/**
 * MissionsScreen.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Displays currently active daily missions with progress and claim
 *   buttons. Delegates claiming to MissionSystem.claimReward(); contains
 *   no progress-tracking logic itself.
 * ---------------------------------------------------------------------------
 */

import { h, setText, toggleClass } from '../Renderer.js';
import { NumberFormatter } from '../../utils/NumberFormatter.js';
import { getMissionDefinition } from '../../data/MissionDefinitions.js';

export const MissionsScreen = {
  _rootEl: null,
  _ctx: null,

  mount(container, ctx) {
    this._ctx = ctx;
    this._rootEl = h('div', { class: 'screen screen--missions screen-enter' }, [
      h('h1', {}, 'Missions'),
      h('p', { class: 'screen-subtitle' }, 'Fresh goals every day. Come back tomorrow for more.'),
      h('div', { class: 'mission-list' }),
    ]);
    container.appendChild(this._rootEl);
    this._renderList(ctx.gameState.getState());
  },

  unmount() {
    this._rootEl?.remove();
    this._rootEl = null;
  },

  update(state) {
    this._renderList(state);
  },

  _renderList(state) {
    const listEl = this._rootEl.querySelector('.mission-list');
    listEl.replaceChildren();

    const { missionSystem } = this._ctx.systems;

    if (state.missions.active.length === 0) {
      listEl.appendChild(
        h('p', { class: 'mission-empty-state' }, 'No active missions right now. Check back soon!')
      );
      return;
    }

    for (const mission of state.missions.active) {
      const def = getMissionDefinition(mission.missionId);
      if (!def) continue;

      const isComplete = mission.progress >= def.target;
      const progressPct = Math.min(100, (mission.progress / def.target) * 100);

      const claimButton = h(
        'button',
        {
          class: `btn ${isComplete ? 'btn--primary' : 'btn--secondary'} ${isComplete ? '' : 'is-disabled'}`,
          type: 'button',
          disabled: isComplete ? undefined : '',
          onClick: () => {
            missionSystem.claimReward(this._ctx.gameState, mission.missionId);
          },
        },
        isComplete ? 'Claim' : 'In Progress'
      );

      const row = h('div', { class: 'mission-row', dataset: { missionId: mission.missionId } }, [
        h('div', { class: 'mission-row-info' }, [
          h('h3', { class: 'mission-row-title' }, def.displayName),
          h('p', { class: 'mission-row-description' }, def.description),
          h('div', { class: 'progress-bar' }, h('div', {
            class: 'progress-bar-fill',
            style: `--progress: ${progressPct}%`,
          })),
          h(
            'span',
            { class: 'mission-row-progress-label' },
            `${NumberFormatter.abbreviate(Math.min(mission.progress, def.target))} / ${NumberFormatter.abbreviate(def.target)}`
          ),
        ]),
        claimButton,
      ]);

      toggleClass(row, 'is-complete', isComplete);
      listEl.appendChild(row);
    }
  },
};
