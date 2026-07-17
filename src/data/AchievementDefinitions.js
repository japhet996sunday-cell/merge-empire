/**
 * AchievementDefinitions.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Pure data describing every achievement: which statistic it tracks, its
 *   target threshold, and its reward. AchievementSystem interprets this;
 *   this file only declares it.
 *
 *   Every `readStat` function reads from `state.statistics` (see
 *   StateSchema.js) — never from raw grid/currency state directly, so
 *   achievement progress survives grid changes (selling items, prestige
 *   resets, etc.) as long as the lifetime counters are preserved.
 * ---------------------------------------------------------------------------
 */

/** @type {Map<string, object>} achievementId -> AchievementDefinition */
const ACHIEVEMENT_REGISTRY = new Map();

export function registerAchievementDefinition(def) {
  ACHIEVEMENT_REGISTRY.set(def.id, def);
}

export function getAchievementDefinition(achievementId) {
  return ACHIEVEMENT_REGISTRY.get(achievementId) ?? null;
}

export function getAllAchievementDefinitions() {
  return [...ACHIEVEMENT_REGISTRY.values()];
}

registerAchievementDefinition({
  id: 'first_merge',
  displayName: 'First Steps',
  description: 'Complete your first merge.',
  category: 'merging',
  target: 1,
  readStat: (stats) => stats.totalMerges,
  rewardCurrency: 'gold',
  rewardAmount: 25,
  iconAssetPath: 'assets/images/icons/achievement_first_merge.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'merge_veteran',
  displayName: 'Merge Veteran',
  description: 'Complete 100 merges.',
  category: 'merging',
  target: 100,
  readStat: (stats) => stats.totalMerges,
  rewardCurrency: 'gold',
  rewardAmount: 500,
  iconAssetPath: 'assets/images/icons/achievement_merge_veteran.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'merge_master',
  displayName: 'Merge Master',
  description: 'Complete 1,000 merges.',
  category: 'merging',
  target: 1000,
  readStat: (stats) => stats.totalMerges,
  rewardCurrency: 'gems',
  rewardAmount: 25,
  iconAssetPath: 'assets/images/icons/achievement_merge_master.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'tier_climber',
  displayName: 'Tier Climber',
  description: 'Reach tier 4 on any item.',
  category: 'progression',
  target: 4,
  readStat: (stats) => stats.highestTierReached,
  rewardCurrency: 'gold',
  rewardAmount: 150,
  iconAssetPath: 'assets/images/icons/achievement_tier_climber.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'tier_champion',
  displayName: 'Tier Champion',
  description: 'Reach tier 6 on any item.',
  category: 'progression',
  target: 6,
  readStat: (stats) => stats.highestTierReached,
  rewardCurrency: 'gems',
  rewardAmount: 50,
  iconAssetPath: 'assets/images/icons/achievement_tier_champion.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'gold_hoarder',
  displayName: 'Gold Hoarder',
  description: 'Earn a total of 10,000 gold across your empire.',
  category: 'economy',
  target: 10000,
  readStat: (stats) => stats.totalCurrencyEarned.gold ?? 0,
  rewardCurrency: 'gems',
  rewardAmount: 15,
  iconAssetPath: 'assets/images/icons/achievement_gold_hoarder.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'gold_tycoon',
  displayName: 'Gold Tycoon',
  description: 'Earn a total of 250,000 gold across your empire.',
  category: 'economy',
  target: 250000,
  readStat: (stats) => stats.totalCurrencyEarned.gold ?? 0,
  rewardCurrency: 'gems',
  rewardAmount: 100,
  iconAssetPath: 'assets/images/icons/achievement_gold_tycoon.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'dedicated_player',
  displayName: 'Dedicated Player',
  description: 'Play across 7 separate sessions.',
  category: 'dedication',
  target: 7,
  readStat: (stats) => stats.sessionCount,
  rewardCurrency: 'gold',
  rewardAmount: 300,
  iconAssetPath: 'assets/images/icons/achievement_dedicated_player.png',
  hidden: false,
});

registerAchievementDefinition({
  id: 'secret_collector',
  displayName: '???',
  description: 'Reach the maximum tier on the Gem family.',
  category: 'secret',
  target: 5,
  readStat: (stats) => stats.highestGemTierReached ?? 0,
  rewardCurrency: 'gems',
  rewardAmount: 200,
  iconAssetPath: 'assets/images/icons/achievement_secret.png',
  hidden: true,
}); 
