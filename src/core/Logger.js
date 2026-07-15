/**
 * Logger.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Thin wrapper around console methods with consistent tagging and a
 *   single choke point to later redirect logs to a remote error-tracking
 *   service (Sentry, etc.) without touching call sites across the codebase.
 *
 *   Also lets FeatureFlags.js globally silence debug logs in production
 *   builds without deleting the calls.
 * ---------------------------------------------------------------------------
 */

import { DEBUG_LOGGING_ENABLED } from '../config/FeatureFlags.js';

function tag(scope) {
  return `[${scope}]`;
}

export const Logger = {
  debug(scope, ...args) {
    if (!DEBUG_LOGGING_ENABLED) return;
    console.debug(tag(scope), ...args);
  },
  info(scope, ...args) {
    console.info(tag(scope), ...args);
  },
  warn(scope, ...args) {
    console.warn(tag(scope), ...args);
  },
  error(scope, ...args) {
    console.error(tag(scope), ...args);
    // Hook point: send to remote error tracking here in the future.
  },
};
