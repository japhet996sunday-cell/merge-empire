/**
 * MissionSystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Manages the rotating set of active daily missions that drive short-term
 *   retention. Distinct from AchievementSystem: achievements are
 *   permanent/one-time and account-wide; missions are time-boxed, reset on
 *   a schedule, and reward the player for logging in regularly.
 *
 * CONTRACT
 *   init(gameState) — subscribe to progress-driving events, check for
 *     daily reset on boot
 *   refreshDailyMissions(gameState) — clears active missions, assigns a
 *     fresh set from MissionDefinitions
 *   claimReward(gameState, missionId) -> boolean
 *   checkDailyReset(gameState) — called on boot; compares Clock timestamps
 *     to decide if missions should roll over
 *
 * EVENTS EMITTED
 *   'mission:assigned' { missionId }
 *   'mission:progress' { missionId, current, target }
 *   'mission:completed' { missionId }        — progress hit target
 *   'mission:claimed' { missionId, rewardCurrency, rewardAmount }
 *   'mission:dailyReset' { newMissionIds }
 *
 * DESIGN NOTES
 *   - Completion (progress reaching target) and claiming (player collects
 *     reward) are separate steps — the UI shows a "claim" affordance
 *     rather than auto-granting silently.
 *   - Each mission definition declares `trackEvent` (which EventBus event
 *     advances it) and `readProgressDelta(payload)` (how much that single
 *     event instance advances it). This system is a generic dispatcher over
 *     that declarative data — it contains no mission-specific branching.
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { Clock } from '../core/Clock.js';
import { EconomySystem } from './EconomySystem.js';
import {
  getMissionDefinition,
  getAllMissionDefinitions,
  pickDailyMissionSet,
} from '../data/MissionDefinitions.js';

const DAILY_MISSION_COUNT = 3;

export const MissionSystem = {
  /**
   * @param {import('../state/GameState.js').GameState} gameState
   */
  init(gameState) {
    this.checkDailyReset(gameState);

    // Subscribe once per distinct trackEvent name used across all mission
    // definitions, rather than one listener per mission, so adding new
    // missions never requires new listener wiring here.
    const trackedEventNames = new Set(getAllMissionDefinitions().map((d) => d.trackEvent));
    for (const eventName of trackedEventNames) {
      eventBus.on(eventName, (payload) => this._advanceMissionsFor(gameState, eventName, payload));
    }
  },

  checkDailyReset(gameState) {
    const state = gameState.getState();
    const lastReset = state.missions.lastDailyResetAtMs;
    const isNewDay = Clock.isDifferentUtcDay(lastReset, Clock.nowMs());
    const hasNoActiveMissions = state.missions.active.length === 0;

    if (!isNewDay && !hasNoActiveMissions) return;
    this.refreshDailyMissions(gameState);
  },

  refreshDailyMissions(gameState) {
    const newMissionIds = pickDailyMissionSet(DAILY_MISSION_COUNT);

    gameState.update((draft) => {
      draft.missions.active = newMissionIds.map((missionId) => ({
        missionId,
        progress: 0,
        assignedAtMs: Date.now(),
      }));
      draft.missions.lastDailyResetAtMs = Date.now();
    }, 'mission:dailyReset');

    for (const missionId of newMissionIds) {
      eventBus.emit('mission:assigned', { missionId });
    }
    eventBus.emit('mission:dailyReset', { newMissionIds });
  },

  /**
   * @returns {boolean} success
   */
  claimReward(gameState, missionId) {
    const state = gameState.getState();
    const mission = state.missions.active.find((m) => m.missionId === missionId);
    const def = getMissionDefinition(missionId);
    if (!mission || !def) return false;
    if (mission.progress < def.target) return false; // not yet complete

    gameState.update((draft) => {
      draft.missions.active = draft.missions.active.filter((m) => m.missionId !== missionId);
      draft.missions.completedIds.push(missionId);
    }, `mission:claim:${missionId}`);

    if (def.rewardCurrency && def.rewardAmount > 0) {
      EconomySystem.grantCurrency(gameState, def.rewardCurrency, def.rewardAmount, `mission:${missionId}`);
    }

    eventBus.emit('mission:claimed', {
      missionId,
      rewardCurrency: def.rewardCurrency,
      rewardAmount: def.rewardAmount,
    });
    return true;
  },

  _advanceMissionsFor(gameState, eventName, payload) {
    const state = gameState.getState();
    const relevantMissions = state.missions.active.filter((m) => {
      const def = getMissionDefinition(m.missionId);
      return def && def.trackEvent === eventName;
    });
    if (relevantMissions.length === 0) return;

    for (const mission of relevantMissions) {
      const def = getMissionDefinition(mission.missionId);
      const delta = def.readProgressDelta(payload);
      if (delta <= 0) continue;

      let newProgress = 0;
      let justCompleted = false;
      gameState.update((draft) => {
        const entry = draft.missions.active.find((m) => m.missionId === mission.missionId);
        if (!entry) return;
        const wasComplete = entry.progress >= def.target;
        entry.progress = Math.min(def.target, entry.progress + delta);
        newProgress = entry.progress;
        justCompleted = !wasComplete && entry.progress >= def.target;
      }, `mission:progress:${mission.missionId}`);

      eventBus.emit('mission:progress', { missionId: mission.missionId, current: newProgress, target: def.target });
      if (justCompleted) {
        eventBus.emit('mission:completed', { missionId: mission.missionId });
      }
    }
  },
};
