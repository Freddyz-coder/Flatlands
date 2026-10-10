// History stress: runs the shipped browser history block extracted by core.mjs
// against the actual placement/removal records used by the game.
import { buildCore } from './core.mjs';
const C = buildCore();
const { history, pushCmd, undo, redo } = C;

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.log('FAIL', name); } };

// ==== Sequence A: place 3 trees -> undo all -> redo all
{
  const recs = [C.place('tree',5,5), C.place('tree',6,5), C.place('tree',7,5)];
  const cmd = {t:'multi', recs}; pushCmd(cmd);
  ok(C.objects.length===3, 'A: three objects placed');
  undo(); ok(C.objects.length===0, 'A: undo removes all three (multi, reverse order)');
  ok(C.groundMap.size===0 && C.objMap.size===0, 'A: maps empty after undo');
  redo(); ok(C.objects.length===3, 'A: redo restores all three');
  ok(C.objMap.size===3, 'A: objMap fully re-synced after redo');
}
// ==== Sequence B: interleaved transforms + undo/redo integrity
{
  const r = C.place('tree', 10, 10);
  const before = { scale: r.scale, rot: r.rot };
  const cmdB = {t:'tr', rec:r, b:{...before}, a:{rot:Math.PI/2, scale:1.5}, ts:0};
  pushCmd(cmdB);
  undo();            // step back so the transform cmd is *pending* (matches real usage)
  redo(); ok(r.scale===1.5 && Math.abs(r.rot - Math.PI/2)<1e-9, 'B: redo applies pending transform');
  undo(); ok(r.scale===1 && r.rot===0, 'B: undo restores original rot/scale exactly');
  // undo past the beginning
  for (let i=0;i<20;i++) undo();
  ok(C.objects.length===1, 'B: undo stops at the first command (no double-apply)');
  const errBefore = C.objects.length;
  for (let i=0;i<20;i++) redo();
  ok(C.objects.length>=1, 'B: redo at the frontier does not fail');
  // clear history (simulate pushCmd past the frontier: new edit discards the branch)
  const r2 = C.place('tree', 11, 10);
  pushCmd({t:'multi', recs:[r2]});
  ok(C.getHistIdx()===history.length-1, 'B: pushing a new cmd truncates the redo branch');
}
// ==== Sequence C: delete + undo-delete + redo-delete rapid cycling
{
  const r = C.place('bench', 20, 20);
  pushCmd({t:'del', rec:r});
  C.removeRec(r);
  undo();
  ok(C.objects.includes(r) && C.objMap.has(C.key(20,20)), 'C: undo-delete restores registry and object map');
  redo();
  ok(!C.objects.includes(r) && !C.objMap.has(C.key(20,20)), 'C: redo-delete removes registry and object map');
  C.restoreRec(r);
  for (let i=0;i<50;i++){ C.removeRec(r); C.restoreRec(r); }  // user rips repeatedly
  ok(C.objects.includes(r), 'C: object survives rapid remove/restore cycle');
  ok(C.objMap.has(C.key(20,20)), 'C: objMap coherent after churn');
}
// ==== Sequence D: history depth cap (120) keeps bounds
{
  for (let i=0;i<200;i++) pushCmd({t:'multi', recs:[C.place('grass', i%C.GRID, 30)]});
  ok(history.length<=120, 'D: history capped at 120 entries, got ' + history.length);
}

console.log('history stress:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
