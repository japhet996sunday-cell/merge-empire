/**
 * Constants.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Engineering-level constants: timing, storage keys, limits. NOT game
 *   balance numbers (item values, upgrade costs, production rates) — those
 *   live in data/BalanceConfig.js and data/*Definitions.js so designers can
 *   tune the economy without touching engine code.
 *
 *   Rule of thumb: if changing the number requires understanding *code*,
 *   it belongs here. If changing the number only requires understanding
 *   *game design*, it belongs in data/.
 * ---------------------------------------------------------------------------
 */

export const SAVE_KEY = 'mergeEmpire.save.v1';
export const SAVE_BACKUP_KEY = 'mergeEmpire.save.v1.backup';

export const AUTOSAVE_INTERVAL_MS = 15_000; // debounced autosave cadence

export const OFFLINE_PROGRESS_CAP_HOURS = 12;
export const OFFLINE_EFFICIENCY = 0.75; // offline earns 75% of active rate

export const TOAST_DEFAULT_DURATION_MS = 2500;
export const MODAL_TRANSITION_MS = 200;

export const MAX_GRID_UNDO_STACK = 20; // for potential "undo last merge" UX
