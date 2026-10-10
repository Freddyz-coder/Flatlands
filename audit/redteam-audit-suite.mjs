// Adversarial Red-Team Audit Suite — Independent Verification of All Repairs & Invariants
import { assertNoCriticalBrowserErrors, launchFirefox, openReadyPage, startAppServer } from './browser.mjs';

const fixture = await startAppServer();
const server = fixture.server;
const browser = await launchFirefox();
const events = { pageErrors: [], consoleErrors: [], failedRequests: [] };
const page = await openReadyPage(browser, fixture.url, events);

let pass = 0, fail = 0;
const test = (name, cond, info = '') => {
  if (cond) {
    pass++;
    console.log(`  PASS: ${name} ${info}`);
  } else {
    fail++;
    console.error(`  FAIL: ${name} ${info}`);
  }
};

console.log('=== TEST SUITE 1: REBUILD RAIL & PICKMESHES INTEGRITY ===');
const test1 = await page.evaluate(() => {
  // 1. Place r1 at (12, 12)
  const r1 = place('railway', 12, 12);
  const m1 = r1.group.children[0];
  const inPickInitial = pickMeshes.includes(m1);

  // 2. Place r2 adjacent at (13, 12), triggering rebuildRail(r1)
  const r2 = place('railway', 13, 12);
  const m1Rebuilt = r1.group.children[0];
  const oldStillInPick = pickMeshes.includes(m1);
  const newInPick = pickMeshes.includes(m1Rebuilt);

  // 3. Verify that raycasting / picking finds r1 on the rebuilt mesh
  const hitRec = m1Rebuilt.userData.rec;
  const result = {
    rebuilt: m1 !== m1Rebuilt,
    inPickInitial,
    oldStillInPick,
    newInPick,
    hitRecIsR1: hitRec === r1
  };
  removeRec(r2);
  removeRec(r1);
  return result;
});
test('Rebuild rail creates new mesh', test1.rebuilt);
test('Initial rail mesh in pickMeshes', test1.inPickInitial);
test('Old disposed rail mesh purged from pickMeshes (no leak)', !test1.oldStillInPick);
test('New rebuilt rail mesh registered in pickMeshes', test1.newInPick);
test('Rebuilt rail mesh has correct rec reference', test1.hitRecIsR1);

console.log('=== TEST SUITE 2: RAIL GHOST TRANSPARENCY & WARNING TINT ===');
const test2 = await page.evaluate(() => {
  startPlacing('railway');
  // Drive the real pointer-preview path.  The same canvas point is first empty,
  // then occupied, so updateGhost itself must change the warning material.
  let event = null;
  for (const [clientX, clientY] of [[600, 620], [380, 650], [900, 620], [350, 420], [900, 420]]) {
    updateGhost({ clientX, clientY, target: canvas });
    if (placing.tile && canPlace(placing.def, placing.tile.x, placing.tile.z)) {
      event = { clientX, clientY, target: canvas };
      break;
    }
  }
  const meshGhost = ghost.children[0];
  const isGhostV = meshGhost.material === GHOST_V;
  const castShadow = meshGhost.castShadow;
  const receiveShadow = meshGhost.receiveShadow;
  const tile = placing.tile && { ...placing.tile };
  const validBefore = !!tile && canPlace(placing.def, tile.x, tile.z);
  const validColor = GHOST_V.color.getHex();
  const blocker = validBefore && place('railway', tile.x, tile.z);
  if (event) updateGhost(event);
  const invalidColor = GHOST_V.color.getHex();
  if (blocker) removeRec(blocker);
  stopPlacing();
  return {
    isGhostV,
    noCastShadow: !castShadow,
    noReceiveShadow: !receiveShadow,
    validBefore,
    validColor,
    invalidColor
  };
});
test('Rail ghost uses GHOST_V transparent material', test2.isGhostV);
test('Rail ghost does not cast shadows', test2.noCastShadow);
test('Rail ghost does not receive shadows', test2.noReceiveShadow);
test('Rail ghost is white when the real preview is valid', test2.validBefore && test2.validColor === 0xffffff);
test('Rail ghost warns with red/pink tint (0xff9a8a) after the real preview becomes blocked', test2.invalidColor === 0xff9a8a);

console.log('=== TEST SUITE 3: DRAG CANDIDATE STROKECMD ISOLATION ===');
const test3 = await page.evaluate(() => {
  // Simulate drag-and-drop of a pine tree
  dragCandidate = { defId: 'pine', x: 80, y: 80, moved: true };
  startPlacing('pine');
  placing.tile = { x: 18, z: 18 };
  canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 500, clientY: 500 }));
  const strokeCmdImmediatelyAfter = strokeCmd;

  // Place another object via separate click
  placing = { defId: 'rock', def: DEFS.rock, rot: 0, tile: { x: 19, z: 19 } };
  placeUserAt(19, 19, false);
  const rockCmd = history[history.length - 1];
  const pineCmd = history[history.length - 2];
  const pine = pineCmd.recs[0];
  const rock = rockCmd.recs[0];
  stopPlacing();
  const result = {
    strokeCmdCleared: strokeCmdImmediatelyAfter === null,
    commandsSeparated: pineCmd !== rockCmd,
    pineCmdCount: pineCmd.recs.length,
    rockCmdCount: rockCmd.recs.length
  };
  removeRec(rock);
  removeRec(pine);
  return result;
});
test('strokeCmd cleared after drag-drop pointerup', test3.strokeCmdCleared);
test('Subsequent click creates independent history command', test3.commandsSeparated);
test('Drag command contains exactly 1 object', test3.pineCmdCount === 1);
test('Click command contains exactly 1 object', test3.rockCmdCount === 1);

console.log('=== TEST SUITE 4: RESTOREREC CAP & DEDUPLICATION ===');
const test4 = await page.evaluate(() => {
  // Test 1: deduplicate objects
  const existingCount = objects.length;
  const sample = objects[0];
  restoreRec(sample);
  const countAfterDup = objects.length;

  // Test 2: walkSpots & bins deduplication
  const samplePlatform = objects.find(o => o.defId === 'platform');
  const walkSpotsBefore = walkSpots.length;
  if (samplePlatform) {
    restoreRec(samplePlatform);
  }
  const walkSpotsAfter = walkSpots.length;

  // Test 3: Cap enforcement in restoreRec
  const currentLen = objects.length;
  // Create mock rec
  const mockRec = { uid: 999999, defId: 'grass', def: DEFS.grass, tile: { x: 1, z: 1 }, group: new THREE.Group(), kind: 'static' };
  // Temporarily set objects.length to MAXO
  const originalObjs = [...objects];
  while (objects.length < MAXO) {
    objects.push({ uid: 88888, defId: 'grass', def: DEFS.grass, tile: { x: 0, z: 0 }, group: new THREE.Group(), kind: 'static' });
  }
  const lenAtCap = objects.length;
  restoreRec(mockRec);
  const lenAfterOverflowAttempt = objects.length;

  // Restore objects array
  objects.length = 0;
  objects.push(...originalObjs);

  return {
    noDupObject: countAfterDup === existingCount,
    noDupWalkSpot: walkSpotsAfter === walkSpotsBefore,
    lenAtCap,
    lenAfterOverflowAttempt
  };
});
test('restoreRec does not duplicate already-present objects', test4.noDupObject);
test('restoreRec does not duplicate walkSpots', test4.noDupWalkSpot);
test('restoreRec strictly obeys MAXO limit (does not exceed 900)', test4.lenAfterOverflowAttempt === 900);

console.log('=== TEST SUITE 5: TRAPPED NPC ESCAPE & BOUNDARY CLAMP ===');
const test5 = await page.evaluate(() => {
  // Simulate a world edit placing a solid object around an existing wanderer.
  // UI placement prevents this state, but recovery keeps save/import or future
  // world-edit code from leaving an entity permanently embedded.
  const cot = place('cottage', 25, 25);
  const hum = place('human', 25, 24);
  hum.pos = { x: t2w(25), z: t2w(25) };
  const initialPos = { ...hum.pos };
  const initialBlocked = blockedAt(hum.pos.x, hum.pos.z);

  // Run wander update for 300 ticks
  for (let i = 0; i < 300; i++) updateWander(hum, 0.016, i * 0.016);
  const afterEscapePos = { ...hum.pos };
  const afterBlocked = blockedAt(hum.pos.x, hum.pos.z);

  // Test boundary clamp
  hum.pos.x = HB + 10;
  hum.pos.z = -HB - 10;
  updateWander(hum, 0.016, 5);
  const clampedX = hum.pos.x <= HB && hum.pos.x >= -HB;
  const clampedZ = hum.pos.z <= HB && hum.pos.z >= -HB;

  // Clean up
  removeRec(cot);
  removeRec(hum);

  return {
    initialBlocked,
    afterEscapePosMoved: Math.hypot(afterEscapePos.x - initialPos.x, afterEscapePos.z - initialPos.z) > 1.0,
    afterBlocked,
    clampedX,
    clampedZ
  };
});
test('Human initially inside cottage is blocked', test5.initialBlocked);
test('Human successfully moves to escape blocked tile', test5.afterEscapePosMoved);
test('Human is no longer inside solid tile after escape', !test5.afterBlocked);
test('Human position clamped to X world boundary HB', test5.clampedX);
test('Human position clamped to Z world boundary HB', test5.clampedZ);

console.log('=== TEST SUITE 6: GROUND ASSETS ROTATABLE FLAGS ===');
const test6 = await page.evaluate(() => {
  return {
    railway: DEFS.railway.rotatable === false,
    platform: DEFS.platform.rotatable === false,
    pathway: DEFS.pathway.rotatable === false,
    grass: DEFS.grass.rotatable === false,
    cottage: DEFS.cottage.rotatable === true,
    tree: DEFS.tree.rotatable === true
  };
});
test('railway is rotatable: false', test6.railway);
test('platform is rotatable: false', test6.platform);
test('pathway is rotatable: false', test6.pathway);
test('grass is rotatable: false', test6.grass);
test('cottage remains rotatable: true', test6.cottage);
test('tree remains rotatable: true', test6.tree);

console.log('=== TEST SUITE 7: GENESIS TIMERS & RESET CLEANUP ===');
const test7 = await page.evaluate(() => {
  // Trigger genesis
  runGenesis();
  const timersCount = genesisTimers.length;
  // Trigger clearGenesisTimers
  clearGenesisTimers();
  const timersCleared = genesisTimers.length === 0;
  return {
    timersTracked: timersCount > 0,
    timersCleared
  };
});
test('Genesis timers tracked in genesisTimers array', test7.timersTracked);
test('clearGenesisTimers cancels all pending timers', test7.timersCleared);

console.log('=== TEST SUITE 8: BLUR & POINTERCANCEL STATE RESET ===');
const test8 = await page.evaluate(() => {
  panning = { x: 50, y: 50 };
  painting = true;
  dragCandidate = { defId: 'tree' };
  window.dispatchEvent(new Event('pointercancel'));
  const afterCancelPanning = panning;
  const afterCancelPainting = painting;
  const afterCancelCandidate = dragCandidate;

  panning = { x: 60, y: 60 };
  window.dispatchEvent(new Event('blur'));
  const afterBlurPanning = panning;

  return {
    cancelClean: afterCancelPanning === null && afterCancelPainting === false && afterCancelCandidate === null,
    blurClean: afterBlurPanning === null
  };
});
test('pointercancel resets panning, painting, dragCandidate', test8.cancelClean);
test('blur resets panning', test8.blurClean);

console.log('=== TEST SUITE 9: 100 -> 250 -> 500 -> 750 -> 900 OBJECT WORKLOAD LADDER ===');
const ladderResult = await page.evaluate(() => {
  // Clean back to baseline 97 objects before ladder
  while (objects.length > 97) {
    const lastObj = objects[objects.length - 1];
    removeRec(lastObj);
  }

  const stages = [100, 250, 500, 750, 900];
  const results = [];
  
  let tx = 0, tz = 0;
  for (const target of stages) {
    const t0 = performance.now();
    while (objects.length < target && tx < GRID) {
      if (canPlace(DEFS.grass, tx, tz)) {
        place('grass', tx, tz);
      }
      tz++;
      if (tz >= GRID) { tz = 0; tx++; }
    }
    const t1 = performance.now();
    const updateStart = performance.now();
    for (const ent of entities) {
      if (ent.defId === 'train') updateTrain(ent, 0.016, 1);
      else updateWander(ent, 0.016, 1);
    }
    const updateTime = performance.now() - updateStart;
    results.push({
      target,
      actualCount: objects.length,
      fillTimeMs: t1 - t0,
      simCostMs: updateTime
    });
  }
  
  // Try placing at exactly 900
  const overplaceResult = place('cottage', 1, 1);
  const overplaceEntityResult = place('human', 2, 2);
  const finalCount = objects.length;
  
  // Clean back to baseline
  while (objects.length > 97) {
    const lastObj = objects[objects.length - 1];
    removeRec(lastObj);
  }

  return {
    results,
    overplaceResult: overplaceResult === null,
    overplaceEntityResult: overplaceEntityResult === null,
    finalCount,
    cleanedToBaseline: objects.length === 97
  };
});

for (const r of ladderResult.results) {
  test(`Workload stage ${r.target} objects reached`, r.actualCount === r.target, `(${r.actualCount} objs, sim: ${r.simCostMs.toFixed(2)}ms)`);
}
test('Placing static object at 900 returns null', ladderResult.overplaceResult);
test('Placing entity at 900 returns null', ladderResult.overplaceEntityResult);
test('Object count capped at exactly 900', ladderResult.finalCount === 900);
test('Cleaned back to baseline 97 objects', ladderResult.cleanedToBaseline);

assertNoCriticalBrowserErrors(events, test);

console.log(`\nRED-TEAM AUDIT SUMMARY: ${pass} passed, ${fail} failed.`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
