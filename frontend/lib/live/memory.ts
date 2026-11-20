import type { HostedAction, HostedEngine, HostedMove, HostedStart, HostedStep, HostedTable } from "./hosted"
import type { LiveResult, RoomOptions } from "./types"

/**
 * Memory Tiles — a pairs game the server runs (lib/live/hosted).
 *
 * All tiles start face down. On your turn you flip two: a match is yours (a
 * point) and you go again; a miss stays up for a moment ("peek") and then
 * both flip back and the next player goes. When every pair is found, the
 * round goes to whoever found the most (tied leaders share it). A match is
 * one round or best of 3 (first to 2 round wins; after the last round, most
 * round wins, then most pairs overall).
 *
 * Which picture lies under which tile (the layout) is the server's alone
 * (`hidden`): the public table only ever shows the tiles that are face up —
 * the ones flipped this turn and the pairs already found. Nothing is private
 * per player.
 *
 * Actions:
 *   { type: "flip", tile, seq }   the current player flips a face-down tile
 *   { type: "tick" }              anyone: moves the clock along (a miss flips
 *                                 back after its peek, an idle turn passes after
 *                                 IDLE_MS, the next round deals, a player who
 *                                 left is skipped, the last one standing wins)
 *
 * Everything here survives a Realtime Database round trip: no `undefined`,
 * no holes in arrays, and empty arrays / objects (which the database drops)
 * are read back as empty (see `normalize`).
 */

/** How many different pictures there are (components/live/memory/pictures). */
export const MEMORY_PICTURES = 18
export const MEMORY_SIZES = [16, 24, 36] as const
/** A turn with no flip passes after this long. */
export const MEMORY_IDLE_MS = 30_000
/** A miss stays face up this long before it flips back. */
export const MEMORY_PEEK_MS = 1200
/** The finished round's board stays up this long before the next deal (or the result). */
export const MEMORY_ROUND_PAUSE_MS = 3500

export type MemoryPhase = "play" | "peek" | "roundover" | "over"

/** A tile face up this turn, with its picture. */
export interface MemoryFlip {
  tile: number
  pic: number
}

/** A pair found: its two tiles, the picture and who found it. */
export interface MemoryPair {
  a: number
  b: number
  pic: number
  by: string
}

export interface MemoryState extends HostedTable {
  phase: MemoryPhase
  /** Seat order (uids). */
  players: string[]
  /** Tiles on the board (16, 24 or 36). */
  size: number
  /** 1 or 3 (best of 3). */
  rounds: number
  /** 1-based. */
  round: number
  /** Face up this turn: 0 or 1 while playing, the two of a miss while peeking. */
  flipped: MemoryFlip[]
  /** Pairs found this round, oldest first. */
  matched: MemoryPair[]
  /** Pairs found this round, per player. */
  pairs: Record<string, number>
  /** Pairs found over the whole match, per player (the tiebreak). */
  total: Record<string, number>
  /** Rounds won, per player (a tied round counts for every leader). */
  wins: Record<string, number>
  /** Who flipped the tiles shown in a peek (the turn already moved on). */
  peekBy: string
  /** Server ms a peek's tiles flip back (0: no peek). */
  peekUntil: number
  /** Server ms the next round deals / the result shows (0: not between rounds). */
  nextAt: number
  /** Who started this round (the next round starts with the player after them). */
  starter: string
  /** The round just finished: who won it (empty / missing: shared by nobody). */
  lastWinners: string[]
}

/** The server's own: which picture lies under each tile. */
export interface MemoryHidden {
  layout: number[]
}

type Step = HostedStep<MemoryState, never, MemoryHidden>

/** Grid shapes per board size: [columns, rows] on a tall (phone) screen. */
export const memoryGrid = (size: number, wide = false): [number, number] => {
  const [c, r] = size === 16 ? [4, 4] : size === 36 ? [6, 6] : [4, 6]
  return wide ? [r, c] : [c, r]
}

/** Round wins needed to take the match. */
export const winsNeeded = (rounds: number) => Math.floor(rounds / 2) + 1

const sizeOf = (options: RoomOptions) => {
  const v = Number(options.size)
  return (MEMORY_SIZES as readonly number[]).includes(v) ? v : 24
}
const roundsOf = (options: RoomOptions) => (Number(options.rounds) === 3 ? 3 : 1)

/** A shuffled layout: `size / 2` different pictures, two of each. */
export function dealLayout(size: number, rand: () => number): number[] {
  const pics = Array.from({ length: MEMORY_PICTURES }, (_, i) => i)
  shuffle(pics, rand)
  const chosen = pics.slice(0, size / 2)
  const layout = [...chosen, ...chosen]
  shuffle(layout, rand)
  return layout
}

function shuffle<T>(a: T[], rand: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
}

const zeroes = (players: string[]) => Object.fromEntries(players.map((p) => [p, 0]))

/** Reads a table back from the database: dropped empty arrays / objects come back empty. */
export function normalize(s: MemoryState): MemoryState {
  const players = toArray<string>(s.players)
  const fill = (r: Record<string, number> | undefined) => ({ ...zeroes(players), ...(r ?? {}) })
  return {
    ...s,
    players,
    flipped: toArray<MemoryFlip>(s.flipped),
    matched: toArray<MemoryPair>(s.matched),
    pairs: fill(s.pairs),
    total: fill(s.total),
    wins: fill(s.wins),
    lastWinners: toArray<string>(s.lastWinners),
    peekBy: s.peekBy ?? "",
    peekUntil: s.peekUntil ?? 0,
    nextAt: s.nextAt ?? 0,
    starter: s.starter ?? "",
    turn: s.turn ?? "",
  }
}

/** An array the database may have dropped (empty) or turned into an object. */
function toArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined) as T[]
  if (v && typeof v === "object") return Object.values(v as Record<string, T>)
  return []
}

/** Who's next after `from` in seat order, skipping players who left ("" if nobody). */
export function nextPlayer(players: string[], from: string, gone: ReadonlySet<string>): string {
  const n = players.length
  const at = players.indexOf(from)
  for (let k = 1; k <= n; k++) {
    const p = players[(((at < 0 ? -1 : at) + k) % n + n) % n]
    if (!gone.has(p)) return p
  }
  return ""
}

/** Tiles face up for good (found pairs). */
export const matchedTiles = (s: Pick<MemoryState, "matched">) => {
  const out = new Set<number>()
  for (const m of s.matched) {
    out.add(m.a)
    out.add(m.b)
  }
  return out
}

/** Is the match over after the round just finished? */
export function matchDecided(s: Pick<MemoryState, "round" | "rounds" | "wins" | "players">, gone: ReadonlySet<string>) {
  if (s.round >= s.rounds) return true
  const need = winsNeeded(s.rounds)
  return s.players.some((p) => !gone.has(p) && (s.wins[p] ?? 0) >= need)
}

/**
 * The match result: most round wins, then most pairs overall. Tied leaders
 * share the win; if every player still in is tied, it's a draw (no winner).
 */
export function memoryResult(s: MemoryState, gone: ReadonlySet<string>, reason = "rounds_over"): LiveResult {
  const active = s.players.filter((p) => !gone.has(p))
  const key = (p: string) => (s.wins[p] ?? 0) * 1000 + (s.total[p] ?? 0)
  const ranking = [...s.players].sort((a, b) => Number(gone.has(a)) - Number(gone.has(b)) || key(b) - key(a))
  const stats = Object.fromEntries(s.players.map((p) => [p, { pairs: s.total[p] ?? 0, rounds: s.wins[p] ?? 0 }]))
  const scores = Object.fromEntries(s.players.map((p) => [p, s.total[p] ?? 0]))
  let winnerIds: string[]
  if (active.length === 0) {
    winnerIds = []
    reason = "everyone_left"
  } else if (active.length === 1) {
    winnerIds = active
    if (reason !== "rounds_over") reason = "abandoned"
  } else {
    const best = Math.max(...active.map(key))
    const top = active.filter((p) => key(p) === best)
    winnerIds = top.length === active.length ? [] : top
    if (winnerIds.length === 0) reason = "draw"
  }
  return { winnerIds, ranking, scores, reason, stats }
}

function freshRound(s: MemoryState, rand: () => number, starter: string, now: number): Step["hidden"] {
  s.phase = "play"
  s.flipped = []
  s.matched = []
  s.pairs = zeroes(s.players)
  s.peekBy = ""
  s.peekUntil = 0
  s.nextAt = 0
  s.starter = starter
  s.turn = starter
  s.turnAt = now
  return { layout: dealLayout(s.size, rand) }
}

function start(input: HostedStart): Step {
  const players = [...input.players]
  if (players.length < 1) throw new Error("no players")
  const s: MemoryState = {
    seq: 1,
    phase: "play",
    turn: "",
    turnAt: input.now,
    players,
    size: sizeOf(input.options),
    rounds: roundsOf(input.options),
    round: 1,
    flipped: [],
    matched: [],
    pairs: zeroes(players),
    total: zeroes(players),
    wins: zeroes(players),
    peekBy: "",
    peekUntil: 0,
    nextAt: 0,
    starter: "",
    lastWinners: [],
  }
  const first = players[Math.min(players.length - 1, Math.floor(input.rand() * players.length))]
  const hidden = freshRound(s, input.rand, first, input.now)
  return { state: s, secrets: {}, hidden }
}

function finish(s: MemoryState, gone: ReadonlySet<string>, reason?: string) {
  s.phase = "over"
  s.turn = ""
  s.flipped = []
  s.peekBy = ""
  s.peekUntil = 0
  s.nextAt = 0
  s.result = memoryResult(s, gone, reason)
}

/** Flip back what's up and hand the turn on (after `from`). */
function passTurn(s: MemoryState, from: string, gone: ReadonlySet<string>, now: number) {
  s.phase = "play"
  s.flipped = []
  s.peekBy = ""
  s.peekUntil = 0
  s.turn = nextPlayer(s.players, from, gone)
  s.turnAt = now
}

/**
 * Moves the clock along; returns whether anything changed. Runs before every
 * action, so a flip after a peek ran out flips the miss back first.
 */
function settle(s: MemoryState, hidden: MemoryHidden, now: number, gone: ReadonlySet<string>, rand: () => number): { hidden: MemoryHidden; changed: boolean } {
  let changed = false
  for (let guard = 0; guard < 4 && s.phase !== "over"; guard++) {
    const active = s.players.filter((p) => !gone.has(p))
    // Everyone else left: the last one standing wins (nobody left: nobody does)
    if (active.length <= 1 && s.players.length > 1) {
      finish(s, gone, "abandoned")
      return { hidden, changed: true }
    }
    if (s.phase === "peek" && now >= s.peekUntil) {
      // The turn already moved on when the miss was flipped; it starts now
      s.phase = "play"
      s.flipped = []
      s.peekBy = ""
      s.peekUntil = 0
      if (gone.has(s.turn)) s.turn = nextPlayer(s.players, s.turn, gone)
      s.turnAt = Math.max(s.turnAt, now)
      changed = true
      continue
    }
    if (s.phase === "roundover" && now >= s.nextAt) {
      if (matchDecided(s, gone)) {
        finish(s, gone)
        return { hidden, changed: true }
      }
      s.round += 1
      hidden = freshRound(s, rand, nextPlayer(s.players, s.starter, gone), now)
      changed = true
      continue
    }
    if (s.phase === "play") {
      // The player whose turn it is left: skip them
      if (gone.has(s.turn)) {
        passTurn(s, s.turn, gone, now)
        changed = true
        continue
      }
      // Idle too long: what's up flips back and the turn passes
      if (now - s.turnAt >= MEMORY_IDLE_MS) {
        passTurn(s, s.turn, gone, now)
        changed = true
        continue
      }
    }
    break
  }
  return { hidden, changed }
}

function flip(s: MemoryState, hidden: MemoryHidden, uid: string, action: HostedAction, now: number, gone: ReadonlySet<string>) {
  if (s.phase === "peek") throw new Error("hold on — those tiles are flipping back")
  if (s.phase !== "play") throw new Error("the round is over")
  if (s.turn !== uid) throw new Error("not your turn")
  const tile = action.tile
  if (typeof tile !== "number" || !Number.isInteger(tile) || tile < 0 || tile >= s.size) throw new Error("no such tile")
  if (matchedTiles(s).has(tile) || s.flipped.some((f) => f.tile === tile)) throw new Error("that tile is already up")
  const pic = hidden.layout[tile]
  if (typeof pic !== "number") throw new Error("no such tile")
  s.turnAt = now
  if (s.flipped.length === 0) {
    s.flipped = [{ tile, pic }]
    return
  }
  const first = s.flipped[0]
  if (first.pic === pic) {
    // A match: the pair is yours, and you go again
    s.matched = [...s.matched, { a: first.tile, b: tile, pic, by: uid }]
    s.pairs = { ...s.pairs, [uid]: (s.pairs[uid] ?? 0) + 1 }
    s.total = { ...s.total, [uid]: (s.total[uid] ?? 0) + 1 }
    s.flipped = []
    if (s.matched.length * 2 >= s.size) endRound(s, gone, now)
    return
  }
  // A miss: both stay up for a peek, and the turn moves on (it starts when they flip back)
  s.flipped = [first, { tile, pic }]
  s.phase = "peek"
  s.peekBy = uid
  s.peekUntil = now + MEMORY_PEEK_MS
  s.turn = nextPlayer(s.players, uid, gone)
  s.turnAt = s.peekUntil
}

function endRound(s: MemoryState, gone: ReadonlySet<string>, now: number) {
  const active = s.players.filter((p) => !gone.has(p))
  const best = Math.max(0, ...active.map((p) => s.pairs[p] ?? 0))
  const winners = best > 0 ? active.filter((p) => (s.pairs[p] ?? 0) === best) : []
  s.wins = { ...s.wins }
  for (const w of winners) s.wins[w] = (s.wins[w] ?? 0) + 1
  s.lastWinners = winners
  s.phase = "roundover"
  s.turn = ""
  s.turnAt = now
  s.nextAt = now + MEMORY_ROUND_PAUSE_MS
}

function act(m: HostedMove<MemoryState, never, MemoryHidden>): Step {
  const before = normalize(m.state)
  if (before.phase === "over") throw new Error("the game is over")
  const s: MemoryState = structuredClone(before)
  const gone = new Set(m.gone)
  const settled = settle(s, m.hidden, m.now, gone, m.rand)
  let hidden = settled.hidden
  let changed = settled.changed
  if (m.action.type === "tick") {
    // nothing else to do
  } else if (m.action.type === "flip") {
    if (s.phase === "over") throw new Error("the game is over")
    flip(s, hidden, m.uid, m.action, m.now, gone)
    changed = true
  } else {
    throw new Error("unknown move")
  }
  if (!changed) return { state: m.state, secrets: m.secrets, hidden: m.hidden }
  hidden = { layout: [...hidden.layout] }
  s.seq = before.seq + 1
  return { state: clean(s), secrets: {}, hidden }
}

/** No `undefined` anywhere (the database refuses it). */
function clean(s: MemoryState): MemoryState {
  const out = { ...s }
  if (out.result === undefined) delete out.result
  return out
}

export const memoryEngine: HostedEngine<MemoryState, never, MemoryHidden> = { start, act }
