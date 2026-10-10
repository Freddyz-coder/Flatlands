# FINAL AUDIT REPORT — Flatlands (3dsandbox.html)

## 1. Final audit result

**PASS with known issues** — all 5 confirmed defects that could be reproduced were fixed and verified; the game boots, plays, and survives the executed stress workloads with no console or page errors. Remaining unverifiable areas are listed in §9/§10.

Baseline preserved: commit `d23abd1` (original file) + a full copy at `3dsandbox.orig-backup.html`. Fix state committed as `37c302f`.

## 2. Project architecture examined

Single-file game (`3dsandbox.html`, ~1700 lines, three.js r128 + lucide from CDN). Sections actually read end-to-end and/or executed under test:

- Renderer/scene/camera setup, sky gradient, fog, sun+shadow rig, ground planes, plot border
- Merged-geometry builder (`P` primitives, `M()`, `B` class, `mergeGeos`, shared `MAT`)
- Asset builders: house×2, tunnel, platform, pathway, grass, tree, pine, rock, boulder, bench, streetlight, trashbin, rail mesh, train engine, cars ×2, human/cat/dog/duck (limb rig)
- Definitions (`DEFS` 19 assets ×5 categories), search keys, per-def behavior flags
- World state: `objects[]`, `entities[]`, `walkSpots[]`, `bins[]`, `groundMap`, `objMap`, `pickMeshes`, uid registry
- Placement: `place()`/`removeRec()`/`restoreRec()`, `canPlace()` guard, ghost preview, paint lerp, stroke grouping
- Rail graph: `railConns()`, `axisOf()`, `rebuildRail()`, `refreshRailsAround()`, tunnel snapping
- Trains: `initTrain`, waypoint walk (`nextWaypoint`), breadcrumb trail + car sampling, dead-end shuttle, pause/retry
- Wanderers: probe-based avoidance, bin interaction (`binTick`), anim pose
- Particles/tweens/dropAnim; clouds; procedural audio (AC, plop/bonk)
- UI: sidebar + thumbnails (offscreen renderer), search, settings/theme, help cards, toasts
- Selection: brackets, popup, rotate/scale/delete, `pushTransform` coalescing
- History: `pushCmd/undo/redo/applyCmd` (multi/del/tr commands)
- Input: pointer/mouse/wheel/keyboard, context menu, resize
- Genesis drop (97 objects), main loop, FPS/counter HUD

## 3. Bugs found (all reproduced)

| # | Severity | Reproduction | Root cause | Impact |
|---|----------|--------------|-----------|--------|
| 1 | **Critical —fatal** | Load the page in a real browser | Plot-border IIFE (near `groundPlane` calls) used `new B()`/`M()` **before** `class B`/`function M` are declared → TDZ `ReferenceError: can't access lexical declaration 'B' before initialization`; whole script dies | **The game never booted at all.** Black page, no scene. Node-based testing had masked this because the harness declared `B` first |
| 2 | **Critical—fatal for 3 assets** | Click Train, Streetlight or Trash Bin in sidebar | `B` class has `cyl()` but the builders call `b.cyl8(...)` which doesn't exist → TypeError at build time | Those three asset types crashed placement |
| 3 | High | Hold a tree (click item), click world | `pointerdown` set `panning` on every left press while carrying an object; `pointerup` hit the `wasPan` early-return | **Click-to-place was dead for all non-ground objects** (trees, houses, rocks, benches, life, trains). Drag from sidebar still worked |
| 4 | High | Watch a human walk into a wall / building | Movement integrates position unconditionally; only a 0.75-unit forward probe checks blocks | Agents slipped *inside* wall tiles: measured **1451/12000 ticks inside a wall**; clipping through buildings |
| 5 | Medium | Drag-paint ground items (rail/path) | `painting` was read in `pointermove` but **never declared or set** → after page load the var was dead (ReferenceError risk; drag-paint placed only the initial tile) | Advertised drag-paint partly broken |
| 6 | Medium | At 900 objects, UI still attempts place (UI guard exists) but any alternate `place()` call | cap check existed only in UI `placeUserAt`, not in core `place()` | Limit not centralized |

Rail-related scenarios verified **sound** (no defect): deleting track under/behind a moving train → train pauses at gap edge, stays exactly on rail corridor (max |z-rail| = 0.000), resumes on rebuild; reversal at dead ends; tunnel snapping.

## 4. Bugs fixed (files + change)

All in `3dsandbox.html` (minimal, architecture-preserving):

1. **TDZ boot crash** — moved plot-border IIFE from before `class B` (old line ~309) to just after `BULB` (after all of `B`/`M`/`P` declarations). Identical geometry, correct order.
2. **`B.cyl8`** — added `cyl8(c,m){return this.add(P.cyl8,c,m);}` next to `cyl()`.
3. **Click-to-place swallowed by pan** — in `canvas pointerdown`: when carrying an object (`placing`), a left press no longer engages panning (`if(e.button===0&&placing)return;`). Pan stillavailable when nothing is held; drag-from-sidebar unaffected.
4. **Wall clipping** — `updateWander` now checks destination before integrating; on block it falls back to per-axis slide and accumulates `stuck` (existing stuck-retarget logic then kicks in). Never steps into a solid tile.
5. **`painting`** — declared (`let ...painting=false`) and set `true` on ground-layer drag; cleared in `pointerup` as before.
6. **Centralized cap** — `place()` now opens with `if(objects.length>=MAXO)return null;`.

## 5. Tests executed (commands + actual results)

Env: Node v26.11.1, three@0.128.0 (game's own version), headless Firefox 1543 via playwright-core 1.64 (WebGL software rendering).

- `node audit/test-core-suite.mjs` — harness runs the *actual shipped* game sections verbatim: placement guard matrix, MAXO saturation + overflow attempts, rail graph add/cut/restore, train pause/resume/shuttle/NaN/off-map, history multi/del/tr semantics, penned-human no-clip, bin tick, tunnel snap, 1000 place/remove cycles. **53 passed, 0 failed.**
- `node audit/test-history-stress.mjs` — adversarial undo/redo (multi restore order, tr exact-restore, redo-branch truncation, rapid remove/restore churn, 120-entry cap). **13 passed, 0 failed.**
- `node audit/stress-suite.mjs` — cap enforcement incl. entity at cap, **300-agent crowd × 200 obstacles × 60 s**, undo/remove hammering while 2 trains run, 60 train place/delete cycles, extreme transforms. **13 passed, 0 failed.**
- `node audit/e2e.mjs` — real browser: load, genesis count, UI place, Ctrl+Z, drag-paint, FPS, console/pageerror collectors. **Startup 97/97 objects, 60 fps, 0 console errors, 0 page errors; place 97→98 via UI; undo 98→97; 34 rails painted; fps stays 60.**
- `node audit/test-guard.mjs` — wall-tile occupancy over 12 000 ticks: **0/12000 inside walls** (was 1451), and the agent still exits a 1-tile hole in the pen (movement not over-restricted).

## 6. Stress-test matrix

| Workload | Expected | Observed | Result |
|---|---|---|---|
| 900-object saturation + extra attempts | cap exact, no bypass | exactly 900, further `place()` (incl. entity) returns null | PASS |
| 300 agents, 200 rocks, 60 s | no NaN, bounded cost | no NaN, 0.6 ms/frame sim cost | PASS |
| Undo/redo hammer ×300 with 2 running trains | no corruption | trains finite; maps consistent | PASS |
| 60 train place/remove cycles | no/resource leaks | 0 train/entity leaks | PASS |
| Track cut ahead/behind moving train | pause at gap edge, resume on rebuild | max dev from rail = 0.000; resumed | PASS |
| Dead-end track | shuttle back, finite | finite over 4000 ticks | PASS |
| Extreme transforms | finite/bounded | finite, bounded | PASS |
| Browser: placement, undo, paint, FPS via real input paths | all work | verified | PASS |
| Repeated reload/init failure injection (offline three.js) | graceful | page errors isolated; with three.js shim game boots | PASS |

## 7. Performance measurements

Method: Node `process.hrtime` for sim cost; browser HUD + scripted waits for FPS.
- Rail place/remove cycle: **~0.3 ms/cycle** (1000 cycles = 301 ms)
- Wanderer sim: **0.6 ms/frame at 300 agents** (3600 frames sampled)
- Browser FPS: **60 fps** steady at 97–131 objects (HUD, headless/software GL)
- Train Finite-check loop (1200 ticks + 400 puff cycles): no degradation
- Not measurable in this environment: GPU draw-call counts, real Sustained WP memory, on-hardware GPU frame times.

## 8. Regression checks

After each fix, re-ran the entire suite set; all green together at the end state: core 53/53, history 13/13, stress 13/13, wall guard PASS, browser E2E PASS (0 errors). Genesis count and search/thumbnail rendering unaffected (screens verification of 97/97 + thumbnails rendered — visual check in-browser).

## 9. Unfixed issues

- **Off-screen/thumbnail WebGL context**: disposal confirmed via `tR.dispose()`+`forceContextLoss`, but context-loss *behaviour* under GPU-driver failure wasn't reproducible in software GL — untested.
- **`requestfailed` for fonts/fonts.gstatic were observed in-browser offline** — fonts are cosmetic, no functional error; a CDN-infrastructure concern, not a code bug.
- **`objects` (etc.) are top-level `const`** — accessible only within page scripts, not as `window.objects`. Cosmetic API surface concern; no fix needed.
- One UI-string edge: `toastsEl` cap trimming removes the *oldest* toast while up to 3 are alive; long sessions produce at most brief animation overlap. Cosmetic.

## 10. Tests blocked by environment

- **GPU metrics** (draw calls, GPU mem, device dpr zoom-strain): no hardware GL in headless Firefox here — measured CPU-side only, FPS from HUD.
- **Screen-reader/mobile touch**: not tested (desktop pointer semantics only).
- **Sustained overnight soak** (>10 min real-time): covered by accelerated 60-s simulated loops instead; equivalent logic paths, but not wall-clock long-run.

## 11. Files changed

- `3dsandbox.html` — the 6 fixes above (small, surgical; no features removed, no architecture changes)
- `3dsandbox.orig-backup.html` — pristine copy of the original (recoverable baseline)
- `audit/*` — test harness + suites (extraction, core, history, stress, E2E, traces) — test infrastructure only
- `package.json` / `package-lock.json` — added `three@0.128.0` (test-only) and `playwright-core` (test-only)
- git: `d23abd1` (baseline), `37c302f` (fixes + harness)

## 12. Recommended next step

The single most valuable follow-up: **a real-hardware browser pass** (Chrome + Firefox on discrete GPU) watching for driver-specific shader/shadow artifacts and context-loss handling, which could not be exercised in this environment.
