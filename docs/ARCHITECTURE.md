# Architecture & Technical Design — Flatlands

Flatlands is a client-side 3D god-sandbox game implemented in a zero-build, self-contained architecture. This document details the runtime systems, data structures, graphics pipeline, entity steering, history management, and simulation loop.

---

## 1. High-Level System Architecture

Flatlands is constructed as an event-driven, single-document WebGL application. It has zero runtime build dependencies, relying directly on Three.js (r128) and Lucide icons via CDN.

```
+---------------------------------------------------------------------------------+
|                                Flatlands Sandbox                                |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   +-----------------------+     +-------------------+     +-----------------+   |
|   |    Input & Events     |     |   History Stack   |     |    Audio Synth  |   |
|   | (Pointers, Keyboard)  |     |  (Undo / Redo 120)|     |   (Web Audio)   |   |
|   +-----------+-----------+     +---------+---------+     +--------+--------+   |
|               |                           |                        |            |
|               v                           v                        v            |
|   +-------------------------------------------------------------------------+   |
|   |                           Game State & World                            |   |
|   |   - objects[] / entities[] / walkSpots[] / bins[]                       |   |
|   |   - Spatial Maps: groundMap (80x80) & objMap (80x80)                    |   |
|   |   - Raycast Index: pickMeshes[]                                         |   |
|   +-----------------------------------+-------------------------------------+   |
|                                       |                                         |
|            +--------------------------+--------------------------+              |
|            |                          |                          |              |
|            v                          v                          v              |
|   +-----------------+        +------------------+       +-------------------+   |
|   |   Rail Graph    |        |  Autonomous AI   |       | Procedural Assets |   |
|   | Dynamic Topology|        | Steering / Avoid |       | BufferGeometry M  |   |
|   +--------+--------+        +--------+---------+       +---------+---------+   |
|            |                          |                           |             |
|            +--------------------------+---------------------------+             |
|                                       |                                         |
|                                       v                                         |
|   +-------------------------------------------------------------------------+   |
|   |                   Three.js WebGL Rendering Pipeline                     |   |
|   |        (PerspectiveCamera, Soft Shadows, Dynamic Shaders, Sky)          |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

## 2. Rendering & Graphics Pipeline

### Coordinate System & Grid
- **World Dimensions:** An 80 × 80 unit terrain grid centered at origin `(0, 0, 0)`.
- **Half-Bounds (`HB`):** Defined as `38.5` units, keeping all objects within `[-HB, +HB]`.
- **Unit Grid:** 1 Three.js world unit corresponds to 1 grid cell tile.
- **Elevation Layers:**
  - Base ground plane: `y = 0.0`.
  - Pathways and ground patches: `y = 0.02`.
  - Railway ties and rails: `y = 0.04` to `0.14`.
  - Station platforms: `y = 0.40`.
  - Static structures (cottages, trees, streetlights): resting on ground `y = 0.0`.

### Camera Rig, Lighting & Weather
- **Camera:** `THREE.PerspectiveCamera` positioned at an isometric slant (`fov: 42`, elevation `y: 42`, offset `z: 46`).
- **Camera Navigation:**
  - **Pan:** Right-drag pans smoothly across the world plane via target lerping (`cam.tx`, `cam.tz`).
  - **Zoom:** Mouse wheel adjusts target distance (`cam.dist`), smoothly clamped between 18 and 92 units.
  - **Rotation:** Smooth 90° stepped rotations (`cam.targetRot`), interpolating with a damping factor of `0.14`.
- **Lighting & Dynamic Weather System:**
  - **Directional Sun Light:** Positioned at `(24, 48, 28)` casting high-resolution soft shadows (`shadow.mapSize: 2048x2048`, `bias: -0.0004`).
  - **World Time & Sun Phase:** `worldTime` advances in simulated hours. `updateWorldLighting()` interpolates daylight, dusk, dawn, and nighttime palettes without rebuilding the scene graph.
  - **Weather States (`clear`, `cloudy`, `rain`, `fog`):**
    - `clear`: Full directional sunlight and standard atmospheric fog (`near: 46`, `far: 140`).
    - `cloudy`: Sun intensity attenuated (0.55×), overcast hemisphere light, softened ambient tones.
    - `rain`: Heavy cloud cover (sun attenuated to 0.35×), darkened sky gradient, tightened fog (`near: 34`, `far: 90`), and streetlights automatically illuminate even during daytime.
    - `fog`: Dense atmospheric mist (`near: 18`, `far: 62`), muted sunlight (0.40×), soft diffused horizon.
  - **Rain Particle System:** A bounded, single-draw-call `THREE.Points` mesh (`rainMesh`) containing 180 rain streaks within a `[-26, +26]` camera-centered box. Drops fall at 32 units/s and wrap seamlessly with zero per-frame garbage collector allocation. Only active during `rain` weather.
  - **Ambient Light & Sky Gradient:** Directional and hemisphere lighting, fog, and the sky gradient share the solar phase. Streetlight bulbs use a shared `MeshBasicMaterial` whose brightness automatically boosts at dusk, night, or during rainstorms.

---

## 3. Procedural Geometry Engine (`B` Builder)

Flatlands does not load external `.gltf` or `.obj` 3D model files. All 32 asset definitions are procedurally generated at runtime using an optimized merged-buffer builder (`class B`).

### Architecture of `class B`:
1. **Primitive Cache (`P`):** Shared geometric primitives (`box`, `cyl`, `cyl8`, `cone`, `sphere`) pre-allocated with minimal vertex counts to maximize mobile and software-WebGL throughput.
2. **Material Palette (`MAT`):** A shared indexed palette of `MeshLambertMaterial` instances with custom hex colors (terracotta, slate blue, meadow green, pine foliage, warm stone, wood, train iron, asphalt, cream walls, awning stripes, fountain water).
3. **Buffer Merging:** `B.build()` compiles multiple sub-shapes into a single `THREE.BufferGeometry` or grouped mesh, dramatically reducing draw calls across the 900-object capacity.
4. **Thumbnail Generation:** A lightweight offscreen renderer (`tR`) isolates each asset definition to render crisp 2D icon previews in the UI sidebar without blocking the main render loop.
5. **Expanded Catalog (32 Assets):**
   - **Original & Scenery (19):** `track`, `train`, `cottage`, `house`, `tree`, `pine`, `flower`, `grass`, `path`, `platform`, `lantern`, `bench`, `fence_wood`, `trashbin`, `human`, `dog`, `cat`, `duck`, `tunnel`.
   - **Detail Decor (7):** `shrub`, `flowerbed`, `fence`, `sign`, `crate`, `barrel`, `planter`.
   - **Town Infrastructure (6):** `station` (passenger depot), `shop` (striped awning general store), `clocktower` (belfry tower with clock faces), `bridge` (elevated pedestrian footbridge), `road` (marked asphalt roadway), `fountain` (tiered basin with animated water shimmer).

---

## 4. World State & Spatial Indexing

The simulation state is maintained across several coordinated structures:

| Data Structure | Type | Purpose |
|---|---|---|
| `objects` | `Array<ObjectRecord>` | Authoritative list of all placed structures and entities. Max limit: 900 (`MAXO`). |
| `entities` | `Array<EntityRecord>` | Active simulation objects requiring per-frame tick updates (citizens, animals, trains). |
| `groundMap` | `Map<string, ObjectRecord>` | Spatial hash keyed by `"tx,tz"` tracking ground tiles (rails, paths, grass, platforms). |
| `objMap` | `Map<string, ObjectRecord>` | Spatial hash keyed by `"tx,tz"` tracking solid occupying objects (buildings, trees, decor). |
| `walkSpots` | `Array<{x, z, y, h}>` | Pathfinding nodes collected from placed pathways and platforms for pedestrian AI preference. |
| `bins` | `Array<ObjectRecord>` | Locations of placed trash bins for citizen litter-disposal interactions. |
| `pickMeshes` | `Array<THREE.Mesh>` | Raycast targets for click inspection, hover ghosts, and deletion targeting. |

---

## 5. Railway Graph & Train Simulation

### Auto-Interlocking Track Topology
When a rail tile is placed or modified:
1. `railConns(tx, tz)` queries cardinal neighbors `(0, 1), (0, -1), (1, 0), (-1, 0)` in `groundMap`.
2. Based on the bitmask of connected neighbors, the tile determines its topological identity:
   - **Straight Track:** 2 opposite connections (north-south or east-west).
   - **Corner Curve:** 2 adjacent connections (e.g., north-east).
   - **T-Junction / Crossing:** 3 or 4 connections.
   - **Dead-End Stub:** 0 or 1 connection.
3. `rebuildRail(rec)` dynamically disposes the old mesh, constructs the correct auto-turned rail geometry, and updates `pickMeshes` cleanly without leaking stale raycast references.
4. Adjacent tracks are immediately notified via `refreshRailsAround(tx, tz)` to re-mesh automatically.

### Train Waypoint Navigation
- **Locomotive Engine:** Follows discrete waypoint lines along track centers.
- **Dead-End Shuttle:** When a train arrives at a track termination without an adjacent rail connection, it reverses direction (`t.dir *= -1`), shuttling back and forth across isolated lines.
- **Carriages & Breadcrumbs:** Trailing passenger and cargo cars sample a continuously refreshed breadcrumb trail of locomotive positions and orientations, preserving spacing and articulation through curves and S-bends. The locomotive's local `-X` front is explicitly mapped to rail travel direction.
- **Steam Particles:** Procedural billboard puffs spawn from the chimney, rising and dissipating with lifetime-based scale and opacity falloff.

---

## 6. Autonomous Entity AI & Steering

### Pedestrian & Animal Wanderers (Citizens, Dogs, Cats, Ducks)
- **Avoidance Vector:** Entities cast forward and lateral probe rays against `objMap` and boundary walls.
- **Non-Penetrating Slide:** If the target destination intersects a solid building or tree, movement clamps to an unobstructed tangential slide vector, preventing clipping.
- **Pen Escape Mechanism:** In trapped or dense geometries, accumulated stuck counters trigger broad rotational retargeting, allowing NPCs to escape tight enclosures through single-tile openings.
- **Path & Elevation Bias:** Wanderers evaluate nearby `walkSpots` (pathways, platforms, roads at `y = 0.12`, bridges at `y = 0.70`). If within range, they steer toward the walkway network and smoothly conform to surface elevations.
- **Role-Specific Behavioral Steering:**
  - **Dogs (`isDog`):** Exhibit companion loyalty by periodically seeking out nearby citizens within a 9-tile radius, following them affectionately while maintaining organic social spacing.
  - **Ducks (`isDuck`):** Drawn toward water bodies (fountains) and lush grass patches. During rain, duck swimming/bobbing animation frequency doubles (16 rad/s vs 8 rad/s).
  - **Citizens (`isHuman`):**
    - **Shelter Seeking in Rain:** When weather transitions to `rain`, citizens accelerate their walking pace (1.45× speed boost) and steer toward nearby cottages, houses, shops, or stations to seek shelter.
    - **Public Gatherings:** On clear days, citizens gather near communal hubs (fountains, benches, stations, shops) and pause for contemplative breaks.
    - **Train Watching:** Citizens within 3.5 units of passing trains momentarily halt their movement, turning to watch the train pass before resuming their walk.
- **Interactive Litter Mechanics:** Passing near a trash bin initiates a momentary pause where citizens deposit litter with confetti/dust particle feedback.

---

## 7. History & Command Pattern (Undo / Redo)

Flatlands implements a robust, capped command pattern supporting up to 120 historical actions:

- **Command Types:**
  - `multi`: Composite operations containing multiple placements (e.g., drag-painted railway lines or multi-block station foundations).
  - `del`: Deletion of single or grouped objects.
  - `tr`: Transform operations (rotations and scaling) with delta coalescing to prevent flooding the history stack during rapid clicks.
- **Invariance & Deduplication:**
  - Restoring records via `restoreRec()` performs strict object duplication checks, updates spatial maps (`groundMap`, `objMap`), and re-registers collision meshes.
  - Hard limit of 900 objects (`MAXO`) is enforced at both the placement entry and history restoration layers.

---

## 8. Sandbox Usability & UI Architecture

Flatlands features an intuitive, zero-dependency HUD designed for rapid world building and micro-management:

- **Sidebar Filtering & Catalog Search:**
  - Category pill tabs (`all`, `nature`, `urban`, `rail`, `decor`, `life`) filter catalog cards in real time.
  - Live search input (`#catSearch`) matches item names dynamically across the 32 asset definitions with clean empty-state fallback.
- **Object Inspection & Duplication:**
  - Selection popup (`#objpop`) exposes precise tile coordinates (`#opCoords`: `[X, Z]`) and height values.
  - One-click duplicate button (`#opDup`) and <kbd>Ctrl</kbd>+<kbd>D</kbd> shortcut instantly select the inspected asset for rapid replication.
- **Time & Weather Integration:**
  - Top HUD badge displays simulated 24h clock, solar phase icon, and current weather badge (`#clockWeather`).
  - Settings panel features structured sections (`.set-sec`) separating World Clock, Dynamic Weather, Camera Controls, and Session Actions with segmented buttons and toggle switches.

---

## 9. Performance Budget & Resource Management

- **Memory Retention:** Disposed geometries and materials explicitly call `.dispose()`.
- **Software WebGL Compatibility:** Tested and verified under software WebGL (SwiftShader / Mesa llvmpipe) at a solid 60 FPS under normal loads.
- **CPU Simulation Budget:** Full 300-agent crowd simulation with 200 obstacles consumes **~0.6 ms per frame**, well within the 16.6 ms frame budget for 60 FPS rendering.
- **Particle Overhead:** 180 rain points updated strictly via `Float32Array` in-place positions without any per-frame object allocation.
