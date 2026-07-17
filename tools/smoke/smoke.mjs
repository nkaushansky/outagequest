// SPOF smoke suite: REVIEW.md M1 (engine core) + M2 (vertical slice).
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
