# SINGLE POINT OF FAILURE
### An Outage Quest, Part I

A Sierra-style comedy adventure about the day everything-as-a-service became
nothing-at-all. (Title-screen ceremonial form above; everyday name "Single
Point of Failure," colloquially SPOF. Domain: outagequest.com.)

## Logline

The world's largest cloud company goes down — globally, totally,
doors-and-coffee-makers totally. The only person who can fix it is a remote
IT guy in a fading nowhere town who hasn't physically gone anywhere in
years. And he has to fix it **offline**, because every tool he'd normally
use runs on the thing that's broken.

## Register & tone

Space Quest register: affectionate parody with a snarky omniscient narrator
as the true main character. The narrator mocks the hero, editorializes on
scenery, and turns deaths into punchlines. Satire target: everything-as-a-
service tech culture — dependency, jargon, process theater. Evergreen, not
headlines. Comedy contrast baked in: mundane rust-belt reality vs.
trillion-dollar corporate cosmic absurdity. The shinier the layer of the
stack, the less anyone understands it. Competence lives at the bottom.

## Design pillars

**Keep the Sierra soul:** narrator-as-character (every LOOK gets a joke);
curiosity as the core loop (absurd amounts of examinable stuff); rooms as
places (discrete screens with edges); real stakes (collectible deaths);
score counter whispering completionism — a ticket queue that opens at 250
and burns down toward the sysadmin's one true dream, zero.

**Fix the Sierra sins:** never silently unwinnable; death = instant retry
one step back; no guess-the-verb (rich synonyms, "did you mean"); no pixel
hunts; puzzles follow sysadmin logic, which is its own comedy.

## Interface

Parser-core with tap-assist; the parser is a diegetic terminal. Tappable
hotspots insert nouns; small verb strip (LOOK, TAKE, USE, TALK, OPEN +
game-specific); desktop free typing with autocomplete. Shell easter eggs
(`sudo take donut`, `ls`, `ping`, `man`, `whoami`). Errors read like stack
traces; "did you mean" behaves like snarky autocorrect. Mobile-friendly is
a hard requirement.

## Characters

- **Mel Function** — protagonist. Competent-but-invisible remote IT guy;
  the inverse of Roger Wilco's lucky incompetence. Hasn't traveled in
  years. Running gag: nobody at the company knows his name; every NPC
  calls him something different (Mark, Neil, "my guy," "the IT"); the
  narrator keeps score.
- **Cumulonimbus, Inc.** — trillion-dollar everything-as-a-service cloud
  giant. Everyone on Earth calls it "Nimbus," to the founder's documented
  fury (style guides, all-hands slides, and legal threats about it appear
  as readable lore).
- **Chadwick Cirrus** — founder/CEO. The man who built the world's biggest
  cloud, named after the wispiest one. Being called "Chad" bothers him
  almost as much as "Nimbus" does.
- **The One Guy** — Act 5. Sole maintainer of the 40-year-old system
  everything secretly runs on; nobody at the company knows he exists.

## Story spine: the Great Outage, descended

Five acts, each tracing the outage one layer down the stack; each layer is
a location. Structural joke: the descent moves from the most glamorous,
least understood layers toward the unglamorous thing everything actually
runs on.

| Act | Layer | Location | Beat |
|-----|-------|----------|------|
| 1 | The user's edge | Home office + dying town | Outage hits; exhaust every remote option; forced to leave the house for the first time in years (real pants: acquired) |
| 2 | Edge node | Humming closet in a strip mall behind a nail salon | "Regional infrastructure" is one rack and a box fan; trail points deeper |
| 3 | The cloud, physically | Flagship datacenter, a cathedral in the middle of nowhere | Scale, absurdity, security theater; fault isn't here either |
| 4 | The company | Corporate HQ campus | Kombucha taps, empty desks, org-chart archaeology; nobody has known how anything works in years |
| 5 | Bottom of the stack | The legacy core + The One Guy | The 40-year-old system everything secretly runs on, maintained by one person nobody knows exists |

## Root cause (ending)

The legacy core phones home once a year to validate its license — to a
domain registered in 1999 on Chadwick Cirrus's personal college credit
card. The card expired; the $12 renewal failed; the domain lapsed; the
license check failed; the core shut itself down politely, exactly as
documented in a binder nobody has opened since the Clinton administration.
The One Guy would have caught the warning — he always has — but he's on his
first vacation in 26 years, and his cat dismissed the alert by sitting on
the keyboard.

**Final puzzle:** Mel writes the blameless postmortem. The score screen is
the post-incident review. "Root cause: $12. Contributing factors: a credit
card, a cat, and twenty-six years of nobody asking questions."

## Scope (locked)

25–30 rooms (5–6 per act, all dense) · 2–3 hours playtime · 20–25 puzzles ·
12–15 unique collectible deaths · several hundred bespoke LOOK responses.

## Art direction (locked)

Target: VGA-era Sierra (SQ4/LSL5 vintage) — painterly 256-color-feel
backgrounds. Source art generated with **ChatGPT image generation only**
(one generator for all rooms), then treated: `tools/treat_bg.py` — 16:9
center crop → 320x180 Lanczos → 128-color median-cut quantize +
Floyd-Steinberg dither. The fixed low resolution + palette acts as a style
normalizer across rooms. Dark scenes lose detail at 320x180 and suffer on
phones — every prompt bakes in warm, lifted lighting.

**Prompt style prefix (every room):** "Painted background art for a 1991
point-and-click adventure game, gouache concept-painting style, clean
readable shapes. Camera: wide theater-stage view from a slightly raised
angle looking gently down into the room, back wall parallel to the frame,
open flat floor filling the lower 40% of the frame as a walkable stage,
furniture and points of interest arranged along the back wall and side
edges, nothing blocking the foreground floor. Saturated but limited
palette, warm ambient lighting with gently lifted shadows, no
photorealism, no visible text, no people. 16:9."

Character art: one hero sprite (~32x64 px, 4 directions, 6–8 frame walk
cycles, hand-cleaned); NPCs mostly static with 2–3 talk frames.

## Systems

- **Score:** events award once by id; total 250; internally additive.
  Presented as a ticket queue counting DOWN: the outage opens with 250
  tickets on Mel's plate, every event closes some, completionism is queue
  zero. Unclosed tickets at the end read as backlog carried over. Final
  screen = post-incident review.
- **Deaths:** narrated punchlines, instant retry one step back, tracked in
  a "deaths found" gallery.
- **Inventory:** two classes. *Consumables* are acquired and spent inside
  the same act — when an item's story ends, it leaves the inventory (the
  narration owns the exit). A lingering consumable near act end is a
  visible signal of unfinished business, but never a gate: every act stays
  speedrunnable. No act may require an item from a previous act. *Kit* is
  Mel's permanent two-piece loadout, unmissable by construction and
  allowed to cross acts: the hand-crimped ethernet cable (his sword —
  each act finds a new device to jack it into) and the emotional-support
  mug. (Pending a destined payoff, the backup hoodie rides along as
  honorary kit.)
- **The Coffee Log (meta-collectible):** every act contains exactly one
  coffee source (Act 1: the diner urn; Act 2+: break station, coffee
  shop, etc.). Filling the mug in an act sets a persistent
  `coffee_act<N>` flag. Filling it in all five acts earns a commendation
  in the endgame postmortem, alongside the deaths gallery and the
  wrong-name tally. Optional, like all completionism here.
- **Saves:** autosave to localStorage on room change + export/import save
  string.
- **Audio (open):** chiptune/MT-32 pastiche vs. minimal ambience — decide
  by M8.

## Tech (locked)

Canvas + DOM hybrid; Vite + TypeScript strict, zero runtime deps;
data-driven JSON content per `data/schema.md`; static build deploys to
outagequest.com on DreamHost. Milestones in CLAUDE.md.
