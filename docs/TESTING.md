# Automated Testing & Verification Guide — Flatlands

This project maintains a multi-tiered test harness covering unit invariants, rail network mathematics, autonomous entity steering, history command integrity, heavy stress workloads, and headless browser end-to-end interactions.

---

## 1. Test Suite Summary

Total Verified Tests: **129 passing assertions** across 6 distinct suites.

| Suite | File | Tests | Runtime Environment | Focus Area |
|---|---|---|---|---|
| **Core Systems & Invariants** | `audit/test-core-suite.mjs` | **53** | Node.js (extracted core) | Spatial limits, rail graph recompute, train physics, wanderers, bin ticks, tunnel snapping, rapid allocation churn |
| **History & Undo/Redo** | `audit/test-history-stress.mjs` | **13** | Node.js (extracted core) | Multi-command restoration order, redo-branch truncation, rapid remove/restore churn, 120-entry history cap |
| **Crowd & Simulation Stress** | `audit/stress-suite.mjs` | **13** | Node.js (extracted core) | 900-object saturation, 300-agent crowd simulation over 60s, transform limits, simultaneous train & undo hammering |
| **NPC Collision Guard** | `audit/test-guard.mjs` | **1** (12k ticks) | Node.js (extracted core) | 12,000-tick wall-clipping and enclosure escape verification |
| **Adversarial Red-Team Audit** | `audit/redteam-audit-suite.mjs` | **41** | Playwright (Headless Firefox) | PickMeshes memory leak, rail ghost material warning, drag strokeCmd isolation, restoreRec deduplication, NPC boundary clamp, rotatable flags, genesis timer cancellation, pointercancel/blur reset, 100->900 object ladder |
| **Browser E2E & Input Suites** | `audit/e2e.mjs` & `audit/e2e-inputs.mjs` | **8** | Playwright (Headless Firefox) | Real browser boot, genesis drop (97 objects), UI placement, Ctrl+Z undo, drag-paint rails, right-drag pan, Ctrl+R rotate, settings restart |

---

## 2. Running the Test Suites

All tests can be executed directly using Node.js. Dependencies are specified in `package.json` (`three@0.128.0` and `playwright-core`).

### Quick Run: Core Invariants & Unit Tests
```bash
# 53 core system tests
node audit/test-core-suite.mjs

# 13 history & undo/redo stress tests
node audit/test-history-stress.mjs

# 13 crowd & saturation stress tests
node audit/stress-suite.mjs

# 12,000-tick wall collision verification
node audit/test-guard.mjs
```

### Full Browser End-to-End & Red-Team Audits
These tests require Playwright's Firefox browser binary (installed locally):
```bash
# 41 adversarial red-team audit tests
node audit/redteam-audit-suite.mjs

# Full browser E2E interaction test
node audit/e2e.mjs

# Camera, drag-paint, and keyboard input E2E test
node audit/e2e-inputs.mjs
```

### Run All Test Suites in Sequence
```bash
node audit/test-core-suite.mjs && \
node audit/test-history-stress.mjs && \
node audit/stress-suite.mjs && \
node audit/test-guard.mjs && \
node audit/redteam-audit-suite.mjs && \
node audit/e2e.mjs && \
node audit/e2e-inputs.mjs
```

---

## 3. Test Harness Architecture

The test harness operates via two primary mechanisms:

### 1. Script Extraction via `audit/extract.mjs`
To test game logic in headless Node.js without maintaining duplicate source files, `audit/extract.mjs` extracts pure JavaScript engine routines directly from `3dsandbox.html`. It exposes:
- Object placement and validation matrix (`canPlace`, `place`, `removeRec`, `restoreRec`).
- Spatial maps (`groundMap`, `objMap`, `walkSpots`, `bins`).
- Rail network topology (`railConns`, `rebuildRail`, `refreshRailsAround`).
- Autonomous simulation updates (`updateWander`, `binTick`, train updates).
- History stack commands (`pushCmd`, `undo`, `redo`).

### 2. In-Browser Verification via Playwright
The E2E suites (`audit/e2e.mjs`, `audit/e2e-inputs.mjs`, `audit/redteam-audit-suite.mjs`) boot the game inside headless Firefox with software WebGL rendering:
- Shims offline CDN assets (`three.js` and `lucide`) via an embedded local HTTP server to guarantee 100% offline test reliability.
- Captures console output (`console.error`, `console.warn`) and uncaught page exceptions.
- Dispatches synthetic pointer, mouse, and keyboard events through the DOM to verify real user interactions.

---

## 4. Key Verified Invariants

1. **Object Limit (`MAXO = 900`):**
   - Placement strictly returns `null` once 900 objects are reached.
   - History redo and restore operations strictly respect the 900 cap without overflowing.
   - Deleting an object decrements the count and re-enables placement.
2. **Rail Network Integrity:**
   - Removing an adjacent track updates connected neighbors to straight or corner pieces without orphaned meshes.
   - Rebuilding rails removes previous mesh pointers from `pickMeshes`, preventing memory leaks and ghost raycasts.
   - Trains pause safely at dead ends or track cuts without throwing `NaN` coordinates, and resume when tracks are reconnected.
3. **Collision & Steering:**
   - Over 12,000 continuous simulation ticks, wanderers recorded 0 frames inside solid obstacles.
   - Wanderers trapped inside enclosures successfully find 1-tile openings and escape without clipping.
   - Entity coordinates are clamped to world boundaries `[-HB, +HB]`.
4. **History Isolation:**
   - Drag-and-drop operations isolate their history command; subsequent clicks cannot contaminate previous composite stroke commands.
   - Repeated undo/redo cycles do not duplicate records or corrupt spatial hash maps.
5. **Lifecycle & Cleanup:**
   - Settings restart cancels all pending Genesis falling animation timers, preventing overlapping drops.
   - Window blur and pointercancel events reset drag candidates, panning states, and painting flags.

---

## 5. Performance Benchmarks Recorded

- **Rail Place/Delete Cycle:** ~0.22 ms per cycle (1,000 cycles completed in 215 ms).
- **Wanderer Simulation Cost:** ~0.5 ms per frame for 300 active agents with 200 obstacles.
- **Headless Browser Frame Rate:** Steady 60 FPS maintained during active placement and train simulation under software WebGL.
