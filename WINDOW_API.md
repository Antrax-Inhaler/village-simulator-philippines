# Window API

Mini Bayan has no bundler and no framework — modules talk to `index.html`'s
markup (and to each other, in a few places) through properties attached to
`window`. This file is the single source of truth for that surface: every
`window.X = ...` assignment in the codebase, who owns it, and what it's for.

**Keep this updated.** When you add a new `window.X = ...`, add a line here
in the same commit. When you delete one, delete its line here too. A stale
entry is worse than none — it sends the next person hunting in the wrong file.

Conventions used throughout the codebase:
- A leading underscore (`window._VS`, `window._launchMissile`) marks an
  internal/engine-facing property — not meant to be called from `onclick=""`
  HTML attributes, only from other modules.
- No underscore (`window.showMsg`, `window.openShop`) usually means it's
  called directly from an `onclick=""` attribute in `index.html`, or is a
  small stable API other modules are expected to depend on.
- Most call sites guard with `typeof window.X === 'function'` before calling,
  since load order across ~10 independent `<script type="module">` tags
  means a callee may not exist yet on the very first frames.

## Core game state (main.js)

main.js itself now only sets the handful of `window.X` properties tied
directly to its own module-scoped mutable state (viewport size, camera
zoom, pause flags) or to boot-time handoff. Everything that's really "an
action the rest of the app can call into the game" — save/load, spawn,
policy, tax, missiles, debt — was pulled out into **main/windowApi.js**
(see the next section) specifically so this list wouldn't require reading
main.js's whole update loop to find. If you're hunting for a `window.X`
and it's not in this main.js section, check "Game actions" below before
anywhere else.

| Property | Purpose |
|---|---|
| `window._VW`, `window._VH` | Current canvas viewport width/height. |
| `window._camZoom` | Current camera zoom, mirrored each frame for modules that don't import `render/camera.js` directly. |
| `window.pauseMainGame`, `window.resumeMainGame` | Called by `attack/attack_controller.js` when the attack screen opens/closes, so the two canvases never run their update loops simultaneously. |
| `window._unlockedBuildingTypes` | Array of building keys unlocked via rank-up (`_onRankUp` in main.js). Read by the shop catalogue. |
| `window._savedPlayerGold`, `window._savedPlayerRice`, `window._savedCorruptionHistory` | One-shot handoff values used only during `initPersonalFinance()` at boot/load; set to `undefined` immediately after. |
| `window._minibayanInit` | Set by main.js to the game-boot function. **Note:** `ui/audioSystem.js` installs a `get`/`set` trap on this property before main.js ever assigns it, so setting it also wires up "stop splash music → start BGM" as a side effect. If you ever need to bypass that, you'd have to change the trap, not this assignment. |
| `window._minibayanAutoLoad` | Handshake flag: `ui/splashScreen.js` sets it (true = Continue, false = New Game) right before calling `_minibayanInit`; main.js reads it once in its `DOMContentLoaded` handler and resets it to `undefined`. |

## Game actions (main/windowApi.js)

Everything here is installed by one call — `installWindowApi(deps)` — made
once from `init()` in main.js. `deps` is the only bridge back into main.js's
module-scoped state (the live `VS` object, plus accessor closures for
`dayCount`, `gameMode`, and the canvas element, since those are plain
`var`s in main.js and can't be imported/reassigned across module files
directly). Everything else this file needs, it imports directly from the
same subsystem modules main.js does. **If you add a new window action that
belongs conceptually with these, add it here, not back into main.js** —
that's the whole point of the split.

| Property | Purpose |
|---|---|
| `window._VS` | The entire live game-state object. Read by nearly every UI module and the inline HTML side-panel/settings scripts. |
| `window.showMsg` | Toast notification function (`ui/notifToast.js`, re-exported). Used everywhere. |
| `window.spawnVillager`, `window.setMode`, `window.setSpeed`, `window.openShop`, `window.softPan`, `window.triggerProtest`, `window.openExpand`, `window.purchaseZone`, `window.isZoneUnlocked`, `window.ZONE_DEFS` | Thin wrappers around internal game functions, called from `onclick=""` in `index.html`. |
| `window.getPolicyState`, `window.activatePolicy`, `window.deactivatePolicy` | Policy panel actions (called from `ui/sidePanelEngine.js`'s policy tab). |
| `window.setTaxRate`, `window.getTaxRate` | Tax rate get/set, called from the tax side panel. |
| `window.triggerSave`, `window.triggerLoad` | Save/Load buttons in the settings modal. |
| `window.openRankModal` | Also re-exported directly by `ui/rankModal.js` — both assignments point at the same function; harmless double-definition, not two implementations. |
| `window._makeDebtPayment`, `window._takeLoan`, `window._getMaxLoanAmount`, `window._getInterestRate`, `window._getDebtSummary` | Debt/loan actions, called from `ui/sidePanelEngine.js`'s tax panel. Thin wrappers around `resources/economy.js`. |
| `window._getRepairCost` | Building repair cost lookup (`buildings/wreckBuildings.js`, re-exported). |
| `window._launchMissile`, `window._cancelMissile`, `window._getMissileTracking`, `window._processMissileImpacts` | Missile warfare actions, called from `attack/attack_controller.js` and the missile/scout panels. |
| `window.debugShowReport`, `window.debugShowDayCount`, `window.debugAddMissiles` | Console debug helpers, not used by the UI. |

## Audio (ui/audioSystem.js)

| Property | Purpose |
|---|---|
| `window.SOUNDS_ENABLED` | Dev mute-all flag. Also read directly (as a bare global) by `ui/dailyReport.js`. |
| `window.setBackgroundVolume` | Called by both volume sliders (settings modal). |
| `window.updateBgmForTime` | Switches day/night BGM track based on `VS.time`; called from `window.updateCenterTime` every UI tick. |
| `window.switchToBattleMusic`, `window.resumeRegularMusic`, `window.isBattleMusicActive` | Battle-music crossfade, called from `attack/attack_controller.js` on attack-screen open/close. |
| `window.playSound`, `window.stopSound`, `window.stopAllCalamitySounds`, `window.setSfxVolume` | SFX engine, called from many modules (`government/events.js`, `input/input.js`, `ui/dailyReport.js`, etc.) |
| `window.updateCenterTime` | Updates the on-screen clock/day text; called every ~100ms from main.js's UI tick. Also the trigger point for BGM day/night switching. |

## Settings (ui/settings.js)

| Property | Purpose |
|---|---|
| `window.openSettingsPanel`, `window.closeSettingsPanel` | Settings modal open/close, called from `onclick=""` in `index.html`. |

## Side panels (ui/sidePanelEngine.js)

| Property | Purpose |
|---|---|
| `window.openSidePanel`, `window.closeSidePanel`, `window.refreshSidePanel` | Open/close/refresh any of the 5 FAB side panels (requests, log, policy, tax, trade). |
| `window.openPolicy`, `window.openTaxPanel` | Convenience aliases for `openSidePanel('policy' \| 'tax')`. |
| `window.spTaxSlider`, `window.spApplyTax` | Tax panel slider + apply button. |
| `window.spMakePayment`, `window.spTakeLoan` | Debt panel payment/loan buttons. |
| `window.fulfillTradeContract`, `window.importResource` | Trade panel actions (dynamically `import()`s `resources/trade.js`). |
| `window._tradeImportAmount` | Remembers the last-typed import quantity per resource, across panel re-renders. |

## Requests panel (ui/requestPanel.js)

| Property | Purpose |
|---|---|
| `window._renderRequestsToSidePanel` | Renders the requests-panel HTML; called by `ui/sidePanelEngine.js`. |
| `window._wireRequestButtons` | Attaches click handlers to the ayuda/ignore buttons after each render. **Call it by this exact name** — `ui/sidePanelEngine.js` used to call the non-existent `window.wireRequestButtons` (no underscore), which silently no-op'd behind a `typeof === 'function'` guard, so the requests panel's buttons never got wired up after the first render. Fixed; don't reintroduce the mismatch. |

## Attack screen (attack/attack_controller.js)

| Property | Purpose |
|---|---|
| `window.openAttackScreen` | Entry point, called from the "LUSUBIN" button in `index.html`. |
| `window._atkClose`, `window._atkNewVillage`, `window._atkChg`, `window._atkSelectDeploy`, `window._atkLusubin` | Attack-screen HUD button handlers, called from `onclick=""` in `index.html`. |
| `window._enterScoutMode`, `window._getCapturedCoords`, `window._calculateMissileETA`, `window._previewMissileTargets`, `window._openMissilePanel` | Cross-talk with the scout/missile panels. |
| `window.showMissilePanel` | Re-declared here as a thin forwarder; the real implementation lives in `ui/missilePanel.js`. |

## Missile / scout panels (ui/missilePanel.js, ui/scoutPanel.js)

| Property | Purpose |
|---|---|
| `window.showMissilePanel`, `window.closeMissilePanel`, `window.updateMissilePanel` | Missile targeting panel lifecycle. |
| `window.showScoutPanel`, `window.closeScoutPanel`, `window.updateScoutPanel` | Scout/recon panel lifecycle. |

## Rank modal (ui/rankModal.js)

| Property | Purpose |
|---|---|
| `window.openRankModal`, `window.closeRankModalInstance` | Rank progression modal. |

## Rank-up banner (ranking/rankingSystem.js)

| Property | Purpose |
|---|---|
| `window.closeRankUpBanner` | Close button inside the rank-up banner's own generated HTML (`onclick="closeRankUpBanner()"`). |

## Personal finance (government/personalFinance.js)

| Property | Purpose |
|---|---|
| `window.playerGold`, `window.playerRice` | The *player's* personal wallet (distinct from `VS.res`, the village treasury). |
| `window.getPersonalWealth`, `window.getCorruptionTotal`, `window.addPersonalIncome`, `window.deductPersonalFunds` | Personal-finance helpers, used by `ui/dashboard.js` and the corruption system. |

## Trade / expansion panels (ui/tradePanel.js, ui/expansionPanel.js)

| Property | Purpose |
|---|---|
| `window.openTradePanel`, `window.closeTradePanel` | Legacy trade panel (separate from the FAB trade tab in `ui/sidePanelEngine.js` — both exist; the FAB one is what's actually wired into `index.html` today). |
| `window.renderExpandContent` | Zone-expansion panel content renderer. |

## Building lifecycle (ui/drawer.js)

| Property | Purpose |
|---|---|
| `window.onHallUpgradeComplete` | Called from main.js's update loop when the Main Hall finishes an upgrade construction. |

## Dashboard (ui/dashboard.js)

| Property | Purpose |
|---|---|
| `window._sbTogglePanel`, `window._sbToggleSection` | Collapsible dashboard sections, called from `onclick=""`. |
| `window.updateWasteDisplay` | Waste indicator refresh. |

## Villager quips (villagers/villagerQuips.js)

| Property | Purpose |
|---|---|
| `window._fullscreenQuipCooldown` | Rate-limits a specific speech-bubble quip; internal cooldown timestamp, not called externally. |

## Missile warfare backend (attack/missileWarfare.js)

| Property | Purpose |
|---|---|
| `window.generateDefenderVillage` | Generates a procedural enemy village for the attack screen. |

## Known gaps

- **`window.showEventModal` is referenced but never defined.** `main.js` and
  `ui/sidePanelEngine.js` both call it (unguarded, in the log panel's
  `onclick=""`) when a calamity/event log entry has detail worth showing,
  but no module anywhere assigns `window.showEventModal`. Clicking a
  detailed log entry currently throws in the console and does nothing.
  Needs either a real event-detail modal built somewhere (`ui/` seems like
  the right home) or the dead call sites removed if the feature was cut.
