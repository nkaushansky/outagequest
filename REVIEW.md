# REVIEW.md — Milestone Review Protocol

How to review: after completing a milestone, start a **fresh Claude chat
thread**, upload this file plus screenshots (desktop + mobile portrait), and
say which milestone is under review. Claude has persistent project memory of
SPOF; this file makes the pass/fail criteria explicit so the review doesn't
depend on any one thread's context. Claude Code should append results to the
log at the bottom after each review.

## Every-review checks (regression + soul)

- [ ] Prior milestones' checks still pass
- [ ] No console errors; loads acceptably on shared hosting
- [ ] Mobile portrait + landscape: scene letterboxes, UI reflows, inputs tappable
- [ ] All colors explicit / dark-mode safe (no UA-inverted surprises)
- [ ] Content is still pure JSON — no room logic leaked into engine code
- [ ] Voice check: read 3 random LOOK responses aloud — would the Space
      Quest narrator say them? Calibrate against data/rooms/act1_home_office.json

## M1 — Engine core

- [ ] Room renders from JSON at true 320x180, nearest-neighbor upscale
- [ ] Click/tap-to-walk stays inside walkable polygon
- [ ] Hotspot hit-testing (generous), hotspot tap inserts noun into command line
- [ ] Parser: synonyms resolve; VERB OBJECT [PREP OBJECT2] grammar; snarky
      "did you mean"; unknown-verb fallback; shell easter eggs (ls, sudo,
      whoami, man, ping) intercepted
- [ ] Verb strip taps compose commands; desktop autocomplete works
- [ ] Message window, flags, inventory, score state all functional

## M2 — Vertical slice (Mel's home office)

- [ ] act1_home_office.json fully playable; all hotspots respond per data
- [ ] Score events award exactly once (take mug twice = 2 points, not 4)
- [ ] One puzzle completable; one death: screen, gallery registration,
      instant retry exactly one step back
- [ ] Autosave on room change; restore on reload; export/import save string
- [ ] Regenerated office background with stage-set camera prompt; hotspot
      polygons redrawn (dev-mode overlay if built)

## M3–M7 — Acts 1 through 5

Per act:
- [ ] Every hotspot has a bespoke LOOK (spot-check 10 at random)
- [ ] Act completable start to finish; no dead-man-walking (replay test:
      can every required item still be obtained at act end?)
- [ ] Deaths collectible and fair; puzzles follow sysadmin logic
- [ ] Act-specific running gags present (wrong-name gag, Nimbus lore)
- [ ] New backgrounds via tools/treat_bg.py, one generator, stage-set camera

## M8 — Polish

- [ ] Title screen: full ceremonial title, once, gloriously
- [ ] Deaths gallery; postmortem ending; final score as post-incident review
- [ ] Audio decision executed (chiptune vs. ambience)
- [ ] Full playthrough on phone, start to finish

## Review log

| Milestone | Date | Status | Notes |
|-----------|------|--------|-------|
| M1 | 2026-07-16 | self-check pass | Automated (headless Chromium, 40 checks vs M1 list + zero console errors). Formal fresh-thread review pending. |
| M2 | 2026-07-16 | self-check pass | Automated (51 checks: M1 regression, puzzle, death/retry/gallery, autosave + export/import). Formal review pending. |
| M2 (art) | 2026-07-17 | self-check pass | Stage-set background regenerated + treated via tools/treat_bg.py; all polygons re-fit with `?dev=1`; room grown to 20 bespoke hotspots; 51-check regression green. |
| M1 | 2026-07-17 | pass (formal) | Fresh-thread review. Rebuilt from source; 56-check suite green, zero console errors; independent probes: parser grammar + did-you-mean auto-run, shell eggs, autocomplete/Tab, verb-strip compose, clamp-to-polygon walk, hotspot tap→noun. Emulated mobile both orientations; real-device pass still recommended. |
| M2 | 2026-07-17 | pass (formal) | Slice playable end to end; score idempotent incl. across import; death/gallery/one-step-back verified (also via sudo, reload, import); saves round-trip; bg true 320x180 @128 colors, 20 polygons re-fit. Voice check pass (chair/modem/photo). Found+fixed in review: saw_the_red was missable (monitors.look reorder + suite check). Carried to M3: instrument-blind "use X on Y" → schema extension. |
| M2 (device playtest) | 2026-07-18 | QoL patch | Real-phone feedback: floor-priority taps (walkable taps always walk; hotspots contest only off-floor), CLEAR button next to RUN, hotspot taps replace/fill the object slot instead of stacking bare nouns. Round 2: empty-input suggestion row collapses (log reclaims the space); tap-completed VERB+NOUN auto-runs in either order (bare verb taps compose; typed input still runs only via Enter/RUN). Suite extended, all green. Carried to M3: drag-to-walk prototype (then decide on arrows), room "last ticket" narrator aside via onScoreComplete schema extension, landscape log-density CSS polish. |
| M3 (content+engine) | 2026-07-18 | self-check pass | Act 1 authored: 5 new rooms (living room, bedroom, Main Street, diner, edge-of-town act-out), 58 new bespoke hotspots, 3 NPCs with ask-about topics + wrong-name gag tally, 2 new registered deaths (both warn first), act score = exactly 45/250, act completable start-to-finish in-suite. Engine/schema: instrument+anyInstrument conditions (fixes mug-on-modem must-fix), topics, gated exits (if/blocked), onScoreComplete, item responses ("wear pants"), death registry as single copy source, drag-to-walk, death-overlay focus trap, landscape CSS density, #ui min-width:0 (long room names were shrinking the scene). Suite now 129 checks, green twice. Placeholders: backgrounds are programmatic stand-ins (tools/placeholder_bg.py); real art prompts in PROMPTS.md; polygons pre-fit. Open: real backgrounds + polygon refit, real-phone pass, formal fresh-thread review. |
| M3 (ticket queue) | 2026-07-18 | decision | Score presentation flipped to a countdown: opens at "TICKETS OPEN 250/250", awards read "N tickets closed (M open)", completionism = queue zero. Engine stays additive internally (saves, award-once, onScoreComplete untouched); GDD.md/CLAUDE.md/schema.md canon lines amended; suite assertions updated, 129 green. |
| M3 (playtest QoL 2) | 2026-07-18 | QoL patch | Full-act playtest (desktop + phone), fixes landed: drag-to-walk now stops on finger lift (steering, not fire-and-forget); desktop arrow keys walk Mel on an empty command line (terminal keys keep caret/history mid-command; Ctrl+Up recalls anywhere; history cursor now resets on edit like a real shell); tappable topic chips — TALK on a topic-bearing NPC offers "ask X about Y" full-command chips on the empty line, closing the phone path to Merle's reveal; bedroom dresser dead-end now points under the bed. Thought-bubble dialogue UI considered and rejected (breaks terminal conceit + no-text-in-canvas rule; chips are the diegetic equivalent). Suite: 137 checks green. Carried to M8: QFG-style exhausted-topic dimming/ordering on chips, deaths gallery, NPC sprites (Gary/Darlene/Merle spots reserved), Earl Prouty memorial-bench joke awaits a bench in some future room's art. |
| M3 (act boundary) | 2026-07-18 | decision | Act 1 ends on ARRIVAL at the Edge of Town (the stinger room; gray door refuses entry by design — nothing there is usable yet, confirmed intended). Getting through the door is Act 2's OPENING puzzle, not Act 1's closer. Carried to M4: door-entry puzzle shaped as a key/code hunt seeded in already-planted hooks — Kim's salon (watches the door), dumpster (Dale's install debris), diner corkboard Gazette photo, Merle/Dale lore — with at least one thread sending the player back into town (open world at act end pays off as design). Keep the code out of Mel's own office (strains sense); trail stays town-side. Road death verified fair across phrasings: warn-first is shared between "road"/"street" (not per-synonym). |
| M3 (inventory tray) | 2026-07-18 | QoL patch | Inventory chips now wrap into rows (no horizontal scrolling); the "inventory/" label is a toggle that collapses the tray to "inventory/ (N)" to reclaim log space as the pile grows across acts. Floating context-menu popover considered and rejected (new UI grammar; the wrap+toggle is the terminal-native equivalent, and `ls` remains). Suite: 142 checks green. |
| M3 (art) | 2026-07-18 | self-check pass | All five real backgrounds generated (one ChatGPT generator, stage-set prompts), treated via tools/treat_bg.py, placeholders retired. Polygons/walkables/exits re-fit to the art per room: LR couch carved from walkable (art blocks the bedroom doorway — walk-exit rerouted through the couch-left gap; doorway hotspot still taps/opens), MS sidewalk narrowed to the painted band (road below is the death hotspot), diner aisle follows the booth line, EOT parking island carved out. Bench hotspot cut from Main Street (no bench in art — Earl Prouty joke banked for a later act). Diner gained a window hotspot. Suite coordinates updated; 129 checks green twice. Open: real-phone pass, NPC sprites (Gary/Darlene/Merle spots reserved), formal fresh-thread review. |
