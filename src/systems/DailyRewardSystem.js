/**
 * DailyRewardSystem.js
 * Handles one daily login reward per UTC day.
 */

import { eventBus } from '../core/EventBus.js';
import { EconomySystem } from './EconomySystem.js';
import { Clock } from '../core/Clock.js';

function utcDayKey(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export const DailyRewardSystem = {

  init(gameState) {
    this.check(gameState);
  },

  check(gameState) {
    const now = Clock.nowMs();
    const state = gameState.getState();

    const last = state.missions.lastLoginRewardAtMs || 0;

    if (last && utcDayKey(last) === utcDayKey(now)) {
      return false;
    }

    let streak = state.missions.loginStreak || 0;

    if (last) {
      const previous = new Date(last);
      const current = new Date(now);

      const previousDay = Date.UTC(
        previous.getUTCFullYear(),
        previous.getUTCMonth(),
        previous.getUTCDate()
      );

      const currentDay = Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate()
      );

      const daysAway = Math.round(
        (currentDay - previousDay) / 86400000
      );

      streak = daysAway === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }

    streak = Math.min(streak, 7);

    const baseReward = 25;
    const upgradeLevel = state.upgrades?.daily_bonus?.level || 0;
    const rewardMultiplier = 1 + upgradeLevel * 0.10;
    const reward = baseReward * streak * rewardMultiplier;

    gameState.update((draft) => {
      draft.missions.loginStreak = streak;
      draft.missions.lastLoginRewardAtMs = now;
    }, 'daily:login');

    EconomySystem.grantCurrency(
      gameState,
      'gold',
      reward,
      `daily-login:${streak}`
    );

    eventBus.emit('daily:reward', {
      streak,
      rewardCurrency: 'gold',
      rewardAmount: reward,
    });

    return true;
  },
};
