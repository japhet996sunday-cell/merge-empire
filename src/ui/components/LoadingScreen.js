/**
 * LoadingScreen.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   The first thing the player sees: a full-screen loading state shown
 *   while main.js's boot sequence runs (load save, compute offline
 *   progress, initialize systems). Even though this boot sequence is fast
 *   in practice, showing a loading screen avoids a flash of an empty/
 *   half-built game shell, and gives a natural place for a splash/branding
 *   moment.
 *
 * CONTRACT
 *   show(rootEl) -> HTMLElement   — mounts the loading screen, returns its
 *     root element so the caller can remove it once boot finishes
 *   hide(loadingEl) -> Promise<void>  — fades the loading screen out and
 *     removes it from the DOM
 *   setProgress(loadingEl, fraction, label) -> void — updates the progress
 *     bar and status label (fraction is 0..1)
 * ---------------------------------------------------------------------------
 */

import { h, setText } from '../Renderer.js';

export const LoadingScreen = {
  show(rootEl) {
    const fillEl = h('div', { class: 'loading-progress-fill' });
    const labelEl = h('p', { class: 'loading-status-label' }, 'Loading...');

    const loadingEl = h('div', { class: 'loading-screen' }, [
      h('div', { class: 'loading-logo' }, [
        h('span', { class: 'loading-logo-icon' }, '👑'),
        h('h1', { class: 'loading-logo-text' }, 'Merge Empire'),
      ]),
      h('div', { class: 'loading-progress-track' }, fillEl),
      labelEl,
    ]);

    rootEl.appendChild(loadingEl);
    return loadingEl;
  },

  setProgress(loadingEl, fraction, label) {
    if (!loadingEl) return;
    const fillEl = loadingEl.querySelector('.loading-progress-fill');
    const labelEl = loadingEl.querySelector('.loading-status-label');
    if (fillEl) fillEl.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
    if (labelEl && label) setText(labelEl, label);
  },

  hide(loadingEl) {
    if (!loadingEl) return Promise.resolve();

    const animation = loadingEl.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 280,
      easing: 'ease-out',
    });

    return animation.finished
      .catch(() => {}) // animation may be cancelled if the tab is backgrounded; ignore
      .finally(() => loadingEl.remove());
  },
};
