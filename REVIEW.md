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
