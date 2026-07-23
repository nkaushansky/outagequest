// Shell easter eggs — parser contract step 2. These are engine-level
// terminal chrome (the interface is a terminal), not room content.

import type { Content } from "./data";
import type { GameState } from "./state";
import { normalize, resolveSpan, type Candidate } from "./parser";

export interface ShellCtx {
  content: Content;
  state: GameState;
  candidates(): Candidate[];
  narrate(text: string, cls?: string): void;
  clearLog(): void;
  /** Re-run a command line through the full pipeline (for sudo). */
  exec(input: string): void;
  /** Current save as an export string. */
  exportSave(): string;
  /** Restore from an export string. False = bit rot. */
  importSave(raw: string): boolean;
  /** First matching authored hint (data/hints.json), or null when the
   *  triage queue has nothing actionable. */
  hint(): string | null;
  /** Per-room ticket progress: rooms the player has scored in, plus a
   *  count of tickets waiting in rooms not yet started (no names — the
   *  unopened world stays unspoiled). */
  scoreboard(): {
    rows: { name: string; closed: number; open: number }[];
    unopened: number;
  };
}

/** Returns true if the input was handled as a shell command. */
export function tryShell(raw: string, ctx: ShellCtx): boolean {
  const trimmed = raw.trim();
  const tokens = trimmed.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  const cmd = tokens[0];
  if (!cmd) return false;
  const rest = trimmed.slice(cmd.length).trim();
  const shell = (text: string) => ctx.narrate(text, "shell");

  switch (cmd) {
    case "ls":
    case "dir":
    case "inventory":
    case "inv":
    case "i": {
      const names = ctx.state.inventory.map(
        (id) => ctx.content.items[id]?.name ?? id,
      );
      if (names.length === 0) {
        shell("inventory/: empty. Traveling light into the apocalypse.");
      } else {
        shell("inventory/:\n" + names.map((n) => "  " + n).join("\n"));
      }
      return true;
    }

    case "whoami": {
      shell("That's the question, isn't it, Mel.");
      return true;
    }

    case "sudo": {
      if (!rest) {
        shell("sudo: a command is required. Absolute power, and no idea what to do with it.");
        return true;
      }
      shell("[sudo] password accepted (it was 'password'). Executing with unearned confidence:");
      ctx.exec(rest);
      return true;
    }

    case "ping": {
      if (!rest) {
        shell("usage: ping <target> — yell into the void, but with syntax.");
        return true;
      }
      const hit = resolveSpan(normalize(rest), ctx.candidates());
      if (hit && !hit.suggestion) {
        shell(
          `PING ${hit.ref.name} (127.0.0.1): 1 packet transmitted, 1 received, 0% loss. Nice to know something still answers.`,
        );
      } else {
        shell(`ping: ${rest}: Name or service not known. Like everything else today.`);
      }
      return true;
    }

    case "man": {
      if (!rest) {
        shell("man: which page? Try 'man take'. The one for your life is out of print.");
        return true;
      }
      const verbs = ctx.content.verbs.verbs;
      const query = normalize(rest).join(" ");
      const canonical = Object.keys(verbs).find(
        (v) =>
          v === query ||
          verbs[v]!.synonyms.some((s) => normalize(s).join(" ") === query),
      );
      const def = canonical ? verbs[canonical] : undefined;
      if (!canonical || !def) {
        shell(`No manual entry for '${rest}'. That knowledge lived in someone's head. They were laid off.`);
        return true;
      }
      const aliases = def.synonyms
        .filter((s) => s.toLowerCase() !== canonical)
        .join(", ");
      shell(
        [
          "NAME",
          `    ${canonical} — ${def.default}`,
          "SYNOPSIS",
          `    ${canonical} ${def.needsObject ? "<object>" : "[object]"}`,
          "ALIASES",
          `    ${aliases || "(none. it works alone.)"}`,
        ].join("\n"),
      );
      return true;
    }

    case "reboot":
    case "restart":
    case "shutdown": {
      // Only bare invocations are shell chrome; "reboot modem" belongs to
      // the parser (reboot/restart are `use` synonyms).
      if (rest) return false;
      shell("You consider turning yourself off and on again. Not yet. You're the only service still running.");
      return true;
    }

    case "save":
    case "export": {
      shell("save string (keep it somewhere less flammable than the cloud):");
      shell(ctx.exportSave());
      ctx.narrate("Restore later with: load <that string>", "sys");
      return true;
    }

    case "load":
    case "import": {
      if (!rest) {
        shell("usage: load <save string>. The one 'save' printed. Yes, the long one.");
        return true;
      }
      if (ctx.importSave(rest)) {
        ctx.narrate("State rehydrated. Everything is exactly as bad as you left it.", "sys");
      } else {
        shell("load: that string has bit rot. Not even the good checksum kind.");
      }
      return true;
    }

    case "rm": {
      shell("rm: permission denied. Somewhere, a change advisory board smiles.");
      return true;
    }

    case "hint":
    case "hints": {
      const h = ctx.hint();
      if (h) {
        shell("You triage. The queue sorts itself by blocking severity. Top of stack:");
        ctx.narrate(h, "sys");
      } else {
        shell("Triage returns empty. Whatever's next, nobody has filed it yet — walk, look, poke. The queue respects initiative.");
      }
      return true;
    }

    case "tickets":
    case "queue": {
      const { rows, unopened } = ctx.scoreboard();
      if (rows.length === 0) {
        shell("The queue is untouched. Two hundred fifty tickets, all patiently yours. Start anywhere. Start by LOOKING at things.");
        return true;
      }
      const lines = rows.map((r) =>
        r.open === 0
          ? `  ${r.name} — clear. Ledger closed.`
          : `  ${r.name} — ${r.closed} closed, ${r.open} open`,
      );
      if (unopened > 0) {
        lines.push(`  (elsewhere, unstarted: ${unopened} — the map knows where)`);
      }
      shell("Ticket queue, by site:\n" + lines.join("\n"));
      ctx.narrate("Curiosity closes tickets. LOOK at everything; the queue whispers back.", "sys");
      return true;
    }

    case "pwd": {
      shell(`/home/mel/${ctx.state.roomId}`);
      ctx.narrate("As if you'd be anywhere else.", "sys");
      return true;
    }

    case "help":
    case "?": {
      const verbList = Object.keys(ctx.content.verbs.verbs).join(", ");
      shell(
        `Verbs: ${verbList}. Tap things to name them; tap a verb to start a command. LOOK with nothing after it surveys the room. Arrow keys walk when the line is empty; while typing they edit and recall history (Ctrl+Up anytime). Stuck? 'hint' triages your next move; 'tickets' shows the queue by site. Old habits (ls, man, sudo, ping, whoami, save, load) may also work.`,
      );
      return true;
    }

    case "clear": {
      ctx.clearLog();
      return true;
    }

    default:
      return false;
  }
}
