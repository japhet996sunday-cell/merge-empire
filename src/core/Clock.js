/**
 * Clock.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Provides real-world wall-clock timestamps used for:
 *     - "last saved at" / "last seen at" bookkeeping
 *     - Offline progress calculation (elapsed real time since last session)
 *     - Daily/weekly mission reset boundaries
 *     - Timed events (limited-time offers, daily rewards)
 *
 *   This is intentionally separate from GameLoop's tick counter. GameLoop
 *   answers "how much simulated time passed"; Clock answers "what time is
 *   it in the real world". Idle games need both, and conflating them is a
 *   classic bug source (e.g. tick-based day boundaries drift from real days).
 *
 * NOTES
 *   - All timestamps are stored/compared as UTC epoch ms. Local-time day
 *     boundaries for "daily reset" are computed at the point of use
 *     (MissionSystem), not baked into this file, so the day-boundary policy
 *     can change without touching this utility.
 * ---------------------------------------------------------------------------
 */

export const Clock = {
  nowMs() {
    return Date.now();
  },

  /** Elapsed real milliseconds between two epoch timestamps, floor-clamped to 0. */
  elapsedMs(fromEpochMs, toEpochMs = Date.now()) {
    return Math.max(0, toEpochMs - fromEpochMs);
  },

  /** True if fromEpochMs and toEpochMs fall on different UTC calendar days. */
  isDifferentUtcDay(fromEpochMs, toEpochMs = Date.now()) {
    const a = new Date(fromEpochMs);
    const b = new Date(toEpochMs);
    return (
      a.getUTCFullYear() !== b.getUTCFullYear() ||
      a.getUTCMonth() !== b.getUTCMonth() ||
      a.getUTCDate() !== b.getUTCDate()
    );
  },
};
