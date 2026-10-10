// Phase-1 connected railway: topology, traversal, editor + persistence.
import { buildCore } from './core.mjs';
let pass=0,fail=0;const bad=[];
function ok(c,n,d=''){if(c){pass++;console.log('  PASS',n,d);}else{fail++;console.error('  FAIL',n,d);bad.push(n);}}
const fresh=()=>buildCore();
console.log('== R1 topology: straights, curves, branches, tolerance ==');
{
  const T=fresh();
  T.place('railway',10,10);T.place('railway',11,10);T.place('railway',12,10);
  ok(T.railAreConnected(10,10,12,10),'straight line connects end to end');
  ok(T.railSegmentAt(11,10).links.length===2,'middle straight has 2 links');
  ok(T.railStats().deadEnds===2,'straight line has 2 dead ends');
  const T2=fresh();
  T2.place('railway',20,20);T2.place('railway',21,20);T2.place('railway',21,21);
  ok(T2.railAreConnected(20,20,21,21),'corner curve connects via endpoints');
  ok(T2.railSegmentAt(21,20).links.length===2,'corner tile has 2 links');
  const T3=fresh();
  T3.place('railway',30,30);T3.place('railway',31,30);T3.place('railway',32,30);T3.place('railway',31,31);
  ok(T3.railBranches().length===1,'T junction reports one branch');
  ok(T3.railSegmentAt(31,30).links.length===3,'junction tile has 3 links');
  const T4=fresh();
  T4.place('railway',40,40);T4.place('railway',42,40);
  ok(!T4.railAreConnected(40,40,42,40),'gap of one tile does not connect');
  ok(T4.railSegmentAt(40,40).links.length===0,'gapped stub stays disconnected');
  const T5=fresh();
  T5.place('railway',50,50);T5.place('railway',51,51);
  ok(!T5.railAreConnected(50,50,51,51),'diagonal touch does not connect');
  ok(T5.railValidate().ok,'validator clean on disjoint stubs');
}
console.log('== R2 identity, duplicates, self-links ==');
{
  const T=fresh();
  const a=T.place('railway',10,20),b=T.place('railway',11,20);
  ok(a.uid!==b.uid,'segments carry stable distinct uids');
  T.rebuildRailNet();T.rebuildRailNet();
  ok(T.railValidate().ok,'repeated rebuilds stay valid, no dup links');
  const n=T.railSegmentAt(10,20);
  ok(!n.links.includes(n.uid),'no self-connection');
  ok(new Set(n.links).size===n.links.length,'no duplicate links');
}
console.log('== R3 routes: BFS on actual links, unreachable detected ==');
{
  const T=fresh();
  for(let x=10;x<=14;x++)T.place('railway',x,30);
  T.place('railway',60,30);T.place('railway',61,30);
  const r=T.railFindRoute(10,30,14,30);
  ok(!!r&&r.path.length===5&&r.length===4,'route spans 5 linked segments');
  ok(r.path[0].x===10&&r.path[4].x===14,'route endpoints match request');
  ok(T.railFindRoute(10,30,61,30)===null,'unreachable destination returns null');
  ok(T.railFindRoute(10,30,10,30).length===0,'same-tile route is length 0');
}
console.log('== R4 trains: traverse, orient, wagons, dead end, sabotage ==');
{
  const T=fresh();
  for(let x=10;x<=16;x++)T.place('railway',x,40);
  const tr=T.place('train',10,40);
  const x0=tr.pos.x;
  for(let i=0;i<600;i++)T.updateTrain(tr,0.05,i/20);
  ok(tr.pos.x>x0+2,'train progresses across connected segments');
  ok(Number.isFinite(tr.pos.x+tr.pos.z)&&Number.isFinite(tr.yaw),'train pose stays finite');
  const d0=Math.hypot(tr.cars[0].position.x-tr.pos.x,tr.cars[0].position.z-tr.pos.z);
  const d1=Math.hypot(tr.cars[1].position.x-tr.pos.x,tr.cars[1].position.z-tr.pos.z);
  ok(d0>0.5&&d0<12&&d1>d0&&d1<16,'wagon spacing sane');
  const T5=fresh();
  T5.place('railway',20,20);T5.place('railway',21,20);T5.place('railway',21,21);
  const tc=T5.place('train',20,20);
  let yawBad=false;
  for(let i=0;i<800;i++){T5.updateTrain(tc,0.05,i/20);if(!Number.isFinite(tc.yaw))yawBad=true;}
  ok(!yawBad,'orientation finite through curve and transitions');
  const T6=fresh();
  T6.place('railway',30,30);
  const td=T6.place('train',30,30);
  for(let i=0;i<300&&!td.paused;i++)T6.updateTrain(td,0.05,i/20);
  ok(td.paused,'dead end handled deterministically (paused, no NaN)');
  ok(Number.isFinite(td.pos.x+td.pos.z),'dead-end pose finite');
  const T7=fresh();
  for(let x=40;x<=44;x++)T7.place('railway',x,40);
  const ts=T7.place('train',40,40);
  for(let i=0;i<100;i++)T7.updateTrain(ts,0.05,i/20);
  const mid=T7.groundMap.get(T7.key(42,40));T7.removeRec(mid);
  let threw=false,nan=false;
  try{for(let i=0;i<120;i++){T7.updateTrain(ts,0.05,i/20);if(!Number.isFinite(ts.pos.x+ts.pos.z))nan=true;}}catch(e){threw=true;}
  ok(!threw&&!nan,'track removal mid-run is safe (pause, no crash/NaN)');
  const gone=T7.groundMap.get(T7.key(40,40));T7.removeRec(gone);
  let threw2=false;
  try{T7.updateTrain(ts,0.016,999);}catch(e){threw2=true;}
  ok(!threw2,'stale train update after removal does not throw');
  const T8=fresh();
  for(let x=50;x<=53;x++)for(let z=50;z<=53;z++)T8.place('railway',x,z);
  const tl=T8.place('train',50,50);
  let bad2=false;
  for(let i=0;i<2000;i++){T8.updateTrain(tl,0.05,i/20);if(!Number.isFinite(tl.pos.x+tl.pos.z)){bad2=true;break;}}
  ok(!bad2,'dense grid stays finite over 2000 steps (per-frame work bounded)');
  const T9=fresh();
  T9.place('railway',60,60);T9.place('railway',61,60);T9.place('railway',61,61);T9.place('railway',60,61);
  const loop=T9.place('train',60,60);
  const lx0=loop.pos.x,lz0=loop.pos.z;
  for(let i=0;i<1200;i++)T9.updateTrain(loop,0.05,i/20);
  const moved=Math.hypot(loop.pos.x-lx0,loop.pos.z-lz0);
  ok(Number.isFinite(loop.pos.x+loop.pos.z)&&!loop.paused,'closed loop circulates without pausing');
  ok(moved>0.5,'loop train actually travels, moved '+moved.toFixed(2));
}
console.log('== R5 editor + persistence: place/remove/undo/redo/rebuild ==');
{
  const T=fresh();
  T.place('railway',10,50);T.place('railway',11,50);
  ok(T.railAreConnected(10,50,11,50),'placement links neighbours');
  const mid=T.groundMap.get(T.key(11,50));T.removeRec(mid);
  ok(T.railSegmentAt(10,50).links.length===0,'removal invalidates obsolete links');
  T.restoreRec(mid);
  ok(T.railAreConnected(10,50,11,50),'restore re-links');
  const r=T.place('railway',20,50);T.pushCmd({t:'multi',recs:[r]});
  T.undo();
  ok(T.railSegmentAt(20,50)===null,'undo removes segment from graph');
  T.redo();
  ok(!!T.railSegmentAt(20,50),'redo restores graph node');
  const before=T.railStats().segments;
  T.rebuildRailNet();
  ok(T.railStats().segments===before&&T.railValidate().ok,'rebuild idempotent, no dup links');
}
console.log(`\nRAIL SUMMARY: ${pass} passed, ${fail} failed`);
if(bad.length)console.log('FAILURES:\n - '+bad.join('\n - '));
process.exit(fail?1:0);

