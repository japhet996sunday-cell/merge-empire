/**
 * OfflineProgress.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Computes what happened while the player was away and applies it as a
 *   single lump-sum update on load — this is the defining feature of an
 *   "idle tycoon" game, so it gets its own dedicated module rather than
 *   being folded into GameLoop.
 *
 * WHY THIS IS SEPARATE FROM GameLoop
 *   GameLoop simulates in small fixed ticks (50ms) for correctness and
 *   smooth rendering. Naively "catching up" 8 hours of offline time by
 *   running 576,000 ticks synchronously on load would freeze the browser.
 *   Offline progress instead uses closed-form / batched math:
 *   production = rate * elapsedSeconds, capped by offline limits and
 *   diminishing-returns rules, computed once, applied once.
 *
 * DESIGN DECISIONS
 *   - Offline earnings are typically capped (e.g. 8-12 hours max, or reduced
 *     efficiency after a threshold) — a standard idle-genre balancing lever
 *     to preserve the value of active play. The cap value lives in
 *     BalanceConfig.js, not here.
 *   - Returns a summary object (resources earned, time away) so the UI can
 *     show a "Welcome Back" modal — this module does NOT touch the DOM.
 *   - Pure function core: (previousState, elapsedSeconds, balanceConfig) =>
 *     { updatedState, summary }. Easy to unit test without a browser.
 *
 * NON-RESPONSIBILITIES
 *   - Does not read the clock itself for "now" — caller passes elapsed time,
 *     keeping this testable with fake durations.
 *   - Does not show UI. GameLoop/UIManager decides how to present the summary.
 * ---------------------------------------------------------------------------
 */

import { OFFLINE_PROGRESS_CAP_HOURS, OFFLINE_EFFICIENCY } from '../config/Constants.js';

/**
 * @param {object} params
 * @param {number} params.elapsedMs - real time since last save/session end
 * @param {object} params.productionSnapshot - output of ProductionSystem's
 *   current per-second rates, e.g. { gold: 12.5, gems: 0.02 }
 * @returns {{ earned: Record<string, number>, cappedMs: number, elapsedMs: number }}
 */
export function calculateOfflineProgress({ elapsedMs, productionSnapshot }) {
  const capMs = OFFLINE_PROGRESS_CAP_HOURS * 60 * 60 * 1000;
  const cappedMs = Math.min(elapsedMs, capMs);
  const cappedSeconds = cappedMs / 1000;

  const earned = {};
  for (const [resourceId, perSecondRate] of Object.entries(productionSnapshot)) {
    earned[resourceId] = perSecondRate * cappedSeconds * OFFLINE_EFFICIENCY;
  }

  return { earned, cappedMs, elapsedMs };
}
