// Saves (GDD "Systems"): autosave to localStorage plus an export/import
// save string. The string is the same payload, base64-wrapped, so a save
// survives even DreamHost-grade catastrophes.

import type { Snapshot } from "./state";

export interface SaveData {
  v: 1;
  snap: Snapshot;
  deathsFound: string[];
}

const KEY = "spof_save";
const PREFIX = "SPOF1.";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeSave(data: SaveData): string {
  return PREFIX + toBase64(JSON.stringify(data));
}

export function decodeSave(raw: string): SaveData | null {
  const s = raw.trim();
  if (!s.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(fromBase64(s.slice(PREFIX.length))) as SaveData;
    if (
      data.v !== 1 ||
      typeof data.snap?.roomId !== "string" ||
      !Array.isArray(data.snap.flags) ||
      !Array.isArray(data.snap.inventory) ||
      typeof data.snap.score !== "number" ||
      !Array.isArray(data.snap.awarded) ||
      typeof data.snap.player?.x !== "number" ||
      !Array.isArray(data.deathsFound)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeLocal(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, encodeSave(data));
    return true;
  } catch {
    return false; // private mode / storage denied — play on without autosave
  }
}

export function readLocal(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? decodeSave(raw) : null;
  } catch {
    return null;
  }
}
