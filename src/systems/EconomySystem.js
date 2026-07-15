/**
 * EconomySystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   The ONLY module allowed to add/subtract currency values in GameState.
 *   Every other system that wants to grant or spend currency goes through
 *   here (grantCurrency / spendCurrency), never touching state.currencies
 *   directly. This single choke point is what makes it possible to:
 *     - Log every currency transaction for balancing/analytics
 *     - Apply global multipliers (e.g. upgrade-driven "2x gold") in one place
 *     - Guarantee currencies never go negative
 *
 * CONTRACT
 *   grantCurrency(gameState, currencyId, amount, sourceTag)
 *   spendCurrency(gameState, currencyId, amount, sourceTag) -> boolean (success)
 *   getMultiplier(state, currencyId) -> number   (from upgrades/boosts)
 *   registerMultiplierProvider(fn) -> void
 *
 * CIRCULAR DEPENDENCY NOTE
 *   UpgradeSystem needs EconomySystem (to spend currency on purchases), and
 *   EconomySystem needs to know about upgrade-driven multipliers. Rather
 *   than a static two-way `import` (which deadlocks under ES modules) or an
 *   async dynamic import (which would make every currency grant asynchronous
 *   — a poor fit for a system called 20x/second from the game loop), this
 *   uses dependency injection: main.js's boot sequence calls
 *   `registerMultiplierProvider(UpgradeSystem.getCurrencyMultiplier)` once,
 *   after both modules have loaded. Until that registration happens,
 *   getMultiplier() safely returns 1 (no bonus) rather than throwing.
 *
 * EVENTS EMITTED
 *   'currency:changed' { currencyId, delta, newTotal, source }
 *   'currency:insufficientFunds' { currencyId, needed, have }
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { Selectors } from '../state/Selectors.js';

/** @type {((state: object, currencyId: string) => number) | null} */
let multiplierProvider = null;

export const EconomySystem = {
  /**
   * Wires in the function that resolves upgrade-driven multipliers.
   * Called once during boot (see main.js) to break the circular
   * dependency between EconomySystem and UpgradeSystem.
   * @param {(state: object, currencyId: string) => number} providerFn
   */
  registerMultiplierProvider(providerFn) {
    multiplierProvider = providerFn;
  },

  /**
   * @param {import('../state/GameState.js').GameState} gameState
   * @param {string} currencyId
   * @param {number} baseAmount - pre-multiplier amount
   * @param {string} sourceTag
   */
  grantCurrency(gameState, currencyId, baseAmount, sourceTag) {
    if (baseAmount <= 0) return;

    const multiplier = this.getMultiplier(gameState.getState(), currencyId);
    const finalAmount = baseAmount * multiplier;
    let newTotal = 0;

    gameState.update((draft) => {
      draft.currencies[currencyId] = (draft.currencies[currencyId] ?? 0) + finalAmount;
      draft.statistics.totalCurrencyEarned[currencyId] =
        (draft.statistics.totalCurrencyEarned[currencyId] ?? 0) + finalAmount;
      newTotal = draft.currencies[currencyId];
    }, `economy:grant:${sourceTag}`);

    eventBus.emit('currency:changed', {
      currencyId,
      delta: finalAmount,
      newTotal,
      source: sourceTag,
    });
  },

  /**
   * @returns {boolean} true if the spend succeeded
   */
  spendCurrency(gameState, currencyId, amount, sourceTag) {
    const state = gameState.getState();
    const have = Selectors.getCurrency(state, currencyId);

    if (have < amount) {
      eventBus.emit('currency:insufficientFunds', { currencyId, needed: amount, have });
      return false;
    }

    let newTotal = 0;
    gameState.update((draft) => {
      draft.currencies[currencyId] -= amount;
      newTotal = draft.currencies[currencyId];
    }, `economy:spend:${sourceTag}`);

    eventBus.emit('currency:changed', {
      currencyId,
      delta: -amount,
      newTotal,
      source: sourceTag,
    });
    return true;
  },

  /**
   * Reads upgrade levels / active boosts to compute a currency's current
   * multiplier. Returns 1 (no bonus) if no provider has been registered
   * yet, so this is always safe to call.
   */
  getMultiplier(state, currencyId) {
    if (!multiplierProvider) return 1;
    return multiplierProvider(state, currencyId);
  },
};
