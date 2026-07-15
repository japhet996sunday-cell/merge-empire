/**
 * MainScreen.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   The primary gameplay screen: composes HeaderBar + CurrencyBar +
 *   GridView. This is what the player sees by default on load. Bottom
 *   navigation lives outside UIManager's screen-swapping (see BottomNav.js
 *   and main.js) since it must persist across screen changes, so it is
 *   deliberately NOT composed here.
 * ---------------------------------------------------------------------------
 */

import { h } from '../Renderer.js';
import { HeaderBar } from '../components/HeaderBar.js';
import { CurrencyBar } from '../components/CurrencyBar.js';
import { GridView } from '../components/GridView.js';

export const MainScreen = {
  _rootEl: null,

  mount(container, ctx) {
    this._rootEl = h('div', { class: 'screen screen--main screen-enter' });
    container.appendChild(this._rootEl);

    HeaderBar.mount(this._rootEl, ctx);
    CurrencyBar.mount(this._rootEl, ctx);
    GridView.mount(this._rootEl, ctx);
  },

  unmount() {
    HeaderBar.unmount();
    CurrencyBar.unmount();
    GridView.unmount();
    this._rootEl?.remove();
    this._rootEl = null;
  },

  update(state) {
    HeaderBar.update(state);
    CurrencyBar.update(state);
    GridView.update(state);
  },
};
