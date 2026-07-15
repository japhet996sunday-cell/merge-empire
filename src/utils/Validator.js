/**
 * Validator.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Small runtime sanity checks used defensively at trust boundaries:
 *   after loading a save from localStorage (data could be hand-edited or
 *   corrupted) and after importing a save string via SaveManager. Vanilla
 *   JS has no static types, so these act as the last line of defense
 *   against a malformed save silently crashing gameplay systems later.
 *
 *   Intentionally lightweight — not a full schema-validation library.
 *   Extend as new state fields are added.
 * ---------------------------------------------------------------------------
 */

export const Validator = {
  isValidGameState(data) {
    if (!data || typeof data !== 'object') return false;
    const requiredTopLevelKeys = [
      'currencies',
      'grid',
      'inventory',
      'upgrades',
      'achievements',
      'missions',
      'settings',
      'statistics',
    ];
    return requiredTopLevelKeys.every((key) => key in data);
  },

  isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  },

  /** Clamps any currency value to a safe, non-negative finite number. */
  sanitizeCurrencyValue(value) {
    if (!this.isFiniteNumber(value) || value < 0) return 0;
    return value;
  },
};
