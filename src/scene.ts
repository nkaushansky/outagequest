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

// Dev-mode overlay palette (?dev=1) — polygon authoring aid, never shipped UI.
const C_DEV_WALKABLE = "#46FF7A";
const C_DEV_HOTSPOT = "#FFC94A";
const C_DEV_EXIT = "#4AD8FF";

export interface SceneCallbacks {
  onHotspotTap(hotspot: Hotspot): void;
  /** Returns false when a gated exit refused the crossing. */
  onExit(exit: RoomExit): boolean;
  /** Dev mode only: pointer position report, e.g. "143,79 monitors". */
  onDevPointer?(info: string): void;
}

/** Finger travel (CSS px) before a press stops being a tap and becomes a
 *  drag-to-walk. Generous enough that shaky taps stay taps. */
const DRAG_START_PX = 10;

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
  /** A gated exit that refused: stay quiet until the player leaves it. */
  private suppressedExit: RoomExit | null = null;
  /** Live press: becomes a drag past DRAG_START_PX, else a tap on lift. */
  private press: {
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
    /** Set when the room changed mid-drag: swallow the rest of the press. */
    ended: boolean;
  } | null = null;
  private dev: boolean;

  constructor(
    container: HTMLElement,
    state: GameState,
    cb: SceneCallbacks,
    dev = false,
  ) {
    this.state = state;
    this.cb = cb;
    this.dev = dev;
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
    this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
    this.canvas.addEventListener("pointercancel", () => {
      if (this.press?.dragging) this.target = null;
      this.press = null;
    });

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
    this.suppressedExit = null;
    // A drag that carried Mel through a door ends at the threshold —
    // otherwise the finger, still down near the reciprocal exit, would
    // bounce straight back.
    if (this.press?.dragging) this.press.ended = true;
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

    if (this.dev) {
      // Polygon authoring: click coordinates land in the console.
      console.log(`[dev] ${Math.round(p.x)},${Math.round(p.y)}`,
        this.hotspotAt(p)?.id ?? "");
    }

    this.press = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      ended: false,
    };
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    const p = this.toInternal(e);
    if (this.dev && this.cb.onDevPointer) {
      const hs = p ? this.hotspotAt(p) : null;
      this.cb.onDevPointer(
        p ? `${Math.round(p.x)},${Math.round(p.y)}${hs ? " " + hs.id : ""}` : "",
      );
    }

    const press = this.press;
    if (press && press.pointerId === e.pointerId && !press.ended) {
      if (
        !press.dragging &&
        Math.hypot(e.clientX - press.startX, e.clientY - press.startY) >
          DRAG_START_PX
      ) {
        press.dragging = true;
      }
      // Drag-to-walk: Mel continuously heads for the finger, projected
      // into the walkable polygon. No marker — the finger is the marker.
      if (press.dragging && this.room && this.room.walkable.length >= 3) {
        this.target = clampIntoPolygon(
          this.toInternalClamped(e),
          this.room.walkable,
        );
        this.exitArmed = true;
      }
      return;
    }

    if (e.pointerType !== "mouse") return;
    this.canvas.style.cursor = p && this.hotspotAt(p) ? "pointer" : "default";
  }

  private onPointerUp(e: PointerEvent): void {
    const press = this.press;
    if (!press || press.pointerId !== e.pointerId) return;
    this.press = null;
    if (press.dragging || press.ended) {
      // Steering stops when the finger lifts. Taps are the fire-and-forget
      // "go there" gesture; a drag moves Mel only while held — otherwise a
      // 15px nudge commits him to a cross-room march.
      this.target = null;
      return;
    }

    // A clean tap. Floor priority: a tap inside the walkable polygon
    // always walks — dense generous hotspots otherwise out-compete
    // walking on touch screens. Hotspots only contest off-floor taps.
    const p = this.toInternal(e);
    if (!p || !this.room) return;
    const onFloor =
      this.room.walkable.length >= 3 && pointInPolygon(p, this.room.walkable);
    const hotspot = onFloor ? null : this.hotspotAt(p);
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

  /** Like toInternal, but clamps into the picture instead of bailing on
   *  the letterbox — a dragging finger may wander off the art. */
  private toInternalClamped(e: PointerEvent): Pt {
    const rect = this.canvas.getBoundingClientRect();
    const scale =
      Math.min(rect.width / INTERNAL_W, rect.height / INTERNAL_H) || 1;
    const offX = (rect.width - INTERNAL_W * scale) / 2;
    const offY = (rect.height - INTERNAL_H * scale) / 2;
    const x = (e.clientX - rect.left - offX) / scale;
    const y = (e.clientY - rect.top - offY) / scale;
    return {
      x: Math.max(0, Math.min(INTERNAL_W - 1, x)),
      y: Math.max(0, Math.min(INTERNAL_H - 1, y)),
    };
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
      // Never snap onto a target that isn't strictly inside — a clamped
      // target can sit on the boundary at a concave notch.
      if (pointInPolygon(this.target, this.room.walkable)) {
        player.x = this.target.x;
        player.y = this.target.y;
      }
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
      if (
        this.suppressedExit &&
        !pointInPolygon(player, this.suppressedExit.polygon)
      ) {
        this.suppressedExit = null; // stepped clear; the gate may speak again
      }
      for (const exit of this.room.exits) {
        if (exit === this.suppressedExit) continue;
        if (exit.polygon.length >= 3 && pointInPolygon(player, exit.polygon)) {
          this.target = null;
          this.exitArmed = false;
          if (!this.cb.onExit(exit)) {
            // Gate held: stop at the threshold, and don't re-run the
            // blocked snark every frame the player lingers inside.
            this.suppressedExit = exit;
            this.exitArmed = true;
          }
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

    if (this.dev && this.room) {
      this.strokePoly(this.room.walkable, C_DEV_WALKABLE);
      for (const h of this.room.hotspots) this.strokePoly(h.polygon, C_DEV_HOTSPOT);
      for (const x of this.room.exits) this.strokePoly(x.polygon, C_DEV_EXIT);
    }

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

  private strokePoly(poly: Pt[], color: string): void {
    if (poly.length < 3) return;
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!;
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.globalAlpha = 1;
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
