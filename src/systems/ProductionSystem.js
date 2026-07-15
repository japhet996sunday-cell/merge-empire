/**
 * ProductionSystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Computes and applies passive/idle income each simulation tick from
 *   grid items that generate currency over time. Separated from
 *   EconomySystem because Production answers "how much SHOULD be generated
 *   right now" (a rate calculation depending on grid contents + upgrades),
 *   while EconomySystem answers "how do currency totals get mutated
 *   safely."
 *
 * CONTRACT
 *   getProductionSnapshot(state) -> Record<currencyId, perSecondRate>
 *     Pure function, used both by the live tick loop AND by
 *     OfflineProgress.js to compute away-time earnings with the same math —
 *     this shared snapshot function is what guarantees online and offline
 *     income stay consistent.
 *
 *   tick(gameState, dtSeconds)
 *     Called every fixed simulation step from GameLoop. Grants
 *     rate * dtSeconds of each currency via EconomySystem.
 * ---------------------------------------------------------------------------
 */

import { EconomySystem } from './EconomySystem.js';
import { getItemDefinition } from '../data/ItemDefinitions.js';
import { BalanceConfig } from '../data/BalanceConfig.js';

export const ProductionSystem = {
  /**
   * Pure calculation, no mutation. Shared by live tick and offline-progress.
   * @returns {Record<string, number>} currencyId -> amount per second
   */
  getProductionSnapshot(state) {
    const snapshot = {};

    for (const cell of state.grid.cells) {
      if (!cell || !cell.itemId) continue;

      const def = getItemDefinition(cell.itemId);
      if (!def || !def.producesCurrency) continue;

      const tierMultiplier = Math.pow(BalanceConfig.tierValueGrowth, def.tier - 1);
      const rate = def.baseProductionRate * tierMultiplier;

      snapshot[def.producesCurrency] = (snapshot[def.producesCurrency] ?? 0) + rate;
    }

    return snapshot;
  },

  /**
   * Called every fixed simulation tick.
   * @param {import('../state/GameState.js').GameState} gameState
   * @param {number} dtSeconds
   */
  tick(gameState, dtSeconds) {
    const snapshot = this.getProductionSnapshot(gameState.getState());
    for (const [currencyId, perSecondRate] of Object.entries(snapshot)) {
      if (perSecondRate <= 0) continue;
      EconomySystem.grantCurrency(gameState, currencyId, perSecondRate * dtSeconds, 'idleProduction');
    }
  },
};
