# KICKOFFS.md — ready-to-paste briefs for milestone threads

Each milestone starts as a fresh Claude thread opened with a kickoff brief
(the M3 thread worked this way). This file holds the drafted briefs so
they survive between threads. Paste the section verbatim, then settle any
"decide at thread start" items in conversation before work begins.

---

## M3 — Formal review (paste this first; attach screenshots per REVIEW.md)

M3 formal review — Act 1 complete. Repo: nkaushansky/outagequest, branch
`claude/act1-content-engine-a4m3n1` (all M3 work lives there, unmerged;
main still ends at the M2 QoL round). You are the reviewer, not the
builder: verify independently, trust nothing the build thread logged
until you've reproduced it.

Read first: REVIEW.md — the every-review checks, the M3–M7 per-act
checklist, and the M3 log rows (content+engine, ticket queue, playtest
QoL 2, act boundary, items canon, inventory tray, M3.5 plan/scope,
M4 carry-forwards) so you know what was built and what was decided.
Then CLAUDE.md, GDD.md, data/schema.md.

REVIEW PASSES:
1. Build from source; `npm run preview` + `npm run smoke` — the suite is
   ~149 checks and must be green with zero console errors. The suite is
   the builder's evidence; your job is what it can't see.
2. Independent playthrough: complete Act 1 start to finish with your own
   commands (walkthrough intentionally NOT provided — if you need one,
   that's a finding). Verify: act completable, exactly 45 tickets closed
   at full clear ("TICKETS OPEN 205/250"), no dead-man-walking (every
   required step still reachable at act end), all three deaths fair
   (warn-first) and registered, one-step-back retry, saves round-trip.
3. Soul checks: 10 random LOOKs read aloud against the office
   calibration — would the Space Quest narrator say them? Wrong-name gag
   present in every meeting order (Gary/Darlene/Merle tally variants);
   Nimbus-vs-Cumulonimbus lore readable; onScoreComplete asides fire
   once per room; pointer hotspots pull the player onward after each
   state change.
4. Canon-vs-implementation audit: the decision rows (countdown queue,
   consumables/kit + coat spend + coffee_act1, act-ends-on-arrival,
   topic chips, arrow keys, inventory tray) must match what the game
   actually does and what CLAUDE.md/GDD.md/schema.md claim.
5. Purity + platform: content still pure JSON (no room logic in
   src/engine.ts — read the engine diff since main), all colors
   explicit/dark-mode safe, emulated mobile portrait + landscape (scene
   letterboxes, inputs tappable, log budget holds). Note real-device
   findings from the human's screenshots.

VERDICT: append a formal review row to REVIEW.md's log (pass / issues
found; must-fixes get fixed on the branch and re-verified before pass).
On pass: merge the branch to main, deploy the merged build via the
dreamhost-upload flow (slug `outagequest`), and confirm the next step is
the M3.5 Characters kickoff in this file.

---

## M3.5 — Characters (paste after the formal M3 review passes)

M3.5 kickoff — Characters. Repo: nkaushansky/outagequest, start from main
(M3 Act 1 content + formal review merged; see REVIEW.md log rows "M3.5
plan", "M3.5 scope (final)", and "M3 (items canon)").

Read before writing anything: CLAUDE.md (Player sprite section), GDD.md
(Systems → Character art; Characters), data/schema.md, REVIEW.md.

SCOPE:

1. **Engine sprite/entity layer.** Sprite-sheet loading; Mel at ~32x64 with
   4-direction, 6–8 frame walk cycles replacing the placeholder rectangle
   drawing in src/scene.ts; static NPCs with 2–3 talk frames rendered at
   their reserved hotspot spots (Gary in data/rooms/act1_main_street.json,
   Darlene and Merle in data/rooms/act1_diner.json — their hotspot polygons
   mark where they stand); sane draw order against backgrounds. Adding a
   room's NPC must never require an engine change — sprite placement and
   sheets are data.

2. **All four characters designed together** — Mel, Gary, Darlene, Merle —
   one style authority (the sprite counterpart of the one-background-
   generator rule). Visual reference lives in their LOOK texts: Gary
   (neighbor, hose, dead lawn), Darlene (apron, pencil behind ear, coffee
   pot in permanent orbit), Merle (seed cap, flannel, coffee saucered to
   cool, counter stool). Mel: competent-but-invisible remote IT guy;
   base outfit is hoodie + joggers.

3. **Outfit variants.** Worn-state flags select Mel's sprite variant
   through a data-defined outfit map (extend data/schema.md minimally):
   base → wearing_pants → wearing_coat, with room for the backup hoodie's
   future cold-aisle beat. The engine must never hard-code a flag name;
   adding a future outfit must be pure data. Dressing up has to read on
   screen.

4. **Deliver the character style bible** — a reference sheet of all four
   characters plus the documented, repeatable make-a-character process
   (the sprite counterpart of PROMPTS.md's background prompt prefix). This
   is the pass's lasting artifact: from M4 on, each act's new NPCs are
   minted inside that act's own content thread using the bible, calibrated
   against the existing cast. No recurring character milestone (see
   REVIEW.md "M3.5 scope (final)").

DECIDE AT THREAD START:
- Sprite art source: hand-pixeled vs. generated-then-hand-cleaned. The
  backgrounds' one-generator rule does NOT automatically extend to
  sprites — pick deliberately.
- Talk frames: animate during TALK/topic responses in M3.5, or land as
  art-only with animation wired later.

CONSTRAINTS: true 320x180 world scale; palette discipline against the
treated backgrounds (128-color rooms); hand-cleaned per CLAUDE.md; canvas
renders sprites only — all text stays DOM.

TEST LOOP: npm run build + preview + `npm run smoke` (suite is ~149
checks, green — keep it green, extend with sprite checks: sprites render,
outfit variant switches on flag change, NPCs present in their rooms).
Device checks: deploy via the dreamhost-upload flow, slug `outagequest`.

DEFINITION OF DONE: all four characters visible in-game in both
orientations on a phone; Mel's outfit changes read on screen; content
still pure JSON; zero console errors; style bible committed; REVIEW.md
log row appended.

---

## M4 — Act 2 (paste after M3.5 merges)

M4 kickoff — Act 2: the Edge Node. Repo: nkaushansky/outagequest, start
from main (M3.5 characters merged; see REVIEW.md rows "M3.5
(characters)", "M3.5 (device feedback)", "M3 (act boundary)", "M4
carry-forward (documents)", "M3 (items canon)").

Read before writing anything: CLAUDE.md, GDD.md (story spine — Act 2 is
the edge node behind the nail salon), data/schema.md, CHARACTERS.md
(every new NPC is minted with it, calibrated against the reference
plate), PROMPTS.md (background process), REVIEW.md.

SCOPE:

1. **Document close-ups (the opening engine/schema item).** Generalize
   the death-screen pattern: a focus-trapped, dismissible DOM overlay;
   CSS renders the paper (newsprint / Post-it / aged clipping /
   corporate flyer); text stays real DOM text — never canvas. One
   minimal schema action, e.g. `document{style,title,body,image?}`.
   Document images may be treated crops of existing background art (the
   Gazette clipping's plaza photo IS the edge-of-town art, sepia'd —
   free continuity). Build the mechanism first, content second (the M3
   instrument-condition pattern); the door-code hunt is its first
   customer. Retrofit Act 1's lore props in the same pass: Main Street
   notice-board flyer, Gazette box front page, diner corkboard clipping
   (office corkboard optional).

2. **Act 2's opening puzzle: through the gray door.** A key/code hunt
   seeded entirely in Act 1's planted hooks — Kim's salon (watches the
   door), the dumpster (Dale's install debris), the corkboard Gazette
   photo, Merle/Dale lore — with at least one thread sending the player
   back into town (the open world at act end is design, not
   decoration). The code stays out of Mel's own office; the trail is
   town-side. Act 1 must remain completable exactly as reviewed — no
   re-gating anything behind new content.

3. **Act 2 content: the edge node.** "Regional infrastructure" is one
   rack and a box fan in a humming closet behind a nail salon. New
   rooms per GDD scope (5–6 dense, the existing edge-of-town plaza as
   hub), backgrounds via the PROMPTS.md style prefix + treat_bg.py (one
   generator), polygons fit with `?dev=1`. Every hotspot a bespoke
   LOOK; deaths collectible, warn-first, registered; puzzles follow
   sysadmin logic; the act ends pointing one layer down.

4. **New NPCs, in-act, per the bible.** Kim (the salon; watches
   everything) and whoever else the act demands — minted with
   CHARACTERS.md's make-a-character process, placed by hotspot `sprite`
   blocks (pure data), three smoke checks each. Every new NPC gets
   Mel's name wrong a NEW way (the tally continues). The cable finds
   its Act 2 device; one coffee source stamps `coffee_act2`;
   consumables spend in-act.

5. **Act 1 debt sweep (small, while touching those rooms).** From the
   M3 formal-review carry-forwards: office desk noun + post-drawer
   cabinet LOOK, couch remote + griddle content, curiosity LOOK points
   for diner/EOT (both currently award zero), EOT's missing
   onScoreComplete stays absent by design (the act-out is its aside —
   confirm, don't add).

DECIDE AT THREAD START (settle these WITH the human in conversation
before building — they are joint decisions, not builder discretion; see
REVIEW.md "M3.5 (decisions ratified)"):

- Act 2 room map: which 5–6 rooms (salon interior? closet interior?
  service corridor? behind-the-plaza?) and which one is the act's
  coffee source.
- Door-code shape: multi-clue combination vs. physical key vs. social
  (Kim simply knows) — and how many hooks the player must touch.
- Act 2 ticket budget (~205 remain across Acts 2–5; Act 1 spent 45).

CONSTRAINTS: content pure JSON (the document overlay is one schema
action; adding rooms/NPCs touches no engine code); all text DOM, never
canvas; new backgrounds one-generator + treat_bg.py at true 320x180;
new sprites use the master palette; acts stay speedrunnable; nothing
from Act 1's inventory may be required (kit excepted).

TEST LOOP: npm run build + preview + `npm run smoke` (suite is ~182
checks, green twice — keep it green; extend with document-overlay
checks, Act 2 completability, new-NPC sprite checks, coffee_act2).
Deploy via the dreamhost-upload flow, slug `outagequest`; real-phone
pass before calling it done.

DEFINITION OF DONE: Acts 1 + 2 completable start to finish (Act 1
unchanged at 45 closed); the gray door opens via the authored hunt;
document close-ups live incl. the Act 1 retrofits; all new NPCs visible
and talking on a phone in both orientations; the wrong-name tally
grows; content still pure JSON; zero console errors; REVIEW.md log row
appended.
