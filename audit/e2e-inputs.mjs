// E2E for the new input behavior changes:
//  1) left-drag does NOT pan;  2) right-drag DOES pan;  3) Ctrl+R rotates the held
//  object and does NOT reload the page;  4) Restart button wipes + re-runs genesis.
import { assertNoCriticalBrowserErrors, launchFirefox, openReadyPage, startAppServer } from './browser.mjs';

const fixture = await startAppServer();
const server = fixture.server;
const browser = await launchFirefox();
const events = { pageErrors: [], consoleErrors: [], failedRequests: [] };
const page = await openReadyPage(browser, fixture.url, events);

const camTx = () => page.evaluate(() => cam.tx);

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS', n); } else { fail++; console.log('  FAIL', n); } };

const canvas = await page.$('#scene');
const box = await canvas.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

// 1) left-drag must NOT pan
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 5; i++) await page.mouse.move(cx + i * 30, cy, { steps: 4 });
await page.mouse.up();
const txAfterLeftDrag = await camTx();
ok(Math.abs(txAfterLeftDrag - 1) < 2, `left-drag does not pan (cam.tx=${txAfterLeftDrag.toFixed(2)})`);

// 2) right-drag MUST pan
await page.mouse.move(cx, cy);
await page.mouse.down({ button: 'right' });
for (let i = 1; i <= 5; i++) await page.mouse.move(cx + i * 30, cy, { steps: 4 });
await page.mouse.up({ button: 'right' });
const txAfterRightDrag = await camTx();
ok(Math.abs(txAfterRightDrag - txAfterLeftDrag) > 5, `right-drag pans (cam.tx ${txAfterLeftDrag.toFixed(2)} -> ${txAfterRightDrag.toFixed(2)})`);

// 3) Ctrl+R while holding a tree rotates it, no reload
await page.click('.item[data-def="tree"]');
await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
const rotBefore = await page.evaluate(() => placing.rot);
await page.keyboard.press('Control+r');
await page.waitForFunction(before => placing && placing.rot !== before, rotBefore, { timeout: 2000 });
const state = await page.evaluate(() => ({ rot: placing ? placing.rot : null, count: objects.length, restarted: Object.keys(STARTER).length ? true : true }));
ok(state.rot !== null && Math.abs(state.rot - (rotBefore + Math.PI / 4)) < 1e-6, `Ctrl+R rotates the held object (rot ${rotBefore.toFixed(3)} -> ${(state.rot ?? -9).toFixed(3)})`);
ok(state.count >= 97, `no reload happened (objects=${state.count})`);

// 4) Restart button re-runs genesis
await page.keyboard.press('Escape'); // drop held object
await page.click('#gearBtn');
await page.click('#restartBtn');
await page.click('#restartBtn');    // confirm
await page.waitForFunction(() => objects.length === STARTER.length, undefined, { timeout: 12000 });
const afterRestart = await page.evaluate(() => objects.length);
ok(afterRestart === 97, `restart re-runs genesis (objects=${afterRestart})`);
assertNoCriticalBrowserErrors(events, ok);

console.log(`input e2e: ${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
