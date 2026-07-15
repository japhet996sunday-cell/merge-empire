/**
 * StateSchema.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Defines the canonical shape of persisted game state and the current
 *   schema version number. This is documentation-as-code: the source of
 *   truth for "what does a save file contain."
 *
 *   Bumping CURRENT_SCHEMA_VERSION is required whenever the shape changes
 *   in a way older saves won't already match (renamed field, restructured
 *   nesting, new required field). Pair every bump with a migration step in
 *   Migrations.js.
 *
 * SHAPE (v1)
 *   {
 *     schemaVersion: number,
 *     player: {
 *       id: string,
 *       createdAtMs: number,
 *       lastSeenAtMs: number,
 *     },
 *     currencies: {
 *       [currencyId: string]: number   // e.g. gold, gems, prestigePoints
 *     },
 *     grid: {
 *       width: number,
 *       height: number,
 *       cells: Array<{ cellId: string, itemId: string | null, tier: number } | null>,
 *     },
 *     inventory: {
 *       // overflow storage for items not currently on the grid, if the
 *       // game supports that; keyed by a generated instance id
 *       [instanceId: string]: { itemDefId: string, tier: number }
 *     },
 *     upgrades: {
 *       [upgradeId: string]: { level: number, purchasedAtMs: number }
 *     },
 *     achievements: {
 *       [achievementId: string]: { unlocked: boolean, progress: number, unlockedAtMs: number | null }
 *     },
 *     missions: {
 *       active: Array<{ missionId: string, progress: number, assignedAtMs: number }>,
 *       completedIds: string[],
 *       lastDailyResetAtMs: number,
 *     },
 *     settings: {
 *       audioMasterVolume: number,
 *       sfxVolume: number,
 *       musicVolume: number,
 *       reducedMotion: boolean,
 *       theme: 'light' | 'dark' | 'system',
 *     },
 *     statistics: {
 *       // long-lived counters used by achievements/missions/analytics
 *       totalMerges: number,
 *       totalCurrencyEarned: Record<string, number>,
 *       highestTierReached: number,
 *       sessionCount: number,
 *     },
 *   }
 * ---------------------------------------------------------------------------
 */

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Factory for a brand-new player's state. Every field the game reads must
 * have a default here — never assume a field exists without one.
 */
export function createDefaultState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    player: {
      id: crypto.randomUUID(),
      createdAtMs: Date.now(),
      lastSeenAtMs: Date.now(),
    },
    currencies: {
      gold: 0,
      gems: 0,
      prestigePoints: 0,
    },
    grid: {
      width: 5,
      height: 5,
      cells: Array.from({ length: 25 }, (_, i) => ({
        cellId: `cell_${i}`,
        itemId: null,
        tier: 0,
      })),
    },
    inventory: {},
    upgrades: {},
    achievements: {},
    missions: {
      active: [],
      completedIds: [],
      lastDailyResetAtMs: Date.now(),
    },
    settings: {
      audioMasterVolume: 0.8,
      sfxVolume: 1.0,
      musicVolume: 0.6,
      reducedMotion: false,
      theme: 'system',
    },
    statistics: {
      totalMerges: 0,
      totalCurrencyEarned: {},
      highestTierReached: 0,
      highestGemTierReached: 0,
      sessionCount: 0,
    },
  };
    }
