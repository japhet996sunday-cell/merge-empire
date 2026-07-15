/**
 * GameState.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   The single in-memory store for all mutable game data. Modeled after a
 *   minimal Redux-like store, hand-rolled with zero dependencies:
 *
 *     - getState()        : read-only snapshot access
 *     - update(mutatorFn)  : the ONLY way to change state
 *     - subscribe(fn)      : react to any state change (UI re-render, autosave)
 *
 *   WHY NOT LET SYSTEMS MUTATE STATE DIRECTLY
 *   If MergeSystem, EconomySystem, and UIManager all directly poked at a
 *   shared object, you'd get race-condition-style bugs (order-dependent
 *   mutations), no single point to trigger "state changed, please save/
 *   re-render", and no way to add features like undo/replay/analytics later.
 *   Funneling every mutation through update() solves all of that.
 *
 * NON-RESPONSIBILITIES
 *   - Does not know about localStorage (SaveManager's job).
 *   - Does not know about DOM (Renderer/UIManager's job).
 *   - Does not contain gameplay rules (systems/*.js own rules; this module
 *     is just structured storage + change notification).
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { createDefaultState } from './StateSchema.js';

export class GameState {
  #state;
  #subscribers = new Set();

  constructor(initialState = createDefaultState()) {
    this.#state = initialState;
  }

  /**
   * Read-only snapshot. Callers must not mutate the returned object —
   * treat it as frozen even though we don't pay the runtime cost of
   * actually calling Object.freeze() deeply (perf, given frequent reads).
   */
  getState() {
    return this.#state;
  }

  /**
   * The only sanctioned way to mutate state.
   * @param {(draft: object) => void | object} mutatorFn
   *   Either mutate `draft` in place, or return a wholesale replacement.
   * @param {string} [reason] - short tag for debugging/logging what changed
   */
  update(mutatorFn, reason = 'unspecified') {
    const draft = this.#state;
    const result = mutatorFn(draft);
    this.#state = result !== undefined ? result : draft;

    eventBus.emit('state:changed', { reason });
    eventBus.emit('state:dirty', { reason }); // SaveManager listens to this
    this.#notify();
  }

  /**
   * Replace the entire state wholesale (used on load / import).
   */
  replace(newState) {
    this.#state = newState;
    eventBus.emit('state:changed', { reason: 'replace' });
    this.#notify();
  }

  subscribe(fn) {
    this.#subscribers.add(fn);
    return () => this.#subscribers.delete(fn);
  }

  #notify() {
    for (const fn of this.#subscribers) fn(this.#state);
  }
}
