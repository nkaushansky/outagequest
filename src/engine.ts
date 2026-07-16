// Engine orchestration: input pipeline (echo -> snapshot -> shell ->
// parse -> resolve), room changes, and all state side effects. Room
// behavior comes exclusively from JSON — nothing here knows any room.

import { loadContent, type Content } from "./data";
import { GameState, type Snapshot } from "./state";
import { runEntries, type EngineContext } from "./resolver";
import { tryShell } from "./shell";
import { Scene } from "./scene";
import { UI } from "./ui";
import {
  buildCandidates,
  fill,
  matchVerb,
  normalize,
  parse,
  PREPS,
  type Candidate,
  type ParsedCommand,
} from "./parser";
import type { Facing, Hotspot, Room } from "./types";

const MAX_SUGGESTIONS = 6;

export class Engine {
  private content: Content;
  private state = new GameState();
  private scene!: Scene;
  private ui!: UI;
  private images = new Map<string, HTMLImageElement>();
  private lastSnapshot: Snapshot | null = null;

  constructor() {
    this.content = loadContent();
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
      onSuggestion: (s) => this.acceptSuggestion(s),
      onItemTap: (name) => this.insertNoun(name),
    });

    this.scene = new Scene(sceneEl, this.state, {
      onHotspotTap: (h) => this.hotspotTap(h),
      onExit: (exit) =>
        this.changeRoom(exit.to, {
          x: exit.arrive.x,
          y: exit.arrive.y,
          facing: exit.arrive.facing,
        }),
    });

    this.refreshInventory();
    this.refreshSuggestions();
    this.changeRoom(this.content.game.startRoom);
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
    const at = arrive ?? room.playerStart;
    this.state.player.x = at.x;
    this.state.player.y = at.y;
    this.state.player.facing = at.facing;
    this.scene.setRoom(room, this.backgroundFor(room));
    this.refreshStatus();
    if (runOnEnter) runEntries(room.onEnter, this.ctx());
    this.refreshStatus();
    this.refreshInventory();
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
    });
    if (!handled) this.dispatch(trimmed);

    this.refreshStatus();
    this.refreshInventory();
    this.refreshSuggestions();
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
   *  With OBJECT2 present ("use keycard on door"), the target is OBJECT2;
   *  conditions like hasItem gate the instrument. */
  private perform(cmd: ParsedCommand): void {
    const verbDef = this.content.verbs.verbs[cmd.verb];
    const fallback = () => {
      if (verbDef) this.narrate(verbDef.default);
    };

    const target = cmd.object2 ?? cmd.object;
    if (!target) {
      fallback();
      return;
    }

    if (target.kind === "hotspot") {
      const room = this.currentRoom();
      const hotspot = room?.hotspots.find((h) => h.id === target.id);
      const entries = hotspot?.responses?.[cmd.verb];
      if (!runEntries(entries, this.ctx())) fallback();
      return;
    }

    // Inventory item: items carry a bespoke look; other verbs fall back.
    const item = this.content.items[target.id];
    if (cmd.verb === "look" && item?.look) {
      this.narrate(item.look);
      return;
    }
    fallback();
  }

  // ---- engine context (side effects for the resolver) -----------------

  private ctx(): EngineContext {
    return {
      state: this.state,
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
    this.narrate(
      `+${points} ticket${points === 1 ? "" : "s"} (${this.state.score}/${this.content.game.maxScore})`,
      "pts",
    );
  }

  private die(id: string, text: string, title?: string): void {
    this.state.registerDeath(id);
    const registered = this.content.deaths.deaths.find((d) => d.id === id);
    this.narrate(text, "err");
    this.ui.showDeath(registered?.title ?? title ?? "SEGMENTATION FAULT", text, () => {
      if (this.lastSnapshot) {
        const snap = this.lastSnapshot;
        this.state.restore(snap);
        this.changeRoom(snap.roomId, snap.player, false);
        this.narrate("Snapshot restored. It's one step earlier and you know one more way to die.", "sys");
      }
      this.refreshStatus();
      this.refreshInventory();
    });
  }

  // ---- composition (verb strip, hotspot taps, autocomplete) -----------

  private composeVerb(verb: string): void {
    const tokens = normalize(this.ui.getInput());
    const vm = matchVerb(tokens, this.content.verbs);
    const rest = vm ? tokens.slice(vm.consumed) : tokens;
    const next = [verb, ...rest].join(" ") + (rest.length === 0 ? " " : "");
    this.ui.setInput(next, true);
  }

  private hotspotTap(hotspot: Hotspot): void {
    this.insertNoun(hotspot.name);
  }

  private insertNoun(name: string): void {
    const current = this.ui.getInput().trimEnd();
    this.ui.setInput(current ? `${current} ${name}` : name, true);
  }

  private acceptSuggestion(s: string): void {
    const raw = this.ui.getInput();
    const tokens = normalize(raw);
    const vm = matchVerb(tokens, this.content.verbs);
    if (!vm) {
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
    this.ui.setInput([...verbTokens, ...head, s].join(" ") + " ", true);
  }

  private refreshSuggestions(): void {
    this.ui.setSuggestions(this.suggest(this.ui.getInput()));
  }

  private suggest(raw: string): string[] {
    const verbs = Object.keys(this.content.verbs.verbs);
    if (raw.trim() === "") return verbs;

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
