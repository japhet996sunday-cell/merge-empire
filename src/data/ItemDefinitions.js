/**
 * ItemDefinitions.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Pure data describing every mergeable item in the game: its tier chain,
 *   visuals, and production behavior. MergeSystem and ProductionSystem read
 *   this data; they don't own it.
 *
 * CONTENT DESIGN
 *   Three merge families for the launch build:
 *     - "coin"  : basic currency generator, tiers 1-6, unlocked from start.
 *                 Fast, cheap, teaches the core merge loop.
 *     - "tree"  : mid-tier currency generator, tiers 1-6, unlocked once the
 *                 player reaches a tier-3 coin item. Slower to produce but
 *                 yields more per item at high tiers.
 *     - "gem"   : premium-currency generator, tiers 1-5, rarer to obtain,
 *                 yields gems instead of gold.
 *
 *   Every item carries a sellValue so a future "sell for space" action has
 *   real numbers immediately, without touching this file again.
 * ---------------------------------------------------------------------------
 */

/** @type {Map<string, object>} itemId -> ItemDefinition */
const ITEM_REGISTRY = new Map();

export function registerItemDefinition(def) {
  ITEM_REGISTRY.set(def.id, def);
}

export function getItemDefinition(itemId) {
  return ITEM_REGISTRY.get(itemId) ?? null;
}

export function getNextTierItem(itemId) {
  const def = getItemDefinition(itemId);
  return def?.nextTierItemId ? getItemDefinition(def.nextTierItemId) : null;
}

export function getAllItemDefinitions() {
  return [...ITEM_REGISTRY.values()];
}

export function getFamilyStarterItems() {
  return getAllItemDefinitions().filter((def) => def.unlockedFromStart && def.tier === 1);
}

// ---------------------------------------------------------------------------
// Coin family — tiers 1-6, the default starting chain.
// ---------------------------------------------------------------------------
registerItemDefinition({
  id: 'coin_1', familyId: 'coin', tier: 1,
  displayName: 'Copper Pouch', emoji: '🪙',
  iconAssetPath: 'assets/images/items/coin_1.png',
  nextTierItemId: 'coin_2',
  producesCurrency: 'gold', baseProductionRate: 0.5,
  sellValue: { gold: 2 },
  unlockedFromStart: true,
});
registerItemDefinition({
  id: 'coin_2', familyId: 'coin', tier: 2,
  displayName: 'Silver Pouch', emoji: '💰',
  iconAssetPath: 'assets/images/items/coin_2.png',
  nextTierItemId: 'coin_3',
  producesCurrency: 'gold', baseProductionRate: 1.2,
  sellValue: { gold: 6 },
  unlockedFromStart: true,
});
registerItemDefinition({
  id: 'coin_3', familyId: 'coin', tier: 3,
  displayName: 'Gold Chest', emoji: '🧰',
  iconAssetPath: 'assets/images/items/coin_3.png',
  nextTierItemId: 'coin_4',
  producesCurrency: 'gold', baseProductionRate: 3.0,
  sellValue: { gold: 18 },
  unlockedFromStart: true,
});
registerItemDefinition({
  id: 'coin_4', familyId: 'coin', tier: 4,
  displayName: "Merchant's Vault", emoji: '🏦',
  iconAssetPath: 'assets/images/items/coin_4.png',
  nextTierItemId: 'coin_5',
  producesCurrency: 'gold', baseProductionRate: 7.5,
  sellValue: { gold: 52 },
  unlockedFromStart: true,
});
registerItemDefinition({
  id: 'coin_5', familyId: 'coin', tier: 5,
  displayName: "Baron's Treasury", emoji: '👑',
  iconAssetPath: 'assets/images/items/coin_5.png',
  nextTierItemId: 'coin_6',
  producesCurrency: 'gold', baseProductionRate: 18.0,
  sellValue: { gold: 150 },
  unlockedFromStart: true,
});
registerItemDefinition({
  id: 'coin_6', familyId: 'coin', tier: 6,
  displayName: 'Royal Mint', emoji: '🏛️',
  iconAssetPath: 'assets/images/items/coin_6.png',
  nextTierItemId: null,
  producesCurrency: 'gold', baseProductionRate: 42.0,
  sellValue: { gold: 420 },
  unlockedFromStart: true,
});

// ---------------------------------------------------------------------------
// Tree family — tiers 1-6, unlocked mid-progression.
// ---------------------------------------------------------------------------
registerItemDefinition({
  id: 'tree_1', familyId: 'tree', tier: 1,
  displayName: 'Sapling', emoji: '🌱',
  iconAssetPath: 'assets/images/items/tree_1.png',
  nextTierItemId: 'tree_2',
  producesCurrency: 'gold', baseProductionRate: 1.5,
  sellValue: { gold: 8 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'tree_2', familyId: 'tree', tier: 2,
  displayName: 'Young Tree', emoji: '🌿',
  iconAssetPath: 'assets/images/items/tree_2.png',
  nextTierItemId: 'tree_3',
  producesCurrency: 'gold', baseProductionRate: 3.6,
  sellValue: { gold: 24 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'tree_3', familyId: 'tree', tier: 3,
  displayName: 'Oak Tree', emoji: '🌳',
  iconAssetPath: 'assets/images/items/tree_3.png',
  nextTierItemId: 'tree_4',
  producesCurrency: 'gold', baseProductionRate: 8.6,
  sellValue: { gold: 70 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'tree_4', familyId: 'tree', tier: 4,
  displayName: 'Blossom Grove', emoji: '🌸',
  iconAssetPath: 'assets/images/items/tree_4.png',
  nextTierItemId: 'tree_5',
  producesCurrency: 'gold', baseProductionRate: 20.7,
  sellValue: { gold: 205 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'tree_5', familyId: 'tree', tier: 5,
  displayName: 'Ancient Tree', emoji: '🌲',
  iconAssetPath: 'assets/images/items/tree_5.png',
  nextTierItemId: 'tree_6',
  producesCurrency: 'gold', baseProductionRate: 49.8,
  sellValue: { gold: 600 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'tree_6', familyId: 'tree', tier: 6,
  displayName: 'World Tree', emoji: '🎋',
  iconAssetPath: 'assets/images/items/tree_6.png',
  nextTierItemId: null,
  producesCurrency: 'gold', baseProductionRate: 120.0,
  sellValue: { gold: 1750 },
  unlockedFromStart: false,
});

// ---------------------------------------------------------------------------
// Gem family — tiers 1-5, premium currency, rare spawns.
// ---------------------------------------------------------------------------
registerItemDefinition({
  id: 'gem_1', familyId: 'gem', tier: 1,
  displayName: 'Gem Shard', emoji: '🔹',
  iconAssetPath: 'assets/images/items/gem_1.png',
  nextTierItemId: 'gem_2',
  producesCurrency: 'gems', baseProductionRate: 0.01,
  sellValue: { gold: 40 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'gem_2', familyId: 'gem', tier: 2,
  displayName: 'Cut Gem', emoji: '💎',
  iconAssetPath: 'assets/images/items/gem_2.png',
  nextTierItemId: 'gem_3',
  producesCurrency: 'gems', baseProductionRate: 0.025,
  sellValue: { gold: 110 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'gem_3', familyId: 'gem', tier: 3,
  displayName: 'Radiant Gem', emoji: '🔷',
  iconAssetPath: 'assets/images/items/gem_3.png',
  nextTierItemId: 'gem_4',
  producesCurrency: 'gems', baseProductionRate: 0.06,
  sellValue: { gold: 300 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'gem_4', familyId: 'gem', tier: 4,
  displayName: 'Flawless Gem', emoji: '💠',
  iconAssetPath: 'assets/images/items/gem_4.png',
  nextTierItemId: 'gem_5',
  producesCurrency: 'gems', baseProductionRate: 0.14,
  sellValue: { gold: 820 },
  unlockedFromStart: false,
});
registerItemDefinition({
  id: 'gem_5', familyId: 'gem', tier: 5,
  displayName: 'Crown Jewel', emoji: '👑',
  iconAssetPath: 'assets/images/items/gem_5.png',
  nextTierItemId: null,
  producesCurrency: 'gems', baseProductionRate: 0.32,
  sellValue: { gold: 2200 },
  unlockedFromStart: false,
});
