# Automated testing and verification

Run the entire required suite with:

```sh
npm test
```

`npm test` is fail-fast: each suite is joined with `&&`, so a nonzero result from
any required check is propagated to the command result. `npm run test:core` and
`npm run test:browser` run the non-browser and Playwright portions respectively.

## Machine-counted assertions

The `npm test` chain holds **270 machine-counted assertions** (233 previously
documented + 37 new rail assertions). This is an assertion count, not a count
of scenarios, simulated ticks, or console messages. The two adversarial
suites (`adversarial-break1.mjs`: 12, `adversarial-break2.mjs`: 20) are NOT
part of `npm test` and are counted separately (32 extra, 302 grand total
if combined — do not mix these numbers).

| Suite | File | Assertions | Coverage |
| --- | --- | ---: | --- |
| Core systems | `audit/test-core-suite.mjs` | 58 | Placement validation, 900-object cap, rail graph, train recovery, lifecycle maps, wanderers, bins, tunnels, invalid numeric input |
| Feature expansion | `audit/test-feature-suite.mjs` | 20 | Decor catalog definitions and placement, train heading mapping, clock/time markup, lighting integration, and wheel preference wiring |
| Gameplay expansion | `audit/test-expansion-suite.mjs` | 54 | Town infrastructure assets (station, shop, bridge, road, fountain, clocktower), elevation layers, walkSpots registration, dynamic weather engine & lighting, NPC behavioral purpose (dogs, ducks, citizens), UI search/category tabs, duplication hotkey (Ctrl+D) |
| Connected railway | `audit/test-rail-suite.mjs` | 37 | Tile-port topology, reciprocal links, BFS routes, deterministic junctions, train traversal/wagons/dead-ends/sabotage/loops, undo-redo-rebuild |
| History stress | `audit/test-history-stress.mjs` | 15 | Multi-command undo/redo, branch truncation, deletion restoration, history cap |
| Simulation stress | `audit/stress-suite.mjs` | 13 | Saturation, crowd updates, train/restore churn, transforms |
| Wall guard | `audit/test-guard.mjs` | 2 | No wall occupancy for 12,000 ticks and escape through a one-tile gap |
| Red-team browser audit | `audit/redteam-audit-suite.mjs` | 44 | Rail mesh lifecycle, real preview tint, input cleanup, Genesis, capacity ladder |
| Main browser E2E | `audit/e2e.mjs` | 19 | Startup, Genesis, HUD placement, undo, rail painting, clock controls, wheel direction, browser errors |
| Input browser E2E | `audit/e2e-inputs.mjs` | 8 | Left/right drag behavior, Ctrl+R, restart, browser errors |
| Adversarial break 1 | `audit/adversarial-break1.mjs` | 12 | Weather×time rapid switching, train track sabotage, NPC target removal, boundary clamp |
| Adversarial break 2 | `audit/adversarial-break2.mjs` | 20 | Placement churn near cap, reset cleanup, resource growth, puff cap enforcement |

The browser tests use bounded readiness conditions: they wait for Three.js,
complete Genesis, and the FPS HUD rather than relying on a fixed startup sleep.
They serve the repository's pinned `three@0.128.0` test dependency from a local
ephemeral HTTP server, stub only Lucide's icon-rendering call, and use a
`PLAYWRIGHT_FIREFOX_EXECUTABLE` override when a CI environment needs one. No
browser test fetches Three.js from a CDN or assumes a developer-home Firefox path.

## Running individual suites

```sh
node audit/test-core-suite.mjs
node audit/test-feature-suite.mjs
node audit/test-expansion-suite.mjs
node audit/test-rail-suite.mjs
node audit/test-history-stress.mjs
node audit/stress-suite.mjs
node audit/test-guard.mjs
node audit/redteam-audit-suite.mjs
node audit/e2e.mjs
node audit/e2e-inputs.mjs
```

Browser suites require a Firefox build discoverable by `playwright-core`, or a
path supplied in `PLAYWRIGHT_FIREFOX_EXECUTABLE`. They fail with Playwright's
error if neither is available; that is an environment failure, not a pass.

## Scope and limitations

`audit/extract.mjs` and `audit/core.mjs` execute selected logic extracted from
the shipped `3dsandbox.html`. Browser suites separately exercise the actual page
and pointer/keyboard paths. The test harness does not make a hardware-GPU,
mobile-touch, screen-reader, or multi-hour soak claim. Performance thresholds in
the Node stress suite are local checks, not portable benchmark results.
