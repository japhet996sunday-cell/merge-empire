/**
 * BottomNav.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Persistent bottom navigation bar shown across every screen: switches
 *   between Main/Upgrades/Achievements/Missions via UIManager, and opens
 *   the Settings modal (settings are a modal, not a routed screen — see
 *   SettingsModal.js). Highlights the active tab and shows a badge dot
 *   when missions have unclaimed rewards ready to collect.
 *
 * CONTRACT
 *   mount(container, ctx) -> void
 *   unmount() -> void
 *   update(state) -> void   — refreshes the "missions ready" badge
 * ---------------------------------------------------------------------------
 */

import { h, toggleClass } from '../Renderer.js';
import { eventBus } from '../../core/EventBus.js';
import { SettingsModal } from './SettingsModal.js';
import { getMissionDefinition } from '../../data/MissionDefinitions.js';

const NAV_ITEMS = [
  { screenId: 'main', label: 'Empire', icon: '🏰' },
  { screenId: 'upgrades', label: 'Upgrades', icon: '⬆️' },
  { screenId: 'achievements', label: 'Awards', icon: '🏆' },
  { screenId: 'missions', label: 'Missions', icon: '📋' },
];

export const BottomNav = {
  _container: null,
  _ctx: null,
  _buttonEls: new Map(), // screenId -> HTMLElement
  _activeScreenId: 'main',
  _unsubscribeNavChange: null,

  mount(container, ctx) {
    this._ctx = ctx;
    this._container = h('nav', { class: 'bottom-nav', 'aria-label': 'Main navigation' });

    for (const item of NAV_ITEMS) {
      const badgeEl = h('span', { class: 'nav-badge', hidden: '' });
      const btn = h(
        'button',
        {
          class: 'nav-btn',
          type: 'button',
          dataset: { screenId: item.screenId },
          onClick: () => eventBus.emit('ui:navigate', { screenId: item.screenId }),
        },
        [
          h('span', { class: 'nav-btn-icon' }, item.icon),
          h('span', { class: 'nav-btn-label' }, item.label),
          badgeEl,
        ]
      );
      this._buttonEls.set(item.screenId, btn);
      this._container.appendChild(btn);
    }

    const settingsBtn = h(
      'button',
      {
        class: 'nav-btn',
        type: 'button',
        'aria-label': 'Settings',
        onClick: () => SettingsModal.open(ctx),
      },
      [h('span', { class: 'nav-btn-icon' }, '⚙️'), h('span', { class: 'nav-btn-label' }, 'Settings')]
    );
    this._container.appendChild(settingsBtn);

    container.appendChild(this._container);
    this._setActiveButton(this._activeScreenId);

    this._unsubscribeNavChange = eventBus.on('ui:screenChanged', ({ screenId }) => {
      this._activeScreenId = screenId;
      this._setActiveButton(screenId);
    });

    this.update(ctx.gameState.getState());
  },

  unmount() {
    this._unsubscribeNavChange?.();
    this._unsubscribeNavChange = null;
    this._buttonEls.clear();
    this._container?.remove();
    this._container = null;
  },

  update(state) {
    const missionsBtn = this._buttonEls.get('missions');
    if (!missionsBtn) return;

    const hasReadyMission = state.missions.active.some((m) => {
      const def = getMissionDefinition(m.missionId);
      return def && m.progress >= def.target;
    });

    const badgeEl = missionsBtn.querySelector('.nav-badge');
    if (badgeEl) badgeEl.hidden = !hasReadyMission;
  },

  _setActiveButton(screenId) {
    for (const [id, btn] of this._buttonEls) {
      toggleClass(btn, 'is-active', id === screenId);
    }
  },
};
