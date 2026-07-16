# SPOF Data Schema

The engine is code; **the game is JSON.** Everything a player can see, read,
take, or die from is defined in these files. Coordinates are in internal
resolution space: 320 wide, 180 tall, origin top-left.

## Files

- `data/game.json` — global config: title, startRoom, maxScore
- `data/verbs.json` — canonical verbs + synonym table
- `data/items.json` — inventory items
- `data/deaths.json` — death registry (for the collectible deaths gallery)
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
      "arrive": { "x": 30, "y": 160, "facing": "right" } }
  ],
  "onEnter": [
    { "if": { "flagNot": "seen_office_intro" },
      "do": [ { "narrate": "Welcome to the nerve center." },
              { "setFlag": "seen_office_intro" } ] }
  ],
  "hotspots": [ /* see Hotspot */ ]
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
  }
}
```

### Response resolution

Each verb maps to an ordered list. The first entry whose `if` passes fires.
An entry is either shorthand `{ "text": ... }` (narrate only) or
`{ "if": <cond>, "do": [<actions>] }`. No matching entry -> engine default
snark for that verb (defaults live in `verbs.json`).

### Conditions

`{ "flag": "x" }`, `{ "flagNot": "x" }`, `{ "hasItem": "mug" }`,
`{ "all": [...] }`, `{ "any": [...] }`

### Actions

- `{ "narrate": "text" }` — message window / narrator
- `{ "setFlag": "x" }` / `{ "clearFlag": "x" }`
- `{ "addItem": "id" }` / `{ "removeItem": "id" }`
- `{ "score": { "id": "unique_event", "points": 5 } }` — awards once, ever
- `{ "death": { "id": "electrocuted_by_rack", "text": "..." } }` — death screen,
  registers in gallery, offers instant retry one step back
- `{ "goto": "room_id" }`
- `{ "playSound": "id" }` (M8)

## Parser contract

1. Lowercase, strip articles (a/an/the), collapse whitespace
2. Shell easter eggs intercepted first: `ls` (inventory), `sudo <cmd>`
   (re-runs cmd with a power-trip narration), `ping <npc>`, `man <verb>`,
   `whoami` ("That's the question, isn't it, Mel."), `reboot` (bare only —
   `reboot X` falls through to the parser as a `use` synonym), plus
   `save`/`export` (print save string) and `load <string>`/`import <string>`
3. Grammar: `VERB [OBJECT] [PREP OBJECT2]` — e.g. `use keycard on door`
4. Verb resolved via verbs.json synonyms; objects matched against current
   room hotspot names/synonyms + inventory items
5. Fallbacks, in order: unknown verb -> snark; verb with no object where one
   is required -> prompt; near-miss object -> "did you mean" (snarky
   autocorrect voice). Fallback templates live in `verbs.json`:
   `unknownVerb` ({input}), `needsObjectPrompt` ({verb}), `unknownObject`
   ({object}), `didYouMean` ({suggestion} — the correction auto-runs)
6. A bare object with no verb implies `look` (exact matches only)
7. With `VERB OBJECT PREP OBJECT2`, responses resolve on OBJECT2 (the
   target); gate on the instrument with `hasItem` conditions

## Saves (engine contract)

The engine autosaves to localStorage after every command and on room
change; reload restores. `save` prints a portable save string; `load
<string>` restores it. While a death screen is up, the autosave holds the
pre-command snapshot (one step back). Found deaths persist across retries,
restores, and imports — they're collectibles.

## Writing rules (the soul)

- Every hotspot gets a bespoke `look`. No exceptions. This is the game.
- Narrator voice: omniscient, mocking, complicit. Second person.
- Deaths are punchlines the player collects; never punish beyond one step back.
- Score whispers completionism: small points for curiosity, not just progress.
