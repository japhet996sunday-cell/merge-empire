/**
 * MathUtils.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Small, pure numeric helpers reused across balance/economy calculations
 *   (cost curves, clamping, lerp for animations/interpolation). Centralized
 *   so formulas like exponential cost growth are written once and tested
 *   once instead of re-derived slightly differently in five files.
 * ---------------------------------------------------------------------------
 */

export const MathUtils = {
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /** Standard idle-game exponential cost curve: base * growth^level */
  exponentialCost(base, growthRate, level) {
    return base * Math.pow(growthRate, level);
  },

  randomInt(minInclusive, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
  },

  /** Weighted-random pick from [{ item, weight }] */
  weightedPick(entries) {
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return entries[entries.length - 1]?.item ?? null;
  },
};
