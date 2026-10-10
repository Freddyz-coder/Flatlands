import { buildCore } from './core.mjs';
const T = await buildCore();
T.place('railway', 5, 5); T.place('railway', 6, 5); T.place('railway', 6, 6); T.place('railway', 6, 7);
const del = T.groundMap.get(T.key(6, 6));
T.removeRec(del);
console.log('after deleting (6,6):');
console.log('  railConns(6,7) =', JSON.stringify(T.railConns(6, 7)));
console.log('  railConns(6,5) =', JSON.stringify(T.railConns(6, 5)));
console.log('  railConns(5,5) =', JSON.stringify(T.railConns(5, 5)));
// railConns(DIRS) of (6,7): neighbours are (7,7) [none], (5,7)[none], (6,8)[none], (6,6)[deleted] -> 0 is CORRECT.
// (6,7) has only ONE rail neighbour in the original L: (6,6). After cutting (6,6), (6,7) becomes isolated -> 0.
// The test expectation (1) was wrong: it assumed (6,7) connects to (6,8) — but no rail there.
console.log('(6,7) had neighbours: (6,6) only — so 0 after the cut is CORRECT graph semantics.');
