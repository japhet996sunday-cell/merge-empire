/**
 * Migrations.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Transforms an old-shaped save object into the current schema, one
 *   version step at a time. This is what lets you change state shape in
 *   v2, v3, v4... without ever breaking a save made in v1.
 *
 * PATTERN
 *   Each migration is a pure function: (oldData) => newData, registered
 *   under the version number it upgrades FROM. runMigrations walks the
 *   chain sequentially: v1->v2->v3->...->current. Never skip steps, even
 *   if it seems faster — sequential steps keep each migration small,
 *   reviewable, and testable in isolation.
 *
 * ADDING A NEW MIGRATION (example)
 *   MIGRATIONS[2] = (data) => {
 *     // e.g. v2 introduced a "prestige" object that didn't exist in v1
 *     return { ...data, prestige: { level: 0, totalResets: 0 } };
 *   };
 *   Then bump CURRENT_SCHEMA_VERSION to 3 in StateSchema.js.
 * ---------------------------------------------------------------------------
 */

import { Logger } from '../core/Logger.js';

/** @type {Record<number, (data: object) => object>} */
const MIGRATIONS = {
  // 1: (data) => { ...migration from v1 to v2 goes here in the future... },
};

/**
 * @param {object} data - raw parsed save payload (data.data holds gameplay state)
 * @param {number} fromVersion
 * @param {number} toVersion
 * @returns {object} migrated gameplay state, matching `toVersion` schema
 */
export function runMigrations(rawPayload, fromVersion, toVersion) {
  let data = rawPayload.data ?? rawPayload; // tolerate both wrapped/unwrapped input
  let version = fromVersion;

  if (version === toVersion) return data;

  Logger.info('Migrations', `Migrating save from v${fromVersion} to v${toVersion}`);

  while (version < toVersion) {
    const step = MIGRATIONS[version];
    if (!step) {
      Logger.error('Migrations', `No migration registered for v${version}. Aborting chain.`);
      break;
    }
    data = step(data);
    version += 1;
  }

  data.schemaVersion = version;
  return data;
         }
