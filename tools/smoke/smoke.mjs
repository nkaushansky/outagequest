// SPOF smoke suite: REVIEW.md M1 (engine core) + M2 (vertical slice) +
// M3 (Act 1: instrument/topics/gates/onScoreComplete, act completability) +
// M3.5 (sprites: outfit map, NPC presence, talk cycles, real canvas pixels).
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
/** Put back any open document close-up (the player's Esc). Commands that
 *  open papers would otherwise leave the overlay eating the next click. */
const dismissDoc = () => page.evaluate(() => {
  const d = document.querySelector(".docview");
  if (d && !d.hidden) document.querySelector(".doc-dismiss").click();
});
const run = async (cmd) => {
  await dismissDoc();
  await page.fill(".cmd-input", cmd);
  await page.press(".cmd-input", "Enter");
  await page.waitForTimeout(60);
};
const lastLines = async (n = 4) => (await logText()).split("\n").slice(-n).join("\n");
// Status shows the queue counting down ("TICKETS OPEN 205/250"); checks
// reason in closed tickets, so convert back.
const score = async () => {
  const m = (await status()).match(/TICKETS OPEN (\d+)\/(\d+)/);
  return String(Number(m[2]) - Number(m[1]));
};

// M3.5 sprite probes. Master-palette ramps are the style authority
// (tools/sprites/chars/_master_palette.py) — stable by design, so exact
// canvas pixels are legitimate render evidence.
const RAMP = {
  slate_m: [94, 110, 128],    // Mel's hoodie
  khaki_m: [160, 136, 94],    // the Real Pants
  coat_m: [134, 102, 64],     // the Going Outside coat
  polo_m: [122, 156, 182],    // Gary
  apron_l: [240, 234, 220],   // Darlene
  flannel_m: [146, 62, 42],   // Merle
  rose_m: [188, 108, 122],    // Kim's tunic (M4)
  lavender_m: [156, 136, 176], // Dot's cardigan (M4)
};
const playerSprite = () => page.evaluate(() => window.spof.sprites.player());
const npcIds = () => page.evaluate(() => window.spof.sprites.npcs());
const npcTalking = () => page.evaluate(() => window.spof.sprites.talking());
/** True when any pixel of the backbuffer region holds the exact ramp
 *  color (retries briefly — sheets decode async on first use). */
const canvasHas = async (name, box) => {
  for (let tries = 0; tries < 10; tries++) {
    const hit = await page.evaluate(([rgb, b]) => {
      const cv = document.querySelector("#scene canvas");
      const x0 = Math.max(0, b[0]), y0 = Math.max(0, b[1]);
      const d = cv.getContext("2d")
        .getImageData(x0, y0, Math.min(320, b[2]) - x0, Math.min(180, b[3]) - y0).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] === rgb[0] && d[i + 1] === rgb[1] && d[i + 2] === rgb[2]) return true;
      }
      return false;
    }, [RAMP[name], box]);
    if (hit) return true;
    await page.waitForTimeout(100);
  }
  return false;
};
/** Region around the player's feet-anchored frame. */
const playerBox = async () => {
  const p = await page.evaluate(() => ({ ...window.spof.state.player }));
  return [Math.round(p.x) - 16, Math.round(p.y) - 62, Math.round(p.x) + 16, Math.round(p.y) + 2];
};

// ---- M1 regression ------------------------------------------------------
ok(await page.locator("#scene canvas").count() === 1, "canvas mounted");
const attrs = await page.locator("#scene canvas").evaluate((c) => [c.width, c.height]);
ok(attrs[0] === 320 && attrs[1] === 180, "true 320x180 backbuffer", JSON.stringify(attrs));
ok((await logText()).includes("mug population"), "intro narration");
ok((await status()) === "TICKETS OPEN 249/250", "intro queue count", await status());

// ---- M3.5: the player sprite renders (base outfit) -----------------------
ok((await playerSprite()) === "mel_base", "outfit map resolves to mel_base", await playerSprite());
ok(await canvasHas("slate_m", await playerBox()), "Mel's hoodie drawn on canvas");

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
ok((await status()) === "TICKETS OPEN 249/250", "cleared storage = fresh game", await status());
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
await dismissDoc(); // the corkboard look opened the TODO close-up
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

// carried item catches verbs its source hotspot leaves unhandled: the coat
// must wear IN the office too, then a save restore hands it back for the run
await run("save");
const coatSave = (await logText()).match(/SPOF1\.[A-Za-z0-9+/=]+/g).pop();
await run("wear coat");
ok((await lastLines()).includes("assumes its post"), "coat wears in the office (item catches shadowed verb)", await lastLines());
ok(!(await page.locator(".inv-chip").allInnerTexts()).includes("coat"), "office-worn coat leaves the inventory");
ok((await playerSprite()) === "mel_coat", "coat flag switches the sprite to mel_coat", await playerSprite());
ok(await canvasHas("coat_m", await playerBox()), "coat outfit drawn on canvas");
await run("wear coat");
ok((await lastLines()).includes("already at its post"),
  "worn coat addressable through the office hotspot shadow (presentIf alt)", await lastLines());
await run(`load ${coatSave}`);
ok((await page.locator(".inv-chip").allInnerTexts()).includes("coat"), "save restore returns the coat for the rest of the run");
ok((await playerSprite()) === "mel_base", "restore un-wears the coat sprite", await playerSprite());

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
await page.evaluate(() => { window.spof.state.player.x = 270; window.spof.state.player.y = 150; });
await clickScene(290, 124);
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
await run("look doorway");
ok((await lastLines()).includes("came willingly"), "bedroom doorway re-aims after the pants", await lastLines());

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
ok(!(await page.locator(".inv-chip").allInnerTexts()).includes("real pants"),
  "worn pants leave the inventory");
ok((await playerSprite()) === "mel_pants", "the Real Pants read on the sprite", await playerSprite());
ok(await canvasHas("khaki_m", await playerBox()), "khaki legs drawn on canvas");
await run("wear pants");
ok((await lastLines()).includes("cannot be stacked"), "worn pants stay addressable (presentIf)", await lastLines());
await run("look pants");
ok((await lastLines()).includes("precedes you into rooms"), "worn pants have a worn LOOK", await lastLines());

// ---- M3: main street (set piece, wrong-name gag, road death) ----------------
await run("open door");
await run("open front door");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_main_street", "front door opens with pants on");
ok((await logText()).includes("eleven steps"), "leaving-the-house set piece", await lastLines(8));
ok((await score()) === "33", "outside-at-last scored", await score());

// east gate blocked before the diner reveal
await page.evaluate(() => { window.spof.state.player.x = 300; window.spof.state.player.y = 140; });
await clickScene(315, 138);
await page.waitForTimeout(1000);
ok((await logText()).includes("It serves pie"), "east exit blocked without the trail", await lastLines());

// ---- M3.5: Gary stands in his reserved spot ---------------------------------
ok((await npcIds()).includes("gary"), "Gary's sprite present on Main Street", JSON.stringify(await npcIds()));
ok(await canvasHas("polo_m", [23, 70, 64, 126]), "Gary drawn at his hotspot spot");

await run("look notice board");
ok(await page.evaluate(() => {
  const d = document.querySelector(".docview");
  return d && !d.hidden && !!d.querySelector(".doc-line-stamp") && !!d.querySelector(".doc-line-marker");
}), "flyer annotations render as marks (stamp + scrawl)");
await dismissDoc();
ok((await lastLines(4)).includes("CANCELLED"), "Nimbus lore on the notice board", await lastLines(4));
await run("talk to gary");
ok((await lastLines(4)).includes("NEIL"), "Gary gets the name wrong", await lastLines(4));
ok((await npcTalking()) === "gary", "talking runs Gary's talk cycle", String(await npcTalking()));
await run("ask gary about nimbus");
ok((await lastLines()).includes("Nimbus people"), "Gary topic responds", await lastLines());
await run("ask gary about hum");
ok((await lastLines()).includes("Weird hum"), "Gary's town topic answers its own hint nouns", await lastLines());
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

// ---- M3.5: the diner regulars stand in their reserved spots -----------------
const dinerNpcs = await npcIds();
ok(dinerNpcs.includes("darlene") && dinerNpcs.includes("merle"),
  "Darlene + Merle sprites present in the diner", JSON.stringify(dinerNpcs));
ok(await canvasHas("apron_l", [168, 50, 197, 89]), "Darlene drawn behind the counter");
ok(await canvasHas("flannel_m", [225, 54, 254, 109]), "Merle drawn on his stool");

await run("talk to darlene");
ok((await lastLines()).includes("two names today"), "wrong-name tally at Darlene", await lastLines());
ok((await npcTalking()) === "darlene", "talking runs Darlene's talk cycle", String(await npcTalking()));
const topicChips = await page.locator(".suggest-chip").allInnerTexts();
ok(topicChips.includes("ask Darlene about nimbus"), "talk arms tappable topic chips", JSON.stringify(topicChips));
await page.locator(".suggest-chip", { hasText: "about nimbus" }).click();
await page.waitForTimeout(80);
ok((await lastLines()).includes("For weather"), "topic chip runs the ask", await lastLines());
ok((await page.locator(".suggest-chip").allInnerTexts()).includes("ask Darlene about pie"), "chips persist through the conversation");
await run("talk to merle");
ok((await lastLines()).includes("three names today"), "wrong-name tally at Merle", await lastLines());
ok((await npcTalking()) === "merle", "talking runs Merle's talk cycle", String(await npcTalking()));

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
await run("ask merle about salon");
ok((await lastLines()).includes("cache-miss"), "Merle's key topic answers the salon nouns", await lastLines());
await run("look farmers");
ok((await lastLines()).includes("predates login screens"), "booth farmers answer to their name", await lastLines());
await run("look door");
ok((await lastLines()).includes("holding it open"), "diner door re-aims after the reveal", await lastLines());

// a walked exit ends the conversation AND clears the rendered chip row
// (M3.5: the diner exit moved to the floor's left edge — the old door
// corridor ran over the booth backs and stranded the sprite on them)
await run("talk to merle");
ok((await page.locator(".suggest-chip").count()) > 0, "chips armed before walking out");
await page.evaluate(() => { window.spof.state.player.x = 120; window.spof.state.player.y = 150; });
await clickScene(95, 150);
await page.waitForTimeout(1600);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_main_street", "walked out of the diner");
ok((await page.locator(".suggest-chip").count()) === 0, "walked exit clears the topic chips");
await run("look traffic light");
ok((await lastLines()).includes("practically a green"), "main street pointer re-aims east after the reveal", await lastLines());
await run("open diner");
await run("use cable on urn");
ok((await lastLines()).includes("not whatever that is"), "generic wrong-instrument snark (urn)", await lastLines());
await run("use mug on urn");
ok((await lastLines()).includes("brought your own"), "mug fills at the urn (instrument)", await lastLines());
ok((await score()) === "42", "coffee scored (+2)", await score());
// M4: the diner's ledger now includes two evidence reads (clipping +
// griddle) whose points are Act 2's, gated on the act boundary — so the
// aside must NOT close the room during Act 1.
ok(!(await logText()).includes("ledger closes"), "diner aside waits for the Act 2 evidence reads");
await run("use mug");
ok((await lastLines()).includes("route packets"), "drinking the coffee", await lastLines());

// ---- M3: act out — gate opens, act completable at 45 ------------------------
await run("open door");
await page.evaluate(() => { window.spof.state.player.x = 300; window.spof.state.player.y = 140; });
await clickScene(315, 138);
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
await page.evaluate(() => { window.spof.state.player.x = 30; window.spof.state.player.y = 158; });
await clickScene(10, 164);
await page.waitForTimeout(1200);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_main_street", "act end is not a dead end");

// ---- M4: Act-1-room retrofit points live on Act 2's ledger ------------------
// Back in town with eot_arrived set, the corkboard clipping and the
// griddle award their curiosity tickets — and the diner's tab closes.
await run("open diner");
await run("look corkboard");
ok(await page.evaluate(() => !document.querySelector(".docview").hidden), "clipping close-up opens");
ok((await lastLines(6)).includes("documentation"), "clipping reads as evidence post-arrival", await lastLines(6));
await run("look griddle");
ok((await score()) === "47", "diner curiosity tickets award once arrived (45+2)", await score());
ok((await logText()).includes("ledger closes"), "diner aside fires once the evidence is read");
await run("open door");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_main_street", "back on Main Street");

// ---- M3: drag-to-walk -------------------------------------------------------
await page.evaluate(() => { window.spof.state.player.x = 60; window.spof.state.player.y = 138; });
const dm = await sceneMap();
await page.mouse.move(dm.x(60), dm.y(138));
await page.mouse.down();
for (let i = 1; i <= 8; i++) {
  await page.mouse.move(dm.x(60 + i * 15), dm.y(138));
  await page.waitForTimeout(70);
}
const dragPos = await page.evaluate(() => ({ ...window.spof.state.player }));
await page.mouse.up();
ok(dragPos.x > 85, "drag-to-walk follows the pointer", JSON.stringify(dragPos));
await page.waitForTimeout(120);
const relA = await page.evaluate(() => ({ ...window.spof.state.player }));
await page.waitForTimeout(450);
const relB = await page.evaluate(() => ({ ...window.spof.state.player }));
ok(Math.abs(relB.x - relA.x) < 3 && Math.abs(relB.y - relA.y) < 3,
  "drag release stops the walk", JSON.stringify([relA, relB]));

// ---- M3: desktop keys — arrows steer on an empty line, stay terminal keys otherwise
await page.locator(".cmd-input").click();
const kb0 = await page.evaluate(() => ({ ...window.spof.state.player }));
await page.keyboard.down("ArrowRight");
await page.waitForTimeout(500);
await page.keyboard.up("ArrowRight");
const kb1 = await page.evaluate(() => ({ ...window.spof.state.player }));
ok(kb1.x - kb0.x > 15, "empty-line arrow key walks", JSON.stringify([kb0, kb1]));
await page.waitForTimeout(400);
const kb2 = await page.evaluate(() => ({ ...window.spof.state.player }));
ok(Math.abs(kb2.x - kb1.x) < 3, "arrow release stops the walk (keys)", JSON.stringify([kb1, kb2]));
await run("look sky");
await page.fill(".cmd-input", "l");
await page.dispatchEvent(".cmd-input", "input");
await page.press(".cmd-input", "ArrowUp");
ok((await page.inputValue(".cmd-input")) === "look sky", "ArrowUp mid-command recalls history", await page.inputValue(".cmd-input"));
await page.locator(".clear").click();
await page.press(".cmd-input", "Control+ArrowUp");
ok((await page.inputValue(".cmd-input")) === "look sky", "Ctrl+ArrowUp recalls from an empty line", await page.inputValue(".cmd-input"));
await page.locator(".clear").click();

// alt-tab safety: window blur releases held steering keys
await page.keyboard.down("ArrowLeft");
await page.waitForTimeout(300);
await page.evaluate(() => window.dispatchEvent(new Event("blur")));
await page.waitForTimeout(150);
const bl1 = await page.evaluate(() => ({ ...window.spof.state.player }));
await page.waitForTimeout(400);
const bl2 = await page.evaluate(() => ({ ...window.spof.state.player }));
ok(Math.abs(bl2.x - bl1.x) < 3, "window blur releases held steering keys", JSON.stringify([bl1, bl2]));
await page.keyboard.up("ArrowLeft");

// ---- M3: inventory tray wraps and collapses ---------------------------------
const invCount = await page.locator(".inv-chip").count();
ok(invCount >= 4, "inventory holds the act's item pile", String(invCount));
const invScroll = await page.locator(".inv").evaluate((n) => n.scrollWidth <= n.clientWidth + 1);
ok(invScroll, "inventory wraps instead of scrolling");
ok((await page.locator(".inv-chip").first().innerText()) === "coat", "newest item leads the tray",
  await page.locator(".inv-chip").first().innerText());
const invCap = await page.locator(".inv-chips").evaluate((n) => getComputedStyle(n).maxHeight !== "none");
ok(invCap, "open tray is height-capped (scrolls internally past ~2 rows)");
await page.locator(".inv-label").click();
ok((await page.locator(".inv-chip").count()) === 0, "inventory tray collapses");
ok((await page.locator(".inv-label").innerText()).includes(`(${invCount})`), "collapsed label shows count", await page.locator(".inv-label").innerText());
await page.locator(".inv-label").click();
ok((await page.locator(".inv-chip").count()) === invCount, "inventory tray reopens");

// consumables spend in-act: the coat wears and drops; kit stays
await run("wear coat");
ok((await lastLines()).includes("assumes its post"), "coat wears anywhere", await lastLines());
ok(!(await page.locator(".inv-chip").allInnerTexts()).includes("coat"), "worn coat leaves the inventory");
ok((await page.locator(".inv-chip").allInnerTexts()).includes("ethernet cable"), "kit survives the act");
ok((await playerSprite()) === "mel_coat_pants", "coat + pants compound outfit resolves", await playerSprite());
await run("wear coat");
ok((await lastLines()).includes("already at its post"), "worn coat stays addressable (presentIf)", await lastLines());
const coffeeLog = await page.evaluate(() => window.spof.state.flags.has("coffee_act1"));
ok(coffeeLog, "coffee log stamped for act 1");

// ==== M4: Act 2 — the Edge Node ==============================================
// State on entry: Main Street, eot_arrived long set, score 47, kit carried
// (cable + the emptied mug), coat + pants worn. The block below plays the
// whole act — door hunt, salon, corridor, staging, backlot, closet,
// roadside — and lands Acts 1+2 at exactly 100 tickets closed.

await page.evaluate(() => { window.spof.state.player.x = 300; window.spof.state.player.y = 140; });
await clickScene(315, 138);
await page.waitForTimeout(1200);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_edge_of_town", "east to the plaza hub");

// EOT curiosity tickets (the M3 debt: this room awarded zero LOOK points)
await run("look box fan");
await run("look plaza sign");
ok((await score()) === "49", "EOT curiosity looks award (fan + pylon)", await score());

// the dumpster surrenders Dale's work order (lockbox-rule source #1)
await run("open dumpster");
ok(await page.evaluate(() => !document.querySelector(".docview").hidden), "work-order close-up opens");
await dismissDoc();
ok(await page.evaluate(() => window.spof.state.flags.has("knows_lockbox_rule")), "dumpster teaches the lockbox rule");
ok((await score()) === "51", "dumpster dive scored", await score());

// death: climbing in (warn-first, registered)
await run("use dumpster");
ok((await lastLines()).includes("raccoon with a mortgage"), "dumpster warns first", await lastLines());
await run("use dumpster");
await page.waitForTimeout(200);
ok(!(await page.locator(".death").isHidden()), "Garbage Collected death screen");
await page.locator(".death-retry").click();
await page.waitForTimeout(200);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_edge_of_town", "dumpster retry lands one step back");

// data invariant: no arrival point may sit inside a destination exit
// polygon — the device-pass bounce bug (enter a room, press any key,
// get thrown straight back out). The engine now suppresses the
// containing exit, but the data should not lean on that.
const placementBugs = await page.evaluate(() => {
  const inside = (p, poly) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) &&
          p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  };
  const bugs = [];
  for (const [id, room] of window.spof.content.rooms) {
    for (const exit of room.exits) {
      if (inside(room.playerStart, exit.polygon)) bugs.push(`${id}.playerStart`);
      const dest = window.spof.content.rooms.get(exit.to);
      if (!dest) continue;
      for (const dx of dest.exits) {
        if (inside(exit.arrive, dx.polygon)) bugs.push(`${id}->${exit.to}`);
      }
    }
  }
  return bugs;
});
ok(placementBugs.length === 0, "no arrival point inside a destination exit", JSON.stringify(placementBugs));

// the salon: Kim + Dot, minted per the bible
await run("open nail salon");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_salon", "salon door opens");
// device-pass regression: arriving through the door and pressing a key
// must NOT bounce the player straight back out
await page.keyboard.down("ArrowLeft");
await page.waitForTimeout(400);
await page.keyboard.up("ArrowLeft");
await page.waitForTimeout(150);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_salon",
  "movement just inside the door stays in the salon");
const salonNpcs = await npcIds();
ok(salonNpcs.includes("kim") && salonNpcs.includes("dot"), "Kim + Dot sprites present", JSON.stringify(salonNpcs));
ok(await canvasHas("rose_m", [114, 52, 154, 110]), "Kim drawn standing at her station");
ok(await canvasHas("lavender_m", [206, 50, 248, 106]), "Dot drawn on the dryer chair");
await run("talk to kim");
ok((await lastLines()).includes("Malcolm"), "Kim wrongs the name a new way (Malcolm)", await lastLines());
ok((await npcTalking()) === "kim", "Kim's talk cycle runs");
await run("talk to dot");
ok((await lastLines()).includes("Funkhouser"), "Dot wrongs the name a new way (Funkhouser)", await lastLines());
ok((await npcTalking()) === "dot", "Dot's talk cycle runs");
await run("ask kim about dale");
ok(await page.evaluate(() => window.spof.state.flags.has("kim_told_lockbox")), "Kim's thread marks the lockbox location");
await run("ask kim about coffee");
ok(await page.evaluate(() => window.spof.state.flags.has("kim_coffee_ok")), "Kim flips guest mode");
await run("use mug on pod machine");
ok((await lastLines()).includes("legally describable as coffee"), "mug fills at the pod machine", await lastLines());
ok(await page.evaluate(() => window.spof.state.flags.has("coffee_act2")), "coffee log stamped for act 2");
await run("look polish wall");
await run("look appointment book");
ok((await lastLines(6)).includes("MALCOLM (computers)"), "the ledger of record has ruled", await lastLines(6));
await run("use rotary phone");
ok((await lastLines(6)).includes("Pan-flute"), "the NOC hotline's hold music", await lastLines(6));
ok((await score()) === "59", "salon ledger complete (51+8)", await score());
ok((await logText()).includes("closet won't open itself"), "salon onScoreComplete aside");

// corridor: the laminate (rule source #2), the scorched breaker, the sealed door
await run("open curtain");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_corridor", "curtain to the service corridor");
await run("look laminate");
await run("look breaker panel");
await run("use breaker panel");
ok((await lastLines()).includes("pennies"), "breaker warns first", await lastLines());
await run("use breaker panel");
await page.waitForTimeout(200);
ok(!(await page.locator(".death").isHidden()), "Load Shedding death screen");
await page.locator(".death-retry").click();
await page.waitForTimeout(200);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_corridor", "breaker retry lands one step back");
await run("look sealed door");
await run("look water heater");
ok((await score()) === "64", "corridor ledger complete (59+5)", await score());
ok((await logText()).includes("corridor stands fully surveyed"), "corridor onScoreComplete aside");

// staging: the runbook (rule source #3) + Dale's residue
await run("open unit door");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_staging", "into the old PagePro");
await run("look runbook");
ok(await page.evaluate(() => !document.querySelector(".docview").hidden), "runbook close-up opens");
await dismissDoc();
await run("look demo phones");
await run("look cable spool");
await run("look energy drink shrine");
ok((await score()) === "69", "staging ledger complete (64+5)", await score());
ok((await logText()).includes("Leave the shrine"), "staging onScoreComplete aside");

// backlot: generator, conduit, and the key box
await run("open corridor door");
await run("open delivery door");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_backlot", "delivery door to the back lot");
await run("look generator");
await run("look conduit");
// partial knowledge refuses correctly: rule without the number points to town
const m4real = await page.evaluate(() => {
  const s = window.spof.state;
  return { v: 1, snap: { roomId: s.roomId, flags: [...s.flags], inventory: [...s.inventory],
    score: s.score, awarded: [...s.awarded], player: { ...s.player } }, deathsFound: [...s.deathsFound] };
});
await page.evaluate((base) => {
  const save = { ...base, snap: { ...base.snap, flags: ["eot_arrived", "knows_lockbox_rule"], inventory: [] } };
  window.spof.exec("load SPOF1." + btoa(JSON.stringify(save)));
}, m4real);
await run("open key box");
ok((await lastLines()).includes("glossy"), "rule-without-number points back to town", await lastLines());
await page.evaluate((s) => window.spof.exec("load SPOF1." + btoa(JSON.stringify(s))), m4real);
await run("open key box");
ok((await lastLines(8)).includes("Eight. Five. Six. One."), "the hotline's last four open the box", await lastLines(8));
ok(await page.evaluate(() => window.spof.state.inventory.includes("edge_key")), "janitor's key acquired");
ok((await score()) === "74", "backlot ledger complete (69+5)", await score());
ok((await logText()).includes("Front of house"), "backlot onScoreComplete aside");

// the gray door: the key turns, spends itself, the closet receives
await clickScene(312, 150);
await page.waitForTimeout(3800);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_edge_of_town", "service drive back around front");
await run("use key on door");
await page.waitForTimeout(150);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_closet", "the gray door opens on the closet");
ok(await page.evaluate(() => !window.spof.state.inventory.includes("edge_key")), "the key spends itself in the lock");
ok((await score()) === "81", "unlock + first entry scored (74+4+3)", await score());

// the closet: slip filed, cable proves the LAN, verdict points upstream
await run("look packing slip");
ok(await page.evaluate(() => !document.querySelector(".docview").hidden), "packing-slip close-up opens");
await dismissDoc();
ok(await page.evaluate(() => !window.spof.state.flags.has("act2_trail_found")), "the address means nothing before the diagnosis");
await run("use cable on switch");
ok((await lastLines()).includes("port 47"), "the kit cable finds its Act 2 device", await lastLines());
await run("look router");
ok((await lastLines(6)).includes("one layer down"), "uplink verdict: fault upstream", await lastLines(6));
await run("look packing slip");
ok(await page.evaluate(() => window.spof.state.flags.has("act2_trail_found")), "the slip becomes the trail");
await run("use ups");
ok((await lastLines()).includes("acknowledged"), "nine years of beeping, hushed", await lastLines());
await run("look box fan");
await run("use box fan");
ok((await lastLines()).includes("retract the hand"), "fan warns first", await lastLines());
await run("use box fan");
await page.waitForTimeout(200);
ok(!(await page.locator(".death").isHidden()), "Cooling Architecture death screen");
await page.locator(".death-retry").click();
await page.waitForTimeout(200);
await run("look clipboard");
ok((await score()) === "95", "closet ledger complete (81+14)", await score());
ok((await logText()).includes("no more secrets"), "closet onScoreComplete aside");
const m4deaths = await page.evaluate(() => [...window.spof.state.deathsFound]);
ok(["garbage_collected", "load_shedding", "cooling_architecture"].every((d) => m4deaths.includes(d)),
  "all three Act 2 deaths collected + registered", JSON.stringify(m4deaths));

// the act-out: the road east opens with the trail; Merle drives out
await run("open door");
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_edge_of_town", "back out the gray door");
await page.evaluate(() => { window.spof.state.player.x = 280; window.spof.state.player.y = 170; });
await clickScene(300, 176);
await page.waitForTimeout(1500);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act2_roadside", "the road east opens with the trail");
ok((await logText()).includes("END OF ACT TWO"), "act-out stinger narrates");
ok((await logText()).includes("Get in, IT"), "Merle drives out");
await run("look fiber markers");
await run("look mile marker");
ok((await score()) === "100", "Acts 1+2 full clear at exactly 100", await score());
ok((await status()) === "TICKETS OPEN 150/250", "the queue reads 150 open", await status());

// world stays open at act end; kit crossed, consumables spent
await page.evaluate(() => { window.spof.state.player.x = 30; window.spof.state.player.y = 165; });
await clickScene(9, 165);
await page.waitForTimeout(1400);
ok((await page.evaluate(() => window.spof.state.roomId)) === "act1_edge_of_town", "act two's end is not a dead end");
const m4inv = await page.evaluate(() => [...window.spof.state.inventory]);
ok(m4inv.includes("cable") && m4inv.includes("mug") && !m4inv.includes("edge_key"),
  "kit crosses acts; the key stayed in the lock", JSON.stringify(m4inv));

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
