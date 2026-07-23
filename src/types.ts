// Schema types — the TypeScript mirror of data/schema.md.
// The engine interprets these; it never contains room-specific logic.

export interface Pt {
  x: number;
  y: number;
}

export type Facing = "left" | "right" | "up" | "down";

export interface GameConfig {
  title: string;
  titleScreen?: string;
  startRoom: string;
  maxScore: number;
  /** Outfit map: first entry whose `if` passes names the player's sprite.
   *  The engine never knows a flag name — dressing up is pure data. */
  player?: { sprite: OutfitEntry[] };
}

export interface OutfitEntry {
  if?: Condition;
  use: string;
}

/** One sheet in data/sprites.json. Walker sheets are 4 rows in fixed
 *  order down/left/right/up; single-row sheets are static NPCs. Col 0 is
 *  idle; remaining cols are the walk or talk cycle. `anchor` is the frame
 *  pixel that lands on the sprite's world (x, y) — feet, usually. */
export interface SpriteDef {
  sheet: string;
  frameW: number;
  frameH: number;
  anchor: [number, number];
  walkFps?: number;
  talkFps?: number;
}

export interface SpritesFile {
  note?: string;
  sprites: Record<string, SpriteDef>;
}

/** A hotspot's standing sprite: which sheet, and where the anchor goes. */
export interface HotspotSpriteRef {
  use: string;
  at: Pt;
}

export interface VerbDef {
  synonyms: string[];
  needsObject: boolean;
  default: string;
}

export interface VerbsFile {
  verbs: Record<string, VerbDef>;
  unknownVerb: string;
  didYouMean: string;
  needsObjectPrompt: string;
  unknownObject: string;
  /** "{name} has no opinions on {topic}" — talk-about miss fallback. */
  unknownTopic?: string;
  /** Object words that turn LOOK into a room survey ("around", "room"). */
  lookAroundWords?: string[];
}

export interface ItemDef {
  name: string;
  synonyms?: string[];
  look: string;
  /** Optional per-verb responses, same shape as hotspot responses, so
   *  carried items can react ("use pants" = wearing them). `look` remains
   *  the fallback when no "look" list is authored. */
  responses?: Record<string, ResponseEntry[]>;
  /** The item also answers to its nouns (without being carried) while
   *  this passes — worn things stay addressable after removeItem. */
  presentIf?: Condition;
}

export type ItemsFile = Record<string, ItemDef>;

export interface DeathDef {
  id: string;
  title?: string;
  text?: string;
}

export interface DeathsFile {
  note?: string;
  deaths: DeathDef[];
}

/** data/hints.json: the narrator's triage queue. First entry whose `if`
 *  passes is the current hint — author from the earliest gate to the
 *  latest, each conditioned on that step being incomplete. */
export interface HintsFile {
  note?: string;
  hints: Array<{ if?: Condition; text: string }>;
}

export type Condition =
  | { flag: string }
  | { flagNot: string }
  | { hasItem: string }
  | { instrument: string }
  | { anyInstrument: boolean }
  | { all: Condition[] }
  | { any: Condition[] };

/** A paper close-up (the death-screen pattern, generalized): a
 *  focus-trapped, dismissible DOM overlay. CSS renders the paper; the
 *  text stays real DOM text — never canvas. */
export interface DocumentSpec {
  /** Paper skin, rendered by CSS: "newsprint" | "clipping" | "postit" | "flyer". */
  style: string;
  title?: string;
  /** Body text. A plain string splits into paragraphs on "\n". An array
   *  mixes plain paragraphs with annotated lines — marks ON the paper
   *  (marker scrawl, rubber stamp, handwriting, fine print) rendered as
   *  marks, never described as stage directions. */
  body: string | Array<string | { text: string; style?: string }>;
  /** Optional image under assets/documents/ — typically a treated crop
   *  of existing background art (free continuity). */
  image?: string;
  caption?: string;
}

export type Action =
  | { narrate: string }
  | { setFlag: string }
  | { clearFlag: string }
  | { addItem: string }
  | { removeItem: string }
  | { score: { id: string; points: number } }
  | { death: { id: string; text?: string; title?: string } }
  | { document: DocumentSpec }
  | { goto: string; arrive?: { x: number; y: number; facing: Facing } }
  | { playSound: string };

export interface ResponseEntry {
  if?: Condition;
  text?: string;
  do?: Action[];
}

export interface TopicDef {
  match: string[];
  responses: ResponseEntry[];
}

export interface Hotspot {
  id: string;
  name: string;
  synonyms?: string[];
  polygon: Pt[];
  responses?: Record<string, ResponseEntry[]>;
  /** "talk/ask X about Y" — matched against `match` phrases. */
  topics?: TopicDef[];
  /** Runs for a topic no `match` covers (before verbs.json unknownTopic). */
  topicDefault?: ResponseEntry[];
  /** An NPC stands here: sprite id + anchor point, pure data. */
  sprite?: HotspotSpriteRef;
}

export interface RoomExit {
  to: string;
  polygon: Pt[];
  arrive: { x: number; y: number; facing: Facing };
  /** Optional gate: walking into the exit only fires when this passes. */
  if?: Condition;
  /** Runs when the gate fails (first-match, like any response list). */
  blocked?: ResponseEntry[];
}

export interface Room {
  id: string;
  name: string;
  background: string;
  walkable: Pt[];
  playerStart: { x: number; y: number; facing: Facing };
  exits: RoomExit[];
  onEnter: ResponseEntry[];
  /** Bare LOOK / "look around": the narrator's room survey — a broad,
   *  orienting read that names who and what is here. First-match. */
  lookAround?: ResponseEntry[];
  hotspots: Hotspot[];
  /** Fires once, when every score id authored in this room's JSON has been
   *  awarded (ids inside this list itself are excluded — completion bonuses
   *  are legal). */
  onScoreComplete?: ResponseEntry[];
}
