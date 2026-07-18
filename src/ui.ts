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
}

export class UI {
  private log: HTMLDivElement;
  private suggest: HTMLDivElement;
  private input: HTMLInputElement;
  private statusRoom: HTMLSpanElement;
  private statusDev: HTMLSpanElement;
  private statusScore: HTMLSpanElement;
  private invChips: HTMLDivElement;
  private death: HTMLDivElement;
  private deathTitle: HTMLDivElement;
  private deathText: HTMLDivElement;
  private deathRetry: HTMLButtonElement;
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

    const inv = el("div", "inv");
    const invLabel = el("span", "inv-label");
    invLabel.textContent = "inventory/";
    this.invChips = el("div", "inv-chips");
    inv.append(invLabel, this.invChips);

    this.death = el("div", "death");
    this.death.hidden = true;
    const deathBox = el("div", "death-box");
    const deathKicker = el("div", "death-kicker");
    deathKicker.textContent = "KERNEL PANIC";
    this.deathTitle = el("div", "death-title");
    this.deathText = el("div", "death-text");
    this.deathRetry = el("button", "death-retry") as HTMLButtonElement;
    this.deathRetry.textContent = "RESTORE SNAPSHOT (one step back)";
    deathBox.append(deathKicker, this.deathTitle, this.deathText, this.deathRetry);
    this.death.appendChild(deathBox);

    root.append(status, this.log, this.suggest, inputRow, verbStrip, inv);
    document.body.appendChild(this.death);

    this.input.addEventListener("input", () =>
      this.cb.onInputChanged(this.input.value),
    );
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
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.cycleHistory(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.cycleHistory(1);
      }
    });

    if (this.finePointer) this.input.focus();
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
    this.input.value = value;
    if (focus && this.finePointer) {
      this.input.focus();
      this.input.setSelectionRange(value.length, value.length);
    }
    this.cb.onInputChanged(value);
  }

  setStatus(room: string, score: number, maxScore: number): void {
    this.statusRoom.textContent = room;
    this.statusScore.textContent = `TICKETS ${score}/${maxScore}`;
  }

  setDevInfo(info: string): void {
    this.statusDev.textContent = info;
  }

  setInventory(names: string[]): void {
    this.invChips.replaceChildren();
    if (names.length === 0) {
      const none = el("span", "inv-empty");
      none.textContent = "(empty)";
      this.invChips.appendChild(none);
      return;
    }
    for (const name of names) {
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
    this.deathTitle.textContent = title;
    this.deathText.textContent = text;
    this.death.hidden = false;
    const handler = () => {
      this.deathRetry.removeEventListener("click", handler);
      this.death.hidden = true;
      onRetry();
    };
    this.deathRetry.addEventListener("click", handler);
    this.deathRetry.focus();
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
