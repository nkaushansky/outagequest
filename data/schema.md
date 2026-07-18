# SPOF Data Schema

The engine is code; **the game is JSON.** Everything a player can see, read,
take, or die from is defined in these files. Coordinates are in internal
resolution space: 320 wide, 180 tall, origin top-left.

## Files

- `data/game.json` — global config: title, startRoom, maxScore
- `data/verbs.json` — canonical verbs + synonym table + fallback templates
- `data/items.json` — inventory items
- `data/deaths.json` — death registry: the single source of death copy
  (screen text + gallery title). Room JSON triggers deaths by id.
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
  // then to verbs.json `unknownTopic` ({name}, {topic}). The autocomplete
  // row offers each topic's first `match` phrase after "about" — write
  // match[0] as the label you want players to see.
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
- `{ "score": { "id": "unique_event", "points": 5 } }` — awards once, ever
- `{ "death": { "id": "electrocuted_by_rack" } }` — death screen + gallery
  registration + instant retry one step back. Copy lives in `data/deaths.json`
  (id, title, text); an inline `"text"`/`"title"` here is only a fallback for
  ids the registry doesn't know yet. Register every death.
- `{ "goto": "room_id" }`
- `{ "playSound": "id" }` (M8)

## Items

`data/items.json`: `id -> { name, synonyms, look, responses? }`. The
optional `responses` block has the hotspot shape and resolves first — so a
carried item can react to verbs ("use pants" wears them); `look` is the
fallback when no `look` list is authored. Score ids authored in items.json
belong to no room and never count toward any room's `onScoreComplete`.

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
