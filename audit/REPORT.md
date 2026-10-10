# Repair and reliability audit — current working tree

## Verdict

The test infrastructure has been materially repaired and the feature expansion
adds a simulated clock, new procedural assets, explicit wheel zoom preference,
and train alignment repairs. This working tree is **not marked as test passed**:
the supplied environment has no `node` or `npm` executable, so every required
command stopped with exit code `127` before any suite could run.

## Initial repository state

- `HEAD` / local `master`: `beb0e3e` (`v1.0.0`)
- `origin/master`: `a238472`, one commit ahead; it changes only `LICENSE`.
- The release tag still resolves to `beb0e3e`; no commit, tag, branch, remote, or
  history was rewritten by this repair.

## Repairs

### Test reliability

- `audit/e2e.mjs` now machine-asserts startup, completed Genesis, HUD state, UI
  placement, undo, rail painting, and browser errors. It no longer exits `0`
  unconditionally.
- `audit/test-guard.mjs` now asserts both no wall occupancy and an escape through
  the intended opening, returning a nonzero status on either failure.
- The red-team ghost test drives `updateGhost` over a valid tile, blocks that same
  tile, then checks the real warning tint. It no longer assigns the expected tint
  itself.
- Browser suites share `audit/browser.mjs`: local ephemeral server ports, local
  pinned `three@0.128.0`, Lucide test stub, stripped cosmetic font requests,
  readiness conditions, and no hard-coded Firefox path. Set
  `PLAYWRIGHT_FIREFOX_EXECUTABLE` when `playwright-core` cannot locate Firefox.
- `npm test` is now a fail-fast aggregate command. Browser tests use bounded
  readiness waits instead of fixed startup sleeps.
- History stress now invokes the actual history block extracted from
  `3dsandbox.html`, not a hand-maintained copy.

### Confirmed game defects

- `place()` now rejects non-integer/non-finite coordinates and rotations, capacity
  overflow, collisions, invalid train locations, and any other invalid placement
  that `canPlace()` rejects. This closes API-level bypasses of UI placement rules.
- `restoreRec()` rejects missing, duplicate, over-capacity, and now-conflicting
  records; `removeRec()` is safe to call on missing records and reports success.
- `updateWander()` clamps an entity before idle/blocked handling, preventing an
  idle entity that enters with invalid coordinates from remaining beyond `HB`.

### Feature expansion repairs

- Added `worldTime` and `updateWorldLighting()` to coordinate the sun, hemisphere
  light, sky texture, fog, dusk/dawn colors, and shared streetlight bulb material.
- Added the HUD clock, persistent time controls, cycle-speed control, and a
  persisted optional reverse-wheel preference.
- Added seven procedural assets (`shrub`, `flowerbed`, `fence`, `sign`, `crate`,
  `barrel`, and `planter`) through the existing catalog and placement pipeline.
- Corrected train heading conversion for the locomotive's local `-X` front and
  refreshed the breadcrumb trail during movement so coupled wagons no longer
  wait for waypoint jumps to update.
- Added `audit/test-feature-suite.mjs` with 20 machine-counted assertions and seven browser E2E checks for the clock and wheel behavior.

## Test accounting

There are **180 machine-counted assertions**: 59 core, 20 feature expansion, 15 history, 13 stress,
2 wall guard, 44 red-team browser, 12 main browser E2E, and 8 input E2E. This is
an assertion total—not a count of scenarios, ticks, or console output.

## Verification attempted

All required commands were attempted in this environment:

```text
node audit/test-core-suite.mjs       -> 127 (node: command not found)
node audit/test-feature-suite.mjs    -> 127 (node: command not found)
node audit/test-history-stress.mjs   -> 127 (node: command not found)
node audit/stress-suite.mjs          -> 127 (node: command not found)
node audit/test-guard.mjs            -> 127 (node: command not found)
node audit/redteam-audit-suite.mjs   -> 127 (node: command not found)
node audit/e2e.mjs                   -> 127 (node: command not found)
node audit/e2e-inputs.mjs            -> 127 (node: command not found)
npm test                             -> 127 (npm: command not found)
```

`git diff --check` passed. Mutation verification, browser execution, performance
measurements, and GPU/memory measurements were not performed because Node/npm
are unavailable. The production page still references CDN Three.js, Lucide, and
fonts; only the test fixture is made deterministic to avoid altering the shipped
bundle or third-party licensing surface.

## Remaining audit work

Run `npm test` in a Node environment with a Playwright Firefox build, then perform
a real-hardware Chrome and Firefox pass focused on WebGL context loss, thumbnail
renderer disposal, and long-duration simulation behavior.
