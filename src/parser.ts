// The parser (data/schema.md "Parser contract", steps 1 and 3–5).
// Shell easter eggs (step 2) are intercepted in shell.ts before this runs.
// Pure functions: the engine owns all side effects.

import type { ItemsFile, Room, VerbsFile } from "./types";
import type { GameState } from "./state";

export interface ObjectRef {
  kind: "hotspot" | "item";
  id: string;
  name: string;
}

export interface Candidate {
  phrase: string; // normalized, space-joined
  ref: ObjectRef;
}

export interface ParsedCommand {
  verb: string; // canonical
  object?: ObjectRef;
  /** Carried item sharing OBJECT's noun (see SpanResolution.alt). */
  objectAlt?: ObjectRef;
  prep?: string;
  object2?: ObjectRef;
  /** Carried item sharing OBJECT2's noun. */
  object2Alt?: ObjectRef;
  /** "talk/ask X about Y": Y is a free topic phrase, not an object. */
  topic?: string;
  /** Set when a near-miss was accepted; holds the corrected phrase. */
  didYouMean?: string;
}

export type ParseResult =
  | { ok: true; cmd: ParsedCommand }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "unknownVerb"; input: string }
  | { ok: false; reason: "needsObject"; verb: string }
  | { ok: false; reason: "unknownObject"; object: string };

export const PREPS = new Set([
  "on", "onto", "with", "to", "at", "in", "into", "from",
  "under", "behind", "about", "using",
]);

const ARTICLES = new Set(["a", "an", "the"]);

/** Lowercase, strip punctuation and articles, collapse whitespace. */
export function normalize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !ARTICLES.has(t));
}

export interface VerbMatch {
  verb: string;
  consumed: number;
}

/** Longest synonym wins, so "look at" beats "look". */
export function matchVerb(tokens: string[], verbs: VerbsFile): VerbMatch | null {
  let best: VerbMatch | null = null;
  for (const [canonical, def] of Object.entries(verbs.verbs)) {
    for (const syn of def.synonyms) {
      const synTokens = normalize(syn);
      if (synTokens.length === 0 || synTokens.length > tokens.length) continue;
      let matches = true;
      for (let i = 0; i < synTokens.length; i++) {
        if (tokens[i] !== synTokens[i]) {
          matches = false;
          break;
        }
      }
      if (matches && (!best || synTokens.length > best.consumed)) {
        best = { verb: canonical, consumed: synTokens.length };
      }
    }
  }
  return best;
}

/** Room hotspots first, then carried items — schema matching order. */
export function buildCandidates(
  room: Room,
  state: GameState,
  items: ItemsFile,
): Candidate[] {
  const out: Candidate[] = [];
  for (const h of room.hotspots) {
    const ref: ObjectRef = { kind: "hotspot", id: h.id, name: h.name };
    for (const phrase of [h.name, ...(h.synonyms ?? [])]) {
      const norm = normalize(phrase).join(" ");
      if (norm) out.push({ phrase: norm, ref });
    }
  }
  for (const id of state.inventory) {
    const item = items[id];
    if (!item) continue;
    const ref: ObjectRef = { kind: "item", id, name: item.name };
    for (const phrase of [item.name, ...(item.synonyms ?? [])]) {
      const norm = normalize(phrase).join(" ");
      if (norm) out.push({ phrase: norm, ref });
    }
  }
  return out;
}

/** Damerau-Levenshtein (optimal string alignment) for near-miss objects. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i]![0] = i;
  for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2]![j - 2]! + cost);
      }
      d[i]![j] = v;
    }
  }
  return d[m]![n]!;
}

export interface SpanResolution {
  ref: ObjectRef;
  /** Same phrase, other kind: when a room hotspot and a carried item share
   *  a noun, the hotspot wins the match and the item rides along so the
   *  engine can let it catch verbs the hotspot leaves unhandled. */
  alt?: ObjectRef;
  /** Present when matched via near-miss ("did you mean"). */
  suggestion?: string;
}

export function resolveSpan(
  span: string[],
  candidates: Candidate[],
): SpanResolution | null {
  if (span.length === 0) return null;
  // Exact match, letting leading descriptors drop: "old coffee mugs" still
  // finds "coffee mugs".
  for (let start = 0; start < span.length; start++) {
    const joined = span.slice(start).join(" ");
    const hit = candidates.find((c) => c.phrase === joined);
    if (hit) {
      const alt = candidates.find(
        (c) => c.phrase === joined && c.ref.kind !== hit.ref.kind,
      );
      return alt ? { ref: hit.ref, alt: alt.ref } : { ref: hit.ref };
    }
  }
  // Near miss.
  const joined = span.join(" ");
  let best: Candidate | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const dist = editDistance(joined, c.phrase);
    if (dist < bestD) {
      bestD = dist;
      best = c;
    }
  }
  const limit = joined.length <= 4 ? 1 : 2;
  if (best && bestD > 0 && bestD <= limit) {
    return { ref: best.ref, suggestion: best.phrase };
  }
  return null;
}

/** Grammar: VERB [OBJECT] [PREP OBJECT2]. A bare object implies `look`. */
export function parse(
  raw: string,
  verbs: VerbsFile,
  candidates: Candidate[],
): ParseResult {
  const tokens = normalize(raw);
  if (tokens.length === 0) return { ok: false, reason: "empty" };

  const vm = matchVerb(tokens, verbs);
  if (!vm) {
    // Bare noun implies look — exact full match only, so that an unknown
    // verb before a known object still gets the unknown-verb snark.
    const joined = tokens.join(" ");
    const bare = candidates.find((c) => c.phrase === joined);
    if (bare) {
      return { ok: true, cmd: { verb: "look", object: bare.ref } };
    }
    return { ok: false, reason: "unknownVerb", input: raw.trim() };
  }

  const rest = tokens.slice(vm.consumed);
  // A dangling preposition ("use cable on") is the tap-composer's arming
  // state — RUN executes it as the one-object command it already is.
  if (rest.length > 0 && PREPS.has(rest[rest.length - 1]!)) rest.pop();
  const def = verbs.verbs[vm.verb];
  if (rest.length === 0) {
    if (def?.needsObject) return { ok: false, reason: "needsObject", verb: vm.verb };
    return { ok: true, cmd: { verb: vm.verb } };
  }

  let prepIdx = -1;
  for (let i = 1; i <= rest.length - 2; i++) {
    if (PREPS.has(rest[i]!)) {
      prepIdx = i;
      break;
    }
  }

  const objSpan = prepIdx === -1 ? rest : rest.slice(0, prepIdx);
  const obj = resolveSpan(objSpan, candidates);
  if (!obj) return { ok: false, reason: "unknownObject", object: objSpan.join(" ") };

  const cmd: ParsedCommand = { verb: vm.verb, object: obj.ref };
  if (obj.alt) cmd.objectAlt = obj.alt;
  if (obj.suggestion) cmd.didYouMean = obj.suggestion;

  if (prepIdx !== -1) {
    const span2 = rest.slice(prepIdx + 1);
    // "talk/ask X about Y": Y is a free topic phrase, matched later against
    // the hotspot's authored topics — never against room objects.
    if (vm.verb === "talk" && rest[prepIdx] === "about") {
      cmd.prep = "about";
      cmd.topic = span2.join(" ");
      return { ok: true, cmd };
    }
    const obj2 = resolveSpan(span2, candidates);
    if (!obj2) return { ok: false, reason: "unknownObject", object: span2.join(" ") };
    cmd.prep = rest[prepIdx]!;
    cmd.object2 = obj2.ref;
    if (obj2.alt) cmd.object2Alt = obj2.alt;
    if (obj2.suggestion && !cmd.didYouMean) cmd.didYouMean = obj2.suggestion;
  }

  return { ok: true, cmd };
}

/** Fill "{key}" placeholders in a template from verbs.json. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}
