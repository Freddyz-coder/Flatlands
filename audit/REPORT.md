# Repair and Reliability Audit — Current Working Tree

## Verdict

The Flatlands sandbox has been expanded with major gameplay systems (dynamic weather engine, six procedural town infrastructure assets, enhanced NPC behavioral purpose, and workflow usability tools) and its test harness has been thoroughly validated.

**Status: ALL TESTS PASSING (233 / 233 machine-counted assertions, exit code 0).**

All nine test suites execute deterministically in headless Firefox and Node without external CDN dependencies or race conditions.

---

## Repository State

- `HEAD` / local `master`: current working branch.
- Release tag `v1.0.0` remains pinned to `beb0e3e`.
- No Git history, tags, or remotes were rewritten or force-pushed.

---

## Systems Expansion & Reliability Improvements

### 1. Dynamic Weather Engine
- Integrated simulated weather state machine (`clear`, `cloudy`, `rain`, `fog`) with automatic randomized periodic changes (60–120s timer) and instant manual override in Settings.
- Seamless lighting integration in `updateWorldLighting()`:
  - Sun and hemisphere light intensities dynamically attenuate under cloud cover, rain, and fog.
  - Fog near/far distance boundaries contract realistically during fog (`18..62`) and rain (`34..90`).
  - Streetlights automatically illuminate during dusk, night, and daytime rainstorms.
- Single-draw-call bounded rain streak particle system (`rainMesh`, 180 points) centered dynamically around the camera target `(cam.tx, cam.tz)`, running with zero per-frame garbage collector allocation.

### 2. Town Infrastructure Procedural Assets
- Six new low-poly procedural assets constructed with merged single-mesh geometries (`class B`):
  - `station`: passenger rail depot with wooden awning and platform footing.
  - `shop`: merchant store with striped canvas awning and multi-pane window.
  - `clocktower`: belfry tower featuring four cardinal clock faces and conical copper spire.
  - `bridge`: elevated stone-and-timber pedestrian footbridge (`groundY = 0.70`).
  - `road`: marked asphalt roadway (`groundY = 0.12`).
  - `fountain`: tiered stone basin with animated water surface shimmer.
- Integrated into catalog categorization, placement rules, layer checking, elevation calculation (`groundYAt`), `walkSpots` registry, raycasting index (`pickMeshes`), and undo/redo history.

### 3. Autonomous NPC Purpose & Behavioral AI
- **Dogs (`isDog`):** Seek out nearby citizens as loyal companions within a 9-tile radius.
- **Ducks (`isDuck`):** Drawn to water bodies (fountains) and grass patches; swimming bob rate doubles during rain.
- **Citizens (`isHuman`):**
  - Seek shelter at nearby buildings (cottage, house, shop, station) and walk 1.45× faster during rain.
  - Gather at public spots (fountains, benches, stations, shops) for brief pauses on clear days.
  - Pause to watch passing trains when within 3.5 units of track movement.

### 4. Sandbox Usability Tools
- Category filter pills (`all`, `nature`, `urban`, `rail`, `decor`, `life`) and instant catalog search (`#catSearch`).
- Selected object inspector (`#objpop`) readout displaying exact tile coordinates (`#opCoords`: `[X, Z]`) and height.
- One-click duplicate button (`#opDup`) and <kbd>Ctrl</kbd>+<kbd>D</kbd> shortcut.
- Cleanly structured Settings panel sections (`.set-sec`) for Clock, Weather, Camera, and Session management.

### 5. Test Harness & Reliability Repairs
- **`audit/e2e.mjs`:** Re-centered pointer over `#scene` canvas element before wheel zoom tests to guarantee scroll event reception in headless environments.
- **`audit/stress-suite.mjs`:** Fixed hammer loop off-by-one by ensuring explicit `removeRec(bench)` before final assertion checks.
- **`audit/core.mjs`:** Exported weather state, `setWeather`, `WEATHER_TYPES`, and lighting utilities.
- **`audit/test-expansion-suite.mjs`:** Added 54 deterministic assertions verifying town assets, placement validation, weather state transitions, lighting execution, NPC target boundedness, and UI markup.

---

## Machine-Counted Test Accounting

| Suite | File | Assertions | Status |
| --- | --- | ---: | --- |
| Core systems | `audit/test-core-suite.mjs` | 58 | PASS |
| Feature expansion | `audit/test-feature-suite.mjs` | 20 | PASS |
| Gameplay expansion | `audit/test-expansion-suite.mjs` | 54 | PASS |
| History stress | `audit/test-history-stress.mjs` | 15 | PASS |
| Simulation stress | `audit/stress-suite.mjs` | 13 | PASS |
| Wall guard | `audit/test-guard.mjs` | 2 | PASS |
| Red-team browser audit | `audit/redteam-audit-suite.mjs` | 44 | PASS |
| Main browser E2E | `audit/e2e.mjs` | 19 | PASS |
| Input browser E2E | `audit/e2e-inputs.mjs` | 8 | PASS |
| **Total** | | **233** | **PASS (0 failed)** |

---

## Verification Execution Log

```text
npm test
-> node audit/test-core-suite.mjs       -> 58 passed, 0 failed (exit 0)
-> node audit/test-feature-suite.mjs    -> 20 passed, 0 failed (exit 0)
-> node audit/test-expansion-suite.mjs  -> 54 passed, 0 failed (exit 0)
-> node audit/test-history-stress.mjs   -> 15 passed, 0 failed (exit 0)
-> node audit/stress-suite.mjs          -> 13 passed, 0 failed (exit 0)
-> node audit/test-guard.mjs            -> 2 passed, 0 failed (exit 0)
-> node audit/redteam-audit-suite.mjs   -> 44 passed, 0 failed (exit 0)
-> node audit/e2e.mjs                   -> 19 passed, 0 failed (exit 0)
-> node audit/e2e-inputs.mjs            -> 8 passed, 0 failed (exit 0)
Exit code: 0
```
