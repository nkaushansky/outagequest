// Content loading. The game is JSON: everything under data/ and
// assets/backgrounds/ is picked up by glob, so adding a room means adding
// files, never touching the engine.

import type {
  DeathsFile,
  Facing,
  GameConfig,
  Hotspot,
  ItemsFile,
  Pt,
  ResponseEntry,
  Room,
  RoomExit,
  VerbsFile,
} from "./types";

import gameJson from "../data/game.json";
import verbsJson from "../data/verbs.json";
import itemsJson from "../data/items.json";
import deathsJson from "../data/deaths.json";

const roomModules = import.meta.glob("../data/rooms/*.json", {
  eager: true,
  import: "default",
});

const backgroundUrls = import.meta.glob("../assets/backgrounds/*.png", {
  eager: true,
  import: "default",
  query: "?url",
});

function toPts(raw: unknown): Pt[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((pair) => {
    const p = pair as [number, number];
    return { x: Number(p[0]), y: Number(p[1]) };
  });
}

function toFacing(raw: unknown): Facing {
  return raw === "left" || raw === "right" || raw === "up" || raw === "down"
    ? raw
    : "left";
}

function normalizeRoom(raw: unknown): Room {
  const r = raw as Record<string, unknown>;
  const start = (r.playerStart ?? {}) as Record<string, unknown>;
  const exits = Array.isArray(r.exits) ? r.exits : [];
  const hotspots = Array.isArray(r.hotspots) ? r.hotspots : [];
  const room: Room = {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    background: String(r.background ?? ""),
    walkable: toPts(r.walkable),
    playerStart: {
      x: Number(start.x ?? 160),
      y: Number(start.y ?? 160),
      facing: toFacing(start.facing),
    },
    exits: exits.map((e): RoomExit => {
      const x = e as Record<string, unknown>;
      const arrive = (x.arrive ?? {}) as Record<string, unknown>;
      const exit: RoomExit = {
        to: String(x.to ?? ""),
        polygon: toPts(x.polygon),
        arrive: {
          x: Number(arrive.x ?? 160),
          y: Number(arrive.y ?? 160),
          facing: toFacing(arrive.facing),
        },
      };
      if (x.if) exit.if = x.if as RoomExit["if"];
      if (Array.isArray(x.blocked)) exit.blocked = x.blocked as ResponseEntry[];
      return exit;
    }),
    onEnter: (Array.isArray(r.onEnter) ? r.onEnter : []) as ResponseEntry[],
    hotspots: hotspots.map((h): Hotspot => {
      const s = h as Record<string, unknown>;
      const hotspot: Hotspot = {
        id: String(s.id ?? ""),
        name: String(s.name ?? ""),
        synonyms: (s.synonyms ?? []) as string[],
        polygon: toPts(s.polygon),
        responses: (s.responses ?? {}) as Hotspot["responses"],
      };
      if (Array.isArray(s.topics)) hotspot.topics = s.topics as Hotspot["topics"];
      if (Array.isArray(s.topicDefault))
        hotspot.topicDefault = s.topicDefault as ResponseEntry[];
      return hotspot;
    }),
  };
  if (Array.isArray(r.onScoreComplete)) {
    room.onScoreComplete = r.onScoreComplete as ResponseEntry[];
  }
  return room;
}

export interface Content {
  game: GameConfig;
  verbs: VerbsFile;
  items: ItemsFile;
  deaths: DeathsFile;
  rooms: Map<string, Room>;
  /** room background path (as written in room JSON) -> served asset URL */
  backgroundUrl(path: string): string | undefined;
}

export function loadContent(): Content {
  const rooms = new Map<string, Room>();
  for (const mod of Object.values(roomModules)) {
    const room = normalizeRoom(mod);
    if (room.id) rooms.set(room.id, room);
  }

  const bgByPath = new Map<string, string>();
  for (const [key, url] of Object.entries(backgroundUrls)) {
    // key is "../assets/backgrounds/<file>.png"; rooms reference
    // "assets/backgrounds/<file>.png"
    bgByPath.set(key.replace(/^\.\.\//, ""), String(url));
  }

  return {
    game: gameJson as GameConfig,
    verbs: verbsJson as unknown as VerbsFile,
    items: itemsJson as unknown as ItemsFile,
    deaths: deathsJson as unknown as DeathsFile,
    rooms,
    backgroundUrl: (path) => bgByPath.get(path.replace(/^\.?\//, "")),
  };
}
