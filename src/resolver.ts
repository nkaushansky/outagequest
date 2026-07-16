// Response resolution engine (data/schema.md): for a list of entries, the
// first whose `if` passes fires. Entries are `{ text }` shorthand or
// `{ if?, do: [...] }`. Actions mutate state through the EngineContext so
// the engine stays the only owner of side effects.

import type { Action, Condition, ResponseEntry } from "./types";
import type { GameState } from "./state";

export interface EngineContext {
  state: GameState;
  narrate(text: string, cls?: string): void;
  award(id: string, points: number): void;
  addItem(id: string): void;
  removeItem(id: string): void;
  die(id: string, text: string, title?: string): void;
  gotoRoom(id: string): void;
}

export function evalCondition(cond: Condition, state: GameState): boolean {
  if ("flag" in cond) return state.flags.has(cond.flag);
  if ("flagNot" in cond) return !state.flags.has(cond.flagNot);
  if ("hasItem" in cond) return state.hasItem(cond.hasItem);
  if ("all" in cond) return cond.all.every((c) => evalCondition(c, state));
  if ("any" in cond) return cond.any.some((c) => evalCondition(c, state));
  return false;
}

export function runActions(actions: Action[], ctx: EngineContext): void {
  for (const action of actions) {
    if ("narrate" in action) {
      ctx.narrate(action.narrate);
    } else if ("setFlag" in action) {
      ctx.state.flags.add(action.setFlag);
    } else if ("clearFlag" in action) {
      ctx.state.flags.delete(action.clearFlag);
    } else if ("addItem" in action) {
      ctx.addItem(action.addItem);
    } else if ("removeItem" in action) {
      ctx.removeItem(action.removeItem);
    } else if ("score" in action) {
      ctx.award(action.score.id, action.score.points);
    } else if ("death" in action) {
      ctx.die(action.death.id, action.death.text, action.death.title);
      return; // nothing runs past a death; retry restores the snapshot
    } else if ("goto" in action) {
      ctx.gotoRoom(action.goto);
    } else if ("playSound" in action) {
      // M8. Silence, for now. Fitting.
    }
  }
}

/** Run the first entry whose condition passes. Returns false if none did. */
export function runEntries(
  entries: ResponseEntry[] | undefined,
  ctx: EngineContext,
): boolean {
  if (!entries) return false;
  for (const entry of entries) {
    if (entry.if && !evalCondition(entry.if, ctx.state)) continue;
    if (entry.text !== undefined) ctx.narrate(entry.text);
    if (entry.do) runActions(entry.do, ctx);
    return true;
  }
  return false;
}
