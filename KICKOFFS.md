# KICKOFFS.md — ready-to-paste briefs for milestone threads

Each milestone starts as a fresh Claude thread opened with a kickoff brief
(the M3 thread worked this way). This file holds the drafted briefs so
they survive between threads. Paste the section verbatim, then settle any
"decide at thread start" items in conversation before work begins.

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

## M4 — Act 2 (draft after M3.5; seeds below)

Not yet drafted. When drafting, pull from REVIEW.md rows: "M3 (act
boundary)" (door-entry code/key hunt as Act 2's opening puzzle, hooks:
Kim's salon, dumpster, Gazette clipping, Merle/Dale lore, at least one
thread back into town), "M4 carry-forward (documents)" (document
close-up overlay is M4's opening engine/schema item; retrofit Act 1's
lore props), "M3 (items canon)" (Act 2 needs one coffee source →
coffee_act2; new NPCs get new wrong names for Mel; consumables spend
in-act; the cable finds a new device). Score budget: ~205 tickets remain
across Acts 2–5.
