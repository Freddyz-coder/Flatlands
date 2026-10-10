// Instrumented placeUserAt call at the exact browser click path:
// window pointerup → placing && !painted → placeUserAt(tile). Which guard fails?
import { buildCore } from './core.mjs';
const T = await buildCore();
// place genesis subset near the click point like the browser had
T.place('railway', 40, 43);
// click tile (62,17) is EMPTY — placeUserAt should succeed:
const before = T.objects.length;
const placing = { defId: 'tree', def: T.DEFS.tree, rot: 0, tile: { x: 62, z: 17 }, gTile: null };
const tx = placing.tile.x, tz = placing.tile.z;
console.log('canPlace:', T.canPlace(placing.def, tx, tz));
const rec = T.place('tree', tx, tz, 0);
console.log('place() returned:', rec ? rec.uid : null);
console.log('objects:', T.objects.length, '(was', before + ')');
