// Shared Chromium launcher for the smoke scripts.
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const CANDIDATES = [
  process.env.SPOF_CHROMIUM,
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
].filter(Boolean);

export async function launch() {
  const exe = CANDIDATES.find((p) => existsSync(p));
  return chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
}
