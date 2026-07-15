/**
 * BalanceConfig.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Global economy tuning knobs that apply across many items/upgrades
 *   rather than belonging to one specific definition — e.g. global tier
 *   multiplier curves, prestige conversion rates, spawn timers. Keeping
 *   these separate from individual *Definitions.js files means the whole
 *   game's growth curve can be rebalanced by editing a handful of numbers
 *   here instead of hunting through many item entries.
 * ---------------------------------------------------------------------------
 */

export const BalanceConfig = {
  // How much stronger each merge tier is, applied multiplicatively to
  // production/sell-value baselines defined per-item.
  tierValueGrowth: 1.6,

  // Interval (seconds) between automatic item spawns.
  baseSpawnIntervalSeconds: 8,

  // Prestige system conversion rate: how much "prestige currency" 1 unit of
  // total lifetime gold earned converts to. The prestige system itself is
  // not wired up yet — this constant exists so EconomySystem/UpgradeSystem
  // can already reference a stable value once it is.
  prestigeConversionRate: 0.0001,

  // Maximum number of items that can occupy the grid before spawning stops
  // and the UI should nudge the player to merge/clear space.
  gridSoftCapWarningThreshold: 0.85, // fraction of cells filled
};
