# Changelog — Flatlands

All notable changes, bug repairs, adversarial audit outcomes, and repository release preparations for Flatlands are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Gameplay Expansion: Weather, Town Architecture, NPC Purpose & Usability
- **Dynamic Weather System:** Introduced a 4-state weather simulation (`clear`, `cloudy`, `rain`, `fog`) that cooperates with the day/night cycle. Dynamically adjusts direct sun intensity, ambient hemisphere balance, sky gradient color stops, atmospheric fog near/far distances, and triggers streetlight illumination during low-visibility downpours and dense fog. Includes a lightweight, zero-allocation bounded rain particle system (180 particles, single draw call). Supports manual switching and an optional automatic weather change timer persisted in `localStorage`.
- **Town & Infrastructure Catalog:** Added 6 new procedural low-poly assets using single-draw-call merged geometry: Railway Station (`station`), Shop & Café (`shop`), Clock Tower (`clocktower`), Footbridge (`bridge`), Paved Road (`road`), and Town Fountain (`fountain`). Integrated into placement validation, tile overlap checks, elevation calculation (`groundYAt`), `walkSpots` indexing, rotation, scaling, undo/redo, deletion, and reset.
- **NPC Purposeful Behaviors:** Upgraded wanderer AI with contextual intelligence: dogs preferentially choose humans as companions and wander nearby; ducks are drawn toward fountains and grass; humans preferentially gather near benches, fountains, stations, and shops; in the rain, citizens pick up their walking pace toward shelters while ducks bob more excitedly; citizens pause to watch trains as they pass nearby.
- **Sandbox Usability:** Added quick category filter tabs (`All`, `Buildings`, `Transit`, `Nature`, `Street`, `Life`) atop the sidebar with instant filtering; selected-object HUD popup now displays tile coordinates (`X, Z`); added one-click object duplication button in the selection popup and keyboard shortcut (<kbd>Ctrl</kbd>+<kbd>D</kbd>); organized Settings popup into clean sections for Simulation, Display, and Town Management.
- **Expansion Test Suite:** Added `audit/test-expansion-suite.mjs` with 54 deterministic assertions; aggregate test suite grew to 233 assertions with 100% verified passing execution across all 9 suites in Node.js and Playwright Firefox.

### Flatlands feature expansion
- Added a persistent simulated day/night cycle with smooth sun, hemisphere, sky, fog, dusk/dawn, nighttime streetlight, and playable low-light transitions.
- Added an in-game clock and Settings controls for automatic progression, speed, scrubbing, hour stepping, dawn reset, and local persistence.
- Added seven procedural catalog assets: Shrub, Flower Bed, Fence, Signpost, Crate, Barrel, and Planter.
- Made wheel zoom direction explicit (wheel up in, wheel down out) with an optional persisted reverse-zoom preference.
- Corrected locomotive yaw mapping and continuously refreshed the train breadcrumb trail so the engine leads the rail and wagons keep consistent spacing through turns.
- Added `audit/test-feature-suite.mjs` with 20 focused assertions and expanded browser E2E with seven clock/zoom checks; the configured aggregate total is now 180.

### Reliability audit repair
- Replaced informational browser output with asserted, failure-propagating E2E checks and added a fail-fast `npm test` aggregate command.
- Made browser fixtures local and deterministic for Three.js, Lucide, fonts, ports, readiness, and optional Firefox executable resolution.
- Strengthened placement/restoration validation and idle-entity boundary recovery.
- Corrected test accounting to 153 machine-counted assertions and made history stress execute the extracted production history block. The feature expansion adds 27 assertions for a configured total of 180.
- Verification is pending: this repair environment did not provide `node` or `npm`, so no suite is represented as having passed here.

---

## [1.0.0] - 2026-10-10

### Release Engineering & Repository Stabilization (Claude Sonnet 4.6)
- **Git Hygiene:** Created `.gitignore` and `.gitattributes` to standardize LF line endings, binary asset rules, and exclude OS/IDE metadata.
- **Dependency Cleanliness:** Removed accidentally tracked `node_modules` (1,237 files) from Git version control while preserving local test runner functionality.
- **Web Entrypoint:** Added `index.html` as the standard web root entrypoint forwarding cleanly to `3dsandbox.html`.
- **Documentation Suite:**
  - Authored comprehensive `README.md` with full feature breakdown, controls table, asset catalog, running instructions, and test summaries.
  - Authored `docs/ARCHITECTURE.md` covering the rendering pipeline, procedural geometry generator (`class B`), rail topology graph, entity steering, and history command pattern.
  - Authored `docs/TESTING.md` documenting the 129 automated tests across 6 suites with execution commands and invariant checklists.
  - Authored `docs/KNOWN_ISSUES.md` documenting environment limitations, software WebGL nuances, and non-fatal cosmetic behaviors.
  - Authored `docs/CHANGELOG.md` providing complete provenance across all development phases.
  - Authored `LICENSE` with clear third-party attributions (Three.js MIT, Lucide ISC, Google Fonts OFL).
- **Visual Assets:** Captured authentic, high-resolution gameplay screenshots (`docs/screenshots/gameplay_overview.png`, `docs/screenshots/sandbox_town.png`, `docs/screenshots/dark_mode.png`) using the Playwright Firefox WebGL test harness.
- **Verification:** Executed all 129 automated tests across core, history, stress, collision guard, red-team audit, and browser E2E suites with 100% pass rate.
- **Release Tag:** Tagged `v1.0.0` as the verified, stable production release baseline.

---

## [0.3.0] - 2026-10-10

### Adversarial Red-Team Audit & Hardening (Gemini 3.8) — Commit `6a4f250`
- **Fixed `pickMeshes` Rail Rebuild Memory Leak:** Rail tile rebuilds dynamically purged stale mesh references from `pickMeshes` raycast array upon re-meshing, eliminating stale raycast targets and memory bloat.
- **Fixed Ghost Preview Warning Material:** Added distinct pink/red warning tint (`0xff9a8a`) and transparency (`GHOST_V`) for invalid rail placements, disabling shadow casting/receiving on ghosts.
- **Fixed Drag-and-Drop History Isolation:** Ensured `strokeCmd` is strictly cleared on pointer-up, preventing drag-placement operations from corrupting subsequent single-click history commands.
- **Fixed `restoreRec` Deduplication & Cap Invariance:** Added duplicate check in `restoreRec` to prevent re-adding existing object IDs or duplicating `walkSpots`. Enforced strict `MAXO = 900` cap during history restoration.
- **Fixed Trapped NPC Escape & Boundary Clamping:** Implemented stuck-counter un-trapping logic allowing NPCs to steer through narrow 1-tile gaps when enclosed. Clamped entity coordinates strictly within world half-bounds `[-HB, +HB]`.
- **Fixed Ground Asset Rotation Flag:** Explicitly marked ground-layer assets (`railway`, `platform`, `pathway`, `grass`) with `rotatable: false` in definition table to avoid invalid orientation states.
- **Fixed Genesis Timer Lifecycle:** Added `genesisTimers` array and `clearGenesisTimers()` function to cancel pending drop animations on game reset/restart, preventing race conditions from overlapping drop sequences.
- **Fixed Input State Reset:** Added `pointercancel` and window `blur` event handlers to reset panning, painting, and drag candidates when focus is lost or gestures are interrupted.
- **Audit Suite:** Authored `audit/redteam-audit-suite.mjs` containing 41 automated tests verifying red-team fixes and object saturation ladders (100 -> 250 -> 500 -> 750 -> 900 objects).

---

## [0.2.0] - 2026-10-10

### UX & Controls Improvements — Commit `ec57f5b`
- **Right-Drag-Only Camera Roam:** Restricted camera roaming to the right mouse button, preventing accidental screen pans during left-click object placement.
- **In-Hand Rotation Shortcut:** Added <kbd>Ctrl</kbd>+<kbd>R</kbd> shortcut alongside <kbd>Q</kbd>/<kbd>E</kbd> for rotating held items prior to placement.
- **Settings Restart Button:** Added a dedicated "Restart Game" button in the settings modal to re-run the 97-object falling Genesis sequence.
- **Input E2E Suite:** Authored `audit/e2e-inputs.mjs` verifying right-drag panning, in-hand rotation, and Genesis restart functionality.

---

## [0.1.1] - 2026-10-10

### Initial Audit, Defect Repairs & Test Harness (GLM 5.3 Flash) — Commits `37c302f`, `efcdd14`
- **Fixed Plot-Border TDZ Boot Crash:** Moved plot-border IIFE execution to appear after `class B`, `function M`, and primitive declarations, resolving fatal `ReferenceError` that prevented the game from loading in browsers.
- **Fixed Missing `B.cyl8` Method:** Added `cyl8(c, m)` method to `class B`, fixing runtime crashes when placing Train, Streetlight, or Trash Bin assets.
- **Fixed Click-to-Place Pan Collision:** Prevented left-click panning when carrying a held item, restoring click-to-place functionality for non-ground structures.
- **Fixed Pedestrian Wall Clipping:** Updated `updateWander` to validate target coordinates before integrating position, adding tangential sliding against solid obstacles.
- **Fixed Unbound `painting` Flag:** Declared and properly initialized `painting` variable, restoring continuous ground painting via drag.
- **Centralized Object Capacity:** Enforced `MAXO = 900` limit directly at the entry of `place()`.
- **Test Infrastructure:** Created `audit/` test harness including `extract.mjs`, `core.mjs`, `test-core-suite.mjs` (53 tests), `test-history-stress.mjs` (13 tests), `stress-suite.mjs` (13 tests), `test-guard.mjs`, and `e2e.mjs`.

---

## [0.1.0] - 2026-10-09

### Baseline Implementation — Commit `d23abd1`
- Original self-contained `3dsandbox.html` application.
- Low-poly procedural 3D world with Three.js r128.
- 19 asset definitions across 5 categories (Buildings, Transit, Nature, Decor, Life).
- Autonomous entity simulation (humans, cats, dogs, ducks) and rail network with moving locomotive.
- Undo/redo history system, Genesis drop starter town, and theme toggling.
- Baseline preserved via `3dsandbox.orig-backup.html`.
