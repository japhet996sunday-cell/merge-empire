# Merge Empire: Idle Tycoon — Architecture

Status: **playable foundation**. Real content is authored and wired end to
end — 3 item families, 5 upgrades, 9 achievements, 6 daily missions — and
verified via both static import-graph checks and an executable runtime
smoke test. This document explains how the pieces fit together so new
content and features can keep being added without re-architecting.

## Data flow, end to end

```
User input (tap grid cell)
        │
        ▼
GridView / other UI component
        │  calls into a system, never mutates state itself
        ▼
Gameplay System (e.g. MergeSystem.attemptMerge)
        │  reads current state via gameState.getState()
        │  validates the action
        │  calls gameState.update(draft => { ...mutate... })
        ▼
GameState
        │  applies mutation
        │  emits 'state:changed' + 'state:dirty' on EventBus
        │  notifies subscribers (UIManager)
        ▼
   ┌────┴─────────────────┬───────────────────────┐
   ▼                       ▼                       ▼
UIManager           SaveManager              Other Systems
(re-renders          (debounced             (Achievement/Mission/
 active screen)        autosave)              Audio/Animation —
                                               all react via events
                                               the acting system
                                               also emitted, e.g.
                                               'merge:completed')
```

The rule that makes this scale: **a system never calls another system's
internals directly to react to something.** It emits an event. This is why
you can add, say, a "combo streak" system in month six without touching
MergeSystem, EconomySystem, or AudioSystem at all — it just listens for
`merge:completed` like everyone else.

## Where things live, and why

| Concern | Location | Notes |
|---|---|---|
| What data looks like | `state/StateSchema.js` | Single source of truth for save shape |
| How data changes safely | `state/GameState.js` | The only mutation gateway |
| How data changes over app versions | `state/Migrations.js` | One function per schema version bump |
| Reading derived values | `state/Selectors.js` | Never store what you can derive |
| Gameplay rules | `systems/*.js` | Pure-ish, take `gameState` as an argument |
| Content (numbers, names, chains) | `data/*Definitions.js` | Currently empty registries + schema docs |
| Engineering constants | `config/Constants.js` | Timing, storage keys — NOT balance numbers |
| DOM rendering | `ui/*` | Never contains gameplay rules |
| Cross-cutting reusable logic | `utils/*` | Pure functions, no state |
| Composition / boot order | `main.js` | The only file that wires everything together |

## Extension points for future work

- **New mergeable item chain** → add entries to `data/ItemDefinitions.js`.
  No code changes needed in MergeSystem.
- **New upgrade** → add an entry to `data/UpgradeDefinitions.js`, wire its
  `effectType` into whichever system reads effect values
  (EconomySystem/ProductionSystem's `getMultiplier`).
- **New achievement** → add an entry to `data/AchievementDefinitions.js`
  with a `readStat` function. AchievementSystem's event-driven recheck
  picks it up automatically.
- **New screen** (e.g. a Prestige screen) → build a module with
  `mount/unmount/update`, register it in `main.js` via
  `uiManager.registerScreen(...)`.
- **New currency** → add a default entry in `StateSchema.createDefaultState()`
  currencies map; EconomySystem handles arbitrary currency IDs generically.
- **Cloud save / account sync** → SaveManager is the only file that touches
  localStorage; swapping in a network-backed implementation only requires
  changing that one file's internals, not its public contract.

## Content currently shipped

Every `data/*Definitions.js` registry is populated with real content, and
every system that reads it (`MergeSystem`, `ProductionSystem`,
`UpgradeSystem`, `AchievementSystem`, `MissionSystem`) is fully wired
against that data rather than stubbed:

- **Items**: 3 merge families, 17 items total — `coin` (tiers 1–6, starts
  unlocked), `tree` (tiers 1–6), `gem` (tiers 1–5, premium currency).
- **Upgrades**: 5 real upgrades with working cost curves — gold multiplier,
  gem refinement, grid expansion, spawn speed, offline efficiency.
- **Achievements**: 9 real achievements (including one hidden/secret one)
  with working unlock detection against `state.statistics`.
- **Missions**: 6 real missions in the daily rotation pool, 3 assigned per
  day with working progress tracking and claimable rewards.
- **Audio**: real procedurally synthesized SFX via Web Audio oscillators
  (no external audio files required to hear sound).

## Two real bugs found via runtime testing (not just static analysis)

Both were caught by an executable smoke test that actually ran the
gameplay systems together, not by reading the code:

1. **`GridSystem.expandGrid` / grid-expansion upgrade logic filled new grid
   cells with `null`** instead of real `{ cellId, itemId: null, tier: 0 }`
   cell-shell objects. This would have silently broken `MergeSystem`/
   `GridSystem` lookups (`cells.find(c => c?.cellId === ...)`) on any
   newly-expanded row. Fixed in both `GridSystem.expandGrid` and
   `StateSchema.createDefaultState`'s initial grid.
2. **`MissionSystem.checkDailyReset` never assigned missions to a
   brand-new game.** The reset check only fired on a UTC-day boundary
   change, which is correct for returning players but left `missions.active`
   permanently empty for a fresh save (whose `lastDailyResetAtMs` is set to
   "now" at creation, so no day boundary has passed yet). Fixed by also
   triggering an initial assignment when `active` is empty.

A third gap (not a bug, but a missing wire-up) was also caught this way:
nothing was calling `GridSystem.spawnRandomItem` during play, which would
have left the board permanently empty after the initial two starter items.
`main.js`'s game loop now spawns on a timer driven by
`BalanceConfig.baseSpawnIntervalSeconds`, adjusted by the `spawn_speed`
upgrade's effect value.

## Verified before handoff

- Every module (46 files) resolves and executes cleanly under Node's ESM
  loader with DOM/storage stubbed — catches import typos, circular-import
  deadlocks, and structural JS errors that per-file syntax checks miss.
- All 109 relative import statements across the codebase were statically
  verified to resolve to real files on disk.
- A runtime smoke test exercised the real modules together against real
  content: grid spawn → merge (using actual item chain data) → production
  rate calculation (verified against the exact `BalanceConfig` tier-scaling
  formula) → upgrade purchase → the `EconomySystem`/`UpgradeSystem`
  circular-dependency injection (verified the multiplier is actually
  applied to a currency grant) → achievement auto-unlock → daily mission
  assignment → grid-expansion upgrade actually resizing the grid. All
  assertions passed.
- Every file referenced by `index.html` (7 stylesheets + `main.js`) was
  confirmed to exist on disk.

## Extending further

The architecture doesn't change as you add content — only `data/*.js`
registries grow. See "Extension points for future work" above for the
mechanics of adding a new item chain, upgrade, achievement, mission, or
screen.

Natural next features, in rough priority order for a merge/idle tycoon's
early retention loop:
- A prestige/rebirth system (`BalanceConfig.prestigeConversionRate`
  already exists as a placeholder constant for this).
- Push notifications or a service worker for offline-progress reminders.
- A "sell item" action on grid cells (every item already has a
  `sellValue` in `ItemDefinitions`, just not wired to a UI action yet).
- Expanding the item roster's tier ceiling once early-game pacing is
  tuned against real playtesting data.
