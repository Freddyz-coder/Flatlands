import { buildCore } from './core.mjs';

const T = await buildCore();
// track along x=5..60 at z=10; train placed at x=30 heading east (+x);
// DIRS[0]={x:1,z:0} is the first connexion, so a fresh rail's conns at 30 will be empty -> but
// place() of the train triggers initTrain which uses railConns(tx,tz), i.e. the tile's own conns.
const t = T.place('train', 30, 10);
console.log('just initial', t.dirx, t.dirz, 'travel', t.travel);
for (let i = 0; i < 70; i++) T.updateTrain(t, 0.05, i / 20);
console.log('after 3.5s pos', t.pos.x.toFixed(2), 'tile', T.w2t(t.pos.x), 'dirx', t.dirx);
