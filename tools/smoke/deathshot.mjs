// Capture the death screen (fresh profile, so the intro save is clean).
// Usage: node tools/smoke/deathshot.mjs [baseURL] [outPath]
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { launch } from "./browser.mjs";

const BASE = process.argv[2] ?? "http://localhost:4173/";
const OUT = process.argv[3] ?? "./smoke-shots/death-screen.png";
mkdirSync(dirname(OUT), { recursive: true });

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
for (const cmd of ["use ups", "use ups"]) {
  await page.fill(".cmd-input", cmd);
  await page.press(".cmd-input", "Enter");
  await page.waitForTimeout(150);
}
await page.screenshot({ path: OUT });
await browser.close();
console.log("wrote " + OUT);
