/**
 * UIManager.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Top-level UI orchestrator. Owns which screen is active (Main/Upgrades/
 *   Achievements/Missions/Settings), mounts/unmounts screen modules, and
 *   subscribes to GameState changes to trigger re-renders. This is the
 *   bridge between the state layer and the DOM layer — it reads state via
 *   Selectors and hands data down to screens/components, but never
 *   contains gameplay rules itself (no merge logic, no cost math).
 *
 * PATTERN
 *   Screens are simple objects with mount(container, ctx) / unmount() /
 *   update(state) methods — not a component framework, just a consistent
 *   contract so screens are swappable without UIManager caring about their
 *   internals. `ctx` bundles shared dependencies (gameState, eventBus,
 *   systems) so screens don't each import a dozen modules individually.
 *
 * NON-RESPONSIBILITIES
 *   - Does not directly manipulate individual DOM nodes for gameplay
 *     elements (GridView/HUD components do that).
 *   - Does not run animations (AnimationController's job, triggered via
 *     events, not called directly by UIManager).
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';

export class UIManager {
  #rootEl;
  #ctx;
  #screens = new Map(); // screenId -> screen module
  #activeScreenId = null;

  /**
   * @param {HTMLElement} rootEl
   * @param {object} ctx - shared context: { gameState, systems }
   */
  constructor(rootEl, ctx) {
    this.#rootEl = rootEl;
    this.#ctx = ctx;

    ctx.gameState.subscribe((state) => this.#onStateChanged(state));
    eventBus.on('ui:navigate', ({ screenId }) => this.showScreen(screenId));
  }

  registerScreen(screenId, screenModule) {
    this.#screens.set(screenId, screenModule);
  }

  showScreen(screenId) {
    const next = this.#screens.get(screenId);
    if (!next) return;

    const current = this.#screens.get(this.#activeScreenId);
    current?.unmount?.();

    this.#rootEl.replaceChildren(); // clear previous screen's DOM
    next.mount(this.#rootEl, this.#ctx);
    this.#activeScreenId = screenId;

    eventBus.emit('ui:screenChanged', { screenId });
  }

  #onStateChanged(state) {
    const active = this.#screens.get(this.#activeScreenId);
    active?.update?.(state);
  }
  }
