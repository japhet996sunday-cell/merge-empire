/**
 * Selectors.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Pure functions that DERIVE values from GameState rather than storing
 *   them redundantly. E.g. "total production per second" is computed from
 *   grid + upgrades, not stored as its own field — storing derived data
 *   invites desync bugs where the stored value drifts from its inputs.
 *
 *   Keeping these in one file also gives UI components and systems a shared,
 *   tested vocabulary for reading state instead of each reaching into raw
 *   state shape and duplicating logic (e.g. five different places computing
 *   "can afford this upgrade" slightly differently).
 *
 * CONVENTION
 *   Every selector: (state, ...args) => value. No side effects, no mutation.
 *   Cheap selectors here; anything genuinely expensive should be memoized
 *   by the caller (e.g. UIManager only recomputes on relevant state:changed
 *   events, not every render frame).
 * ---------------------------------------------------------------------------
 */

export const Selectors = {
  getCurrency(state, currencyId) {
    return state.currencies[currencyId] ?? 0;
  },

  canAfford(state, costs) {
    // costs: { gold: 100, gems: 5 }
    return Object.entries(costs).every(
      ([currencyId, amount]) => this.getCurrency(state, currencyId) >= amount
    );
  },

  getUpgradeLevel(state, upgradeId) {
    return state.upgrades[upgradeId]?.level ?? 0;
  },

  isAchievementUnlocked(state, achievementId) {
    return state.achievements[achievementId]?.unlocked ?? false;
  },

  getActiveMissions(state) {
    return state.missions.active;
  },

  getGridCell(state, cellId) {
    return state.grid.cells.find((c) => c?.cellId === cellId) ?? null;
  },

  getEmptyCellCount(state) {
    return state.grid.cells.filter((c) => c === null).length;
  },
};
