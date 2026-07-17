# CLAUDE.md — Single Point of Failure (SPOF)

A Sierra-style (Space Quest register) comedy adventure game. Browser-based,
mobile-friendly, deploys as static files to outagequest.com (DreamHost).

**Read before writing any code:** `GDD.md` (the design — canon, do not drift
from it) and `data/schema.md` (the content format — the engine's contract).

## Architecture (locked)

- **Canvas + DOM hybrid.** Canvas in `#scene`: a true 320x180 backbuffer,
  upscaled with nearest-neighbor (`image-rendering: pixelated`). Backgrounds,
  player sprite, walk animation live here. ALL UI in `#ui` as DOM: terminal
  input line, tappable verb strip, inventory, message windows. Never render
  text into the canvas.
- **Vite + TypeScript, strict, zero runtime dependencies.** devDependencies
  only. `npm run build` output in `dist/` must work from any static host
  with relative paths.
- **Data-driven.** The engine interprets JSON per `data/schema.md`. Adding a
  room must never require an engine change. If a room needs something the
  schema can't express, extend the schema (and schema.md) first, minimally.
- **Parser-core with tap-assist.** One parser, two input skins: free typing
  with autocomplete (desktop), tap-to-compose via verb strip + hotspot taps
  (mobile). Interface is diegetic — it's a terminal. Shell easter eggs per
  schema.md.
- **Mobile is a hard requirement.** Test portrait and landscape. Scene
  letterboxes; UI reflows below/beside it.
- **Dark-mode safety:** every color explicit, `color-scheme` declared. Never
  rely on UA default colors (index.html shows the pattern).

## Sierra soul / Sierra sins (non-negotiable design rules)

- Every hotspot has a bespoke LOOK response. Writing density IS the game.
- Deaths are collectible punchlines: death screen -> instant retry one step
  back. Never lose more than one step. Track found deaths for a gallery.
- The game must never become silently unwinnable. If an item is needed
  later, it must remain obtainable.
- No pixel hunts (hotspots are generous), no guess-the-verb (synonyms are
  generous; "did you mean" is snarky but helpful).
- Score events award exactly once (by id). "N of 250" whispers completionism.

## Milestones

- **M1 — Engine core:** room load/render, walkable-polygon movement (tap or
  click to walk), hotspot hit-testing, parser + verb strip + autocomplete,
  message window, flags/inventory/score state, response resolution engine.
- **M2 — Vertical slice:** `data/rooms/act1_home_office.json` fully playable
  (asset already in `assets/backgrounds/`). Add one puzzle, one death, saves
  (localStorage autosave on room change + export/import string).
- **M3 — Act 1 complete.** M4–M7 — Acts 2–5. M8 — polish: deaths gallery,
  postmortem ending, sound, title screen ("Single Point of Failure: An
  Outage Quest, Part I" — the long title appears there and only there).
- Definition of done per milestone: playable in browser, mobile-checked,
  no console errors, content still pure JSON.
- Regression harness: `tools/smoke/` (build + preview, then `npm run
  smoke`). Keep it green; extend it with each milestone's checks.

## Player sprite (M1 can stub)

Placeholder rectangle or simple silhouette is fine through M2. Real sprite:
~32x64 px, 4 directions, 6–8 frame walk cycles, hand-cleaned. NPCs static
with 2–3 talk frames.

## Asset pipeline

New backgrounds: generate per the prompt template in GDD.md (ChatGPT
generator only, one generator for all rooms), then:

    python3 tools/treat_bg.py source.png assets/backgrounds/<room_id>.png

Keep source art in `assets/source/`. Assets are stored at true 320x180.

## Writing voice (for any content you draft)

Omniscient narrator, second person, mocking but affectionate. The narrator
is the main character. Satire target: everything-as-a-service tech culture —
evergreen absurdity, not headlines. See `data/rooms/act1_home_office.json`
for calibration. Nobody at Cumulonimbus knows Mel's name; NPCs each get it
wrong differently. "Nimbus" vs "Cumulonimbus" is a running institutional
wound. When in doubt: would the Space Quest narrator say it?
