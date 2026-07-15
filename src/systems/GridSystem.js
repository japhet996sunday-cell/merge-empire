/**
 * GridSystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Owns spatial rules of the merge board: placing items, moving items
 *   between cells, checking adjacency/validity, and grid expansion (an
 *   upgrade-gated feature). MergeSystem depends on GridSystem for cell
 *   queries; GridSystem knows nothing about merge rules itself — it's pure
 *   spatial bookkeeping, which keeps it reusable if a future game mode
 *   uses the same grid without merge mechanics (e.g. a "storage" grid).
 *
 * CONTRACT
 *   placeItem(gameState, cellId, itemDefId, tier) -> boolean
 *   moveItem(gameState, fromCellId, toCellId) -> boolean
 *   isCellEmpty(state, cellId) -> boolean
 *   expandGrid(gameState, newWidth, newHeight) -> void
 *   spawnRandomItem(gameState) -> { cellId, itemDefId, tier } | null
 *     (drops a new base-tier item into a random empty cell — the standard
 *     "tap to spawn" or "timed spawn" idle-merge mechanic)
 *
 * EVENTS EMITTED
 *   'grid:itemPlaced' { cellId, itemDefId, tier }
 *   'grid:itemMoved' { fromCellId, toCellId }
 *   'grid:expanded' { newWidth, newHeight }
 *   'grid:full' — emitted when spawnRandomItem finds no empty cell, useful
 *     for UI to prompt the player to merge/clear space
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { Selectors } from '../state/Selectors.js';
import { getFamilyStarterItems } from '../data/ItemDefinitions.js';

export const GridSystem = {
  isCellEmpty(state, cellId) {
    const cell = Selectors.getGridCell(state, cellId);
    return cell === null || cell?.itemId === null;
  },

  /**
   * @param {import('../state/GameState.js').GameState} gameState
   */
  placeItem(gameState, cellId, itemDefId, tier) {
    const state = gameState.getState();
    if (!this.isCellEmpty(state, cellId)) return false;

    gameState.update((draft) => {
      const idx = draft.grid.cells.findIndex((c) => c?.cellId === cellId);
      draft.grid.cells[idx] = { cellId, itemId: itemDefId, tier };
    }, 'grid:place');

    eventBus.emit('grid:itemPlaced', { cellId, itemDefId, tier });
    return true;
  },

  moveItem(gameState, fromCellId, toCellId) {
    const state = gameState.getState();
    if (!this.isCellEmpty(state, toCellId)) return false;

    gameState.update((draft) => {
      const from = draft.grid.cells.find((c) => c?.cellId === fromCellId);
      const toIdx = draft.grid.cells.findIndex((c) => c?.cellId === toCellId);
      draft.grid.cells[toIdx] = { cellId: toCellId, itemId: from.itemId, tier: from.tier };
      from.itemId = null;
      from.tier = 0;
    }, 'grid:move');

    eventBus.emit('grid:itemMoved', { fromCellId, toCellId });
    return true;
  },

  expandGrid(gameState, newWidth, newHeight) {
    gameState.update((draft) => {
      const newCellCount = newWidth * newHeight;
      const existingCells = draft.grid.cells;
      const grown = Array.from({ length: newCellCount }, (_, i) =>
        existingCells[i] ?? { cellId: `cell_${i}`, itemId: null, tier: 0 }
      );
      draft.grid.width = newWidth;
      draft.grid.height = newHeight;
      draft.grid.cells = grown;
    }, 'grid:expand');

    eventBus.emit('grid:expanded', { newWidth, newHeight });
  },

  /**
   * Finds a random empty cell and places a fresh tier-1 item there, chosen
   * from whichever item families are currently unlocked-from-start. Returns
   * null (and emits 'grid:full') if no space is available.
   */
  spawnRandomItem(gameState) {
    const state = gameState.getState();
    const emptyCells = state.grid.cells.filter((c) => c === null || c.itemId === null);

    if (emptyCells.length === 0) {
      eventBus.emit('grid:full', {});
      return null;
    }

    const starterItems = getFamilyStarterItems();
    if (starterItems.length === 0) return null; // no content registered yet

    const chosenDef = starterItems[Math.floor(Math.random() * starterItems.length)];
    const targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    this.placeItem(gameState, targetCell.cellId, chosenDef.id, chosenDef.tier);
    return { cellId: targetCell.cellId, itemDefId: chosenDef.id, tier: chosenDef.tier };
  },
};
