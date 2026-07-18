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
}

export interface ItemDef {
  name: string;
  synonyms?: string[];
  look: string;
  /** Optional per-verb responses, same shape as hotspot responses, so
   *  carried items can react ("use pants" = wearing them). `look` remains
   *  the fallback when no "look" list is authored. */
  responses?: Record<string, ResponseEntry[]>;
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

export type Condition =
  | { flag: string }
  | { flagNot: string }
  | { hasItem: string }
  | { instrument: string }
  | { anyInstrument: boolean }
  | { all: Condition[] }
  | { any: Condition[] };

export type Action =
  | { narrate: string }
  | { setFlag: string }
  | { clearFlag: string }
  | { addItem: string }
  | { removeItem: string }
  | { score: { id: string; points: number } }
  | { death: { id: string; text?: string; title?: string } }
  | { goto: string }
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
  hotspots: Hotspot[];
  /** Fires once, when every score id authored in this room's JSON has been
   *  awarded (ids inside this list itself are excluded — completion bonuses
   *  are legal). */
  onScoreComplete?: ResponseEntry[];
}
