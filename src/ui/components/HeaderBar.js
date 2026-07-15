/**
 * HeaderBar.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Top branding bar shown above the currency bar on the main gameplay
 *   screen: game title/logo and a compact production-rate readout (gold
 *   per second), giving the player an at-a-glance sense of their empire's
 *   current earning power without opening a stats screen.
 *
 * CONTRACT
 *   mount(container, ctx) -> void
 *   unmount() -> void
 *   update(state) -> void
 * ---------------------------------------------------------------------------
 */

import { h, setText } from '../Renderer.js';
import { NumberFormatter } from '../../utils/NumberFormatter.js';

export const HeaderBar = {
  _container: null,
  _rateEl: null,
  _ctx: null,
  _lastRenderedRate: undefined,

  mount(container, ctx) {
    this._ctx = ctx;
    this._rateEl = h('span', { class: 'header-bar-rate-value' }, '+0/s');

    this._container = h('div', { class: 'header-bar' }, [
      h('div', { class: 'header-bar-brand' }, [
        h('span', { class: 'header-bar-icon' }, '👑'),
        h('span', { class: 'header-bar-title' }, 'Merge Empire'),
      ]),
      h('div', { class: 'header-bar-rate' }, [h('span', { class: 'header-bar-rate-icon' }, '🪙'), this._rateEl]),
    ]);

    container.appendChild(this._container);
    this.update(ctx.gameState.getState());
  },

  unmount() {
    this._container?.remove();
    this._container = null;
    this._rateEl = null;
  },

  update(state) {
    if (!this._rateEl || !this._ctx) return;

    const snapshot = this._ctx.systems.productionSystem.getProductionSnapshot(state);
    const goldRate = snapshot.gold ?? 0;
    const rounded = Math.round(goldRate * 10) / 10;

    if (this._lastRenderedRate === rounded) return;
    setText(this._rateEl, `+${NumberFormatter.abbreviate(goldRate)}/s`);
    this._lastRenderedRate = rounded;
  },
};
