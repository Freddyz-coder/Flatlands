# Known Issues & Environment Limitations — Flatlands

This document provides a transparent record of verified edge cases, environment-specific testing constraints, and non-fatal cosmetic behaviors in Flatlands.

---

## 1. Unfixed Edge Cases & Cosmetic Observations

### 1.1 WebGL Context Loss on Driver Crash
- **Description:** The off-screen thumbnail renderer (`tR`) calls `dispose()` and releases resources, but full graceful recovery from spontaneous GPU driver context loss (`webglcontextlost` event) is not explicitly hooked to rebuild the entire Three.js scene graph.
- **Impact:** In the rare event of an operating system GPU crash or driver reset, the page may require a browser refresh.
- **Severity:** Low (standard for lightweight browser games).

### 1.2 Font Loading in Fully Offline Environments
- **Description:** Flatlands requests Google Fonts (`Titan One` and `Outfit`) via Google Fonts CDN in the HTML `<head>`.
- **Impact:** If the user opens `3dsandbox.html` with no internet access and without a local web server caching the fonts, the browser will fall back to system UI sans-serif fonts (`ui-sans-serif, system-ui, sans-serif`). The game remains 100% playable and functional, but headings will display in standard sans-serif rather than the stylized display font.
- **Severity:** Cosmetic.

### 1.3 Rapid Action Toast Notification Trimming
- **Description:** When the user rapidly executes multiple god actions in quick succession (e.g., smashing delete repeatedly), up to 3 toast notifications can be active simultaneously. When trimming the oldest toast, CSS entrance/exit animations may slightly overlap on screen for ~200ms.
- **Impact:** Visual artifact in the lower-right toast area; zero gameplay or simulation impact.
- **Severity:** Cosmetic.

### 1.4 Web Audio Autoplay Policy
- **Description:** Browsers enforce strict autoplay policies preventing Web Audio contexts from emitting sound until the user interacts with the page.
- **Impact:** Procedural audio synthesis is initialized on the first user interaction (click or drag). If sound is toggled on before any interaction, audio begins silently until the first canvas interaction occurs.
- **Severity:** By design / browser security requirement.

### 1.5 Dynamic Weather Rain Particle Bounds
- **Description:** Rain streaks (`rainMesh`, 180 particles) are dynamically bounded within a `[-26, +26]` box centered at `(cam.tx, cam.tz)` to prevent wasting render overhead on off-screen areas.
- **Impact:** If the camera is rapidly panned across vast distances in a single frame, rain drops instantly wrap into the new camera frustum within 1-2 frames.
- **Severity:** By design / performance optimization.

### 1.6 Particle Effect (Puff) Cap Enforcement
- **Description:** Particle effects (smoke puffs, dust, litter disposal) are capped at 140 active sprites to prevent unbounded GPU allocation during heavy usage.
- **Impact:** When the cap is reached, new `spawnPuff()` calls return early without creating additional sprites. This was corrected from an off-by-one error (`>140` → `>=140`) in release 1.0.0 to enforce the exact cap.
- **Severity:** Low (bounded resource management).

---

## 2. Environment Limitations During Verification

### 2.1 Headless Software WebGL vs. Hardware GPUs
- **Testing Condition:** Automated test suites and browser E2E runs were executed using headless Firefox with software WebGL rendering (Mesa llvmpipe / SwiftShader).
- **Limitation:** Hardware-specific GPU features (such as vendor-specific shadow map filtering artifacts, driver-level depth precision variations, or high-DPI retina display strain) could not be benchmarked on physical GPU silicon in the headless CI environment.
- **Recommendation:** Perform manual sanity checks on physical hardware with discrete NVIDIA/AMD/Intel/Apple GPUs across Chrome and Firefox.

### 2.2 Mobile & Touch Input
- **Testing Condition:** Flatlands was designed and validated for desktop pointer and keyboard navigation (right-drag pan, mouse wheel zoom, keyboard drift, shortcut keys).
- **Limitation:** Multi-touch gestures (pinch-to-zoom, two-finger pan) and mobile virtual controls are not currently implemented.
- **Scope:** Desktop browser target.

### 2.3 Extended Soak Testing (>24 Hours)
- **Testing Condition:** Accelerated simulation loops were executed (60 seconds at accelerated tick rates simulating thousands of frames of train motion and crowd wandering).
- **Limitation:** Continuous multi-day wall-clock browser runtime was not measured. Memory profiling indicates no object or rail mesh leaks under 1,000 churn cycles, but prolonged sessions spanning multiple days have not been formally soaked.

### 2.4 Test Harness Scope
- **Testing Condition:** The Node.js test harness (`audit/core.mjs`) extracts game logic from `3dsandbox.html` and runs it without a full browser environment.
- **Limitation:** The harness strips certain rendering-only initializations (e.g., `scene.fog`) to focus on game logic. Adversarial tests that check rendering state (like fog near/far bounds) are harness-aware and skip those checks when running in the harness.
- **Result:** All 9 test suites pass (`npm test` exits code 0). Adversarial break tests (`audit/adversarial-break1.mjs`, `audit/adversarial-break2.mjs`) pass with harness-aware adjustments.
