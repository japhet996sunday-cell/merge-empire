/**
 * FeatureFlags.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Central toggles for work-in-progress features and debug tooling. Lets
 *   you merge incomplete systems behind a flag instead of long-lived
 *   feature branches, and lets QA/dev builds diverge from production
 *   without a build-step (since this is a no-bundler vanilla JS project).
 *
 *   For a real production deploy, swap these constants for values injected
 *   at build/deploy time (e.g. via a small config.json fetched at boot).
 * ---------------------------------------------------------------------------
 */

export const DEBUG_LOGGING_ENABLED = true;   // flip false for production
export const DEBUG_PANEL_ENABLED = true;     // in-game cheat/inspector panel
export const SEASONAL_EVENTS_ENABLED = false; // gate future limited-time content
export const CLOUD_SAVE_ENABLED = false;      // gate future account-sync feature
