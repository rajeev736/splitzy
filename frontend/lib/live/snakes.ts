import type { LiveResult, RoomOptions, RoomPlayer } from "./types"

/**
 * Snakes & Ladders, for 2–5 players. One engine for both games:
 *
 *  - "snakes"   the flat 2D board (start by rolling anything)
 *  - "snakes3d" the 3D tower — a gate at the start opens only on a 1
 *
 * Squares are 1–100; 0 = not on the board yet (behind the gate in 3D).
 * Land on a ladder's foot and climb to its top; on a snake's head and slide
 * to its tail. You must land on 100 exactly (overshoot = stay put). A 6
 * rolls again (three 6s in a row lose the turn). Finishers are ranked; the
 * game ends when at most one player is still going. Pure functions: the
 * component stamps server times before writing.
 */

export const LAST = 100
/** An online player gets this long to roll before the referee passes their turn. */
export const SNAKES_IDLE_MS = 30_000
/** Turns in a row lost to the clock before a player is out of the game. */
export const SNAKES_MAX_MISSED = 3

/** Ladders: foot → top — as drawn on the board picture (public/boards/snakes-classic.webp). */
export const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 71: 91, 80: 100,
}
/**
 * The 3D tower's ladders: the same, less square 1's — there the gate already
 * takes the 1 you need to get in, so a ladder waiting right behind it would
 * make every start the same climb — and less 80's, straight to 100: one lucky
 * landing shouldn't win the whole game.
 */
export const GATE_LADDERS: Record<number, number> = Object.fromEntries(
  Object.entries(LADDERS).filter(([foot]) => foot !== "1" && foot !== "80")
)
export const laddersFor = (variant: "flat" | "gate") => (variant === "gate" ? GATE_LADDERS : LADDERS)

/** Snakes: head → tail — as drawn on the board picture. */
export const SNAKES: Record<number, number> = {
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 79,
}

export type SnakesColour = "red" | "green" | "yellow" | "blue" | "purple"
export const SNAKES_COLOURS: SnakesColour[] = ["red", "green", "yellow", "blue", "purple"]

export interface SnakesPlayer {
  uid: string
  colour: SnakesColour
  /** 0 = start (behind the gate in 3D), 1–100 on the board. */
  pos: number
  /** 1 = finished first… 0 = still going. */
  place: number
  missed?: number
  out?: true
  /** Lifetime-of-this-game counts, for the result screen. */
  ladders?: number
  snakes?: number
}

export type SnakesSkipReason = "idle" | "offline" | "left"

export type SnakesLast =
  | {
      type: "move"
      by: string
      value: number
      from: number
      /** Where the dice took them (before a ladder / snake). */
      to: number
      /** Where they ended up after a ladder or snake. */
      end: number
      via?: "ladder" | "snake"
      /** 3D: rolled the 1 that opened the gate. */
      gate?: true
      /** Overshot 100: stayed put. */
      stuck?: true
      finished?: true
      bonus?: true
    }
  | { type: "blocked"; by: string; value: number }
  | { type: "three_sixes"; by: string }
  | { type: "skip"; by: string; reason: SnakesSkipReason; out?: true }

export interface SnakesState {
  /** "gate": the 3D game, where you need a 1 to come in. */
  variant: "flat" | "gate"
  order: string[]
  players: Record<string, SnakesPlayer>
  turn: string
  phase: "roll" | "over"
  sixes: number
  turnAt: number
  seq: number
  last?: SnakesLast
}

export interface SnakesContext {
  now: number
  /** Players who left for good. */
  gone?: string[]
}

export function initialSnakesState(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string,
  variant: "flat" | "gate" = "flat"
): SnakesState {
  void options
  void seed
  const order = players.slice(0, 5).map((p) => p.uid)
  const entries: Record<string, SnakesPlayer> = {}
  order.forEach((uid, i) => {
    entries[uid] = { uid, colour: SNAKES_COLOURS[i], pos: 0, place: 0 }
  })
  return { variant, order, players: entries, turn: order[0], phase: "roll", sixes: 0, turnAt: 0, seq: 0 }
}

const isGone = (s: SnakesState, uid: string, gone: string[] = []) => gone.includes(uid) || !!s.players[uid]?.out
const isRacing = (s: SnakesState, uid: string, gone: string[] = []) => s.players[uid]?.place === 0 && !isGone(s, uid, gone)
export const racing = (s: SnakesState, gone: string[] = []) => s.order.filter((u) => isRacing(s, u, gone))
/** Over when at most one player is still going (2 players: the first finisher ends it). */
export const isOver = (s: SnakesState, gone: string[] = []) => racing(s, gone).length <= 1

export function nextTurn(s: SnakesState, from: string, gone: string[] = []): string | null {
  const n = s.order.length
  const start = s.order.indexOf(from)
  for (let k = 1; k <= n; k++) {
    const u = s.order[(start + k) % n]
    if (isRacing(s, u, gone)) return u
  }
  return null
}

/** Where a roll takes a piece (before ladders and snakes), and whether it can move at all. */
export function stepTo(s: SnakesState, pos: number, value: number): { to: number; gate?: true; blocked?: true; stuck?: true } {
  if (pos === 0 && s.variant === "gate") {
    // The gate opens only on a 1: you step onto square 1
    return value === 1 ? { to: 1, gate: true } : { to: 0, blocked: true }
  }
  const to = pos + value
  if (to > LAST) return { to: pos, stuck: true }
  return { to }
}

/** Ladders up, snakes down. */
export function slideFrom(square: number, variant: "flat" | "gate" = "flat"): { end: number; via?: "ladder" | "snake" } {
  const ladders = laddersFor(variant)
  return ladders[square] ? { end: ladders[square], via: "ladder" } : SNAKES[square] ? { end: SNAKES[square], via: "snake" } : { end: square }
}

function passTo(s: SnakesState, from: string, ctx: SnakesContext): SnakesState {
  return { ...s, phase: "roll", turn: nextTurn(s, from, ctx.gone) ?? from, sixes: 0, turnAt: ctx.now }
}

/** `uid` rolled `value`: the piece moves (and climbs or slides), the turn passes unless it was a 6. */
export function applyRoll(s: SnakesState, uid: string, value: number, ctx: SnakesContext): SnakesState {
  if (s.phase !== "roll" || s.turn !== uid) throw new Error("Not your roll")
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error("Bad dice")
  const me = { ...s.players[uid] }
  delete me.missed
  const sixes = value === 6 ? s.sixes + 1 : 0
  const players = { ...s.players, [uid]: me }
  const seq = s.seq + 1
  if (sixes >= 3) return { ...passTo({ ...s, players }, uid, ctx), seq, last: { type: "three_sixes", by: uid } }

  const step = stepTo(s, me.pos, value)
  if (step.blocked) return { ...passTo({ ...s, players }, uid, ctx), seq, last: { type: "blocked", by: uid, value } }

  const from = me.pos
  const { end, via } = slideFrom(step.to, s.variant)
  me.pos = end
  if (via === "ladder") me.ladders = (me.ladders ?? 0) + 1
  if (via === "snake") me.snakes = (me.snakes ?? 0) + 1
  const finished = end === LAST
  if (finished) me.place = Math.max(0, ...s.order.map((u) => s.players[u].place)) + 1
  const bonus = value === 6 && !finished

  const last: SnakesLast = { type: "move", by: uid, value, from, to: step.to, end }
  if (via) last.via = via
  if (step.gate) last.gate = true
  if (step.stuck) last.stuck = true
  if (finished) last.finished = true
  if (bonus) last.bonus = true

  const next: SnakesState = { ...s, players, seq, last, turnAt: ctx.now, sixes: bonus ? sixes : 0 }
  if (isOver(next, ctx.gone)) return { ...next, phase: "over" }
  return bonus ? next : passTo(next, uid, ctx)
}

/**
 * The roll, weighted so a game stays a race (still random — every face keeps
 * a real chance, nothing is ever fixed):
 *  - trailing far behind the leader: ladders under your next squares get
 *    likelier, snakes rarer, big numbers (and the 6 that rolls again) a bit
 *    likelier — and at the gate, the 1 that opens it;
 *  - far in front: snakes get a little likelier and ladders a little rarer —
 *    but the roll that reaches 100 is never made harder.
 * Even games (or alone in the race) roll fair. `rand` is a uniform [0, 1)
 * source (the screen passes the CSPRNG).
 */
export function rollFor(s: SnakesState, uid: string, rand: () => number): number {
  const w = [0, 1, 1, 1, 1, 1, 1]
  const me = s.players[uid]
  const rivals = s.order.filter((u) => u !== uid && s.players[u] && s.players[u].place === 0 && !s.players[u].out)
  if (me && me.place === 0 && rivals.length > 0) {
    const best = Math.max(...rivals.map((u) => s.players[u].pos))
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
    const behind = clamp01((best - me.pos - 8) / 40)
    const ahead = clamp01((me.pos - best - 8) / 40)
    for (let d = 1; d <= 6; d++) {
      const step = stepTo(s, me.pos, d)
      if (step.blocked || step.stuck) continue
      const { end, via } = slideFrom(step.to, s.variant)
      if (end === LAST) continue
      if (via === "ladder") w[d] *= 1 + behind * 1.5 - ahead * 0.4
      if (via === "snake") w[d] *= 1 - behind * 0.6 + ahead * 0.6
      w[d] += behind * (d - 1) * 0.08
    }
    // Stuck at the gate while the others climb: the 1 that opens it
    if (me.pos === 0 && s.variant === "gate") w[1] += behind * 1.2
  }
  const total = w.slice(1).reduce((a, b) => a + Math.max(0.25, b), 0)
  let r = rand() * total
  for (let face = 1; face <= 6; face++) {
    r -= Math.max(0.25, w[face])
    if (r < 0) return face
  }
  return 6
}

/** The referee passes an idle / offline / departed player's turn; 3 clock misses in a row and they're out. */
export function passTurn(s: SnakesState, from: string, reason: SnakesSkipReason, ctx: SnakesContext): SnakesState {
  if (s.phase === "over" || s.turn !== from) throw new Error("Not their turn")
  const p = s.players[from]
  const missed = reason === "left" ? (p.missed ?? 0) : (p.missed ?? 0) + 1
  const out = reason !== "left" && missed >= SNAKES_MAX_MISSED
  const players = { ...s.players, [from]: out ? { ...p, missed, out: true as const } : { ...p, missed } }
  const last: SnakesLast = { type: "skip", by: from, reason }
  if (out) last.out = true
  const next = { ...passTo({ ...s, players }, from, ctx), seq: s.seq + 1, last }
  return isOver(next, ctx.gone) ? { ...next, phase: "over" } : next
}

export function rankingOf(s: SnakesState, gone: string[] = []): string[] {
  const done = s.order.filter((u) => s.players[u].place > 0).sort((a, b) => s.players[a].place - s.players[b].place)
  const by = (a: string, b: string) => s.players[b].pos - s.players[a].pos || s.order.indexOf(a) - s.order.indexOf(b)
  const still = s.order.filter((u) => isRacing(s, u, gone)).sort(by)
  const gonePlayers = s.order.filter((u) => s.players[u].place === 0 && isGone(s, u, gone)).sort(by)
  return [...done, ...still, ...gonePlayers]
}

export function resultOf(s: SnakesState, gone: string[] = []): LiveResult {
  const ranking = rankingOf(s, gone)
  const stats: Record<string, Record<string, number>> = {}
  for (const u of s.order) stats[u] = { ladders: s.players[u].ladders ?? 0, snakes: s.players[u].snakes ?? 0 }
  return {
    winnerIds: ranking.slice(0, 1),
    ranking,
    reason: s.order.some((u) => s.players[u].place > 0) ? "reached_100" : "abandoned",
    stats,
  }
}

export function describeLast(s: SnakesState, nameOf: (uid: string) => string): string {
  const l = s.last
  if (!l) return s.variant === "gate" ? `${nameOf(s.turn)} starts — roll a 1 to open the gate` : `${nameOf(s.turn)} starts`
  const who = nameOf(l.by)
  switch (l.type) {
    case "blocked":
      return `${who} rolled a ${l.value} — the gate needs a 1`
    case "three_sixes":
      return `${who} rolled three 6s — turn lost`
    case "skip":
      return l.out ? `${who} missed ${SNAKES_MAX_MISSED} turns — out of the game` : `${who} ran out of time`
    case "move":
      if (l.finished) return `${who} reached 100 — finished ${ordinal(s.players[l.by]?.place ?? 0)}!`
      if (l.gate) return `${who} rolled a 1 — the gate opens!`
      if (l.stuck) return `${who} rolled a ${l.value} — needs exactly ${LAST - l.from}`
      if (l.via === "ladder") return `${who} climbed a ladder ${l.to} → ${l.end}!`
      if (l.via === "snake") return `${who} was bitten by a snake ${l.to} → ${l.end}`
      return `${who} moved to ${l.end}${l.bonus ? " — rolls again" : ""}`
  }
}

export const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)
