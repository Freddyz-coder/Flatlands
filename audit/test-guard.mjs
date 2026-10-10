import { buildCore } from './core.mjs';

const T = await buildCore();
// pen, but leave a 1-tile hole in the NE corner and verify the human can exit through
// the hole (movement works) but never ends up inside a wall tile.
const center = { x: 15, z: 15 };
const walls = [[-1,0],[1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,-1]];
for (const [dx,dz] of walls) T.place('cottage', center.x+dx, center.z+dz);
// hole at (-1,1) (NW corner)
const holeRec = T.place('pathway', center.x-1, center.z+1);
const h = T.place('human', center.x, center.z);
let insideWall = 0, escaped = false;
for (let i = 0; i < 12000; i++) {
  T.updateWander(h, 0.016, i/60);
  const tx = T.w2t(h.pos.x), tz = T.w2t(h.pos.z);
  const isWall = T.objMap.has(T.key(tx, tz));
  if (isWall) insideWall++;
  if (!insideWall && (Math.abs(tx-center.x)>2 || Math.abs(tz-center.z)>2)) escaped = true;
}
console.log('ticks inside a wall tile:', insideWall, '/ 12000');
console.log('escaped via hole:', escaped);
let fail=0;
function assert(condition,name,detail){
  if(condition)console.log(`PASS: ${name}${detail?` (${detail})`:''}`);
  else{fail++;console.error(`FAIL: ${name}${detail?` (${detail})`:''}`);}
}
assert(insideWall===0,'wanderer never occupies a wall tile',`${insideWall}/12000 ticks`);
// This second invariant prevents a vacuous pass where movement is disabled or an
// entity remains permanently trapped at the centre.
assert(escaped,'wanderer escapes the pen through its one-tile opening');
console.log(`WALL GUARD SUMMARY: ${2-fail} passed, ${fail} failed.`);
process.exitCode=fail?1:0;
