import { buildCore } from './core.mjs';

const T = await buildCore();
const center = { x: 15, z: 15 };
for (const [dx, dz] of [[-1,0],[1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]])
  T.place('cottage', center.x + dx, center.z + dz);
const h = T.place('human', center.x, center.z);

let lastInside = true, escapeTick = -1;
for (let i = 0; i < 3600; i++) {
  T.updateWander(h, 0.016, i / 60);
  const tx = T.w2t(h.pos.x), tz = T.w2t(h.pos.z);
  const inside = (tx === center.x && tz === center.z);
  if (lastInside && !inside) {
    escapeTick = i;
    console.log(`ESCAPE at tick ${i} (t=${(i/60).toFixed(2)}s)`);
    console.log(`  pos=(${h.pos.x.toFixed(3)},${h.pos.z.toFixed(3)}) tile=(${tx},${tz}) heading=${h.heading.toFixed(3)}`);
    console.log(`  ai: mode=${h.ai.mode} target=(${h.ai.tx.toFixed(2)},${h.ai.tz.toFixed(2)}) avoid=${h.ai.avoid?.toFixed(2)} stuck=${(h.ai.stuck||0).toFixed(2)}`);
    const ob = T.objMap.get(T.key(tx, tz));
    console.log(`  landed on tile obj: ${ob ? ob.defId : '(none)'}`);
    // which neighbour tile did it pass through?
    console.log(`  neighbours: ${[[-1,0],[1,0],[0,1],[0,-1]].map(([dx,dz])=>{
      const r = T.objMap.get(T.key(center.x+dx, center.z+dz));
      return `${dx},${dz}:${r?r.defId:'EMPTY'}`;
    }).join(' ')}`);
    lastInside = false;
    if (i > 0) break; // stop at first escape for a clean trace
  }
}
if (escapeTick < 0) console.log('NO ESCAPE — human stayed in pen for 60s');
