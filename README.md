# Flatlands — A Pocket-God Sandbox

[![Tests](https://img.shields.io/badge/tests-252%20assertions-brightgreen)](#-automated-test-suite)
[![Engine](https://img.shields.io/badge/engine-Three.js%20r128-blue)](https://threejs.org/)
[![Build](https://img.shields.io/badge/build-zero--build%20client--side-orange)](#-running-the-game)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved%20(See%20LICENSE)-lightgrey)](LICENSE)

**Flatlands** is a delightful, browser-based 3D god-sandbox game built with [Three.js](https://threejs.org/). You are given an 80×80 plot of vibrant low-poly countryside to shape however you see fit: lay auto-interlocking railways, build stations, shops, and clock towers, pave roads, plant forests, and watch citizens, dogs, cats, and ducks roam around your miniature living world under an atmospheric day/night cycle and dynamic weather.

Everything runs entirely client-side with zero build steps or bundlers required. Simply launch [index.html](index.html) or [3dsandbox.html](3dsandbox.html) in any modern desktop browser.

---

## 📸 Visual Showcase

### Daytime Town Overview
![Flatlands Gameplay Overview](docs/screenshots/gameplay_overview.png)
*Initial Genesis starter town featuring cottages, elevated station platform, railway with tunnel, streetlights, and autonomous citizens.*

### GitHub Dark Theme
![Flatlands Dark Mode](docs/screenshots/dark_mode.png)
*The running railway network, active locomotive pulling carriages, and dark slate UI palette.*

---

## 🌟 Key Features & What You Can Do

### 1. Construction & Creative Placement
- **Drag-and-Drop or Click-to-Place:** Drag any item from the left sidebar onto the terrain, or click an item once to hold it and click anywhere in the world to drop it.
- **Continuous Ground Painting:** Hold left-click and drag across the ground to paint continuous railway lines, paved roads, stone pathways, elevated station platforms, or lush flower-speckled grass patches.
- **Rotation in Hand:** Press <kbd>Q</kbd> / <kbd>E</kbd> or <kbd>Ctrl</kbd>+<kbd>R</kbd> to rotate objects in 45° increments before placing them.
- **Category Filter Tabs:** Filter items instantly using sidebar pills (`All`, `Buildings`, `Transit`, `Nature`, `Street`, `Life`) alongside instant keyword search.
- **Placement Ghost & Safety Guard:** A live ghost preview tracks your cursor. An emerald-green ground marker indicates a valid drop, while a pink-red marker (`#ff9a8a`) and ghost tint warn against overlaps or out-of-bounds drops.

### 2. Living Railway & Transit Network
- **Auto-Interlocking Tracks:** Rail tiles automatically detect neighboring tracks and dynamically re-mesh into straightaways, corners, T-junctions, and crossings.
- **Working Trains:** Place a train engine onto any rail. It pulls passenger and cargo cars along an articulated breadcrumb trail, wheels spin with movement, and steam puffs billow from the smokestack.
- **Dead-End Shuttles:** Trains automatically reverse direction when reaching dead ends or circle indefinitely on closed loops.
- **Stations, Platforms & Tunnels:** Place passenger railway station shelters, elevated platform tiles, and tunnels that snap to the tracks for trains to dive through.
- **Footbridges & Roads:** Build arched footbridges and paved asphalt roads with curbstones and road markings for pedestrians to cross and travel on.

### 3. Autonomous World Simulation
- **Citizens & Creatures:** Spawn humans, cats, dogs, and ducks. They wander autonomously using probe-based obstacle avoidance and procedural limb-rig animations.
- **Enhanced Purpose & Social Behaviors:**
  - **Dog Companionship:** Dogs seek out humans and wander alongside them as faithful pets.
  - **Duck Water Attraction:** Ducks naturally gravitate toward town fountains and grass meadows.
  - **Public Gathering Spots:** Citizens preferentially stroll along paths, visit benches to sit and rest, gather by town fountains, and visit shops.
  - **Train Awareness:** Citizens walking near active tracks pause to watch trains chug past.
- **Wall-Collision Guard & No Clipping:** Wanderers detect solid structures and slide tangentially along walls without clipping inside buildings.
- **Interactive Town Mechanics:** Place trash bins near walkways—passing citizens will pause to dispose of litter with particle puffs and satisfying feedback.

### 4. Atmosphere, Weather & World Time
- **Dynamic Weather System:** Seamless 4-state weather engine (`Clear`, `Cloudy`, `Rain`, `Fog`) with an optional automatic weather change timer.
  - **Clear:** Crisp, vibrant sunlight, blue skies, and high-contrast shadows.
  - **Cloudy:** Soft diffused overcast lighting, muted skies, and gentle ambient tones.
  - **Rain:** Atmospheric drizzle with bounded rain particles (180 drops, 0 runtime allocation), darker skies, and heightened fog. Citizens hasten toward shelter while ducks bob with joy!
  - **Fog:** Mysterious rolling mist with softened visibility.
- **Day/Night Cycle & Clock:** Simulated 24-hour cycle coordinating sun angle, directional shadows, hemisphere ambient light, and sky gradient. Streetlight bulbs illuminate at night, dusk, and during heavy rain or fog.
- **Time Controls:** HUD world clock with time and weather readouts. Settings controls allow pausing time, scrubbing the hour, stepping by ±1h, jumping to dawn, and tuning cycle speed.

### 5. God Powers & World Editing
- **Object Inspection:** Click any placed object to target it with animated selection brackets, view its exact grid coordinates, and open a contextual floating menu.
- **Rotate, Resize & Duplicate:**
  - Rotate objects by 90° increments.
  - Scale objects from **55%** up to **190%** of their original size.
  - **Duplicate Objects:** Click the duplicate button or press <kbd>Ctrl</kbd>+<kbd>D</kbd> to immediately pick up a replica of the selected item to place anywhere.
  - "Smite" (delete) unwanted objects instantly or press <kbd>Delete</kbd> / <kbd>Backspace</kbd>.
- **Full History (Undo / Redo):** Press <kbd>Ctrl</kbd>+<kbd>Z</kbd> to undo and <kbd>Ctrl</kbd>+<kbd>Y</kbd> to redo actions (up to 120 steps).
- **Reset & Restart:**
  - **Flatten the world:** Clears all placed items for a clean slate.
  - **Restart the game:** Sweeps the world clean and re-runs the full 97-object falling "Genesis" drop sequence.

### 6. Camera & Navigation
- **Right-Drag Roam:** Hold the right mouse button to pan smoothly across the terrain without interfering with left-click placement.
- **Scroll Zoom:** Use mouse wheel or the HUD zoom buttons for fluid perspective zoom. Includes persisted reverse-wheel option.
- **Spin the View:** Press <kbd>R</kbd> or click the rotate button for a smooth 90° quarter-turn view spin.
- **Keyboard Drift:** Use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrow keys to drift across the landscape.

---

## 🕹️ Controls Reference

| Action | Control | Description |
|---|---|---|
| **Hold / Select Asset** | Left-click sidebar icon | Selects item to carry in cursor hand |
| **Drop Held Asset** | Left-click valid terrain | Places asset at target grid coordinate |
| **Paint Ground** | Left-drag ground assets | Continuously paints rails, paths, roads, grass, or platforms |
| **Rotate in Hand** | <kbd>Q</kbd> / <kbd>E</kbd> or <kbd>Ctrl</kbd>+<kbd>R</kbd> | Rotates carried item in 45° steps |
| **Cancel / Put Away** | <kbd>Esc</kbd> or quick Right-click | Clears carried item without placing |
| **Duplicate Object** | <kbd>Ctrl</kbd>+<kbd>D</kbd> or HUD duplicate icon | Copies selected object into hand for placement |
| **Pan Camera** | Right-click and drag | Roams across terrain smoothly |
| **Zoom View** | Mouse scroll wheel or HUD `+` / `-` | Wheel up zooms in and wheel down zooms out; direction can be reversed in Settings |
| **Rotate View 90°** | <kbd>R</kbd> or HUD spin button | Quarter-turns camera angle with smooth damping |
| **Drift Camera** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow Keys | Pans camera smoothly across the axes |
| **Select Placed Object** | Left-click placed object | Opens contextual god-menu with brackets and tile coordinates |
| **Smite (Delete)** | <kbd>Delete</kbd> / <kbd>Backspace</kbd> or trash button | Instantly removes selected object |
| **Undo** | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Reverts last placement, transform, or deletion |
| **Redo** | <kbd>Ctrl</kbd>+<kbd>Y</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | Restores reverted action |

---

## 📦 Asset Catalog

The game features 32 procedural low-poly assets across 5 categories with zero external 3D model dependencies:

- 🏛️ **Buildings:** Cottage, Town House, Railway Station (`station`), Village Shop & Café (`shop`), Clock Tower (`clocktower`), Tunnel, Elevated Platform.
- 🚂 **Transit Network:** Railway (dynamic auto-turn tracks), Locomotive Engine (with Passenger & Cargo Cars), Stone Pathway, Footbridge (`bridge`), Paved Road (`road`).
- 🌲 **Nature & Terrain:** Grass Patch (with flowers), Oak Tree, Pine Tree, Rock, Boulder, Shrub, Flower Bed.
- 🪑 **Street & Decor:** Town Fountain (`fountain`), Park Bench, Streetlight (with emissive bulb), Trash Bin, Fence, Signpost, Crate, Barrel, Planter.
- 🐾 **Life:** Human (multi-skin/shirt variants), Cat, Dog, Duck.

---

## 💻 Requirements & System Support

- **Browser:** Any modern desktop browser supporting WebGL 1.0/2.0 and ES6 modules (Google Chrome, Mozilla Firefox, Microsoft Edge, Apple Safari).
- **Graphics:** Any hardware or software GPU supporting WebGL. Verified at 60 FPS under software Mesa/SwiftShader WebGL.
- **Dependencies:** All runtime dependencies (`three.js` r128, `lucide` icons, and Google Fonts) are linked via standard CDNs.

---

## 🚀 Running the Game

### Method 1: Direct File Launch
Simply double-click or open [3dsandbox.html](3dsandbox.html) or [index.html](index.html) in your browser.

### Method 2: Local HTTP Server (Recommended)
Running through an HTTP server ensures consistent asset and font loading:
```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js serve
npx serve .
```
Then navigate your browser to `http://localhost:8000/`.

---

## 🧪 Automated Test Suite

Flatlands has a **252-assertion automated test harness** executed across 11 test suites. Run all required suites
with the fail-fast aggregate command:

```bash
npm test
```

For individual commands, exact assertion accounting, browser prerequisites, and
limitations, see [docs/TESTING.md](docs/TESTING.md).

---

## 📚 Project Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Comprehensive technical design of the renderer, procedural geometry pipeline, railway graph, entity AI, and history command stack.
- [docs/TESTING.md](docs/TESTING.md) — Detailed guide to the test suite, test harness architecture, invariant checks, and performance numbers.
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — Transparent record of environmental limitations, software WebGL nuances, and cosmetic observations.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Full version history tracking baseline creation, GLM 5.3 Flash defect fixes, Gemini 3.8 adversarial audit repairs, and Claude Sonnet 4.6 release engineering.
- [LICENSE](LICENSE) — Project licensing notice and third-party open-source attributions (Three.js MIT, Lucide ISC, Google Fonts OFL).

---

## 🤝 Contributing

Contributions, bug reports, and enhancements are welcome! Please follow these guidelines:
1. Ensure all proposed changes keep the core game self-contained in `3dsandbox.html`.
2. Run the complete automated test suite (`node audit/test-core-suite.mjs`, etc.) before submitting changes.
3. Add regression tests in `audit/` for any new bug fixes or feature additions.
4. Open an issue or pull request with clear reproduction steps and test results.
