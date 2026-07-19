// Engine orchestration: input pipeline (echo -> snapshot -> shell ->
// parse -> resolve), room changes, and all state side effects. Room
// behavior comes exclusively from JSON — nothing here knows any room.

import { loadContent, type Content } from "./data";
import { GameState, type Snapshot } from "./state";
import { runEntries, type EngineContext } from "./resolver";
import { tryShell } from "./shell";
import { Scene } from "./scene";
import { UI } from "./ui";
import { decodeSave, encodeSave, readLocal, writeLocal, type SaveData } from "./save";
import {
  buildCandidates,
  fill,
  matchVerb,
  normalize,
  parse,
  PREPS,
  resolveSpan,
  type Candidate,
  type ParsedCommand,
} from "./parser";
import type { Facing, Hotspot, ResponseEntry, Room, RoomExit } from "./types";
import { evalCondition } from "./resolver";

const MAX_SUGGESTIONS = 6;

export class Engine {
  private content: Content;
  private state = new GameState();
  private scene!: Scene;
  private ui!: UI;
  private images = new Map<string, HTMLImageElement>();
  private lastSnapshot: Snapshot | null = null;
  /** Set while a death overlay is up, so autosave stays one step back. */
  private pendingDeath = false;
  /** Per room: every score id authored in its JSON (onScoreComplete's own
   *  entries excluded). Computed once — content stays pure data. */
  private roomScoreIds = new Map<string, Set<string>>();
  /** Hotspot id of the live conversation: while set, the empty command
   *  line offers tappable "ask X about Y" chips. */
  private topicContext: string | null = null;
  private readonly dev = new URLSearchParams(window.location.search).has("dev");

  constructor() {
    this.content = loadContent();
    for (const room of this.content.rooms.values()) {
      this.roomScoreIds.set(room.id, collectScoreIds(room));
    }
  }

  boot(sceneEl: HTMLElement, uiEl: HTMLElement): void {
    const verbs = Object.keys(this.content.verbs.verbs);
    this.ui = new UI(uiEl, verbs, {
      onSubmit: (raw) => {
        this.ui.setInput("", this.ui.finePointer);
        this.exec(raw);
      },
      onInputChanged: () => this.refreshSuggestions(),
      onVerb: (verb) => this.composeVerb(verb),
      onSuggestion: (s, run) => this.acceptSuggestion(s, run),
      onItemTap: (name) => this.insertNoun(name),
      onSteer: (key, down) => this.scene.steerKey(key, down),
    });

    this.scene = new Scene(
      sceneEl,
      this.state,
      {
        onHotspotTap: (h) => this.hotspotTap(h),
        onExit: (exit) => this.tryExit(exit),
        onDevPointer: (info) => this.ui.setDevInfo(info),
      },
      this.dev,
    );

    this.refreshInventory();
    this.refreshSuggestions();

    const saved = readLocal();
    if (saved && this.content.rooms.has(saved.snap.roomId)) {
      this.state.restore(saved.snap);
      this.state.deathsFound = [...saved.deathsFound];
      this.changeRoom(saved.snap.roomId, saved.snap.player, false);
      this.narrate("Autosave restored. The outage, tragically, persists.", "sys");
      this.refreshInventory();
    } else {
      this.changeRoom(this.content.game.startRoom);
    }
  }

  // ---- rooms ---------------------------------------------------------

  private currentRoom(): Room | undefined {
    return this.content.rooms.get(this.state.roomId);
  }

  private backgroundFor(room: Room): HTMLImageElement | null {
    const url = this.content.backgroundUrl(room.background);
    if (!url) {
      this.narrate(`[engine] missing background: ${room.background}`, "err");
      return null;
    }
    let img = this.images.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      img.decode().catch(() => {
        this.narrate(`[engine] failed to load ${room.background}`, "err");
      });
      this.images.set(url, img);
    }
    return img;
  }

  private changeRoom(
    id: string,
    arrive?: { x: number; y: number; facing: Facing },
    runOnEnter = true,
  ): void {
    const room = this.content.rooms.get(id);
    if (!room) {
      this.narrate(`[engine] no such room: ${id}`, "err");
      return;
    }
    this.state.roomId = id;
    this.topicContext = null;
    const at = arrive ?? room.playerStart;
    this.state.player.x = at.x;
    this.state.player.y = at.y;
    this.state.player.facing = at.facing;
    this.scene.setRoom(room, this.backgroundFor(room));
    this.refreshStatus();
    if (runOnEnter) {
      runEntries(room.onEnter, this.ctx());
      this.checkScoreComplete();
      this.autosave();
    }
    this.refreshStatus();
    this.refreshInventory();
    // A walked exit ends any conversation; the chip row must follow suit.
    this.refreshSuggestions();
  }

  /** Walk-into-exit gatekeeper. Returns false when the gate held. */
  private tryExit(exit: RoomExit): boolean {
    // One step back from the threshold: anything that fires here (blocked
    // snark, an onEnter death in the next room) retries to this moment.
    this.lastSnapshot = this.state.snapshot();
    if (exit.if && !evalCondition(exit.if, this.state)) {
      runEntries(exit.blocked, this.ctx());
      this.checkScoreComplete();
      this.refreshStatus();
      this.refreshInventory();
      this.autosave();
      return false;
    }
    this.changeRoom(exit.to, { ...exit.arrive });
    return true;
  }

  /** The narrator settles the room's tab once its last score id lands. */
  private checkScoreComplete(): void {
    if (this.pendingDeath) return;
    const room = this.currentRoom();
    if (!room) return;
    const ids = this.roomScoreIds.get(room.id);
    if (!ids || ids.size === 0) return;
    const flag = "__scorecomplete_" + room.id;
    if (this.state.flags.has(flag)) return;
    for (const id of ids) if (!this.state.awarded.has(id)) return;
    this.state.flags.add(flag);
    runEntries(room.onScoreComplete, this.ctx());
  }

  // ---- saves -----------------------------------------------------------

  private saveData(): SaveData {
    // While the death overlay is up the only way forward is the retry,
    // so what persists is the pre-command snapshot (one step back).
    const snap =
      this.pendingDeath && this.lastSnapshot
        ? this.lastSnapshot
        : this.state.snapshot();
    return { v: 1, snap, deathsFound: [...this.state.deathsFound] };
  }

  private autosave(): void {
    writeLocal(this.saveData());
  }

  private exportSave(): string {
    return encodeSave(this.saveData());
  }

  private importSave(raw: string): boolean {
    const data = decodeSave(raw);
    if (!data || !this.content.rooms.has(data.snap.roomId)) return false;
    this.state.restore(data.snap);
    this.state.deathsFound = [...data.deathsFound];
    this.pendingDeath = false;
    this.changeRoom(data.snap.roomId, data.snap.player, false);
    this.autosave();
    return true;
  }

  // ---- input pipeline ------------------------------------------------

  exec(raw: string, nested = false): void {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (!nested) {
      this.ui.echo(trimmed);
      this.lastSnapshot = this.state.snapshot();
    }

    const handled = tryShell(trimmed, {
      content: this.content,
      state: this.state,
      candidates: () => this.candidates(),
      narrate: (text, cls) => this.narrate(text, cls),
      clearLog: () => this.ui.clearLog(),
      exec: (input) => this.exec(input, true),
      exportSave: () => this.exportSave(),
      importSave: (raw) => this.importSave(raw),
    });
    if (!handled) this.dispatch(trimmed);
    this.checkScoreComplete();

    this.refreshStatus();
    this.refreshInventory();
    this.refreshSuggestions();
    if (!nested) this.autosave();
  }

  private candidates(): Candidate[] {
    const room = this.currentRoom();
    if (!room) return [];
    return buildCandidates(room, this.state, this.content.items);
  }

  private dispatch(raw: string): void {
    const verbsFile = this.content.verbs;
    const result = parse(raw, verbsFile, this.candidates());

    if (!result.ok) {
      switch (result.reason) {
        case "empty":
          return;
        case "unknownVerb":
          this.narrate(fill(verbsFile.unknownVerb, { input: result.input }), "sys");
          return;
        case "needsObject":
          this.narrate(
            fill(verbsFile.needsObjectPrompt, { verb: result.verb }),
            "sys",
          );
          return;
        case "unknownObject":
          this.narrate(
            fill(verbsFile.unknownObject, { object: result.object }),
            "sys",
          );
          return;
      }
    }

    const cmd = result.cmd;
    if (cmd.didYouMean) {
      this.narrate(
        fill(verbsFile.didYouMean, { suggestion: cmd.didYouMean }),
        "sys",
      );
    }
    this.perform(cmd);
  }

  /** Resolve a parsed command against the target object's response lists.
   *  With OBJECT2 present ("use keycard on door"), the target is OBJECT2
   *  and OBJECT becomes the instrument — `instrument`/`anyInstrument`
   *  conditions see it. Topic commands resolve on OBJECT instead. */
  private perform(cmd: ParsedCommand): void {
    const verbDef = this.content.verbs.verbs[cmd.verb];
    const fallback = () => {
      if (verbDef) this.narrate(verbDef.default);
    };

    // A conversation ends when the player does something else; talking to
    // (or asking) a topic-bearing hotspot re-opens it below.
    this.topicContext = null;

    if (cmd.topic !== undefined) {
      this.performTopic(cmd, fallback);
      return;
    }

    const target = cmd.object2 ?? cmd.object;
    if (!target) {
      fallback();
      return;
    }
    const instrumentId = cmd.object2 ? cmd.object?.id : undefined;

    if (target.kind === "hotspot") {
      const room = this.currentRoom();
      const hotspot = room?.hotspots.find((h) => h.id === target.id);
      if (cmd.verb === "talk" && hotspot?.topics?.length) {
        // Chatting with someone who has topics arms the tap path: the
        // empty command line offers "ask X about Y" chips.
        this.topicContext = hotspot.id;
      }
      const entries = hotspot?.responses?.[cmd.verb];
      if (runEntries(entries, this.ctx(instrumentId))) return;
      // The room named it but authored nothing for this verb; a carried
      // item sharing the noun catches the command ("wear coat" works in
      // the room the coat came from).
      const alt = cmd.object2 ? cmd.object2Alt : cmd.objectAlt;
      if (alt?.kind === "item") {
        const item = this.content.items[alt.id];
        if (runEntries(item?.responses?.[cmd.verb], this.ctx(instrumentId))) return;
        if (cmd.verb === "look" && item?.look) {
          this.narrate(item.look);
          return;
        }
      }
      fallback();
      return;
    }

    // Inventory item target: authored responses first, bespoke look second.
    const item = this.content.items[target.id];
    if (runEntries(item?.responses?.[cmd.verb], this.ctx(instrumentId))) return;
    if (cmd.verb === "look" && item?.look) {
      this.narrate(item.look);
      return;
    }
    fallback();
  }

  /** "talk/ask X about Y" — X's authored topics, then X's topicDefault,
   *  then the verbs.json unknownTopic template. */
  private performTopic(cmd: ParsedCommand, fallback: () => void): void {
    const target = cmd.object;
    const topic = cmd.topic ?? "";
    if (!target) {
      fallback();
      return;
    }
    const room = this.currentRoom();
    const hotspot =
      target.kind === "hotspot"
        ? room?.hotspots.find((h) => h.id === target.id)
        : undefined;
    if (hotspot?.topics?.length) this.topicContext = hotspot.id;
    const match = hotspot?.topics?.find((t) =>
      t.match.some((m) => normalize(m).join(" ") === topic),
    );
    if (match && runEntries(match.responses, this.ctx())) return;
    if (runEntries(hotspot?.topicDefault, this.ctx())) return;
    const template = this.content.verbs.unknownTopic;
    if (template) {
      this.narrate(fill(template, { name: target.name, topic }), "sys");
    } else {
      fallback();
    }
  }

  // ---- engine context (side effects for the resolver) -----------------

  private ctx(instrumentId?: string): EngineContext {
    return {
      state: this.state,
      instrumentId,
      narrate: (text, cls) => this.narrate(text, cls),
      award: (id, points) => this.award(id, points),
      addItem: (id) => {
        this.state.addItem(id);
        this.refreshInventory();
      },
      removeItem: (id) => {
        this.state.removeItem(id);
        this.refreshInventory();
      },
      die: (id, text, title) => this.die(id, text, title),
      gotoRoom: (id) => this.changeRoom(id),
    };
  }

  private narrate(text: string, cls = "narrate"): void {
    this.ui.line(text, cls);
  }

  private award(id: string, points: number): void {
    if (this.state.awarded.has(id)) return;
    this.state.awarded.add(id);
    this.state.score += points;
    this.refreshStatus();
    const open = this.content.game.maxScore - this.state.score;
    this.narrate(
      `${points} ticket${points === 1 ? "" : "s"} closed (${open} open)`,
      "pts",
    );
  }

  private die(id: string, text?: string, title?: string): void {
    this.state.registerDeath(id);
    this.pendingDeath = true;
    // deaths.json is the single source of death copy (the M8 gallery reads
    // it); inline room text only covers deaths the registry doesn't know.
    const registered = this.content.deaths.deaths.find((d) => d.id === id);
    const body =
      registered?.text ??
      text ??
      "You die of an undocumented feature. (Register this death in data/deaths.json.)";
    this.narrate(body, "err");
    this.ui.showDeath(registered?.title ?? title ?? "SEGMENTATION FAULT", body, () => {
      if (this.lastSnapshot) {
        const snap = this.lastSnapshot;
        this.state.restore(snap);
        this.changeRoom(snap.roomId, snap.player, false);
        this.narrate("Snapshot restored. It's one step earlier and you know one more way to die.", "sys");
      }
      this.pendingDeath = false;
      this.autosave();
      this.refreshStatus();
      this.refreshInventory();
    });
  }

  // ---- composition (verb strip, hotspot taps, autocomplete) -----------

  private composeVerb(verb: string): void {
    const tokens = normalize(this.ui.getInput());
    const vm = matchVerb(tokens, this.content.verbs);
    const rest = vm ? tokens.slice(vm.consumed) : tokens;
    if (rest.length > 0) {
      if (this.armInstrument(verb, rest)) return;
      // Verb applied to something already named: fire immediately
      // (Sierra icon-bar feel). Bare verb taps just start composing.
      this.tapExec([verb, ...rest].join(" "));
      return;
    }
    this.ui.setInput(verb + " ", true);
  }

  /** Sierra icon-bar rule: completing USE's object slot with a carried
   *  item arms it as the instrument ("use cable on ") and waits for a
   *  target tap. RUN still fires the bare one-object command (the parser
   *  drops a dangling preposition). Hotspots stay immediate targets. */
  private armInstrument(verb: string, span: string[]): boolean {
    if (verb !== "use" || span.some((t) => PREPS.has(t))) return false;
    const hit = resolveSpan(span, this.candidates());
    if (!hit || hit.suggestion || hit.ref.kind !== "item") return false;
    this.ui.setInput([verb, ...span, "on"].join(" ") + " ", true);
    return true;
  }

  private hotspotTap(hotspot: Hotspot): void {
    this.insertNoun(hotspot.name);
  }

  private insertNoun(name: string): void {
    const tokens = normalize(this.ui.getInput());
    if (matchVerb(tokens, this.content.verbs)) {
      // Mid-command: the noun completes the object slot — and runs.
      this.acceptSuggestion(name, true);
    } else {
      // No verb started: the tap names a new target — replace, don't
      // stack ("window mug rack" is never a command).
      this.ui.setInput(name, true);
    }
  }

  /** Complete the object slot with `s`. Tap-completed verb+noun runs
   *  immediately; typed input only ever runs via Enter/RUN (Tab passes
   *  run=false). */
  private acceptSuggestion(s: string, run = false): void {
    const raw = this.ui.getInput();
    const tokens = normalize(raw);
    const vm = matchVerb(tokens, this.content.verbs);
    if (!vm) {
      // A chip that is a whole command (topic chips: "ask X about Y")
      // runs on tap; anything else starts composing.
      if (run && matchVerb(normalize(s), this.content.verbs)) {
        this.tapExec(s);
        return;
      }
      this.ui.setInput(s + " ", true);
      return;
    }
    const verbTokens = tokens.slice(0, vm.consumed);
    const rest = tokens.slice(vm.consumed);
    let cut = -1;
    for (let i = 0; i < rest.length; i++) {
      if (PREPS.has(rest[i]!)) cut = i;
    }
    const head = rest.slice(0, cut + 1);
    const line = [...verbTokens, ...head, s].join(" ");
    if (run && cut === -1 && this.armInstrument(vm.verb, normalize(s))) return;
    if (run) this.tapExec(line);
    else this.ui.setInput(line + " ", true);
  }

  private tapExec(line: string): void {
    this.ui.setInput("", this.ui.finePointer);
    this.exec(line);
  }

  private refreshSuggestions(): void {
    this.ui.setSuggestions(this.suggest(this.ui.getInput()));
  }

  private suggest(raw: string): string[] {
    const verbs = Object.keys(this.content.verbs.verbs);
    // Empty input suggests nothing — the verb strip already offers the
    // verbs — unless a conversation is live, in which case the line
    // offers the whole ask ("ask Merle about internet"), tap-to-run.
    if (raw.trim() === "") {
      if (!this.topicContext) return [];
      const npc = this.currentRoom()?.hotspots.find(
        (h) => h.id === this.topicContext,
      );
      return (npc?.topics ?? [])
        .map((t) => (t.match[0] ? `ask ${npc!.name} about ${t.match[0]}` : ""))
        .filter(Boolean)
        .slice(0, MAX_SUGGESTIONS);
    }

    const tokens = normalize(raw);
    const vm = matchVerb(tokens, this.content.verbs);
    const trailingSpace = /\s$/.test(raw);

    if (!vm) {
      const first = tokens[0];
      if (tokens.length === 1 && !trailingSpace && first) {
        return verbs.filter((v) => v.startsWith(first) && v !== first);
      }
      return [];
    }

    const rest = tokens.slice(vm.consumed);
    let cut = -1;
    for (let i = 0; i < rest.length; i++) {
      if (PREPS.has(rest[i]!)) cut = i;
    }
    const tail = rest.slice(cut + 1).join(" ");

    // After "talk/ask X about", offer X's authored topics — discoverable
    // conversation beats guess-the-noun.
    if (vm.verb === "talk" && cut >= 0 && rest[cut] === "about") {
      const npc = resolveSpan(rest.slice(0, cut), this.candidates());
      if (npc && npc.ref.kind === "hotspot") {
        const hotspot = this.currentRoom()?.hotspots.find(
          (h) => h.id === npc.ref.id,
        );
        return (hotspot?.topics ?? [])
          .map((t) => t.match[0] ?? "")
          .filter((m) => m && m !== tail && m.startsWith(tail))
          .slice(0, MAX_SUGGESTIONS);
      }
      return [];
    }

    const room = this.currentRoom();
    const names: string[] = [];
    for (const h of room?.hotspots ?? []) names.push(h.name);
    for (const id of this.state.inventory) {
      const item = this.content.items[id];
      if (item) names.push(item.name);
    }

    const seen = new Set<string>();
    const out: string[] = [];
    for (const name of names) {
      const norm = normalize(name).join(" ");
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      if (norm === tail) continue;
      if (norm.startsWith(tail)) out.push(name);
      if (out.length >= MAX_SUGGESTIONS) break;
    }
    return out;
  }

  // ---- UI refresh ------------------------------------------------------

  private refreshStatus(): void {
    const room = this.currentRoom();
    this.ui.setStatus(
      room?.name ?? "…",
      this.state.score,
      this.content.game.maxScore,
    );
  }

  private refreshInventory(): void {
    this.ui.setInventory(
      this.state.inventory.map((id) => this.content.items[id]?.name ?? id),
    );
  }

  // Debug/test handle (window.spof) — not part of the game contract.
  get debug() {
    return {
      state: this.state,
      content: this.content,
      exec: (raw: string) => this.exec(raw),
    };
  }
}

/** Every score id authored in a room's JSON — the set onScoreComplete
 *  waits for. Ids inside onScoreComplete itself are excluded, so a
 *  completion bonus can't make its own trigger unsatisfiable. */
function collectScoreIds(room: Room): Set<string> {
  const ids = new Set<string>();
  const scan = (entries?: ResponseEntry[]) => {
    for (const entry of entries ?? []) {
      for (const action of entry.do ?? []) {
        if ("score" in action) ids.add(action.score.id);
      }
    }
  };
  scan(room.onEnter);
  for (const exit of room.exits) scan(exit.blocked);
  for (const h of room.hotspots) {
    for (const list of Object.values(h.responses ?? {})) scan(list);
    for (const t of h.topics ?? []) scan(t.responses);
    scan(h.topicDefault);
  }
  return ids;
}
