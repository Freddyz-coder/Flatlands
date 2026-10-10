// Comprehensive regression checks for the Flatlands gameplay expansion:
// Weather system, new town buildings, NPC purposeful behaviors, catalog filtering, and duplication.
import fs from 'fs';
import { buildCore } from './core.mjs';

const html = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
function ok(value, name) {
  if (value) { pass++; console.log('  PASS', name); }
  else { fail++; console.error('  FAIL', name); }
}

console.log('== 1. new town buildings & infrastructure catalog ==');
const C = buildCore();
const townAssets = ['station', 'shop', 'clocktower', 'bridge', 'road', 'fountain'];
townAssets.forEach(id => {
  ok(C.DEFS[id] && typeof C.DEFS[id].build === 'function', `catalog defines ${id}`);
  ok(typeof C.DEFS[id].cat === 'string' && C.DEFS[id].name, `${id} has valid category and display name`);
});

console.log('== 2. placement validation & layer checks ==');
townAssets.forEach((id, i) => {
  const rec = C.place(id, 8 + i, 8);
  ok(rec !== null, `${id} successfully places on empty tile (8+${i}, 8)`);
});

// Overlap validation: placing on same tile must be rejected
ok(C.place('cottage', 8, 8) === null, 'overlapping static placement on station tile rejected');
ok(C.place('road', 12, 8) === null, 'overlapping ground placement where road already exists rejected');

// Ground height checking for new infrastructure
ok(Math.abs(C.groundYAt(C.t2w(12), C.t2w(8)) - 0.12) < 1e-4, 'groundYAt returns elevated road height (0.12)');

// WalkSpots registration for road and bridge
const roadRec = C.objects.find(o => o.defId === 'road');
ok(roadRec && C.walkSpots.includes(roadRec), 'road registers in walkSpots upon placement');
const bridgeRec = C.objects.find(o => o.defId === 'bridge');
ok(bridgeRec && C.walkSpots.includes(bridgeRec), 'footbridge registers in walkSpots upon placement');

// Undo / Redo for new town asset
C.removeRec(roadRec);
ok(!C.objects.includes(roadRec) && !C.walkSpots.includes(roadRec), 'road removal cleans registry and walkSpots');
C.restoreRec(roadRec);
ok(C.objects.includes(roadRec) && C.walkSpots.includes(roadRec), 'road restoration recovers registry and walkSpots');

console.log('== 3. weather system state & lighting integration ==');
ok(Array.isArray(C.WEATHER_TYPES) && C.WEATHER_TYPES.length === 4, 'WEATHER_TYPES defines 4 states');
ok(C.WEATHER_TYPES.includes('clear') && C.WEATHER_TYPES.includes('rain'), 'weather includes clear and rain');
ok(C.weather && C.weather.type === 'clear', 'initial weather defaults to clear');

C.setWeather('rain');
ok(C.weather.type === 'rain', 'setWeather transitions to rain');
C.updateWorldLighting(true);
ok(C.weather.type === 'rain', 'updateWorldLighting executes cleanly during rain');

C.setWeather('fog');
ok(C.weather.type === 'fog', 'setWeather transitions to fog');
C.updateWorldLighting(true);
ok(C.weather.type === 'fog', 'updateWorldLighting executes cleanly during fog');

C.setWeather('cloudy');
ok(C.weather.type === 'cloudy', 'setWeather transitions to cloudy');

C.setWeather('clear');
ok(C.weather.type === 'clear', 'setWeather transitions back to clear');
C.updateWorldLighting(true);

console.log('== 4. NPC purpose & behavior enhancements ==');
const human = C.place('human', 20, 20);
ok(human !== null, 'human placed for behavior test');

const dog = C.place('dog', 22, 20);
ok(dog !== null, 'dog placed for companion test');

// Run companion target selection: dog should pick finite target within world bounds
C.pickTargetW(dog);
ok(isFinite(dog.ai.tx) && isFinite(dog.ai.tz), 'dog companion target coordinates are finite');
ok(Math.abs(dog.ai.tx) <= C.HB && Math.abs(dog.ai.tz) <= C.HB, 'dog target stays inside world boundaries HB');

// Run duck target selection near water/fountain
const duck = C.place('duck', 21, 21);
ok(duck !== null, 'duck placed for water attraction test');
C.pickTargetW(duck);
ok(isFinite(duck.ai.tx) && isFinite(duck.ai.tz), 'duck target coordinates are finite');
ok(Math.abs(duck.ai.tx) <= C.HB && Math.abs(duck.ai.tz) <= C.HB, 'duck target stays inside world boundaries HB');

// Wanderer updates across weather conditions
C.setWeather('rain');
C.updateWander(human, 0.016, 0);
ok(isFinite(human.pos.x) && isFinite(human.pos.z), 'human wander update remains finite in rain');

C.updateWander(dog, 0.016, 0);
ok(isFinite(dog.pos.x) && isFinite(dog.pos.z), 'dog wander update remains finite in rain');

C.updateWander(duck, 0.016, 0);
ok(isFinite(duck.pos.x) && isFinite(duck.pos.z), 'duck wander update remains finite in rain');

console.log('== 5. UI markup & usability controls ==');
ok(html.includes('id="catTabs"'), 'category tabs markup is shipped in sidebar');
ok(html.includes('class="catTab"') && html.includes('data-cat="build"'), 'category tab buttons are defined');
ok(html.includes('id="clockWeather"'), 'clock weather readout badge is shipped');
ok(html.includes('id="opDup"'), 'object duplicate button is shipped in objpop');
ok(html.includes('id="opCoords"'), 'object coordinates display is shipped in objpop');
ok(html.includes('id="weatherSeg"'), 'weather segment controls are shipped in Settings');
ok(html.includes('data-set="autoWeather"'), 'automatic weather toggle is shipped');
ok(html.includes('RAIN_COUNT = 180') || html.includes('RAIN_COUNT=180'), 'bounded rain particle effect is shipped');
ok(html.includes('duplicateSelected'), 'duplicateSelected action handler is shipped');
ok(html.includes("k==='d'") && html.includes('duplicateSelected'), 'Ctrl+D keyboard shortcut is wired');

console.log(`\nEXPANSION SUMMARY: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
