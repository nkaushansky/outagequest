// SPOF smoke suite: REVIEW.md M1 (engine core) + M2 (vertical slice) +
// M3 (Act 1: instrument/topics/gates/onScoreComplete, act completability).
// Usage: node tools/smoke/smoke.mjs [baseURL] [shotsDir]
// Requires the built game served at baseURL (npm run build && npm run preview).
import { mkdirSync } from "node:fs";
import { launch } from "./browser.mjs";

const BASE = process.argv[2] ?? "http://localhost:4173/";
const SHOTS = process.argv[3] ?? "./smoke-shots";
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const ok = (cond, name, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + extra}`);
  if (!cond) failures++;
};

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const logText = () => page.locator(".log").innerText();
const status = () => page.locator(".status-score").innerText();
const run = async (cmd) => {
  await page.fill(".cmd-input", cmd);
  await page.press(".cmd-input", "Enter");
  await page.waitForTimeout(60);
};
const lastLines = async (n = 4) => (await logText()).split("\n").slice(-n).join("\n");
const score = async () => (await status()).match(/TICKETS (\d+)\//)[1];

// ---- M1 regression ------------------------------------------------------
ok(await page.locator("#scene canvas").count() === 1, "canvas mounted");
const attrs = await page.locator("#scene canvas").evaluate((c) => [c.width, c.height]);
ok(attrs[0] === 320 && attrs[1] === 180, "true 320x180 backbuffer", JSON.stringify(attrs));
ok((await logText()).includes("mug population"), "intro narration");
ok((await status()) === "TICKETS 1/250", "intro score", await status());

await run("look monitors");
ok((await lastLines()).includes("wall of red"), "monitors look", await lastLines());
await run("take mug");
await run("take mug");
ok((await score()) === "5", "mug scored once (2, not 4)", await score());
await run("pick up hoodie");
ok((await lastLines()).includes("dress code weeps"), "multi-word verb", await lastLines());
await run("window");
ok((await lastLines()).includes("candles"), "bare noun implies look", await lastLines());
await run("look mugz");
ok((await lastLines()).includes("Did you mean 'mug"), "did-you-mean", await lastLines());
await run("frobnicate rack");
ok((await lastLines()).includes("parser stares"), "unknown verb", await lastLines());
await run("take");
ok((await lastLines()).includes("what, exactly"), "needsObject prompt", await lastLines());
await run("take xyzzy");
ok((await lastLines()).includes("don't see any 'xyzzy'"), "unknown object snark", await lastLines());
await run("ls");
ok((await lastLines()).includes("hoodie"), "ls inventory", await lastLines());
await run("whoami");
ok((await lastLines()).includes("isn't it, Mel"), "whoami", await lastLines());
await run("man take");
ok((await lastLines(8)).includes("ALIASES"), "man page", await lastLines(8));
await run("sudo look monitors");
ok((await lastLines()).includes("unearned confidence"), "sudo power trip", await lastLines());
await run("ping rack");
ok((await lastLines()).includes("1 received"), "ping known object", await lastLines());
await run("restart");
ok((await lastLines()).includes("only service still running"), "bare restart intercepted", await lastLines());

// new-hotspot writing density
await run("look ups");
ok((await lastLines()).includes("B-flat"), "UPS look", await lastLines());
await run("look painting");
ok((await lastLines()).includes("webcam height"), "painting look", await lastLines());
await run("talk to rack");
ok((await lastLines()).includes("healthiest relationship"), "talk to rack", await lastLines());

// ---- M2: puzzle chain ---------------------------------------------------
await run("open cabinet");
ok((await lastLines()).includes("sleeping snake"), "cabinet yields cable", await lastLines());
ok((await score()) === "10", "cable scored (+3)", await score());
ok((await page.locator(".inv-chip").allInnerTexts()).includes("ethernet cable"), "cable in inventory");
await run("open cabinet");
ok((await lastLines()).includes("smell of 2009"), "cabinet second open", await lastLines());
ok((await score()) === "10", "cable not re-scored", await score());

await run("use cable on modem");
ok((await lastLines()).includes("sacred interval"), "cycle-first sysadmin logic", await lastLines());
ok((await score()) === "12", "cycle scored (+2)", await score());
await run("plug cable into modem");
ok((await lastLines()).includes("no route to host"), "puzzle solved: confirmed global", await lastLines());
ok((await score()) === "17", "confirm scored (+5)", await score());
await run("look monitors");
ok((await lastLines()).includes("artisanally confirmed"), "monitors confirmed branch", await lastLines());
await run("reboot modem");
ok((await lastLines()).includes("un-global"), "reboot falls through to use", await lastLines());

// ---- M2: death, gallery, one-step-back retry ----------------------------
await run("use ups");
ok((await lastLines()).includes("universal frequency"), "UPS warns first", await lastLines());
await run("use ups");
await page.waitForTimeout(200);
ok(!(await page.locator(".death").isHidden()), "death overlay shown");
ok((await page.locator(".death-title").innerText()) === "Locally Grounded", "gallery title from registry");
const deaths = await page.evaluate(() => [...window.spof.state.deathsFound]);
ok(deaths.includes("ups_grounded"), "death registered for gallery", JSON.stringify(deaths));
await page.locator(".death-retry").click();
await page.waitForTimeout(200);
ok(await page.locator(".death").isHidden(), "overlay dismissed on retry");
ok((await score()) === "17", "retry restores score (one step back)", await score());
const deathsAfter = await page.evaluate(() => [...window.spof.state.deathsFound]);
ok(deathsAfter.includes("ups_grounded"), "death collectible survives retry");

// ---- M2: autosave restore on reload --------------------------------------
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
ok((await logText()).includes("Autosave restored"), "autosave restore on reload");
ok((await score()) === "17", "score restored", await score());
ok((await page.locator(".inv-chip").allInnerTexts()).includes("ethernet cable"), "inventory restored");
await run("look modem");
ok((await lastLines()).includes("evidence"), "flags restored (modem branch)", await lastLines());

// ---- M2: export / import save string --------------------------------------
await run("save");
const saveLine = (await logText()).split("\n").filter((l) => l.startsWith("SPOF1.")).pop();
ok(!!saveLine, "save prints SPOF1. string");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
ok((await status()) === "TICKETS 1/250", "cleared storage = fresh game", await status());
await run("load " + saveLine);
ok((await lastLines()).includes("rehydrated"), "import narrates", await lastLines());
ok((await score()) === "17", "import restores score", await score());
ok((await page.locator(".inv-chip").allInnerTexts()).includes("ethernet cable"), "import restores inventory");

// ---- M2: reload during death overlay = one step back ----------------------
await run("use ups");
await run("use ups");
await page.waitForTimeout(200);
ok(!(await page.locator(".death").isHidden()), "second death overlay shown");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
ok(await page.locator(".death").isHidden(), "no overlay after reload");
ok((await score()) === "17", "death autosave held pre-command snapshot", await score());
const deathsPersist = await page.evaluate(() => [...window.spof.state.deathsFound]);
ok(deathsPersist.includes("ups_grounded"), "death collectible survives reload");

// ---- canvas: hotspot tap + walk -------------------------------------------
const canvas = page.locator("#scene canvas");
const box = await canvas.boundingBox();
const scale = Math.min(box.width / 320, box.height / 180);
const offX = box.x + (box.width - 320 * scale) / 2;
const offY = box.y + (box.height - 180 * scale) / 2;
const toClient = (x, y) => [offX + x * scale, offY + y * scale];

await page.fill(".cmd-input", "");
await page.dispatchEvent(".cmd-input", "input");
let [cx, cy] = toClient(120, 50); // monitors polygon
await page.mouse.click(cx, cy);
ok((await page.inputValue(".cmd-input")) === "monitors", "hotspot tap inserts noun", await page.inputValue(".cmd-input"));

[cx, cy] = toClient(250, 170); // open floor
await page.mouse.click(cx, cy);
await page.waitForTimeout(3200);
const pos = await page.evaluate(() => ({ ...window.spof.state.player }));
ok(Math.abs(pos.x - 250) < 2 && Math.abs(pos.y - 170) < 2, "click-to-walk reaches target", JSON.stringify(pos));

[cx, cy] = toClient(160, 2); // bare ceiling strip, no hotspot
await page.mouse.click(cx, cy);
await page.waitForTimeout(3200);
const inside = await page.evaluate(() => {
  const poly = window.spof.content.rooms.get(window.spof.state.roomId).walkable;
  const p = window.spof.state.player;
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ins = !ins;
  }
  return ins;
});
ok(inside, "out-of-polygon tap clamps inside");

// ---- M2 regression (2026-07-17 review): no missable score ------------------
// Confirm the outage BEFORE ever looking at the monitors; the saw_the_red
// discovery (+2) must still fire on the first look afterward.
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await run("open cabinet");
await run("use modem");
await run("use cable on modem");
ok((await score()) === "11", "confirm-first path reaches 11", await score());
await run("look monitors");
ok((await lastLines()).includes("frozen mid-scroll"), "discovery text after confirm", await lastLines());
ok((await score()) === "13", "saw_the_red not missable (+2 after confirm)", await score());
await run("look monitors");
ok((await lastLines()).includes("artisanally confirmed"), "second look hits confirmed branch", await lastLines());

// ---- input QoL (2026-07-18 device playtest) --------------------------------
// Player is at playerStart (160,150) after the reload above; canvas
// geometry helpers from the walk section are still in scope. Flags
// outage_discovered + confirmed_global are set by the section above.
ok((await page.locator(".suggest-chip").count()) === 0, "no suggestion chips on empty input");
[cx, cy] = toClient(120, 50); // monitors, outside the floor
await page.mouse.click(cx, cy);
ok((await page.inputValue(".cmd-input")) === "monitors", "hotspot tap names noun", await page.inputValue(".cmd-input"));
[cx, cy] = toClient(50, 30); // window, outside the floor
await page.mouse.click(cx, cy);
ok((await page.inputValue(".cmd-input")) === "window", "bare-noun tap replaces, not stacks", await page.inputValue(".cmd-input"));
await page.locator(".verb", { hasText: "USE" }).click(); // verb onto named thing
await page.waitForTimeout(60);
ok((await page.inputValue(".cmd-input")) === "", "verb tap on noun auto-runs", await page.inputValue(".cmd-input"));
ok((await lastLines()).includes("Nothing happens, professionally"), "auto-run hit use default", await lastLines());
await page.locator(".verb", { hasText: "LOOK" }).click(); // bare verb: composes
ok((await page.inputValue(".cmd-input")) === "look ", "bare verb tap composes, no run", JSON.stringify(await page.inputValue(".cmd-input")));
ok((await page.locator(".suggest-chip").count()) > 0, "object chips offered after verb");
[cx, cy] = toClient(120, 50); // noun onto composed verb
await page.mouse.click(cx, cy);
await page.waitForTimeout(60);
ok((await page.inputValue(".cmd-input")) === "", "noun tap completes verb and runs", await page.inputValue(".cmd-input"));
ok((await lastLines()).includes("artisanally confirmed"), "auto-ran look monitors", await lastLines());
await page.fill(".cmd-input", "look co");
await page.dispatchEvent(".cmd-input", "input");
await page.waitForTimeout(50);
await page.locator(".suggest-chip").first().click(); // chip completes and runs
await page.waitForTimeout(60);
ok((await lastLines()).includes("geological strata"), "suggestion chip auto-runs", await lastLines());
ok((await page.inputValue(".cmd-input")) === "", "input cleared after chip run", await page.inputValue(".cmd-input"));
await page.fill(".cmd-input", "look co");
await page.dispatchEvent(".cmd-input", "input");
await page.waitForTimeout(50);
await page.press(".cmd-input", "Tab"); // typing flow: Tab completes, never runs
ok((await page.inputValue(".cmd-input")) === "look corkboard ", "Tab completes without running", JSON.stringify(await page.inputValue(".cmd-input")));
await page.locator(".clear").click();
ok((await page.inputValue(".cmd-input")) === "", "clear button empties input", await page.inputValue(".cmd-input"));
[cx, cy] = toClient(150, 128); // floor, 2px under the chair polygon (inside old pad)
await page.mouse.click(cx, cy);
ok((await page.inputValue(".cmd-input")) === "", "floor tap near chair doesn't hotspot", await page.inputValue(".cmd-input"));
await page.waitForTimeout(900);
const qpos = await page.evaluate(() => ({ ...window.spof.state.player }));
ok(Math.abs(qpos.x - 150) < 2 && Math.abs(qpos.y - 128) < 2, "floor tap walks instead", JSON.stringify(qpos));

// ---- M3: instrument condition (review must-fix) ----------------------------
// State: confirm-first flags set, score 13, cable in inventory, no mug yet.
await run("take mug");
await run("use mug on modem");
ok((await lastLines()).includes("The mug abides"), "wrong instrument gets bespoke snark", await lastLines());
ok((await score()) === "15", "mug-on-modem awards nothing", await score());
await run("use hoodie on modem");
ok((await lastLines()).includes("will not un-global it"), "wrong instrument falls through post-confirm", await lastLines());
await run("take hoodie");
ok((await score()) === "17", "office score complete at 17", await score());
ok((await logText()).includes("everything this office owes you"), "onScoreComplete aside fired");
const scFlags = await page.evaluate(() => [...window.spof.state.flags].filter((f) => f.startsWith("__scorecomplete")));
ok(scFlags.includes("__scorecomplete_act1_home_office"), "onScoreComplete flagged once", JSON.stringify(scFlags));

// ---- M3: pointer rewrites + act gates ---------------------------------------
await run("take coat");
ok((await page.locator(".inv-chip").allInnerTexts()).includes("coat"), "coat takeable after confirmation");
await run("open door");
ok((await logText()).includes("bigger than you remember"), "office door opens to the house", await lastLines());
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_living_room", "arrived in living room");
ok((await score()) === "18", "living room entry scored", await score());

// Scene-space click helper. Re-measures the canvas box every time — the
// layout must never drift (see the #ui min-width fix), but a stale box
// would turn any regression into misleading downstream failures.
const sceneMap = async () => {
  const b = await canvas.boundingBox();
  const s = Math.min(b.width / 320, b.height / 180);
  return {
    s,
    x: (ix) => b.x + (b.width - 320 * s) / 2 + ix * s,
    y: (iy) => b.y + (b.height - 180 * s) / 2 + iy * s,
  };
};
const clickScene = async (ix, iy) => {
  const m = await sceneMap();
  await page.mouse.click(m.x(ix), m.y(iy));
};

// walk into the gated front-door exit without pants: blocked entry fires
await page.evaluate(() => { window.spof.state.player.x = 288; window.spof.state.player.y = 150; });
await clickScene(302, 160);
await page.waitForTimeout(1200);
ok((await logText()).includes("critical path"), "gated exit blocks without pants", await lastLines());
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_living_room", "gate held the door");

// ---- M3: living room + bedroom (pants puzzle, shelf death) ------------------
await run("look doorbell chime");
await run("use bike");
await run("open couch");
ok((await score()) === "22", "living room curiosity scored", await score());
ok((await logText()).includes("fully audited"), "living room onScoreComplete aside");
await run("open bedroom door");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_bedroom", "entered bedroom");
await run("look under bed");
ok((await lastLines()).includes("HARD PANTS"), "under-bed discovery", await lastLines());
await run("open under bed");
ok((await lastLines(6)).includes("cold storage"), "pants restored from cold storage", await lastLines(6));
ok((await page.locator(".inv-chip").allInnerTexts()).includes("real pants"), "pants in inventory");
ok((await score()) === "29", "bedroom scored (2+5)", await score());
ok((await logText()).includes("front door is the next open ticket"), "bedroom onScoreComplete aside");

await run("take boxes");
ok((await lastLines()).includes("geological groan"), "shelf warns before killing", await lastLines());
await run("take boxes");
await page.waitForTimeout(200);
ok((await page.locator(".death-title").innerText()) === "Legacy Infrastructure", "CRT death registered title");
await page.locator(".death-retry").click();
await page.waitForTimeout(200);
ok((await score()) === "29", "CRT death retry is one step back", await score());

await run("wear pants");
ok((await lastLines()).includes("crease engages"), "wear pants via item responses", await lastLines());

// ---- M3: main street (set piece, wrong-name gag, road death) ----------------
await run("open door");
await run("open front door");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_main_street", "front door opens with pants on");
ok((await logText()).includes("eleven steps"), "leaving-the-house set piece", await lastLines(8));
ok((await score()) === "33", "outside-at-last scored", await score());

// east gate blocked before the diner reveal
await page.evaluate(() => { window.spof.state.player.x = 300; window.spof.state.player.y = 150; });
await clickScene(315, 150);
await page.waitForTimeout(1000);
ok((await logText()).includes("It serves pie"), "east exit blocked without the trail", await lastLines());

await run("look notice board");
ok((await lastLines(4)).includes("CANCELLED"), "Nimbus lore on the notice board", await lastLines(4));
await run("talk to gary");
ok((await lastLines(4)).includes("NEIL"), "Gary gets the name wrong", await lastLines(4));
await run("ask gary about nimbus");
ok((await lastLines()).includes("Nimbus people"), "Gary topic responds", await lastLines());
ok((await score()) === "35", "main street curiosity scored", await score());
ok((await logText()).includes("fully canvassed"), "main street onScoreComplete aside");

await run("use road");
ok((await lastLines()).includes("near-miss"), "road warns before killing", await lastLines());
await run("use road");
await page.waitForTimeout(200);
ok((await page.locator(".death-title").innerText()) === "100% Packet Loss", "road death registered title");
await page.locator(".death-retry").click();
await page.waitForTimeout(200);

// ---- M3: diner (topics, tally, mug instrument, the reveal) ------------------
await run("open diner");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_diner", "entered the diner");
await run("talk to darlene");
ok((await lastLines()).includes("two names today"), "wrong-name tally at Darlene", await lastLines());
await run("talk to merle");
ok((await lastLines()).includes("three names today"), "wrong-name tally at Merle", await lastLines());

await page.fill(".cmd-input", "ask merle about ");
await page.dispatchEvent(".cmd-input", "input");
await page.waitForTimeout(60);
ok((await page.locator(".suggest-chip").allInnerTexts()).includes("internet"), "topic chips offered after about");
await page.fill(".cmd-input", "");
await page.dispatchEvent(".cmd-input", "input");

await run("ask merle about internet");
ok((await lastLines(6)).includes("Kim's Nails"), "Merle reveals the edge node", await lastLines(6));
ok((await score()) === "40", "edge intel scored (+4)", await score());
await run("ask darlene about kubernetes");
ok((await lastLines()).includes("city stuff"), "topicDefault catches unknown topics", await lastLines());
await run("use cable on urn");
ok((await lastLines()).includes("not whatever that is"), "generic wrong-instrument snark (urn)", await lastLines());
await run("use mug on urn");
ok((await lastLines()).includes("brought your own"), "mug fills at the urn (instrument)", await lastLines());
ok((await score()) === "42", "coffee scored (+2)", await score());
ok((await logText()).includes("ledger closes"), "diner onScoreComplete aside");
await run("use mug");
ok((await lastLines()).includes("route packets"), "drinking the coffee", await lastLines());

// ---- M3: act out — gate opens, act completable at 45 ------------------------
await run("open door");
await page.evaluate(() => { window.spof.state.player.x = 300; window.spof.state.player.y = 150; });
await clickScene(315, 150);
await page.waitForTimeout(1500);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_edge_of_town", "east gate opens with the trail");
ok((await logText()).includes("END OF ACT ONE"), "act-out stinger narrates");
ok((await score()) === "45", "Act 1 completable at exactly 45", await score());
// The mid-suite localStorage.clear() wiped the earlier UPS collectible, so
// this lifetime can only hold the two new Act 1 deaths (ups_grounded is
// asserted in the M2 section within its own storage lifetime).
const m3deaths = await page.evaluate(() => [...window.spof.state.deathsFound]);
ok(["legacy_infrastructure", "packet_loss"].every((d) => m3deaths.includes(d)),
  "both new Act 1 deaths collected + registered", JSON.stringify(m3deaths));

// no dead-man-walking: the world stays open at act end
await page.evaluate(() => { window.spof.state.player.x = 26; window.spof.state.player.y = 150; });
await clickScene(6, 150);
await page.waitForTimeout(1200);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_main_street", "act end is not a dead end");

// ---- M3: drag-to-walk -------------------------------------------------------
await page.evaluate(() => { window.spof.state.player.x = 60; window.spof.state.player.y = 150; });
const dm = await sceneMap();
await page.mouse.move(dm.x(60), dm.y(150));
await page.mouse.down();
for (let i = 1; i <= 8; i++) {
  await page.mouse.move(dm.x(60 + i * 15), dm.y(150));
  await page.waitForTimeout(70);
}
const dragPos = await page.evaluate(() => ({ ...window.spof.state.player }));
await page.mouse.up();
ok(dragPos.x > 85, "drag-to-walk follows the pointer", JSON.stringify(dragPos));

// ---- M3: every hotspot in every room has a bespoke LOOK ---------------------
const lookGaps = await page.evaluate(() => {
  const gaps = [];
  for (const [id, room] of window.spof.content.rooms) {
    for (const h of room.hotspots) {
      if (!h.responses?.look?.length) gaps.push(`${id}.${h.id}`);
    }
  }
  return gaps;
});
ok(lookGaps.length === 0, "every hotspot has a bespoke LOOK", JSON.stringify(lookGaps));

// ---- console + screenshots -------------------------------------------------
ok(consoleErrors.length === 0, "zero console errors", JSON.stringify(consoleErrors));

await page.screenshot({ path: `${SHOTS}/desktop.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/mobile-portrait.png` });
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/mobile-landscape.png` });

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
