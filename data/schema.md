# SPOF Data Schema

The engine is code; **the game is JSON.** Everything a player can see, read,
take, or die from is defined in these files. Coordinates are in internal
resolution space: 320 wide, 180 tall, origin top-left.

## Files

- `data/game.json` — global config: title, startRoom, maxScore, and the
  player outfit map (see Sprites)
- `data/verbs.json` — canonical verbs + synonym table + fallback templates
- `data/items.json` — inventory items
- `data/deaths.json` — death registry: the single source of death copy
  (screen text + gallery title). Room JSON triggers deaths by id.
- `data/sprites.json` — sprite sheet registry (see Sprites)
- `data/rooms/<room_id>.json` — one file per room

## Room

```jsonc
{
  "id": "act1_home_office",
  "name": "Mel's Home Office",
  "background": "assets/backgrounds/act1_home_office.png",
  "walkable": [[20,130],[300,130],[310,178],[10,178]],   // polygon, player feet stay inside
  "playerStart": { "x": 160, "y": 160, "facing": "left" },
  "exits": [
    { "to": "act1_hallway", "polygon": [[250,60],[290,60],[290,140],[250,140]],
      "arrive": { "x": 30, "y": 160, "facing": "right" },
      // Optional gate: walking in only crosses when `if` passes; otherwise
      // the first matching `blocked` entry fires (once per approach — the
      // player must step out of the polygon before it can speak again).
      "if": { "flag": "confirmed_global" },
      "blocked": [ { "text": "Not yet. The chair isn't done with you." } ] }
  ],
  "onEnter": [
    // First-match, exactly like a verb response list: the first entry whose
    // `if` passes runs, the rest are skipped. Author the one-time intro
    // first (gated on a flagNot), the repeat line after it.
    { "if": { "flagNot": "seen_office_intro" },
      "do": [ { "narrate": "Welcome to the nerve center." },
              { "setFlag": "seen_office_intro" } ] },
    { "text": "The nerve center, again." }
  ],
  "hotspots": [ /* see Hotspot */ ],
  // Optional. Fires once, when every score id authored in THIS room's JSON
  // has been awarded — the narrator settling the room's tab. Convention: a
  // room's score ids are authored only in that room. Ids inside this list
  // itself are excluded from the required set, so a completion bonus here
  // is legal. The engine marks firing with a reserved flag
  // ("__scorecomplete_<roomId>" — never author "__"-prefixed flags).
  // Writing rule: pair this with pointer rewrites — when a room's puzzle
  // state advances, its pointer hotspots (doors, coats, windows) should
  // re-aim the player at wherever the game wants them next.
  "onScoreComplete": [
    { "do": [ { "narrate": "That's everything this room owes you." } ] }
  ]
}
```

## Hotspot

```jsonc
{
  "id": "dead_mugs",
  "name": "coffee mugs",
  "synonyms": ["mug", "mugs", "coffee", "cups", "cup"],
  "polygon": [[10,120],[60,120],[60,150],[10,150]],
  "responses": {
    "look": [
      { "text": "A museum of caffeine. Some of these mugs contain civilizations now." }
    ],
    "take": [
      { "if": { "flagNot": "took_mug" },
        "do": [ { "narrate": "You take the least biohazardous mug." },
                { "addItem": "mug" }, { "setFlag": "took_mug" },
                { "score": { "id": "got_mug", "points": 2 } } ] },
      { "text": "One emotional-support mug is plenty." }
    ]
  },
  // Optional: "talk/ask X about Y". Y is matched (normalized, articles
  // stripped) against each topic's `match` list; first hit wins and its
  // responses resolve first-match as usual. A miss falls to `topicDefault`,
  // then to verbs.json `unknownTopic` ({name}, {topic}). Write match[0] as
  // the label you want players to see: the autocomplete row offers it after
  // a typed "about", and — the tap path — after any TALK (or ask) lands on
  // a topic-bearing hotspot, the empty command line offers full
  // "ask X about Y" chips, tap-to-run, until the player does something else
  // or leaves the room.
  "topics": [
    { "match": ["outage", "internet"],
      "responses": [ { "text": "\"Whole thing's down, hon.\"" } ] }
  ],
  "topicDefault": [ { "text": "She refills your cup instead of answering." } ]
}
```

**Authoring rule (floor-priority taps):** a tap inside the walkable polygon
always walks; hotspots only contest taps *outside* the floor. A hotspot
polygon fully inside the walkable area is therefore unreachable by tap
(typing still works). Keep floor-adjacent hotspot polygons poking above the
walkable boundary (or below it, e.g. a road in front of a sidewalk).

### Response resolution

Each verb maps to an ordered list. The first entry whose `if` passes fires.
An entry is either shorthand `{ "text": ... }` (narrate only) or
`{ "if": <cond>, "do": [<actions>] }`. No matching entry -> engine default
snark for that verb (defaults live in `verbs.json`). `onEnter`,
`onScoreComplete`, exit `blocked` lists, and topic responses all resolve the
same way: first match only.

### Conditions

`{ "flag": "x" }`, `{ "flagNot": "x" }`, `{ "hasItem": "mug" }`,
`{ "all": [...] }`, `{ "any": [...] }`

Instrument conditions — for `VERB OBJECT PREP OBJECT2` commands, which
resolve on OBJECT2 with OBJECT as the *instrument*:

- `{ "instrument": "cable" }` — the command supplied exactly this item or
  hotspot id as the instrument. "use mug on modem" no longer satisfies a
  cable gate; give wrong instruments bespoke snark where it matters.
- `{ "anyInstrument": true }` — some instrument was supplied (use after the
  bespoke ones as the catch-all wrong-instrument entry); `false` matches
  one-object commands only.

Everywhere without a parsed instrument (one-object commands, `onEnter`,
exits, topics), `instrument` is never satisfied and `anyInstrument` equals
`false`.

### Actions

- `{ "narrate": "text" }` — message window / narrator
- `{ "setFlag": "x" }` / `{ "clearFlag": "x" }`
- `{ "addItem": "id" }` / `{ "removeItem": "id" }`
- `{ "score": { "id": "unique_event", "points": 5 } }` — awards once, ever.
  Author points additively as always; the UI presents the total as a
  ticket queue counting down from maxScore ("TICKETS OPEN 205/250")
- `{ "death": { "id": "electrocuted_by_rack" } }` — death screen + gallery
  registration + instant retry one step back. Copy lives in `data/deaths.json`
  (id, title, text); an inline `"text"`/`"title"` here is only a fallback for
  ids the registry doesn't know yet. Register every death.
- `{ "document": { "style": "clipping", "title": "...", "body": "...",
  "image": "assets/documents/x.png", "caption": "..." } }` — a paper
  close-up: the death-screen pattern generalized into a focus-trapped,
  dismissible DOM overlay (button, Escape, or backdrop tap). CSS renders
  the paper; the text stays real DOM text, never canvas. Styles:
  `newsprint`, `clipping`, `postit`, `flyer`. `title`, `image`, `caption`
  are optional; `body` is either a string (paragraphs split on `\n`) or an
  array mixing plain paragraphs with annotated lines:
  `{ "text": "NIMBUS DAY!!", "style": "marker" }`. Line styles render the
  mark AS a mark — `marker` (big scrawl), `hand` (pen note), `stamp`
  (rubber stamp), `fine` (fine print). Never write stage directions
  ("scrawled across the middle:") into body text; put the mark on the
  paper instead. Document images live in
  `assets/documents/` — typically treated crops of existing background art
  (the Gazette clipping's plaza photo IS the edge-of-town art, sepia'd).
  Actions after `document` in the same list still run behind the overlay.
  Writing rule: the overlay is the exhibit, the log is the narrator — pair
  every document with narration so the joke survives in the transcript.
- `{ "goto": "room_id", "arrive": { "x": 100, "y": 134, "facing": "down" } }`
  — `arrive` is optional; without it the player lands on the target room's
  `playerStart`. Set it when a hub room has several named entrances (a
  command-driven door should drop the player at *that* door, not wherever
  the room's default spawn is).
- `{ "playSound": "id" }` (M8)

## Sprites

`data/sprites.json` registers every sprite sheet; sheets live in
`assets/sprites/` and are compiled from hand-pixeled grids by
`tools/sprites/build_sprites.py` (see CHARACTERS.md — the style bible).

```jsonc
{
  "sprites": {
    "mel_base": { "sheet": "assets/sprites/mel_base.png",
      "frameW": 32, "frameH": 64, "anchor": [15, 61], "walkFps": 9 },
    "gary": { "sheet": "assets/sprites/gary.png",
      "frameW": 40, "frameH": 52, "anchor": [19, 51], "talkFps": 6 }
  }
}
```

Sheet convention (the image declares its own shape): columns = frames,
col 0 is the idle frame, the rest are the cycle. A 4-row sheet is a
**walker** — rows in fixed order down/left/right/up, cols 1+ the walk
cycle. A 1-row sheet is a **static NPC** — cols 1+ the talk cycle.
`anchor` is the frame pixel that lands on the sprite's world (x, y):
feet for standing figures, the counter-cut row for a waist-up NPC, boot
soles for a seated one.

**NPC placement is room data.** A hotspot gains an optional `sprite`
block and the engine draws that NPC standing there — adding a room's NPC
never touches engine code:

```jsonc
{ "id": "gary", "name": "Gary", "polygon": [[32,74],[54,74],[54,124],[32,124]],
  "sprite": { "use": "gary", "at": [43, 123] } }
```

`use` names a registry id; `at` is where the anchor lands (in-world,
320x180 space). Draw order is painter's-by-anchor-y across NPCs and the
player, so keep `at` y above the walkable band for characters standing
behind it. TALK (or ask-about) landing on a sprite-bearing hotspot runs
its talk cycle for a beat; there is nothing to author.

**The outfit map** lives in `data/game.json` under `player.sprite`: an
ordered first-match list, exactly like response resolution. The first
entry whose `if` passes (standard conditions) names Mel's sheet. The
engine never knows a flag's name — a future outfit is a new sheet, a
registry row, and one entry here:

```jsonc
"player": { "sprite": [
  { "if": { "all": [{ "flag": "wearing_coat" }, { "flag": "wearing_pants" }] },
    "use": "mel_coat_pants" },
  { "if": { "flag": "wearing_coat" }, "use": "mel_coat" },
  { "if": { "flag": "wearing_pants" }, "use": "mel_pants" },
  { "use": "mel_base" }
] }
```

## Items

`data/items.json`: `id -> { name, synonyms, look, responses?, presentIf? }`.
The optional `responses` block has the hotspot shape — so a carried item
can react to verbs ("use pants" wears them); `look` is the fallback when
no `look` list is authored. When a room hotspot claims the same noun as a
carried item, the hotspot's authored responses win, and the item catches
any verb the hotspot leaves unhandled (so taking a room's coat never
strands "wear coat" in that room). Score ids authored in items.json
belong to no room and never count toward any room's `onScoreComplete`.

`presentIf` (a standard condition) keeps the item addressable while it
passes even when the item isn't carried — the worn-clothes rule. Spent
items leave the inventory (writing rules), but "wear pants" the day after
should meet "you're already in them", not a parser shrug. Pair it with a
guard entry at the top of the relevant verb list, and a worn-state `look`
entry, as the pants and coat do.

## Parser contract

1. Lowercase, strip articles (a/an/the), collapse whitespace
2. Shell easter eggs intercepted first: `ls`/`dir`/`inv`/`i`/`inventory`
   (inventory), `sudo <cmd>` (re-runs cmd with a power-trip narration),
   `ping <object>`, `man <verb>`, `whoami`, `pwd`, `rm` (denied), `help`/`?`,
   `clear` (wipes the log), `reboot`/`restart`/`shutdown` (bare only —
   with an object they fall through to the parser as `use` synonyms), plus
   `save`/`export` (print save string) and `load <string>`/`import <string>`.
   Keep this list in sync with `src/shell.ts`.
3. Grammar: `VERB [OBJECT] [PREP OBJECT2]` — e.g. `use keycard on door`.
   A trailing preposition is dropped ("use cable on" runs as "use cable") —
   it's the tap composer's arming state, see step 8.
4. Verb resolved via verbs.json synonyms; objects matched against current
   room hotspot names/synonyms + inventory items
5. Fallbacks, in order: unknown verb -> snark; verb with no object where one
   is required -> prompt; near-miss object -> "did you mean" (snarky
   autocorrect voice). Fallback templates live in `verbs.json`:
   `unknownVerb` ({input}), `needsObjectPrompt` ({verb}), `unknownObject`
   ({object}), `didYouMean` ({suggestion} — the correction auto-runs),
   `unknownTopic` ({name}, {topic})
6. A bare object with no verb implies `look` (exact matches only)
7. With `VERB OBJECT PREP OBJECT2`, responses resolve on OBJECT2 (the
   target); OBJECT is the instrument, gated with `instrument` /
   `anyInstrument` conditions (plus `hasItem` where mere possession
   matters). Exception: `talk/ask X about Y` resolves on X with Y as a free
   topic phrase (see Hotspot topics).
8. Tap grammar: tap-completed VERB+NOUN auto-runs in either order — except
   that completing USE's object slot with a *carried item* arms it as the
   instrument ("use cable on ") and waits for a target tap; hotspot taps
   stay immediate. RUN fires an armed command bare (step 3 drops the
   dangling prep). Typed input only ever runs via Enter/RUN; Tab completes
   without running.

## Saves (engine contract)

The engine autosaves to localStorage after every command and on room
change; reload restores. `save` prints a portable save string; `load
<string>` restores it. While a death screen is up, the autosave holds the
pre-command snapshot (one step back). A death during a walk-in exit (a
`blocked` entry or the next room's `onEnter`) snapshots at the threshold —
retry returns the player to the moment before crossing. Found deaths
persist across retries, restores, and imports — they're collectibles.

## Writing rules (the soul)

- Every hotspot gets a bespoke `look`. No exceptions. This is the game.
- Narrator voice: omniscient, mocking, complicit. Second person.
- Deaths are punchlines the player collects; never punish beyond one step back.
- Score whispers completionism: small points for curiosity, not just progress.
- Pointer rewrites: every room's puzzle-state transitions rewrite its
  pointer hotspots — after the big flag flips, the door/coat/window lines
  should pull the player onward, and `onScoreComplete` says so out loud.
- Spent items leave the pocket: when an item's story is over (worn,
  consumed, handed off) and no later act can need it, `removeItem` it in
  the same response and let the narration own the disappearance — the
  inventory is a working set, not a trophy case. Never remove anything a
  later `hasItem` gate could want; durable state belongs in flags, which
  survive the item.
- Consumables vs kit (GDD "Systems"): every non-kit item acquired in an
  act gets spent in that act; a lingering consumable is a signal of open
  tickets, never a gate — acts stay speedrunnable, and no act may require
  a previous act's item. Kit (cable, mug) crosses acts and stays.
- The Coffee Log: each act's one coffee source sets `coffee_act<N>` when
  the mug is filled there (alongside the reusable `mug_full` flag). The
  M8 postmortem reads these — author the flag, don't invent variants.
