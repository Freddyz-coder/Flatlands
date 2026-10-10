# Automated testing and verification

Run the entire required suite with:

```sh
npm test
```

`npm test` is fail-fast: each suite is joined with `&&`, so a nonzero result from
any required check is propagated to the command result. `npm run test:core` and
`npm run test:browser` run the non-browser and Playwright portions respectively.

## Machine-counted assertions

The current suite has **180 machine-counted assertions**. This is an assertion
count, not a count of scenarios, simulated ticks, or console messages.

| Suite | File | Assertions | Coverage |
| --- | --- | ---: | --- |
| Core systems | `audit/test-core-suite.mjs` | 59 | Placement validation, 900-object cap, rail graph, train recovery, lifecycle maps, wanderers, bins, tunnels, invalid numeric input |
| Feature expansion | `audit/test-feature-suite.mjs` | 20 | New catalog definitions and placement, train heading mapping, clock/time markup, lighting integration, and wheel preference wiring |
| History stress | `audit/test-history-stress.mjs` | 15 | Multi-command undo/redo, branch truncation, deletion restoration, history cap |
| Simulation stress | `audit/stress-suite.mjs` | 13 | Saturation, crowd updates, train/restore churn, transforms |
| Wall guard | `audit/test-guard.mjs` | 2 | No wall occupancy for 12,000 ticks and escape through a one-tile gap |
| Red-team browser audit | `audit/redteam-audit-suite.mjs` | 44 | Rail mesh lifecycle, real preview tint, input cleanup, Genesis, capacity ladder |
| Main browser E2E | `audit/e2e.mjs` | 19 | Startup, Genesis, HUD placement, undo, rail painting, clock controls, wheel direction, browser errors |
| Input browser E2E | `audit/e2e-inputs.mjs` | 8 | Left/right drag behavior, Ctrl+R, restart, browser errors |

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
