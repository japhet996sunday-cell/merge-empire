/**
 * NumberFormatter.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Idle games produce very large numbers quickly (millions, billions,
 *   beyond). This module formats raw numeric currency/production values
 *   into player-friendly display strings (1.2K, 3.4M, 5.6B...). Isolated
 *   here so the abbreviation scheme (and later, a "scientific notation"
 *   or "AA/AB" suffix scheme for extreme lategame numbers) can evolve
 *   without touching every UI component that displays a number.
 * ---------------------------------------------------------------------------
 */

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];

export const NumberFormatter = {
  /** e.g. 1234567 -> "1.23M" */
  abbreviate(value, decimals = 2) {
    if (value < 1000) return this._trimTrailingZeros(value, value < 10 ? decimals : 0);

    const tier = Math.min(Math.floor(Math.log10(Math.abs(value)) / 3), SUFFIXES.length - 1);
    const scaled = value / Math.pow(1000, tier);
    return `${this._trimTrailingZeros(scaled, decimals)}${SUFFIXES[tier]}`;
  },

  /** e.g. 1234567 -> "1,234,567" */
  withCommas(value) {
    return Math.floor(value).toLocaleString('en-US');
  },

  _trimTrailingZeros(value, decimals) {
    return Number(value.toFixed(decimals)).toString();
  },
};
