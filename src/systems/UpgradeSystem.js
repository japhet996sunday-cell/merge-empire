/**
 * UpgradeSystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Owns purchase logic and level-based effect calculation for permanent
 *   upgrades. Upgrade definitions (cost curve, max level, effect type) live
 *   in data/UpgradeDefinitions.js as pure data; this system interprets that
 *   data.
 *
 * CONTRACT
 *   getCost(state, upgradeId) -> { currencyId, amount } | null (null = maxed)
 *   canPurchase(state, upgradeId) -> boolean
 *   purchase(gameState, upgradeId) -> boolean (success)
 *   getEffectValue(state, upgradeId) -> number
 *     Meaning depends on effectType — for 'currencyMultiplier' it's a
 *     multiplier (1.0 = no bonus); for others it's a raw magnitude.
 *
 * EVENTS EMITTED
 *   'upgrade:purchased' { upgradeId, newLevel, cost }
 *   'upgrade:maxLevelReached' { upgradeId }
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { EconomySystem } from './EconomySystem.js';
import { GridSystem } from './GridSystem.js';
import { Selectors } from '../state/Selectors.js';
import { getUpgradeDefinition, getAllUpgradeDefinitions } from '../data/UpgradeDefinitions.js';

export const UpgradeSystem = {
  /**
   * @returns {{ currencyId: string, amount: number } | null} null if max level
   */
  getCost(state, upgradeId) {
    const def = getUpgradeDefinition(upgradeId);
    if (!def) return null;

    const level = Selectors.getUpgradeLevel(state, upgradeId);
    if (level >= def.maxLevel) return null;

    const amount = Math.round(def.baseCost * Math.pow(def.growthRate, level));
    return { currencyId: def.costCurrency, amount };
  },

  canPurchase(state, upgradeId) {
    const cost = this.getCost(state, upgradeId);
    if (!cost) return false;
    return Selectors.canAfford(state, { [cost.currencyId]: cost.amount });
  },

  /**
   * @param {import('../state/GameState.js').GameState} gameState
   * @returns {boolean} success
   */
  purchase(gameState, upgradeId) {
    const def = getUpgradeDefinition(upgradeId);
    if (!def) return false;

    const state = gameState.getState();
    const cost = this.getCost(state, upgradeId);
    if (!cost) return false;

    const spent = EconomySystem.spendCurrency(
      gameState,
      cost.currencyId,
      cost.amount,
      `upgrade:${upgradeId}`
    );
    if (!spent) return false;

    let newLevel = 0;
    gameState.update((draft) => {
      const entry = draft.upgrades[upgradeId] ?? { level: 0, purchasedAtMs: 0 };
      entry.level += 1;
      entry.purchasedAtMs = Date.now();
      draft.upgrades[upgradeId] = entry;
      newLevel = entry.level;
    }, `upgrade:purchase:${upgradeId}`);

    if (def.effectType === 'gridExpansion') {
      const state2 = gameState.getState();
      const newHeight = state2.grid.height + def.effectParams.extraRowsPerLevel;
      GridSystem.expandGrid(gameState, state2.grid.width, newHeight);
    }

    eventBus.emit('upgrade:purchased', { upgradeId, newLevel, cost });
    if (newLevel >= def.maxLevel) {
      eventBus.emit('upgrade:maxLevelReached', { upgradeId });
    }
    return true;
  },

  /**
   * Computes the current gameplay effect of an upgrade based on its level.
   * @returns {number} interpretation depends on effectType (see header doc)
   */
  getEffectValue(state, upgradeId) {
    const def = getUpgradeDefinition(upgradeId);
    if (!def) return 1;

    const level = Selectors.getUpgradeLevel(state, upgradeId);
    if (level === 0) return def.effectType === 'currencyMultiplier' ? 1 : 0;

    switch (def.effectType) {
      case 'currencyMultiplier':
        return 1 + level * def.effectParams.perLevelBonus;
      case 'spawnRateBoost':
        return 1 - Math.min(0.9, level * def.effectParams.perLevelReduction);
      case 'offlineEfficiencyBoost':
        return level * def.effectParams.perLevelBonus;
      case 'gridExpansion':
        return level * def.effectParams.extraRowsPerLevel;
      default:
        return level;
    }
  },

  /**
   * Aggregate multiplier for a given currency across every upgrade that
   * affects it. Used by EconomySystem so it never needs to know upgrade
   * internals directly.
   */
  getCurrencyMultiplier(state, currencyId) {
    let multiplier = 1;
    for (const def of getAllUpgradeDefinitions()) {
      if (def.effectType === 'currencyMultiplier' && def.effectParams.currencyId === currencyId) {
        multiplier *= this.getEffectValue(state, def.id);
      }
    }
    return multiplier;
  },
};
