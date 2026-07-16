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
}

export interface ItemDef {
  name: string;
  synonyms?: string[];
  look: string;
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
  | { all: Condition[] }
  | { any: Condition[] };

export type Action =
  | { narrate: string }
  | { setFlag: string }
  | { clearFlag: string }
  | { addItem: string }
  | { removeItem: string }
  | { score: { id: string; points: number } }
  | { death: { id: string; text: string; title?: string } }
  | { goto: string }
  | { playSound: string };

export interface ResponseEntry {
  if?: Condition;
  text?: string;
  do?: Action[];
}

export interface Hotspot {
  id: string;
  name: string;
  synonyms?: string[];
  polygon: Pt[];
  responses?: Record<string, ResponseEntry[]>;
}

export interface RoomExit {
  to: string;
  polygon: Pt[];
  arrive: { x: number; y: number; facing: Facing };
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
}
