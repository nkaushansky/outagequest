// Capture the ?dev=1 polygon overlay at native 320x180, upscaled 4x.
// Usage: node tools/smoke/devshot.mjs [baseURL] [outPath]
import { writeFileSync } from "node:fs";
import { launch } from "./browser.mjs";

const base = new URL(process.argv[2] ?? "http://localhost:4173/");
base.searchParams.set("dev", "1");
const OUT = process.argv[3] ?? "./smoke-shots/dev-overlay.png";

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base.toString(), { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const dataUrl = await page.evaluate(() => {
  const src = document.querySelector("#scene canvas");
  const big = document.createElement("canvas");
  big.width = src.width * 4;
  big.height = src.height * 4;
  const ctx = big.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, big.width, big.height);
  return big.toDataURL("image/png");
});
writeFileSync(OUT, Buffer.from(dataUrl.split(",")[1], "base64"));
await browser.close();
console.log("wrote " + OUT);
