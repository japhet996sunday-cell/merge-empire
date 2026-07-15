/**
 * SaveManager.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Owns all reading/writing of persisted game state. This is the ONLY file
 *   allowed to touch localStorage (or later, a cloud-save backend) for
 *   gameplay data. Centralizing this makes it trivial to later swap
 *   localStorage for IndexedDB or a server API without touching gameplay code.
 *
 * DESIGN DECISIONS
 *   1. Versioned saves. Every save includes a `schemaVersion`. On load, if
 *      the stored version is older than the current schema, Migrations.js
 *      runs a chain of transforms to bring it up to date. This is the
 *      difference between "game breaks for existing players on every update"
 *      and "game evolves for years."
 *   2. Debounced autosave. Systems don't call save() directly on every
 *      mutation (way too expensive). They emit 'state:dirty'; SaveManager
 *      debounces and writes on an interval + on visibility change.
 *   3. Defensive parsing. A corrupted or partial save must never hard-crash
 *      the game. Fall back to a fresh state and surface a non-blocking
 *      warning instead.
 *   4. Redundant slot. Before overwriting the primary save, the previous
 *      save is copied to a backup key. Protects against a crash mid-write
 *      corrupting the only copy a player has.
 *
 * NON-RESPONSIBILITIES
 *   - Does not know the shape of game state beyond schemaVersion (that's
 *     StateSchema.js / Migrations.js).
 *   - Does not decide WHEN to autosave beyond reacting to events (that
 *     policy — e.g. "every 30s" — lives in config/Constants.js).
 * ---------------------------------------------------------------------------
 */

import { eventBus } from './EventBus.js';
import { CURRENT_SCHEMA_VERSION } from '../state/StateSchema.js';
import { runMigrations } from '../state/Migrations.js';
import { AUTOSAVE_INTERVAL_MS, SAVE_KEY, SAVE_BACKUP_KEY } from '../config/Constants.js';
import { Logger } from './Logger.js';

export class SaveManager {
  #getState;      // () => GameState snapshot (plain object)
  #applyState;    // (savedObject) => void, hydrates GameState from disk
  #debounceHandle = null;
  #dirty = false;

  /**
   * @param {object} deps
   * @param {() => object} deps.getState   - returns a serializable snapshot
   * @param {(data: object) => void} deps.applyState - hydrates state on load
   */
  constructor({ getState, applyState }) {
    this.#getState = getState;
    this.#applyState = applyState;

    eventBus.on('state:dirty', () => this.#scheduleAutosave());

    // Save on tab hide/close — the most common moment players "lose" progress.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.saveNow();
    });
    window.addEventListener('beforeunload', () => this.saveNow());
  }

  /**
   * Loads and returns the raw saved payload (already migrated), or null if
   * no save exists / save is unrecoverable.
   * @returns {{ data: object, lastSavedAtMs: number } | null}
   */
  load() {
    const raw = this.#readKey(SAVE_KEY) ?? this.#readKey(SAVE_BACKUP_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const migrated = runMigrations(parsed, parsed.schemaVersion ?? 0, CURRENT_SCHEMA_VERSION);
      return { data: migrated, lastSavedAtMs: parsed.lastSavedAtMs ?? Date.now() };
    } catch (err) {
      Logger.error('SaveManager', 'Failed to parse save; starting fresh.', err);
      return null;
    }
  }

  /** Immediate, synchronous save. Used on unload/hide — must not be async. */
  saveNow() {
    if (this.#debounceHandle) {
      clearTimeout(this.#debounceHandle);
      this.#debounceHandle = null;
    }
    this.#writeSave();
    this.#dirty = false;
  }

  #scheduleAutosave() {
    this.#dirty = true;
    if (this.#debounceHandle) return; // already scheduled
    this.#debounceHandle = setTimeout(() => {
      this.#debounceHandle = null;
      if (this.#dirty) this.saveNow();
    }, AUTOSAVE_INTERVAL_MS);
  }

  #writeSave() {
    try {
      const previous = this.#readKey(SAVE_KEY);
      if (previous) this.#writeKey(SAVE_BACKUP_KEY, previous); // rotate backup first

      const payload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        lastSavedAtMs: Date.now(),
        data: this.#getState(),
      };
      this.#writeKey(SAVE_KEY, JSON.stringify(payload));
      eventBus.emit('save:completed', { atMs: payload.lastSavedAtMs });
    } catch (err) {
      Logger.error('SaveManager', 'Write failed (quota exceeded?).', err);
      eventBus.emit('save:failed', { error: String(err) });
    }
  }

  #readKey(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null; // storage disabled/unavailable (private browsing, etc.)
    }
  }

  #writeKey(key, value) {
    localStorage.setItem(key, value);
  }

  /** Exports current save as a downloadable JSON string (manual backup / support). */
  exportSaveString() {
    return JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastSavedAtMs: Date.now(),
      data: this.#getState(),
    });
  }

  /** Imports a JSON string previously produced by exportSaveString(). */
  importSaveString(jsonString) {
    const parsed = JSON.parse(jsonString);
    const migrated = runMigrations(parsed, parsed.schemaVersion ?? 0, CURRENT_SCHEMA_VERSION);
    this.#applyState(migrated);
    this.saveNow();
  }

  /**
   * Permanently erases all saved data (primary + backup slot). Does not
   * reset in-memory GameState itself — callers typically follow this with
   * a full page reload so the app re-boots from createDefaultState().
   */
  hardReset() {
    if (this.#debounceHandle) {
      clearTimeout(this.#debounceHandle);
      this.#debounceHandle = null;
    }
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_BACKUP_KEY);
    } catch (err) {
      Logger.error('SaveManager', 'Failed to clear save data.', err);
    }
  }
}
