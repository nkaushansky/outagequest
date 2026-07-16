// Game state: flags, inventory, score, deaths found, player position.
// Serializable snapshots power death-retry (one step back) now and
// saves (M2) later.

import type { Facing } from "./types";

export interface Snapshot {
  roomId: string;
  flags: string[];
  inventory: string[];
  score: number;
  awarded: string[];
  player: { x: number; y: number; facing: Facing };
}

export class GameState {
  roomId = "";
  flags = new Set<string>();
  inventory: string[] = [];
  score = 0;
  awarded = new Set<string>();
  /** Meta-progression for the deaths gallery — survives death retries. */
  deathsFound: string[] = [];
  player = { x: 160, y: 160, facing: "left" as Facing };

  hasItem(id: string): boolean {
    return this.inventory.includes(id);
  }

  addItem(id: string): void {
    if (!this.hasItem(id)) this.inventory.push(id);
  }

  removeItem(id: string): void {
    this.inventory = this.inventory.filter((i) => i !== id);
  }

  registerDeath(id: string): void {
    if (!this.deathsFound.includes(id)) this.deathsFound.push(id);
  }

  snapshot(): Snapshot {
    return {
      roomId: this.roomId,
      flags: [...this.flags],
      inventory: [...this.inventory],
      score: this.score,
      awarded: [...this.awarded],
      player: { ...this.player },
    };
  }

  restore(snap: Snapshot): void {
    this.roomId = snap.roomId;
    this.flags = new Set(snap.flags);
    this.inventory = [...snap.inventory];
    this.score = snap.score;
    this.awarded = new Set(snap.awarded);
    this.player = { ...snap.player };
    // deathsFound intentionally untouched: deaths are collectibles.
  }
}
