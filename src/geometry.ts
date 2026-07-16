// Polygon math in internal 320x180 space.

import type { Pt } from "./types";

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const intersects =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function closestPointOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestPointOnPolygon(p: Pt, poly: Pt[]): { point: Pt; dist: number } {
  let best: Pt = poly[0] ?? { x: 0, y: 0 };
  let bestD = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const q = closestPointOnSegment(p, poly[j]!, poly[i]!);
    const d = dist(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return { point: best, dist: bestD };
}

export function polygonCentroid(poly: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  const n = Math.max(1, poly.length);
  return { x: x / n, y: y / n };
}

/** Clamp a point into the polygon: unchanged if inside, else the nearest
 *  boundary point nudged slightly toward the centroid so it tests inside. */
export function clampIntoPolygon(p: Pt, poly: Pt[]): Pt {
  if (pointInPolygon(p, poly)) return p;
  const { point } = nearestPointOnPolygon(p, poly);
  const c = polygonCentroid(poly);
  const d = dist(point, c);
  if (d === 0) return point;
  const nudge = Math.min(1, d);
  return {
    x: point.x + ((c.x - point.x) / d) * nudge,
    y: point.y + ((c.y - point.y) / d) * nudge,
  };
}

/** Generous hit test: inside the polygon, or within `pad` px of its edge. */
export function nearPolygon(p: Pt, poly: Pt[], pad: number): boolean {
  if (pointInPolygon(p, poly)) return true;
  return nearestPointOnPolygon(p, poly).dist <= pad;
}
