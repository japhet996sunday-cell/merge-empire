/**
 * GridView.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Renders the merge grid to the DOM and translates pointer input
 *   (tap-to-select, then tap a second cell to attempt a merge) into calls
 *   against MergeSystem. Holds direct references to its cell DOM nodes so
 *   it can patch just the cells that changed rather than re-rendering the
 *   whole grid every state update — critical since this updates on every
 *   idle production tick's currency change, not just on merges.
 *
 * CONTRACT
 *   mount(container, ctx) -> void
 *   unmount() -> void
 *   update(state) -> void   — patches only changed cells
 *
 * NON-RESPONSIBILITIES
 *   - Does not decide if a merge is legal (asks MergeSystem.canMerge).
 *   - Does not play animations directly (emits events via MergeSystem;
 *     AnimationController reacts to 'merge:completed' independently).
 * ---------------------------------------------------------------------------
 */

import { h, setText, toggleClass } from '../Renderer.js';
import { getItemDefinition } from '../../data/ItemDefinitions.js';

export const GridView = {
  _container: null,
  _cellEls: new Map(),        // cellId -> HTMLElement
  _cellIconEls: new Map(),    // cellId -> HTMLElement (icon/emoji span)
  _cellTierEls: new Map(),    // cellId -> HTMLElement (tier badge span)
  _lastRenderedItemId: new Map(), // cellId -> itemId | null, for change detection
  _ctx: null,
  _selectedCellId: null,

  mount(container, ctx) {
    this._ctx = ctx;
    this._container = h('div', { class: 'grid-view' });
    container.appendChild(this._container);
    this._renderInitialGrid(ctx.gameState.getState());
  },

  unmount() {
    this._cellEls.clear();
    this._cellIconEls.clear();
    this._cellTierEls.clear();
    this._lastRenderedItemId.clear();
    this._selectedCellId = null;
    this._container?.remove();
    this._container = null;
  },

  update(state) {
    // Grid dimensions can change (grid expansion upgrade) — if the cell
    // count no longer matches what we rendered, do a full re-render rather
    // than trying to patch a structurally different grid.
    if (state.grid.cells.length !== this._cellEls.size) {
      this._container.replaceChildren();
      this._cellEls.clear();
      this._cellIconEls.clear();
      this._cellTierEls.clear();
      this._lastRenderedItemId.clear();
      this._renderInitialGrid(state);
      return;
    }

    for (const cell of state.grid.cells) {
      if (!cell) continue;
      this._patchCell(cell);
    }
  },

  _renderInitialGrid(state) {
    this._container.style.setProperty('--grid-cols', state.grid.width);

    for (const cell of state.grid.cells) {
      const cellId = cell.cellId;
      const iconEl = h('span', { class: 'grid-cell-icon' });
      const tierEl = h('span', { class: 'grid-cell-tier' });

      const cellEl = h(
        'button',
        {
          class: 'grid-cell',
          dataset: { cellId },
          type: 'button',
          'aria-label': 'Empty grid cell',
          onClick: () => this._handleCellClick(cellId),
        },
        [iconEl, tierEl]
      );

      this._cellEls.set(cellId, cellEl);
      this._cellIconEls.set(cellId, iconEl);
      this._cellTierEls.set(cellId, tierEl);
      this._lastRenderedItemId.set(cellId, undefined); // force first patch to write
      this._container.appendChild(cellEl);

      this._patchCell(cell);
    }
  },

  /**
   * Writes only the DOM changes needed to reflect `cell`'s current
   * contents, skipping cells whose itemId hasn't changed since last patch.
   */
  _patchCell(cell) {
    const { cellId, itemId, tier } = cell;
    if (this._lastRenderedItemId.get(cellId) === itemId) return; // unchanged, skip

    const cellEl = this._cellEls.get(cellId);
    const iconEl = this._cellIconEls.get(cellId);
    const tierEl = this._cellTierEls.get(cellId);
    if (!cellEl || !iconEl || !tierEl) return;

    if (!itemId) {
      setText(iconEl, '');
      setText(tierEl, '');
      cellEl.setAttribute('aria-label', 'Empty grid cell');
      toggleClass(cellEl, 'has-item', false);
    } else {
      const def = getItemDefinition(itemId);
      setText(iconEl, def?.emoji ?? '❓');
      setText(tierEl, tier > 0 ? String(tier) : '');
      cellEl.setAttribute('aria-label', def?.displayName ?? 'Item');
      toggleClass(cellEl, 'has-item', true);
    }

    this._lastRenderedItemId.set(cellId, itemId);
  },

  _handleCellClick(cellId) {
    const { gameState, systems } = this._ctx;
    const state = gameState.getState();
    const cell = state.grid.cells.find((c) => c?.cellId === cellId);

    // Tapping an empty cell while nothing is selected does nothing.
    if (!this._selectedCellId && (!cell || !cell.itemId)) return;

    if (!this._selectedCellId) {
      this._selectedCellId = cellId;
      toggleClass(this._cellEls.get(cellId), 'is-selected', true);
      return;
    }

    if (this._selectedCellId === cellId) {
      toggleClass(this._cellEls.get(cellId), 'is-selected', false);
      this._selectedCellId = null;
      return;
    }

    const previousSelection = this._selectedCellId;
    systems.mergeSystem.attemptMerge(gameState, previousSelection, cellId);
    toggleClass(this._cellEls.get(previousSelection), 'is-selected', false);
    this._selectedCellId = null;
  },
};
