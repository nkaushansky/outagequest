// SPOF — engine entry point.
// See CLAUDE.md for milestones and conventions, GDD.md for the design,
// data/schema.md for the content format.
// Contract: 320x180 canvas backbuffer in #scene, all UI in #ui as DOM.

import { Engine } from "./engine";

declare global {
  interface Window {
    spof?: Engine["debug"];
  }
}

const sceneEl = document.getElementById("scene");
const uiEl = document.getElementById("ui");

if (sceneEl && uiEl) {
  const engine = new Engine();
  engine.boot(sceneEl, uiEl);
  window.spof = engine.debug;
} else {
  document.body.textContent = "boot failure: #scene/#ui mount points missing";
}
