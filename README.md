# Merge Empire: Idle Tycoon

A production-quality browser merge/idle tycoon game built entirely with
**HTML5, CSS3, and vanilla JavaScript (ES6 modules)** — no frameworks, no
build step, no external libraries or CDN dependencies.

## Quick start

This project has no build step. Any static file server works.

```bash
# from the project root
python3 -m http.server 8080
# then open http://localhost:8080
```

Or with Node's `npx serve`, or the VS Code "Live Server" extension — anything
that serves static files over HTTP works, since the game is loaded via
native ES module `<script type="module">`, which requires `http://` (not
`file://`) due to browser CORS restrictions on modules.

No `npm install` is required. There is nothing to compile.

## What's playable right now

- A 5×5 starting grid you can expand via the **Grid Expansion** upgrade.
- Three real merge chains: **Coin** (tiers 1–6, starts unlocked), **Tree**
  (tiers 1–6), and **Gem** (tiers 1–5, premium currency).
- Tap a cell, tap a second matching cell, and they merge into the next tier.
- Idle production: every placed item generates currency per second, scaled
  by tier and any purchased multiplier upgrades.
- A working upgrade shop (5 real upgrades: gold multiplier, gem refinement,
  grid expansion, spawn speed, offline efficiency).
- 9 real achievements with working unlock detection and rewards.
- A rotating pool of 6 daily missions, 3 assigned per day, with real
  progress tracking and claimable rewards.
- Offline progress: leave the tab closed and come back to a "Welcome Back"
  summary of what your empire earned while you were away.
- A working settings modal: master/music/SFX volume sliders, light/dark/
  auto theme switching, reduced-motion toggle, save export, and a hard
  reset.
- Procedurally synthesized sound effects (Web Audio oscillators — no audio
  files to source or license) for merges, purchases, achievements, and
  mission rewards.

## Project structure

```
merge-empire/
├── index.html                  Entry point — loads all stylesheets + main.js
├── README.md
├── docs/
│   └── ARCHITECTURE.md         Deep dive: data flow, extension points
├── styles/
│   ├── base.css                Design tokens (CSS variables), reset, type
│   ├── layout.css               App shell structure, grid, screens
│   ├── components.css           Buttons, modal, toast, card rows
│   ├── shell.css                 Header, currency bar, bottom nav, loading
│   │                             screen, settings modal, achievement banner
│   ├── animations.css            Keyframes, reduced-motion handling
│   ├── themes.css                Light/dark theme variable overrides
│   └── responsive.css            Mobile-first breakpoints (loaded last)
└── src/
    ├── main.js                  Composition root — the only file that
    │                            wires every system together
    ├── core/                    Engine-level infrastructure
    │   ├── EventBus.js           Pub/sub backbone — systems never call
    │   │                         each other directly, only emit/listen
    │   ├── GameLoop.js           Fixed-timestep simulation loop
    │   ├── Clock.js              Wall-clock time helpers
    │   ├── SaveManager.js        Versioned localStorage persistence
    │   ├── OfflineProgress.js    Away-time earnings calculation
    │   └── Logger.js             Tagged console wrapper
    ├── state/                   The single source of truth
    │   ├── StateSchema.js        Canonical save shape + defaults
    │   ├── Migrations.js         Schema version upgrade chain
    │   ├── GameState.js          The only sanctioned mutation gateway
    │   └── Selectors.js          Derived-value read helpers
    ├── systems/                 Gameplay rules (no DOM code)
    │   ├── MergeSystem.js
    │   ├── EconomySystem.js
    │   ├── ProductionSystem.js
    │   ├── UpgradeSystem.js
    │   ├── AchievementSystem.js
    │   ├── MissionSystem.js
    │   ├── GridSystem.js
    │   └── AudioSystem.js
    ├── data/                    Pure content data (no logic)
    │   ├── ItemDefinitions.js
    │   ├── UpgradeDefinitions.js
    │   ├── AchievementDefinitions.js
    │   ├── MissionDefinitions.js
    │   └── BalanceConfig.js
    ├── ui/                      Rendering (no gameplay rules)
    │   ├── UIManager.js          Screen routing
    │   ├── Renderer.js           Framework-free DOM helpers (h, setText...)
    │   ├── AnimationController.js
    │   ├── components/           Reusable pieces: GridView, CurrencyBar,
    │   │                         HeaderBar, BottomNav, Modal, Toast,
    │   │                         Button, SettingsModal, LoadingScreen
    │   └── screens/               Routed screens: MainScreen,
    │                              UpgradesScreen, AchievementsScreen,
    │                              MissionsScreen
    ├── utils/                    Pure, stateless helper functions
    └── config/                   Engineering constants + feature flags
```

See `docs/ARCHITECTURE.md` for the full data-flow diagram and a guide to
extending each system (adding items, upgrades, achievements, missions,
or screens) without touching unrelated code.

## Design principles

- **No frameworks.** Every DOM update goes through a small hyperscript-style
  helper (`ui/Renderer.js`'s `h()`), not React/Vue/a virtual DOM. Components
  hold direct references to the DOM nodes they update repeatedly, so
  currency counters ticking 20×/second don't cause unnecessary re-renders.
- **State flows one way.** `GameState.update()` is the only place gameplay
  data changes. Every system reads state, decides what should happen, and
  calls `update()` — nothing mutates state directly.
- **Systems talk through events, never directly.** `MergeSystem` doesn't
  know `AchievementSystem` exists. It emits `merge:completed`;
  `AchievementSystem` listens. This is what lets new features get added for
  years without rewriting old systems.
- **Content is data, not code.** Adding a new mergeable item, upgrade,
  achievement, or mission means adding an entry to a `data/*Definitions.js`
  file — never touching the system that interprets it.
- **Fixed-timestep simulation.** The game loop simulates at a fixed 20Hz
  regardless of render framerate, which is what makes offline-progress math
  consistent with online play (see `core/GameLoop.js` and
  `core/OfflineProgress.js`).

## Browser support

Targets evergreen browsers (Chrome, Firefox, Safari, Edge — current and
previous major version) on both mobile and desktop. Uses standard, widely
supported web platform features only: ES6 modules, the Web Audio API,
`localStorage`, CSS custom properties, and the Web Animations API
(`element.animate()`). No polyfills are bundled or required.

## Browser storage note

Save data lives in `localStorage` under the key `mergeEmpire.save.v1`
(plus an automatic backup slot). Clearing site data/cookies for this page
will erase progress. Use the **Export Save** button in Settings to copy a
JSON backup of your save to the clipboard.

## License

This is a project foundation intended for further development. No license
has been chosen yet — add one appropriate to your intended use before
distributing.
