/**
 * MergeSystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Owns the rules of the core interaction loop: combining two same-item,
 *   same-tier grid cells into one higher-tier item. Pure gameplay logic —
 *   no DOM, no animation, no audio. Reads item chains from
 *   data/ItemDefinitions.js so adding a new merge family is a data change,
 *   never a code change here.
 *
 * CONTRACT
 *   canMerge(state, cellIdA, cellIdB) -> boolean
 *   attemptMerge(gameState, cellIdA, cellIdB) -> MergeResult | null
 *
 *   MergeResult = {
 *     sourceCellIds: [cellIdA, cellIdB],
 *     resultCellId: string,
 *     resultItemDefId: string,
 *     resultTier: number,
 *     isMaxTier: boolean,
 *   }
 *
 * EVENTS EMITTED
 *   'merge:attempted'  { cellIdA, cellIdB, success }
 *   'merge:completed'  MergeResult
 *   'merge:maxTierReached' { itemDefId, familyId, tier }  — the merged item
 *     has no nextTierItemId; useful for AchievementSystem/UI celebration.
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { Selectors } from '../state/Selectors.js';
import { getItemDefinition, getNextTierItem } from '../data/ItemDefinitions.js';

export const MergeSystem = {
  /**
   * @returns {boolean} whether the two cells contain mergeable items
   */
  canMerge(state, cellIdA, cellIdB) {
    if (cellIdA === cellIdB) return false;

    const a = Selectors.getGridCell(state, cellIdA);
    const b = Selectors.getGridCell(state, cellIdB);
    if (!a || !b || !a.itemId || !b.itemId) return false;
    if (a.itemId !== b.itemId) return false; // must be the exact same item/tier

    const defA = getItemDefinition(a.itemId);
    if (!defA) return false;
    if (!defA.nextTierItemId) return false; // already at max tier, nothing to merge into

    return true;
  },

  /**
   * Attempts the merge. Returns null if illegal (no mutation occurs).
   * On success, mutates gameState via GameState#update and emits events.
   *
   * @param {import('../state/GameState.js').GameState} gameState
   */
  attemptMerge(gameState, cellIdA, cellIdB) {
    const state = gameState.getState();
    const legal = this.canMerge(state, cellIdA, cellIdB);

    eventBus.emit('merge:attempted', { cellIdA, cellIdB, success: legal });
    if (!legal) return null;

    const sourceCell = Selectors.getGridCell(state, cellIdA);
    const resultDef = getNextTierItem(sourceCell.itemId);

    let result = null;
    gameState.update((draft) => {
      const cellA = draft.grid.cells.find((c) => c?.cellId === cellIdA);
      const cellB = draft.grid.cells.find((c) => c?.cellId === cellIdB);

      cellB.itemId = resultDef.id;
      cellB.tier = resultDef.tier;
      cellA.itemId = null;
      cellA.tier = 0;

      draft.statistics.totalMerges += 1;
      draft.statistics.highestTierReached = Math.max(
        draft.statistics.highestTierReached,
        resultDef.tier
      );
      if (resultDef.familyId === 'gem') {
        draft.statistics.highestGemTierReached = Math.max(
          draft.statistics.highestGemTierReached ?? 0,
          resultDef.tier
        );
      }

      result = {
        sourceCellIds: [cellIdA, cellIdB],
        resultCellId: cellIdB,
        resultItemDefId: resultDef.id,
        resultTier: resultDef.tier,
        isMaxTier: resultDef.nextTierItemId === null,
      };
    }, 'merge');

    eventBus.emit('merge:completed', result);
    if (result.isMaxTier) {
      eventBus.emit('merge:maxTierReached', {
        itemDefId: resultDef.id,
        familyId: resultDef.familyId,
        tier: resultDef.tier,
      });
    }
    return result;
  },
};
