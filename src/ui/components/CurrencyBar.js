/**
 * CurrencyBar.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Persistent currency display shown across all screens (gold, gems, and
 *   any future currency defined in StateSchema's currencies map). Holds
 *   direct references to its counter DOM nodes and patches text content
 *   only when a value actually changed, since this updates very frequently
 *   during idle production ticks (potentially 20x/second) — full re-render
 *   here would be a real performance cost.
 *
 * CONTRACT
 *   mount(container, ctx) -> void
 *   unmount() -> void
 *   update(state) -> void
 * ---------------------------------------------------------------------------
 */

import { h, setText } from '../Renderer.js';
import { NumberFormatter } from '../../utils/NumberFormatter.js';

const CURRENCY_ICONS = {
  gold: '🪙',
  gems: '💎',
  prestigePoints: '⭐',
};

export const CurrencyBar = {
  _container: null,
  _currencyEls: new Map(), // currencyId -> HTMLElement (value span)
  _lastRenderedValue: new Map(), // currencyId -> number, for change detection

  mount(container, ctx) {
    this._container = h('div', { class: 'currency-bar' });

    for (const currencyId of Object.keys(ctx.gameState.getState().currencies)) {
      if (currencyId === 'prestigePoints') continue; // hidden until prestige system ships

      const valueEl = h('span', { class: 'currency-bar-value' }, '0');
      this._currencyEls.set(currencyId, valueEl);
      this._lastRenderedValue.set(currencyId, undefined);

      this._container.appendChild(
        h('div', { class: 'currency-bar-item', dataset: { currencyId } }, [
          h('span', { class: 'currency-bar-icon' }, CURRENCY_ICONS[currencyId] ?? '🔸'),
          valueEl,
        ])
      );
    }

    container.appendChild(this._container);
    this.update(ctx.gameState.getState());
  },

  unmount() {
    this._currencyEls.clear();
    this._lastRenderedValue.clear();
    this._container?.remove();
    this._container = null;
  },

  update(state) {
    for (const [currencyId, el] of this._currencyEls) {
      const value = state.currencies[currencyId] ?? 0;
      // Round to a display-relevant precision before comparing, so we don't
      // trigger a DOM write on every fractional idle-tick increment when
      // the rendered abbreviation wouldn't actually change.
      const rounded = Math.floor(value * 100) / 100;
      if (this._lastRenderedValue.get(currencyId) === rounded) continue;

      setText(el, NumberFormatter.abbreviate(value));
      this._lastRenderedValue.set(currencyId, rounded);
    }
  },
};
