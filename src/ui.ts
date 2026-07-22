// All UI is DOM inside #ui: status line, message log, autocomplete chips,
// terminal input row, verb strip, inventory. Styling lives in index.html
// (every color explicit — dark-mode safety).

export interface UICallbacks {
  onSubmit(raw: string): void;
  onInputChanged(text: string): void;
  onVerb(verb: string): void;
  /** `run`: true for chip taps (complete-and-run), false for Tab. */
  onSuggestion(text: string, run: boolean): void;
  onItemTap(name: string): void;
  /** Arrow-key steering: key is "ArrowUp" etc.; down=false on release. */
  onSteer(key: string, down: boolean): void;
}

export class UI {
  private log: HTMLDivElement;
  private suggest: HTMLDivElement;
  private input: HTMLInputElement;
  private statusRoom: HTMLSpanElement;
  private statusDev: HTMLSpanElement;
  private statusScore: HTMLSpanElement;
  private inv!: HTMLDivElement;
  private invLabel!: HTMLButtonElement;
  private invChips: HTMLDivElement;
  private invNames: string[] = [];
  private invOpen = true;
  private death: HTMLDivElement;
  private deathTitle: HTMLDivElement;
  private deathText: HTMLDivElement;
  private deathRetry: HTMLButtonElement;
  private doc: HTMLDivElement;
  private docPaper: HTMLDivElement;
  private docTitle: HTMLDivElement;
  private docBody: HTMLDivElement;
  private docImg: HTMLImageElement;
  private docCaption: HTMLDivElement;
  private docDismiss: HTMLButtonElement;
  private docCleanup: (() => void) | null = null;
  private cb: UICallbacks;
  private history: string[] = [];
  private historyPos = -1;
  private suggestions: string[] = [];
  readonly finePointer: boolean;

  constructor(root: HTMLElement, verbs: string[], cb: UICallbacks) {
    this.cb = cb;
    this.finePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)").matches;

    const status = el("div", "status");
    this.statusRoom = el("span", "status-room");
    this.statusDev = el("span", "status-dev");
    this.statusScore = el("span", "status-score");
    status.append(this.statusRoom, this.statusDev, this.statusScore);

    this.log = el("div", "log");
    this.log.setAttribute("aria-live", "polite");

    this.suggest = el("div", "suggest");

    const inputRow = el("div", "input-row");
    const prompt = el("span", "prompt");
    prompt.textContent = ">";
    this.input = document.createElement("input");
    this.input.className = "cmd-input";
    this.input.type = "text";
    this.input.autocapitalize = "off";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.enterKeyHint = "go";
    this.input.setAttribute("aria-label", "command");
    this.input.placeholder = "type, or tap things…";
    const clear = el("button", "clear");
    clear.textContent = "✕";
    clear.setAttribute("aria-label", "clear command line");
    clear.addEventListener("click", () => this.setInput("", true));
    const run = el("button", "run");
    run.textContent = "RUN";
    run.addEventListener("click", () => this.submit());
    inputRow.append(prompt, this.input, clear, run);

    const verbStrip = el("div", "verbs");
    for (const verb of verbs) {
      const b = el("button", "verb");
      b.textContent = verb.toUpperCase();
      b.addEventListener("click", () => this.cb.onVerb(verb));
      verbStrip.appendChild(b);
    }

    this.inv = el("div", "inv");
    this.invLabel = el("button", "inv-label") as HTMLButtonElement;
    this.invLabel.setAttribute("aria-label", "toggle inventory tray");
    this.invLabel.addEventListener("click", () => {
      this.invOpen = !this.invOpen;
      this.renderInventory();
    });
    this.invChips = el("div", "inv-chips");
    this.inv.append(this.invLabel, this.invChips);
    const inv = this.inv;

    this.death = el("div", "death");
    this.death.hidden = true;
    this.death.setAttribute("role", "dialog");
    this.death.setAttribute("aria-modal", "true");
    const deathBox = el("div", "death-box");
    const deathKicker = el("div", "death-kicker");
    deathKicker.textContent = "KERNEL PANIC";
    this.deathTitle = el("div", "death-title");
    this.deathText = el("div", "death-text");
    this.deathRetry = el("button", "death-retry") as HTMLButtonElement;
    this.deathRetry.textContent = "RESTORE SNAPSHOT (one step back)";
    deathBox.append(deathKicker, this.deathTitle, this.deathText, this.deathRetry);
    this.death.appendChild(deathBox);

    // Document close-up: the death-screen pattern generalized — a paper
    // (newsprint / Post-it / clipping / flyer) rendered entirely in CSS,
    // text as real DOM text, dismissible from anywhere on the backdrop.
    this.doc = el("div", "docview");
    this.doc.hidden = true;
    this.doc.setAttribute("role", "dialog");
    this.doc.setAttribute("aria-modal", "true");
    this.docPaper = el("div", "doc-paper");
    this.docTitle = el("div", "doc-title");
    this.docBody = el("div", "doc-body");
    this.docImg = document.createElement("img");
    this.docImg.className = "doc-img";
    this.docImg.alt = "";
    this.docCaption = el("div", "doc-caption");
    this.docPaper.append(this.docTitle, this.docImg, this.docCaption, this.docBody);
    this.docDismiss = el("button", "doc-dismiss") as HTMLButtonElement;
    this.docDismiss.textContent = "PUT IT BACK";
    this.doc.append(this.docPaper, this.docDismiss);

    root.append(status, this.log, this.suggest, inputRow, verbStrip, inv);
    document.body.append(this.death, this.doc);

    this.input.addEventListener("input", () => {
      this.historyPos = this.history.length; // typing resets the history walk
      this.cb.onInputChanged(this.input.value);
    });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.submit();
      } else if (e.key === "Tab") {
        const first = this.suggestions[0];
        if (first) {
          e.preventDefault();
          this.cb.onSuggestion(first, false);
        }
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        // Terminal keys only while mid-command (or with Ctrl, always).
        // On an empty line the event bubbles to the window handler,
        // where arrows walk Mel instead.
        if (e.ctrlKey || e.metaKey || this.input.value !== "") {
          e.preventDefault();
          this.cycleHistory(e.key === "ArrowUp" ? -1 : 1);
        }
      }
    });

    // Desktop movement: arrows steer Mel whenever they aren't doing
    // terminal work — hold to walk, release to stop (drag's keyboard twin).
    window.addEventListener("keydown", (e) => this.onGlobalArrow(e, true));
    window.addEventListener("keyup", (e) => this.onGlobalArrow(e, false));
    // Alt-tab swallows keyups; release everything so Mel never walks alone.
    window.addEventListener("blur", () => {
      for (const k of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
        this.cb.onSteer(k, false);
      }
    });

    if (this.finePointer) this.input.focus();
  }

  private onGlobalArrow(e: KeyboardEvent, down: boolean): void {
    if (!e.key.startsWith("Arrow")) return;
    if (!down) {
      this.cb.onSteer(e.key, false); // releases always land — no stuck keys
      return;
    }
    if (!this.death.hidden || !this.doc.hidden || e.altKey) return; // the dead don't pace; readers don't either
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+arrow: history recall from anywhere, for the shell diehards.
      if (
        (e.key === "ArrowUp" || e.key === "ArrowDown") &&
        document.activeElement !== this.input
      ) {
        e.preventDefault();
        this.cycleHistory(e.key === "ArrowUp" ? -1 : 1);
        if (this.finePointer) this.input.focus();
      }
      return;
    }
    if (document.activeElement === this.input && this.input.value !== "") {
      return; // mid-command: caret and history keep the keys
    }
    e.preventDefault();
    this.cb.onSteer(e.key, true);
  }

  private submit(): void {
    const raw = this.input.value.trim();
    if (!raw) return;
    this.history.push(raw);
    this.historyPos = this.history.length;
    this.cb.onSubmit(raw);
  }

  private cycleHistory(dir: -1 | 1): void {
    if (this.history.length === 0) return;
    this.historyPos = Math.max(
      0,
      Math.min(this.history.length, this.historyPos + dir),
    );
    this.input.value =
      this.historyPos === this.history.length
        ? ""
        : (this.history[this.historyPos] ?? "");
    this.cb.onInputChanged(this.input.value);
  }

  line(text: string, cls = "narrate"): void {
    const div = el("div", `line ${cls}`);
    div.textContent = text;
    this.log.appendChild(div);
    this.log.scrollTop = this.log.scrollHeight;
  }

  echo(raw: string): void {
    this.line("> " + raw, "cmd");
  }

  clearLog(): void {
    this.log.replaceChildren();
  }

  getInput(): string {
    return this.input.value;
  }

  setInput(value: string, focus = false): void {
    this.historyPos = this.history.length; // a fresh line restarts the walk
    this.input.value = value;
    if (focus && this.finePointer) {
      this.input.focus();
      this.input.setSelectionRange(value.length, value.length);
    }
    this.cb.onInputChanged(value);
  }

  setStatus(room: string, score: number, maxScore: number): void {
    this.statusRoom.textContent = room;
    // The queue burns DOWN: the outage opens with 250 tickets on Mel's
    // plate and completionism is getting it to zero. Score stays additive
    // internally; only the presentation inverts.
    this.statusScore.textContent = `TICKETS OPEN ${maxScore - score}/${maxScore}`;
  }

  setDevInfo(info: string): void {
    this.statusDev.textContent = info;
  }

  setInventory(names: string[]): void {
    this.invNames = names;
    this.renderInventory();
  }

  /** Chips wrap into rows (no horizontal scrolling); the "inventory/"
   *  label toggles the tray closed to "inventory/ (N)" when the player
   *  wants the log space back. `ls` remains the purist's view. */
  private renderInventory(): void {
    const names = this.invNames;
    const open = this.invOpen || names.length === 0;
    this.inv.classList.toggle("collapsed", !open);
    this.invLabel.textContent = open
      ? "inventory/"
      : `inventory/ (${names.length})`;
    this.invChips.replaceChildren();
    if (names.length === 0) {
      const none = el("span", "inv-empty");
      none.textContent = "(empty)";
      this.invChips.appendChild(none);
      return;
    }
    if (!open) return;
    // Newest first: the thing just picked up is the thing about to be
    // used, and it must sit inside the tray's visible window.
    for (const name of [...names].reverse()) {
      const chip = el("button", "inv-chip");
      chip.textContent = name;
      chip.addEventListener("click", () => this.cb.onItemTap(name));
      this.invChips.appendChild(chip);
    }
  }

  setSuggestions(items: string[]): void {
    this.suggestions = items;
    this.suggest.replaceChildren();
    for (const s of items) {
      const chip = el("button", "suggest-chip");
      chip.textContent = s;
      chip.addEventListener("click", () => this.cb.onSuggestion(s, true));
      this.suggest.appendChild(chip);
    }
  }

  showDeath(title: string, text: string, onRetry: () => void): void {
    this.hideDocument(); // a death outranks any paperwork on screen
    this.deathTitle.textContent = title;
    this.deathText.textContent = text;
    this.death.hidden = false;
    // Focus trap: while dead, Tab must not reach the terminal behind the
    // overlay. The retry button is the whole world now.
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.deathRetry.focus();
      }
    };
    document.addEventListener("keydown", trap, true);
    const handler = () => {
      this.deathRetry.removeEventListener("click", handler);
      document.removeEventListener("keydown", trap, true);
      this.death.hidden = true;
      onRetry();
    };
    this.deathRetry.addEventListener("click", handler);
    this.deathRetry.focus();
  }

  /** Paper close-up overlay. Focus-trapped while up; dismissed by the
   *  button, Escape, or a tap on the backdrop. Re-showing while one is
   *  already up just swaps the paper (last document wins). */
  showDocument(spec: {
    style: string;
    title?: string;
    body: string | Array<string | { text: string; style?: string }>;
    imageUrl?: string;
    caption?: string;
  }): void {
    if (!this.death.hidden) return; // the dead don't read
    this.hideDocument();
    this.docPaper.className =
      "doc-paper doc-" + (spec.style || "newsprint").replace(/[^a-z0-9_-]/gi, "");
    this.docTitle.textContent = spec.title ?? "";
    this.docTitle.hidden = !spec.title;
    this.docBody.replaceChildren();
    const lines = Array.isArray(spec.body)
      ? spec.body
      : spec.body.split("\n");
    for (const line of lines) {
      const text = typeof line === "string" ? line : line.text;
      if (!text.trim()) continue;
      const cls = typeof line === "string" ? undefined : line.style;
      const p = el(
        "p",
        "doc-para" + (cls ? " doc-line-" + cls.replace(/[^a-z0-9_-]/gi, "") : ""),
      );
      p.textContent = text;
      this.docBody.appendChild(p);
    }
    if (spec.imageUrl) {
      this.docImg.src = spec.imageUrl;
      this.docImg.hidden = false;
    } else {
      this.docImg.removeAttribute("src");
      this.docImg.hidden = true;
    }
    this.docCaption.textContent = spec.caption ?? "";
    this.docCaption.hidden = !spec.caption;
    this.doc.setAttribute("aria-label", spec.title ?? "document");
    this.doc.hidden = false;
    this.docPaper.scrollTop = 0;

    // Focus trap, death-screen style: while the paper is up, Tab stays on
    // the dismiss button and Escape puts the paper back.
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.docDismiss.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.hideDocument();
      }
    };
    const onBackdrop = (e: MouseEvent) => {
      if (e.target === this.doc) this.hideDocument();
    };
    const onDismiss = () => this.hideDocument();
    document.addEventListener("keydown", trap, true);
    this.doc.addEventListener("click", onBackdrop);
    this.docDismiss.addEventListener("click", onDismiss);
    this.docCleanup = () => {
      document.removeEventListener("keydown", trap, true);
      this.doc.removeEventListener("click", onBackdrop);
      this.docDismiss.removeEventListener("click", onDismiss);
    };
    this.docDismiss.focus();
  }

  hideDocument(): void {
    if (this.doc.hidden) return;
    this.docCleanup?.();
    this.docCleanup = null;
    this.doc.hidden = true;
    if (this.finePointer) this.input.focus();
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}
