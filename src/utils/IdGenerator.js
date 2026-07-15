/**
 * IdGenerator.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Generates stable unique identifiers for runtime instances that need
 *   one (grid cell ids at board-init time, inventory instance ids for
 *   overflow storage). Uses crypto.randomUUID() where available, with a
 *   fallback for older environments/test runners.
 * ---------------------------------------------------------------------------
 */

export function generateId(prefix = 'id') {
  const unique =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${unique}`;
}
