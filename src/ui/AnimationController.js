/**
 * AnimationController.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Translates gameplay events into visual feedback: merge pop/scale
 *   effects, floating "+123 gold" text, item-slide-together animation,
 *   achievement unlock celebration, screen shake, etc. This is the ONLY
 *   place that plays CSS-driven or WAAPI-driven animations in reaction to
 *   gameplay — gameplay systems never call animation code directly, they
 *   just emit events (see MergeSystem, EconomySystem) and this controller
 *   reacts.
 *
 * APPROACH
 *   Uses the Web Animations API (element.animate()) rather than toggling
 *   CSS classes for one-shot effects — gives precise timing control and
 *   automatic cleanup via animation.finished promises, without needing
 *   animationend listener bookkeeping scattered everywhere.
 *   Looping/ambient effects (idle shimmer, hover states) are handled via
 *   CSS classes/keyframes instead (see styles/animations.css) since the
 *   browser optimizes those better than JS-driven loops.
 *
 * CONTRACT
 *   init(ctx) — subscribes to relevant gameplay events
 *   playMergeEffect(resultCellId, resultTier)
 *   playFloatingText(anchorEl, text, { color })
 *   playAchievementCelebration()
 *   respectsReducedMotion() -> boolean — reads state.settings.reducedMotion
 *     and OS-level prefers-reduced-motion; short-circuits animations to
 *     instant/simplified versions for accessibility
 *
 * PERFORMANCE NOTES
 *   - Uses ObjectPool (utils/ObjectPool.js) for floating-text DOM nodes to
 *     avoid GC churn during merge cascades.
 *   - Animates transform/opacity only (compositor-friendly properties),
 *     never top/left/width/height, to avoid layout thrashing.
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { ObjectPool } from '../utils/ObjectPool.js';

const FLOATING_TEXT_DURATION_MS = 900;

export const AnimationController = {
  _ctx: null,
  _floatingTextPool: null,

  init(ctx) {
    this._ctx = ctx;
    this._floatingTextPool = new ObjectPool(
      () => {
        const el = document.createElement('div');
        el.className = 'floating-text';
        return el;
      },
      (el) => {
        el.textContent = '';
        el.style.transform = '';
        el.remove();
      }
    );

    eventBus.on('merge:completed', ({ resultCellId, resultTier }) =>
      this.playMergeEffect(resultCellId, resultTier)
    );
    eventBus.on('achievement:unlocked', async ({ achievementId }) => {
      const { getAchievementDefinition } = await import('../data/AchievementDefinitions.js');
      const def = getAchievementDefinition(achievementId);
      this.playAchievementCelebration({
        displayName: def?.displayName ?? 'Achievement Unlocked!',
        iconAssetPath: def?.iconAssetPath ?? 'assets/images/icons/achievement_secret.png',
      });
    });
  },

  respectsReducedMotion() {
    const stateReduced = this._ctx?.gameState?.getState()?.settings?.reducedMotion ?? false;
    const osReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return stateReduced || osReduced;
  },

  playMergeEffect(resultCellId, resultTier) {
    const targetEl = document.querySelector(`[data-cell-id="${resultCellId}"]`);
    if (!targetEl) return;

    if (this.respectsReducedMotion()) return;

    const intensity = Math.min(Math.max(resultTier, 1), 6);
    const overshoot = 1.10 + intensity * 0.012;

    targetEl.animate(
      [
        { transform: 'scale(0.72)', opacity: 0.72, offset: 0 },
        { transform: `scale(${overshoot})`, opacity: 1, offset: 0.42 },
        { transform: 'scale(0.96)', opacity: 1, offset: 0.68 },
        { transform: 'scale(1)', opacity: 1, offset: 1 }
      ],
      {
        duration: 360,
        easing: 'cubic-bezier(.2,.9,.25,1)'
      }
    );

    targetEl.animate(
      [
        { boxShadow: '0 0 0 0 transparent' },
        { boxShadow: '0 0 0 10px color-mix(in srgb, var(--color-accent-gold) 22%, transparent)' },
        { boxShadow: '0 0 0 0 transparent' }
      ],
      { duration: 420, easing: 'ease-out' }
    );

    const rect = targetEl.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'merge-burst';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;
    burst.setAttribute('aria-hidden', 'true');
    document.body.appendChild(burst);

    const burstAnimation = burst.animate(
      [
        { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: .25 },
        { transform: 'translate(-50%, -50%) scale(1.55)', opacity: 0 }
      ],
      { duration: 430, easing: 'ease-out' }
    );

    burstAnimation.finished
      .then(() => burst.remove())
      .catch(() => burst.remove());
  },

  playFloatingText(anchorEl, text, { color = 'var(--color-accent-gold)' } = {}) {
    if (!anchorEl) return;
    const el = this._floatingTextPool.acquire();
    el.textContent = text;
    el.style.color = color;
    anchorEl.appendChild(el);

    const animation = el.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(-32px)', opacity: 0 },
      ],
      { duration: FLOATING_TEXT_DURATION_MS, easing: 'ease-out' }
    );

    animation.finished
      .then(() => this._floatingTextPool.release(el))
      .catch(() => this._floatingTextPool.release(el)); // animation cancelled
  },

  /**
   * Shows a transient celebration banner in the top of the viewport for an
   * achievement unlock. Uses a lightweight self-contained DOM node (not the
   * blocking Modal component) since unlocks shouldn't interrupt play.
   */
  playAchievementCelebration({
    displayName = 'Achievement Unlocked!',
    iconAssetPath = 'assets/images/icons/achievement_secret.png',
  } = {}) {
    const banner = document.createElement('div');
    banner.className = 'achievement-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <img class="achievement-banner-icon" src="${this._escapeHtml(iconAssetPath)}" alt="" aria-hidden="true">
      <span class="achievement-banner-text">${this._escapeHtml(displayName)}</span>
    `;
    document.body.appendChild(banner);

    if (this.respectsReducedMotion()) {
      setTimeout(() => banner.remove(), 2200);
      return;
    }

    const animation = banner.animate(
      [
        { transform: 'translate(-50%, -24px)', opacity: 0, offset: 0 },
        { transform: 'translate(-50%, 0)', opacity: 1, offset: 0.15 },
        { transform: 'translate(-50%, 0)', opacity: 1, offset: 0.8 },
        { transform: 'translate(-50%, -24px)', opacity: 0, offset: 1 },
      ],
      { duration: 2600, easing: 'ease-out' }
    );

    animation.finished
      .then(() => banner.remove())
      .catch(() => banner.remove());
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
