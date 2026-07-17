/**
 * main.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   The application's composition root. This is the ONLY file that
 *   constructs and wires every system together — every other module stays
 *   decoupled and only knows about the pieces explicitly passed to it.
 *   If you're asking "where does everything get connected," the answer is
 *   always "here."
 *
 * BOOT SEQUENCE
 *   1. Show the loading screen immediately (no flash of empty shell)
 *   2. Load save (or create default state) -> construct GameState
 *   3. Construct SaveManager, bound to GameState read/write
 *   4. Wire EconomySystem <-> UpgradeSystem via dependency injection
 *      (breaks their circular reference — see EconomySystem.js header)
 *   5. Compute + apply offline progress (if a previous session exists)
 *   6. Init passive systems that only need to subscribe to events
 *      (AchievementSystem, MissionSystem)
 *   7. Build the persistent app shell: HeaderBar/CurrencyBar/GridView live
 *      inside a UIManager-owned #screen-root; BottomNav lives outside it
 *      since it must survive screen swaps
 *   8. Init AnimationController (needs ctx with gameState + systems)
 *   9. Show an audio unlock gate (browser autoplay policy), then init
 *      AudioSystem on first user gesture
 *   10. Construct and start GameLoop: onTick runs ProductionSystem.tick()
 *       and periodically checks for a daily mission reset
 *   11. Hide the loading screen and reveal the game
 * ---------------------------------------------------------------------------
 */

import { GameState } from './state/GameState.js';
import { createDefaultState } from './state/StateSchema.js';
import { SaveManager } from './core/SaveManager.js';
import { GameLoop } from './core/GameLoop.js';
import { Clock } from './core/Clock.js';
import { calculateOfflineProgress } from './core/OfflineProgress.js';
import { Logger } from './core/Logger.js';
import { Validator } from './utils/Validator.js';
import { BalanceConfig } from './data/BalanceConfig.js';

import { MergeSystem } from './systems/MergeSystem.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { ProductionSystem } from './systems/ProductionSystem.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { MissionSystem } from './systems/MissionSystem.js';
import { GridSystem } from './systems/GridSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';

import { UIManager } from './ui/UIManager.js';
import { AnimationController } from './ui/AnimationController.js';
import { MainScreen } from './ui/screens/MainScreen.js';
import { UpgradesScreen } from './ui/screens/UpgradesScreen.js';
import { AchievementsScreen } from './ui/screens/AchievementsScreen.js';
import { MissionsScreen } from './ui/screens/MissionsScreen.js';
import { BottomNav } from './ui/components/BottomNav.js';
import { LoadingScreen } from './ui/components/LoadingScreen.js';
import { Modal } from './ui/components/Modal.js';
import { h } from './ui/Renderer.js';
import { NumberFormatter } from './utils/NumberFormatter.js';

alert("main.js loaded");

const DAILY_RESET_CHECK_INTERVAL_MS = 60_000; // check once a minute is plenty

async function boot() {
  const appRootEl = document.getElementById('app-root');

  // --- 1. Loading screen -----------------------------------------------------
  const loadingEl = LoadingScreen.show(appRootEl);
  LoadingScreen.setProgress(loadingEl, 0.1, 'Loading your empire...');

  // --- 2. State ---------------------------------------------------------------
  const gameState = new GameState(createDefaultState());

  // --- 3. Save system -----------------------------------------------------
  const saveManager = new SaveManager({
    getState: () => gameState.getState(),
    applyState: (data) => gameState.replace(data),
  });

  const loaded = saveManager.load();
  let previousSessionEndMs = null;
  if (loaded && Validator.isValidGameState(loaded.data)) {
    gameState.replace(loaded.data);
    previousSessionEndMs = loaded.lastSavedAtMs;
  } else if (loaded) {
    Logger.warn('main', 'Loaded save failed validation; starting fresh.');
  }

  gameState.update((draft) => {
    draft.statistics.sessionCount += 1;
    draft.player.lastSeenAtMs = Clock.nowMs();
  }, 'session:start');

  LoadingScreen.setProgress(loadingEl, 0.3, 'Applying theme...');
  document.body.dataset.theme = gameState.getState().settings.theme;

  // --- 4. Break the EconomySystem <-> UpgradeSystem circular dependency ------
  EconomySystem.registerMultiplierProvider((state, currencyId) =>
    UpgradeSystem.getCurrencyMultiplier(state, currencyId)
  );

  // --- 5. Offline progress -----------------------------------------------------
  LoadingScreen.setProgress(loadingEl, 0.5, 'Calculating offline earnings...');
  if (previousSessionEndMs) {
    const elapsedMs = Clock.elapsedMs(previousSessionEndMs, Clock.nowMs());
    const productionSnapshot = ProductionSystem.getProductionSnapshot(gameState.getState());
    const { earned, cappedMs } = calculateOfflineProgress({ elapsedMs, productionSnapshot });

    for (const [currencyId, amount] of Object.entries(earned)) {
      if (amount > 0) EconomySystem.grantCurrency(gameState, currencyId, amount, 'offlineProgress');
    }

    if (cappedMs > 60_000) {
      // Only bother the player with a summary if they were away meaningfully long.
      // Deferred until after the loading screen is hidden (see step 11).
      queueMicrotask(() => {
        window.__pendingWelcomeBack = { earned, cappedMs };
      });
    }
  }

  // --- 6. Passive systems -------------------------------------------------------
  LoadingScreen.setProgress(loadingEl, 0.65, 'Waking up your merchants...');
  AchievementSystem.init(gameState);
  MissionSystem.init(gameState);

  // --- 7. Build the app shell ----------------------------------------------------
  LoadingScreen.setProgress(loadingEl, 0.8, 'Building your board...');
  const systems = {
    mergeSystem: MergeSystem,
    economySystem: EconomySystem,
    productionSystem: ProductionSystem,
    upgradeSystem: UpgradeSystem,
    achievementSystem: AchievementSystem,
    missionSystem: MissionSystem,
    gridSystem: GridSystem,
    audioSystem: AudioSystem,
    saveManager,
  };
  const ctx = { gameState, systems };

  // #screen-root is exclusively owned by UIManager (cleared on every screen
  // swap). #bottom-nav-root sits alongside it so navigation persists across
  // screen changes.
  const screenRootEl = h('div', { id: 'screen-root', class: 'screen-root' });
  const bottomNavRootEl = h('div', { id: 'bottom-nav-root' });
  appRootEl.append(screenRootEl, bottomNavRootEl);

  const uiManager = new UIManager(screenRootEl, ctx);
  uiManager.registerScreen('main', MainScreen);
  uiManager.registerScreen('upgrades', UpgradesScreen);
  uiManager.registerScreen('achievements', AchievementsScreen);
  uiManager.registerScreen('missions', MissionsScreen);
  uiManager.showScreen('main');

  BottomNav.mount(bottomNavRootEl, ctx);

  // --- 8. Animation -----------------------------------------------------------
  AnimationController.init(ctx);

  // --- 9. Audio (gated behind user gesture per browser autoplay policy) --------
  // The gate's click listener is wired now, but the element itself stays
  // `hidden` (see index.html) until step 11 reveals it — otherwise it sits
  // underneath the loading screen the whole time boot is running and
  // absorbs taps that visually appear to do nothing.
  const audioGateEl = document.getElementById('audio-unlock-gate');
  audioGateEl?.addEventListener(
    'click',
    () => {
      AudioSystem.init(gameState);
      audioGateEl.remove();
    },
    { once: true }
  );

  // --- 10. Game loop -------------------------------------------------------------
  LoadingScreen.setProgress(loadingEl, 0.95, 'Almost there...');
  let msSinceLastDailyCheck = 0;
  let msSinceLastSpawn = 0;

  const loop = new GameLoop({
    onTick: (dtSeconds) => {
      ProductionSystem.tick(gameState, dtSeconds);

      msSinceLastDailyCheck += dtSeconds * 1000;
      if (msSinceLastDailyCheck >= DAILY_RESET_CHECK_INTERVAL_MS) {
        msSinceLastDailyCheck = 0;
        MissionSystem.checkDailyReset(gameState);
      }

      msSinceLastSpawn += dtSeconds * 1000;
      const spawnSpeedMultiplier = UpgradeSystem.getEffectValue(gameState.getState(), 'spawn_speed');
      const currentSpawnIntervalMs = BalanceConfig.baseSpawnIntervalSeconds * 1000 * spawnSpeedMultiplier;
      if (msSinceLastSpawn >= currentSpawnIntervalMs) {
        msSinceLastSpawn = 0;
        GridSystem.spawnRandomItem(gameState);
      }
    },
    onRender: () => {
      // Intentionally empty: this UI re-renders reactively via
      // GameState.subscribe (see UIManager), not on every animation frame.
      // Reserved for future continuous-render needs (e.g. a canvas layer).
    },
  });
  loop.start();

  // Guarantee a playable board immediately — don't make the player wait a
  // full spawn interval to see their first item on a brand-new game.
  if (gameState.getState().grid.cells.every((c) => !c.itemId)) {
    GridSystem.spawnRandomItem(gameState);
    GridSystem.spawnRandomItem(gameState);
  }

  // --- 11. Reveal the game -----------------------------------------------------
  LoadingScreen.setProgress(loadingEl, 1, 'Ready!');
  await new Promise((resolve) => setTimeout(resolve, 200)); // let the bar visibly fill
  await LoadingScreen.hide(loadingEl);

  // Only now does the audio gate become visible/tappable — previously it
  // sat hidden underneath the loading screen for the whole boot sequence.
  if (audioGateEl) audioGateEl.hidden = false;

  if (window.__pendingWelcomeBack) {
    showWelcomeBackModal(window.__pendingWelcomeBack.earned, window.__pendingWelcomeBack.cappedMs);
    delete window.__pendingWelcomeBack;
  }

  Logger.info('main', 'Boot complete.');
}

function showWelcomeBackModal(earned, cappedMs) {
  const hours = (cappedMs / 3_600_000).toFixed(1);
  const lines = Object.entries(earned)
    .filter(([, amount]) => amount > 0)
    .map(([currencyId, amount]) => h('div', { class: 'welcome-back-line' }, `+${NumberFormatter.abbreviate(amount)} ${currencyId}`));

  Modal.open({
    title: 'Welcome Back!',
    bodyEl: h('div', {}, [h('p', {}, `You were away for ${hours} hours.`), ...lines]),
    actions: [{ label: 'Collect', variant: 'primary' }],
  });
}

document.addEventListener('DOMContentLoaded', () => {
  boot().catch((err) => {
    Logger.error('main', 'Boot failed:', err);
  });
});
