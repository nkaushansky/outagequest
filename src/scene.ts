// Canvas scene: true 320x180 backbuffer upscaled with nearest-neighbor.
// Backgrounds, player sprite and walk animation live here. No text is ever
// rendered into the canvas — all UI is DOM (see ui.ts).

import type { Hotspot, Pt, Room, RoomExit } from "./types";
import type { GameState } from "./state";
import {
  clampIntoPolygon,
  dist,
  nearPolygon,
  pointInPolygon,
} from "./geometry";

export const INTERNAL_W = 320;
export const INTERNAL_H = 180;

const WALK_SPEED = 70; // px/sec in internal space
const HOTSPOT_PAD = 5; // generous hit-testing
const HIGHLIGHT_MS = 450;
const MARKER_MS = 350;

// Placeholder sprite palette (real sprite arrives after M2). Explicit colors.
const C_SHADOW = "rgba(0, 0, 0, 0.35)";
const C_LEGS = "#2E3742";
const C_TORSO = "#55606E";
const C_HEAD = "#C9A281";
const C_HAIR = "#3A2E28";
const C_HIGHLIGHT = "#FFE066";
const C_MARKER = "#FFE066";
const C_LETTERBOX = "#000000";

export interface SceneCallbacks {
  onHotspotTap(hotspot: Hotspot): void;
  onExit(exit: RoomExit): void;
}

export class Scene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private room: Room | null = null;
  private bg: HTMLImageElement | null = null;
  private state: GameState;
  private cb: SceneCallbacks;

  private target: Pt | null = null;
  private animTime = 0;
  private highlight: { poly: Pt[]; until: number } | null = null;
  private marker: { p: Pt; until: number } | null = null;
  private lastFrame = 0;
  private exitArmed = false;

  constructor(container: HTMLElement, state: GameState, cb: SceneCallbacks) {
    this.state = state;
    this.cb = cb;
    this.canvas = document.createElement("canvas");
    this.canvas.width = INTERNAL_W;
    this.canvas.height = INTERNAL_H;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    container.appendChild(this.canvas);

    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));

    this.lastFrame = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  setRoom(room: Room, bg: HTMLImageElement | null): void {
    this.room = room;
    this.bg = bg;
    this.target = null;
    this.highlight = null;
    this.marker = null;
    // Don't fire an exit until the player has actually walked somewhere,
    // in case an arrive point sits inside an exit polygon.
    this.exitArmed = false;
  }

  setBackground(bg: HTMLImageElement | null): void {
    this.bg = bg;
  }

  /** Map a pointer event to internal coordinates, accounting for the
   *  object-fit:contain letterbox. Returns null on the black bars. */
  private toInternal(e: PointerEvent): Pt | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scale = Math.min(rect.width / INTERNAL_W, rect.height / INTERNAL_H);
    const offX = (rect.width - INTERNAL_W * scale) / 2;
    const offY = (rect.height - INTERNAL_H * scale) / 2;
    const x = (e.clientX - rect.left - offX) / scale;
    const y = (e.clientY - rect.top - offY) / scale;
    if (x < 0 || x >= INTERNAL_W || y < 0 || y >= INTERNAL_H) return null;
    return { x, y };
  }

  private hotspotAt(p: Pt): Hotspot | null {
    if (!this.room) return null;
    for (const h of this.room.hotspots) {
      if (h.polygon.length >= 3 && nearPolygon(p, h.polygon, HOTSPOT_PAD)) {
        return h;
      }
    }
    return null;
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    const p = this.toInternal(e);
    if (!p || !this.room) return;

    const hotspot = this.hotspotAt(p);
    if (hotspot) {
      this.highlight = {
        poly: hotspot.polygon,
        until: performance.now() + HIGHLIGHT_MS,
      };
      this.cb.onHotspotTap(hotspot);
      return;
    }

    if (this.room.walkable.length >= 3) {
      const dest = clampIntoPolygon(p, this.room.walkable);
      this.target = dest;
      this.exitArmed = true;
      this.marker = { p: dest, until: performance.now() + MARKER_MS };
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerType !== "mouse") return;
    const p = this.toInternal(e);
    this.canvas.style.cursor = p && this.hotspotAt(p) ? "pointer" : "default";
  }

  private frame(now: number): void {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.update(dt);
    this.render(now);
    requestAnimationFrame((t) => this.frame(t));
  }

  private update(dt: number): void {
    if (!this.room || !this.target) return;
    const player = this.state.player;
    const d = dist(player, this.target);
    const step = WALK_SPEED * dt;

    if (d <= step) {
      player.x = this.target.x;
      player.y = this.target.y;
      this.target = null;
    } else {
      const dx = ((this.target.x - player.x) / d) * step;
      const dy = ((this.target.y - player.y) / d) * step;
      const next = { x: player.x + dx, y: player.y + dy };
      if (pointInPolygon(next, this.room.walkable)) {
        player.x = next.x;
        player.y = next.y;
      } else if (pointInPolygon({ x: next.x, y: player.y }, this.room.walkable)) {
        player.x = next.x; // slide along x
      } else if (pointInPolygon({ x: player.x, y: next.y }, this.room.walkable)) {
        player.y = next.y; // slide along y
      } else {
        this.target = null; // wedged; stop rather than escape the polygon
      }
      if (Math.abs(dx) >= Math.abs(dy)) {
        player.facing = dx < 0 ? "left" : "right";
      } else {
        player.facing = dy < 0 ? "up" : "down";
      }
      this.animTime += dt;
    }

    if (this.exitArmed) {
      for (const exit of this.room.exits) {
        if (exit.polygon.length >= 3 && pointInPolygon(player, exit.polygon)) {
          this.target = null;
          this.exitArmed = false;
          this.cb.onExit(exit);
          return;
        }
      }
    }
  }

  private render(now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = C_LETTERBOX;
    ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

    if (this.bg && this.bg.complete && this.bg.naturalWidth > 0) {
      ctx.drawImage(this.bg, 0, 0, INTERNAL_W, INTERNAL_H);
    }

    if (this.marker && now < this.marker.until) {
      const a = (this.marker.until - now) / MARKER_MS;
      ctx.strokeStyle = C_MARKER;
      ctx.globalAlpha = a;
      const { x, y } = this.marker.p;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (this.marker) {
      this.marker = null;
    }

    this.drawPlayer();

    if (this.highlight && now < this.highlight.until) {
      ctx.strokeStyle = C_HIGHLIGHT;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      const poly = this.highlight.poly;
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i]!;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (this.highlight) {
      this.highlight = null;
    }
  }

  /** Placeholder Mel: a hand-stacked silhouette, feet at (x, y). */
  private drawPlayer(): void {
    const ctx = this.ctx;
    const { x, y, facing } = this.state.player;
    const px = Math.round(x);
    const py = Math.round(y);
    const walking = this.target !== null;
    const stride = walking && Math.floor(this.animTime * 6) % 2 === 0 ? 1 : 0;

    ctx.fillStyle = C_SHADOW;
    ctx.fillRect(px - 7, py - 1, 14, 2);

    ctx.fillStyle = C_LEGS;
    ctx.fillRect(px - 5, py - 14 - stride, 4, 14 + stride);
    ctx.fillRect(px + 1, py - 14 + stride, 4, 14 - stride);

    ctx.fillStyle = C_TORSO;
    ctx.fillRect(px - 7, py - 34, 14, 20);

    const lean = facing === "left" ? -1 : facing === "right" ? 1 : 0;
    ctx.fillStyle = C_HEAD;
    ctx.fillRect(px - 4 + lean, py - 42, 8, 8);
    ctx.fillStyle = C_HAIR;
    ctx.fillRect(px - 4 + lean, py - 43, 8, 3);
  }
}
