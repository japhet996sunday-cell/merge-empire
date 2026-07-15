/**
 * MissionDefinitions.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Pure data describing the pool of possible daily missions that
 *   MissionSystem draws from, plus the weighted-random selection helper.
 *
 *   Every `readProgressDelta` function reads an event payload and returns
 *   how much that single event advances the mission — MissionSystem calls
 *   this once per relevant event and adds the result to stored progress,
 *   so definitions stay declarative and MissionSystem stays generic.
 * ---------------------------------------------------------------------------
 */

/** @type {Map<string, object>} missionId -> MissionDefinition */
const MISSION_REGISTRY = new Map();

export function registerMissionDefinition(def) {
  MISSION_REGISTRY.set(def.id, def);
}

export function getMissionDefinition(missionId) {
  return MISSION_REGISTRY.get(missionId) ?? null;
}

export function getAllMissionDefinitions() {
  return [...MISSION_REGISTRY.values()];
}

export function pickDailyMissionSet(count) {
  const pool = getAllMissionDefinitions();
  if (pool.length === 0) return [];

  const chosen = [];
  const remaining = [...pool];
  while (chosen.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, d) => sum + (d.weight ?? 1), 0);
    let roll = Math.random() * totalWeight;
    let pickedIndex = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= remaining[i].weight ?? 1;
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }
    chosen.push(remaining[pickedIndex].id);
    remaining.splice(pickedIndex, 1);
  }
  return chosen;
}

registerMissionDefinition({
  id: 'merge_10_items',
  displayName: 'Merge Enthusiast',
  description: 'Complete 10 merges today.',
  target: 10,
  trackEvent: 'merge:completed',
  readProgressDelta: () => 1,
  rewardCurrency: 'gold',
  rewardAmount: 80,
  weight: 3,
});

registerMissionDefinition({
  id: 'merge_25_items',
  displayName: 'Merge Marathon',
  description: 'Complete 25 merges today.',
  target: 25,
  trackEvent: 'merge:completed',
  readProgressDelta: () => 1,
  rewardCurrency: 'gold',
  rewardAmount: 200,
  weight: 2,
});

registerMissionDefinition({
  id: 'earn_500_gold',
  displayName: "Merchant's Quota",
  description: 'Earn 500 gold today.',
  target: 500,
  trackEvent: 'currency:changed',
  readProgressDelta: (payload) =>
    payload.currencyId === 'gold' && payload.delta > 0 ? payload.delta : 0,
  rewardCurrency: 'gold',
  rewardAmount: 100,
  weight: 3,
});

registerMissionDefinition({
  id: 'earn_2000_gold',
  displayName: 'Big Spender',
  description: 'Earn 2,000 gold today.',
  target: 2000,
  trackEvent: 'currency:changed',
  readProgressDelta: (payload) =>
    payload.currencyId === 'gold' && payload.delta > 0 ? payload.delta : 0,
  rewardCurrency: 'gems',
  rewardAmount: 10,
  weight: 1,
});

registerMissionDefinition({
  id: 'purchase_1_upgrade',
  displayName: 'Investor',
  description: 'Purchase 1 upgrade today.',
  target: 1,
  trackEvent: 'upgrade:purchased',
  readProgressDelta: () => 1,
  rewardCurrency: 'gold',
  rewardAmount: 60,
  weight: 2,
});

registerMissionDefinition({
  id: 'reach_tier_3',
  displayName: 'Level Up',
  description: 'Merge an item up to tier 3 or higher today.',
  target: 1,
  trackEvent: 'merge:completed',
  readProgressDelta: (payload) => (payload.resultTier >= 3 ? 1 : 0),
  rewardCurrency: 'gold',
  rewardAmount: 90,
  weight: 2,
});
