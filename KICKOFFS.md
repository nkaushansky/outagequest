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

---

## M4 — Formal review (optional; Nate's call per the M3.5 waiver precedent)

M4 formal review — Acts 1+2 complete. Repo: nkaushansky/outagequest,
branch `claude/act2-edge-node-kickoff-adsok1` (all M4 work lives there,
unmerged; main still ends at the M3.5 merge). You are the reviewer, not
the builder: verify independently, trust nothing the build thread logged
until you've reproduced it.

Read first: REVIEW.md — the every-review checks, the M3–M7 per-act
checklist, and the M4 log rows (decisions ratified, content+engine, art,
device feedback r1 + r2). Then CLAUDE.md, GDD.md, data/schema.md,
CHARACTERS.md.

REVIEW PASSES:
1. Build from source; `npm run preview` + `npm run smoke` — 266 checks,
   green, zero console errors. The suite is the builder's evidence; your
   job is what it can't see.
2. Independent playthrough, no walkthrough. Fresh-clear invariant first:
   a clean Act 1 run must still read exactly 45 closed ("TICKETS OPEN
   205/250") before first reaching the Edge of Town — the two retrofit
   tickets living in Act 1 rooms (diner clipping, griddle) are gated on
   eot_arrived and must not leak. Then Act 2 to the full 100 ("TICKETS
   OPEN 150/250") and the END OF ACT TWO stinger. Verify the door hunt
   honestly needs three hooks — a rule source (dumpster work order /
   corridor laminate / staging runbook, each sufficient alone), the
   NUMBER only from the Main Street flyer (the mandatory back-into-town
   leg), location color from Kim or the diner clipping. All six deaths
   (three per act) warn-first, registered, one-step-back. Saves
   round-trip mid-Act-2. `hint` nudges at every stage without ever
   solving; `tickets` names only rooms with a closed ticket.
3. Soul checks: 10 random Act 2 LOOKs against the office calibration;
   lookAround surveys read as the narrator, not a map key; Kim's
   "Malcolm" + Dot's "Funkhouser" grow the tally; document annotations
   sit ON the paper (marks, never stage directions); all six paper
   stocks reachable (newsprint, clipping, postit, flyer, binder, slip).
4. Canon-vs-implementation audit: the four ratified M4 decisions (room
   map, pod-machine coffee_act2, coded lockbox → janitor's key, 55
   budget with eot_arrived gating + the accepted diner-aside timing
   shift) must match what the game does and what GDD.md / schema.md /
   CLAUDE.md claim.
5. Purity + platform: content still pure JSON — read the full src diff
   since main (expected engine additions ONLY: document overlay, goto
   arrive, arrival exit-suppression, lookAround, hint/tickets shell);
   colors explicit; emulated mobile both orientations; fold in Nate's
   real-phone findings (desktop already approved — phone is the open
   DoD gate).

VERDICT: append a formal review row to REVIEW.md (must-fixes fixed on
the branch and re-verified before pass). On pass: merge to main, deploy
via the dreamhost-upload flow (slug `outagequest`), and confirm the next
step is the M5 kickoff below. WAIVER PATH (the M3.5 precedent): Nate may
let the 266-check suite plus his device passes stand as the review —
then log an "M4 (review disposition)" decision row, merge, deploy, and
go straight to M5.

---

## M5 — Act 3 (paste after the M4 review disposition settles)

M5 kickoff — Act 3: The Cloud, Physically. Repo: nkaushansky/outagequest,
start from main (M4 Act 2 merged; read REVIEW.md rows "M4 (decisions
ratified)", "M4 (content+engine)", "M4 (art)", both device-feedback
rows, and the M4 review/disposition row).

Read before writing anything: CLAUDE.md, GDD.md (story spine — Act 3 is
the flagship datacenter, "a cathedral in the middle of nowhere": scale,
absurdity, security theater; the fault isn't here either), data/
schema.md, CHARACTERS.md, PROMPTS.md, REVIEW.md. Canon already shipped
points here: the closet packing slip names US-CENTRAL-1 FLAGSHIP CAMPUS,
1 Cumulonimbus Way, Bunker Flats ("If you can see the building, you are
already on campus"), reached via the westbound county fiber; Act 2 ended
mid-ride in Merle's truck ("Get in, IT.").

SCOPE:

1. **Opening beat: arrival + getting inside.** Act 3 opens at the
   perimeter of a building that is deliberately a giant beige nothing.
   The entry puzzle is social/procedural — security theater, not
   another key hunt: visitor badging at Bev's desk. Proposed dual path:
   the paperwork route (Mel's own ticket number IS the credential — the
   queue finally works FOR him) and/or the pie route (Darlene's pie as
   goodwill contraband, seeded before leaving town). The badge prints
   MALFUNCTON, MEL — the wrong-name gag goes institutional: it's on his
   chest for the rest of the act and NPCs read it aloud.

2. **The floor (~6 dense rooms, map decided at thread start).**
   Candidate set from the pitch: perimeter/gatehouse, lobby + security
   desk (Bev), badging/compliance corridor, the COLD AISLE, the hot
   aisle / raised-floor plenum, loading dock with the inventory robot.
   THE HOODIE PAYOFF lands here (canon since "M3 (items canon)"): the
   backup hoodie carried since Act 1 is finally worn in the cold aisle —
   outfit map gains the variant (pure data; engine still knows no flag
   names), the cold gate checks wearing, not carrying, and it must read
   on screen. THE ROBOT: an autonomous inventory scanner that cannot
   perceive Mel because he isn't in the asset database — proposed
   puzzle: get scanned INTO inventory (become an asset) to reach where
   only assets go.

3. **The discovery.** The flagship is FINE — racks green, generators
   humming, dashboards immaculate. The outage isn't here; it's
   administrative, upstream. Act 3 ends knowing WHERE (HQ), never WHY —
   the $12/Chadwick Cirrus root-cause trail must not surface yet.
   Act-out: proposed Mel-drives inversion — Merle lends the truck and
   Mel drives HIMSELF toward HQ ("nobody drives out anymore" completes
   its arc).

4. **Deaths (collectible, warn-first, registered, one-step-back).**
   Pitched menu, pick ~3 at thread start: Clean Agent discharge (fire
   suppression in a sealed aisle), Compliance Hold (a door that legally
   cannot open), the plenum fall (raised floor), robot right-of-way
   (the forklift never had a chance to be wrong).

5. **NPCs per the bible.** Bev (security; the badge is her wrong-name
   contribution) + whoever the floor demands, minted with CHARACTERS.md
   and the master palette. Coffee: proposed coffee_act3 = Bev's
   personal Mr. Coffee behind the desk (the only unmetered appliance in
   the building). The cable finds its Act 3 device; consumables spend
   in-act.

6. **Act 1+2 debt sweep (small).** Whatever the M4 review / phone pass
   carried forward, closed while rooms are open.

DECIDE AT THREAD START (joint decisions, not builder discretion; see
REVIEW.md "M3.5 (decisions ratified)" for the process):
- Room map: which ~6 rooms, and which is the act's coffee source
  (proposal: Bev's Mr. Coffee).
- Entry-puzzle shape: paperwork path, pie path, or true dual path (both
  work, different flavor/score).
- The robot: patrolling (would be the game's FIRST MOVING NPC — a
  data-driven path walker becomes M5's opening engine item) vs.
  stationary scanner (no engine work); plus the become-inventory
  puzzle's exact shape.
- Death menu: pick from the four pitched.
- Budget: 50 tickets (the arithmetic default — 150 remain across Acts
  3–5; confirm the even split).
- Act-out: confirm the Mel-drives inversion and Merle's presence.

CONSTRAINTS: content pure JSON (a patrol walker, if chosen, is the only
engine item and must be data-driven — no room logic in src/); all text
DOM, never canvas; one-generator backgrounds via the PROMPTS.md prefix +
treat_bg.py at true 320x180; sprites per CHARACTERS.md + master palette;
acts stay speedrunnable; no prior-act inventory required (kit excepted;
the hoodie's gate is authored as wearing, not carrying).

TEST LOOP: npm run build + preview + `npm run smoke` (266 green at M4
close — keep green; extend with Act 3 completability, hoodie variant
renders in the cold aisle, robot behavior if moving, coffee_act3, new
deaths, and the fresh-clear invariants for Acts 1 AND 2). Deploy via the
dreamhost-upload flow, slug `outagequest`; real-phone pass before done.

DEFINITION OF DONE: Acts 1–3 completable start to finish (fresh clears
still read Act 1 = 45, Act 2 = 55); the hoodie payoff lands on screen;
the act ends pointing at HQ; all new NPCs visible and talking on a
phone in both orientations; the wrong-name tally grows (the badge
counts); content still pure JSON; zero console errors; REVIEW.md log
row appended.

---

## M6 — Act 4 (paste after the M5 review disposition settles)

M6 kickoff — Act 4: The Company. Repo: nkaushansky/outagequest, start from
main (M5 Act 3 merged; read REVIEW.md rows "M5 (decisions ratified)", "M5
(content+engine)", "M5 (art notes)", "M5 (art)", "M5 (phone check)" and
"M5 (device pass)").

Read before writing anything: CLAUDE.md, GDD.md (story spine — Act 4 is
CORPORATE HQ: kombucha taps, empty desks, org-chart archaeology, nobody
has known how anything works in years), data/schema.md, CHARACTERS.md,
PROMPTS.md, REVIEW.md. Canon already shipped points here: Cold Aisle 4's
row runbook, Tab 7 — the ONLY escalation row with an address instead of a
phone number — sends SERVICE ENTITLEMENT / ADMINISTRATIVE HOLD to
"CORPORATE: Change Advisory Board, Cumulonimbus, Inc., Corporate Campus.
Business hours. In person if unresolved," with Bev Tolliver's nine-year-old
ballpoint note in the margin: "no phone number for the last one. asked
twice. told it's an internal matter." Act 3 ended with Mel DRIVING, keys in
hand, Merle in the passenger seat, boots on the rail.

SCOPE:

1. **Arrival: the campus that is the opposite of the last one.** Act 3 was
   twenty-two acres of beige with one door and one human being in it.
   Act 4 is all lobby and no load-bearing anything: architecture that
   photographs, amenities nobody uses, and a building full of people none
   of whom can tell you how a single thing works. The badge gag inverts —
   Act 3 made Mel an ASSET to get onto a floor; here his self-sponsored
   case number and a farm truck in visitor parking are the wrong shape
   entirely.

2. **The CAB hunt (~6 dense rooms, map decided at thread start).** The act's
   object is a room and a signature: find the Change Advisory Board, get
   the administrative hold lifted. Nobody knows where CAB meets, who chairs
   it, or when — it has been deferring a four-hundred-dollar door for
   eleven quarters. ORG-CHART ARCHAEOLOGY is the mechanic: the trail runs
   through documents (the `binder`/`flyer`/`slip` stocks are shipped),
   reorganizations, renamed teams, and people who each own one true fact
   and no context. Candidate rooms from the pitch: the atrium with the
   kombucha wall, an empty open-plan floor, a wall of framed org charts,
   somebody's abandoned office, the executive floor, a basement records
   room. The trail must end pointing at Act 5 (the legacy core + The One
   Guy) — and the $12/expired-card root cause STILL must not surface.

3. **The Coffee Log's fourth stamp.** `coffee_act4`. Act 3's joke was that
   the only working appliance was a 1997 Mr. Coffee with no account; the HQ
   inversion writes itself (a $9,000 machine that needs to authenticate).
   The cable finds its Act 4 device; consumables spend in-act.

4. **Deaths (3, collectible, warn-first, registered, one-step-back).** Nine
   after Act 3; GDD wants 12–15 total, so 3 here and 3 in Act 5 lands at
   15. Mine them from corporate physicality, not slapstick.

5. **NPCs per the bible.** The satire target is people who are individually
   pleasant and collectively load-bearing on nothing. Every new NPC gets
   Mel's name wrong a NEW way — and note the bar is now high: Act 3's badge
   put MALFUNCTON, MEL on his chest, Corinne read it aloud in field order
   with the comma pronounced, and a robot OCR'd it into a chassis's
   description field. Chadwick Cirrus has NEVER been named in shipped
   content — decide deliberately whether Act 4 is where that changes.

6. **Act 1–3 debt sweep (small).** Whatever the M5 review / phone pass
   carried forward, closed while rooms are open. (M5's device pass came
   back clean, so this may genuinely be empty — check the log rather than
   inventing work.)

WHAT M5 LEFT YOU (use it, don't rebuild it):

- **Patrol walkers.** A hotspot `sprite` block takes `path`/`speed`/`loop`/
  `pauseMs` and the engine walks it, derives facing from travel, and
  y-sorts on live position. Pure data. If Act 4 wants a moving thing — a
  floor-scrubber, a mail cart, an executive on a lap — it costs nothing.
- **`instrument` matches the same-noun alternate**, so "use X on Y" no
  longer silently misses when a hotspot and a carried item share X's noun.
- **The ART PASS has a proven order**, and it is worth following exactly:
  generate → `treat_bg.py` → refit every polygon from GRID-RULED
  measurements (render the treated bg at 3x with a labelled 20px grid) →
  probe floor lines off the actual PIXELS rather than eyeballing them →
  re-anchor every sprite against the real furniture and LOOK at it. M5's
  two art bugs (Bev floating over the desk, the plenum hatch in the floor)
  were both invisible to the suite and obvious in a screenshot. Budget a
  look-at-it step; it is not optional.
- **Name the negative in a prompt.** The first plenum came back with a
  hatch in the floor because the prompt only said where the hatch SHOULD
  be. The reroll said "no openings, pits, hatches or trenches in the
  floor" and got it right. Generators re-add what you don't forbid.
- **Author state-variant response entries AFTER the first-read entry.**
  Three Act 3 tickets were briefly unreachable because a later-state
  variant shadowed the entry that carried the score. The suite's
  full-clear invariant is what caught it — keep that invariant.

DECIDE AT THREAD START (joint decisions, not builder discretion; see
REVIEW.md "M3.5 (decisions ratified)" for the process):
- Room map: which ~6 rooms, and which is the act's coffee source.
- The CAB hunt's shape: how many hooks are mandatory, and is the answer a
  ROOM, a PERSON, or a discovery that CAB has not actually met since 2019.
- Whether Chadwick Cirrus appears, is merely named, or stays offstage for
  Act 5.
- Death menu (3), and whether any of them is the act's own inversion of the
  Compliance Hold.
- Budget: 50 tickets (100 remain across Acts 4–5; confirm the even split).
- Act-out: how Mel gets pointed at the legacy core, and whether Merle
  crosses into Act 5 or the truck's arc closes here.

CONSTRAINTS: content pure JSON (the engine already has documents, patrol
walkers, outfit maps, surveys, hints/tickets — extend the schema only if a
room genuinely can't be expressed, and minimally); all text DOM, never
canvas; one-generator backgrounds via the PROMPTS.md prefix + treat_bg.py
at true 320x180; sprites per CHARACTERS.md + master palette; acts stay
speedrunnable; no prior-act inventory required (kit excepted).

TEST LOOP: npm run build + preview + `npm run smoke` (373 green at M5
close — keep green; extend with Act 4 completability, coffee_act4, the new
deaths, and the fresh-clear invariants for Acts 1, 2 AND 3 — 45 / 100 /
150). Deploy via the dreamhost-upload flow, slug `outagequest`; real-phone
pass before done.

DEFINITION OF DONE: Acts 1–4 completable start to finish (fresh clears
still read 45 / 100 / 150); the act ends pointing at the legacy core; all
new NPCs visible and talking on a phone in both orientations; the
wrong-name tally grows; content still pure JSON; zero console errors;
REVIEW.md log row appended.

---

## Parked (cross-milestone; logged 2026-07-24, pull forward when ready)

Two items from Nate's M4 close-out notes. Neither blocks M5; both must
survive between threads, so they live here (and as a line in CLAUDE.md's
M8 milestone).

**Opening / title sequence.** First load currently drops the player
straight into Mel's office with no ceremony. Wanted: a title beat before
control — title card, opening scene, credits gag, anything (even
something silly: a boot sequence, a POST screen, the terminal
"connecting…" before the office fades in). CLAUDE.md M8 already owns the
title screen ("Single Point of Failure: An Outage Quest, Part I" — long
title there and only there); this extends that item with an intro so the
game STARTS rather than merely appears. Sierra precedent: every SQ opens
with a pan/credits before handing over the joystick. Candidate timing:
M8 proper, or a small standalone pass after any milestone if the bare
office start stings in playtests. Keep it data-driven where possible
(a title "room" with onEnter sequencing beats engine-coded cinematics);
extend the schema minimally if needed.

**outagequest.com build-out.** The game currently deploys as bare static
files. Open design questions, deliberately unanswered until picked up:
is the game a frame inside a page or the whole page? where do SITE-level
easter eggs live (a fake Cumulonimbus status page? a 404 in-voice?
robots.txt jokes)? Minimum viable ship: a "coming soon" page for the
domain — cheap, could land any time, worth doing before anyone shares
the URL. Full site: M8-adjacent launch packaging. Either way the
dreamhost-upload flow is the deploy path, and dark-mode/color rules
apply to the page shell exactly as they do in-game.
