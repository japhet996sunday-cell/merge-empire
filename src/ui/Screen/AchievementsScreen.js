/**
 * AchievementsScreen.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Displays all achievements with progress bars for in-progress ones and
 *   unlock-state styling. Hidden achievements show as "???" until
 *   unlocked. Reads via AchievementSystem.getProgress() /
 *   AchievementDefinitions; contains no unlock-threshold logic itself.
 * ---------------------------------------------------------------------------
 */

import { h, setText, toggleClass } from '../Renderer.js';
import { NumberFormatter } from '../../utils/NumberFormatter.js';
import { getAllAchievementDefinitions } from '../../data/AchievementDefinitions.js';

export const AchievementsScreen = {
  _rootEl: null,
  _ctx: null,
  _rowEls: new Map(), // achievementId -> { row, titleEl, descEl, fillEl, progressLabelEl }

  mount(container, ctx) {
    this._ctx = ctx;
    this._rootEl = h('div', { class: 'screen screen--achievements screen-enter' }, [
      h('h1', {}, 'Achievements'),
      h('p', { class: 'screen-subtitle' }, 'Milestones on your empire-building journey.'),
      h('div', { class: 'achievement-list' }),
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
    const listEl = this._rootEl.querySelector('.achievement-list');
    listEl.replaceChildren();
    this._rowEls.clear();

    const { achievementSystem } = this._ctx.systems;

    for (const def of getAllAchievementDefinitions()) {
      const { current, target, unlocked } = achievementSystem.getProgress(state, def.id);
      const isRevealed = unlocked || !def.hidden;

      const titleEl = h('h3', { class: 'achievement-row-title' });
      const descEl = h('p', { class: 'achievement-row-description' });
      const fillEl = h('div', { class: 'progress-bar-fill' });
      const progressLabelEl = h('span', { class: 'achievement-row-progress-label' });

      const row = h(
        'div',
        { class: 'achievement-row', dataset: { achievementId: def.id } },
        [
          h('span', { class: 'achievement-row-icon' }, unlocked ? '🏆' : '🔒'),
          h('div', { class: 'achievement-row-info' }, [
            titleEl,
            descEl,
            h('div', { class: 'progress-bar' }, fillEl),
            progressLabelEl,
          ]),
        ]
      );

      listEl.appendChild(row);
      this._rowEls.set(def.id, { row, titleEl, descEl, fillEl, progressLabelEl });
      this._patchRow(def.id, state);
      void isRevealed;
    }
  },

  _patchList(state) {
    if (this._rowEls.size === 0) {
      this._renderList(state);
      return;
    }
    for (const def of getAllAchievementDefinitions()) {
      this._patchRow(def.id, state);
    }
  },

  _patchRow(achievementId, state) {
    const refs = this._rowEls.get(achievementId);
    if (!refs) return;

    const { achievementSystem } = this._ctx.systems;
    const def = getAllAchievementDefinitions().find((d) => d.id === achievementId);
    const { current, target, unlocked } = achievementSystem.getProgress(state, achievementId);
    const isRevealed = unlocked || !def.hidden;

    setText(refs.titleEl, isRevealed ? def.displayName : '???');
    setText(refs.descEl, isRevealed ? def.description : 'Keep playing to discover this achievement.');

    const progressPct = Math.min(100, (current / target) * 100);
    refs.fillEl.style.setProperty('--progress', `${progressPct}%`);

    setText(
      refs.progressLabelEl,
      isRevealed
        ? `${NumberFormatter.abbreviate(Math.min(current, target))} / ${NumberFormatter.abbreviate(target)}`
        : ''
    );

    toggleClass(refs.row, 'is-unlocked', unlocked);
    toggleClass(refs.row, 'is-locked', !unlocked);

    const iconEl = refs.row.querySelector('.achievement-row-icon');
    if (iconEl) setText(iconEl, unlocked ? '🏆' : '🔒');
  },
};
