/**
 * UpgradesScreen.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Lists purchasable upgrades (from UpgradeDefinitions) with current
 *   level, cost, and a purchase button. Reads UpgradeSystem/Selectors for
 *   affordability, delegates purchase clicks to UpgradeSystem.purchase().
 *   Contains no cost-curve math itself — that lives in UpgradeSystem.
 * ---------------------------------------------------------------------------
 */

import { h, setText, toggleClass } from '../Renderer.js';
import { NumberFormatter } from '../../utils/NumberFormatter.js';
import { getAllUpgradeDefinitions } from '../../data/UpgradeDefinitions.js';

export const UpgradesScreen = {
  _rootEl: null,
  _ctx: null,
  _rowEls: new Map(), // upgradeId -> { row, levelEl, costButton, costValueEl }

  mount(container, ctx) {
    this._ctx = ctx;
    this._rootEl = h('div', { class: 'screen screen--upgrades screen-enter' }, [
      h('h1', {}, 'Upgrades'),
      h('p', { class: 'screen-subtitle' }, 'Permanent boosts for your empire.'),
      h('div', { class: 'upgrade-list' }),
    ]);
    container.appendChild(this._rootEl);
    this._renderList(ctx.gameState.getState());
  },

  unmount() {
    this._rowEls.clear();
    this._rootEl?.remove();
    this._rootEl = null;
  },

  update(state) {
    this._patchList(state);
  },

  _renderList(state) {
    const listEl = this._rootEl.querySelector('.upgrade-list');
    listEl.replaceChildren();
    this._rowEls.clear();

    const { upgradeSystem } = this._ctx.systems;

    for (const def of getAllUpgradeDefinitions()) {
      const level = state.upgrades[def.id]?.level ?? 0;
      const cost = upgradeSystem.getCost(state, def.id);
      const isMaxed = cost === null;
      const canAfford = !isMaxed && upgradeSystem.canPurchase(state, def.id);

      const levelEl = h('span', { class: 'upgrade-level' }, `Lv. ${level}/${def.maxLevel}`);
      const costValueEl = h('span', { class: 'btn-cost-value' });

      const costButton = h(
        'button',
        {
          class: `btn btn--cost ${canAfford ? '' : 'is-disabled'}`,
          type: 'button',
          disabled: canAfford ? undefined : '',
          onClick: () => {
            if (upgradeSystem.purchase(this._ctx.gameState, def.id)) {
              // Re-render happens automatically via GameState subscription
              // (see UIManager -> UpgradesScreen.update), no manual call needed.
            }
          },
        },
        [h('span', { class: 'btn-cost-label' }, isMaxed ? 'MAXED' : 'Upgrade'), costValueEl]
      );

      if (isMaxed) {
        costButton.disabled = true;
        costButton.classList.add('is-disabled');
      }

      const row = h('div', { class: 'upgrade-row', dataset: { upgradeId: def.id } }, [
        h('div', { class: 'upgrade-row-info' }, [
          h('h3', { class: 'upgrade-row-title' }, def.displayName),
          h('p', { class: 'upgrade-row-description' }, def.description),
          levelEl,
        ]),
        costButton,
      ]);

      listEl.appendChild(row);
      this._rowEls.set(def.id, { row, levelEl, costButton, costValueEl });
      this._patchRow(def.id, state);
    }
  },

  _patchList(state) {
    if (this._rowEls.size === 0) {
      this._renderList(state);
      return;
    }
    for (const def of getAllUpgradeDefinitions()) {
      this._patchRow(def.id, state);
    }
  },

  _patchRow(upgradeId, state) {
    const refs = this._rowEls.get(upgradeId);
    if (!refs) return;

    const { upgradeSystem } = this._ctx.systems;
    const def = getAllUpgradeDefinitions().find((d) => d.id === upgradeId);
    const level = state.upgrades[upgradeId]?.level ?? 0;
    const cost = upgradeSystem.getCost(state, upgradeId);
    const isMaxed = cost === null;
    const canAfford = !isMaxed && upgradeSystem.canPurchase(state, upgradeId);

    setText(refs.levelEl, `Lv. ${level}/${def.maxLevel}`);
    setText(refs.costValueEl, isMaxed ? '' : NumberFormatter.abbreviate(cost.amount));

    toggleClass(refs.costButton, 'is-disabled', isMaxed || !canAfford);
    refs.costButton.disabled = isMaxed || !canAfford;
    refs.costButton.querySelector('.btn-cost-label').textContent = isMaxed ? 'MAXED' : 'Upgrade';
  },
};
