/**
 * UpgradeDefinitions.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Pure data for every purchasable upgrade: cost curve inputs, max level,
 *   and effect. UpgradeSystem interprets this data; this file only declares
 *   it.
 *
 * COST CURVE
 *   cost(level) = baseCost * growthRate^level
 *   A growthRate around 1.15-1.3 is standard idle-genre pacing: cheap
 *   early levels, meaningfully harder late levels, without spiking so hard
 *   that upgrades feel like a one-time purchase.
 * ---------------------------------------------------------------------------
 */

/** @type {Map<string, object>} upgradeId -> UpgradeDefinition */
const UPGRADE_REGISTRY = new Map();

export function registerUpgradeDefinition(def) {
  UPGRADE_REGISTRY.set(def.id, def);
}

export function getUpgradeDefinition(upgradeId) {
  return UPGRADE_REGISTRY.get(upgradeId) ?? null;
}

export function getAllUpgradeDefinitions() {
  return [...UPGRADE_REGISTRY.values()];
}

registerUpgradeDefinition({
  id: 'gold_multiplier',
  displayName: 'Gold Multiplier',
  description: 'Increases all gold production by 10% per level.',
  maxLevel: 25,
  costCurrency: 'gold',
  baseCost: 50,
  growthRate: 1.22,
  effectType: 'currencyMultiplier',
  effectParams: { currencyId: 'gold', perLevelBonus: 0.10 },
});

registerUpgradeDefinition({
  id: 'gem_multiplier',
  displayName: 'Gem Refinement',
  description: 'Increases all gem production by 8% per level.',
  maxLevel: 15,
  costCurrency: 'gems',
  baseCost: 5,
  growthRate: 1.28,
  effectType: 'currencyMultiplier',
  effectParams: { currencyId: 'gems', perLevelBonus: 0.08 },
});

registerUpgradeDefinition({
  id: 'grid_expansion',
  displayName: 'Grid Expansion',
  description: 'Expands your board by one row, giving more room to merge.',
  maxLevel: 4,
  costCurrency: 'gold',
  baseCost: 2000,
  growthRate: 2.4,
  effectType: 'gridExpansion',
  effectParams: { extraRowsPerLevel: 1 },
});

registerUpgradeDefinition({
  id: 'spawn_speed',
  displayName: 'Faster Spawning',
  description: 'Reduces the time between automatic item spawns by 6% per level.',
  maxLevel: 10,
  costCurrency: 'gold',
  baseCost: 120,
  growthRate: 1.3,
  effectType: 'spawnRateBoost',
  effectParams: { perLevelReduction: 0.06 },
});

registerUpgradeDefinition({
  id: 'offline_efficiency',
  displayName: 'Offline Efficiency',
  description: 'Increases offline earnings efficiency by 5% per level.',
  maxLevel: 5,
  costCurrency: 'gems',
  baseCost: 10,
  growthRate: 1.6,
  effectType: 'offlineEfficiencyBoost',
  effectParams: { perLevelBonus: 0.05 },
});
