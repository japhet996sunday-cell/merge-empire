/**
 * AchievementSystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Tracks progress toward and unlocks achievements by listening to events
 *   emitted by OTHER systems (merges, currency earned, upgrades bought).
 *   This system never reaches into MergeSystem/EconomySystem directly — it
 *   is a pure event consumer, which is what lets achievements be added,
 *   removed, or rebalanced by editing data/AchievementDefinitions.js alone.
 *
 * CONTRACT
 *   init(gameState)  — call once at boot; subscribes to relevant events
 *   getProgress(state, achievementId) -> { current, target, unlocked }
 *
 * EVENTS EMITTED
 *   'achievement:progress' { achievementId, current, target }
 *   'achievement:unlocked' { achievementId, rewardCurrency, rewardAmount }
 *
 * EVENTS CONSUMED
 *   'merge:completed', 'currency:changed', 'upgrade:purchased',
 *   'mission:claimed' — any event that could move a tracked statistic.
 *   Because every achievement's `readStat` reads from state.statistics
 *   (already updated by the acting system before these events fire), this
 *   system only needs to re-scan definitions, not duplicate any counting
 *   logic itself.
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { EconomySystem } from './EconomySystem.js';
import { getAllAchievementDefinitions } from '../data/AchievementDefinitions.js';

export const AchievementSystem = {
  /**
   * Wires up event listeners. Call once during app boot.
   * @param {import('../state/GameState.js').GameState} gameState
   */
  init(gameState) {
    const recheck = () => this._recheckAll(gameState);
    eventBus.on('merge:completed', recheck);
    eventBus.on('currency:changed', recheck);
    eventBus.on('upgrade:purchased', recheck);
    eventBus.on('mission:claimed', recheck);

    // Catch anything already true from a loaded save (e.g. imported save
    // file that already qualifies for an achievement never granted).
    recheck();
  },

  /**
   * @returns {{ current: number, target: number, unlocked: boolean }}
   */
  getProgress(state, achievementId) {
    const def = getAllAchievementDefinitions().find((d) => d.id === achievementId);
    if (!def) return { current: 0, target: 1, unlocked: false };

    const entry = state.achievements[achievementId];
    return {
      current: def.readStat(state.statistics),
      target: def.target,
      unlocked: entry?.unlocked ?? false,
    };
  },

  _recheckAll(gameState) {
    for (const def of getAllAchievementDefinitions()) {
      this._checkOne(gameState, def);
    }
  },

  _checkOne(gameState, def) {
    const state = gameState.getState();
    if (state.achievements[def.id]?.unlocked) return; // already unlocked, nothing to do

    const current = def.readStat(state.statistics);
    const unlocked = current >= def.target;

    gameState.update((draft) => {
      draft.achievements[def.id] = {
        unlocked,
        progress: current,
        unlockedAtMs: unlocked ? Date.now() : null,
      };
    }, `achievement:check:${def.id}`);

    eventBus.emit('achievement:progress', { achievementId: def.id, current, target: def.target });

    if (unlocked) {
      if (def.rewardCurrency && def.rewardAmount > 0) {
        EconomySystem.grantCurrency(gameState, def.rewardCurrency, def.rewardAmount, `achievement:${def.id}`);
      }
      eventBus.emit('achievement:unlocked', {
        achievementId: def.id,
        rewardCurrency: def.rewardCurrency,
        rewardAmount: def.rewardAmount,
      });
    }
  },
}; 
