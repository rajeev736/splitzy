import type { SeatColour } from "./room"
import type { LiveResult, RoomOptions, RoomPlayer } from "./types"

/**
 * Ludo: the engine. Pure functions over `LudoState` (kept at
 * rooms/{code}/state) plus the board geometry the SVG needs. Standard
 * "Ludo King" rules — the player's version is LIVE_GAMES.ludo.howTo.
 *
 * A token's position is counted along its own colour's path:
 *   -1       in base
 *   0..50    on the shared 52-square track (0 = own start square)
 *   51..55   own home column
 *   56       home
 *
 * Nothing here touches React or Firebase: the component stamps server
 * timestamps onto `turnAt` / `dice.at` before writing.
 */

export type LudoColour = SeatColour

export const TRACK_LENGTH = 52
export const HOME_COLUMN_START = 51
export const HOME = 56
export const TOKENS_PER_PLAYER = 4
/** Absolute track squares where nobody can be captured: the 4 starts and the 4 stars. */
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47]
/** Where each colour's path begins, in absolute track squares. */
export const START_INDEX: Record<LudoColour, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}
/** An online player gets this long to roll or move before the referee passes their turn. */
export const LUDO_IDLE_MS = 45_000
/** Ludo King style: a roll with exactly one possible move plays itself after this. */
export const LUDO_AUTO_MOVE_MS = 700
/** Turns in a row a player may lose to the clock before they're out of the game. */
export const LUDO_MAX_MISSED = 3

export interface LudoPlayer {
  uid: string
  colour: LudoColour
  /** Always 4 entries (see the position legend above). */
  tokens: number[]
  /** 1 = finished first, 2 = second… 0 = still racing. */
  place: number
  /** Turns in a row lost to the clock (idle / offline); cleared when they play. */
  missed?: number
  /** Out of the game after LUDO_MAX_MISSED missed turns: skipped and their tokens leave the board. */
  out?: true
}

export interface LudoDice {
  value: number
  /** Who rolled — the security rules only let the roller write this. */
  by: string
  /** Server ms */
  at: number
}

export type LudoSkipReason = "idle" | "offline" | "left"

export interface LudoCapture {
  uid: string
  token: number
}

export interface LudoMove {
  type: "move"
  by: string
  value: number
  token: number
  from: number
  to: number
  /** Only present when someone was sent back (the database drops empty arrays). */
  captured?: LudoCapture[]
  home?: true
  finished?: true
  /** The same player rolls again. */
  bonus?: true
}

/** The latest thing that happened: the log line and the token animation come from it. */
export type LudoLast =
  | { type: "roll"; by: string; value: number }
  | LudoMove
  | { type: "no_move"; by: string; value: number }
  | { type: "three_sixes"; by: string }
  | { type: "skip"; by: string; reason: LudoSkipReason; out?: true }

export interface LudoState {
  /** roll: waiting for `turn` to roll · move: they rolled, waiting for a token · over: someone won. */
  phase: "roll" | "move" | "over"
  /** Everyone who started, in seat order; colours follow it. */
  order: string[]
  players: Record<string, LudoPlayer>
  /** Whose decision it is. */
  turn: string
  /** Sixes rolled in a row in the current turn. */
  sixes: number
  /** The roll waiting to be played — only in the "move" phase, absent otherwise. */
  dice?: LudoDice
  /** Server ms when the current decision began (0 = game start: use meta.startedAt). */
  turnAt: number
  /** Bumps on every change, so a device can tell a new state from a replay. */
  seq: number
  last?: LudoLast
}

export interface LudoContext {
  /** Server ms (the component swaps in a serverTimestamp placeholder before writing). */
  now: number
  /** Players who left for good: skipped in the rotation. */
  gone?: string[]
}

/* ── Setup ───────────────────────────────────────────────────────────── */

/** Colours by player count: two players sit in opposite corners. */
export function coloursFor(count: number): LudoColour[] {
  if (count <= 2) return ["red", "yellow"]
  if (count === 3) return ["red", "green", "yellow"]
  return ["red", "green", "yellow", "blue"]
}

export function initialLudoState(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): LudoState {
  void options
  void seed
  const order = players.slice(0, 4).map((p) => p.uid)
  const colours = coloursFor(order.length)
  const entries: Record<string, LudoPlayer> = {}
  order.forEach((uid, i) => {
    entries[uid] = {
      uid,
      colour: colours[i],
      tokens: [-1, -1, -1, -1],
      place: 0,
    }
  })
  return {
    phase: "roll",
    order,
    players: entries,
    turn: order[0],
    sixes: 0,
    turnAt: 0,
    seq: 0,
  }
}

/* ── Rules ───────────────────────────────────────────────────────────── */

/** A 6 brings a token out; otherwise the token can't overshoot home. */
export function canMove(pos: number, dice: number): boolean {
  if (pos >= HOME) return false
  if (pos < 0) return dice === 6
  return pos + dice <= HOME
}

/** Token indices `uid` may move with this roll. */
export function legalMoves(
  state: LudoState,
  uid: string,
  dice: number
): number[] {
  const p = state.players[uid]
  if (!p) return []
  return p.tokens.flatMap((pos, i) => (canMove(pos, dice) ? [i] : []))
}

/** Legal moves with interchangeable tokens (same square) collapsed to one — for auto-play. */
export function distinctMoves(
  state: LudoState,
  uid: string,
  dice: number
): number[] {
  const seen = new Set<number>()
  return legalMoves(state, uid, dice).filter((i) => {
    const pos = state.players[uid].tokens[i]
    if (seen.has(pos)) return false
    seen.add(pos)
    return true
  })
}

/** Absolute track square of a token, or -1 when it's in base, the home column or home. */
export const trackIndex = (colour: LudoColour, pos: number): number =>
  pos >= 0 && pos < HOME_COLUMN_START
    ? (START_INDEX[colour] + pos) % TRACK_LENGTH
    : -1

export const isSafe = (track: number) => SAFE_SQUARES.includes(track)

/** Left the room, or put out of the game for missing too many turns. */
export const isGone = (state: LudoState, uid: string, gone: string[] = []) =>
  gone.includes(uid) || !!state.players[uid]?.out

const isRacing = (state: LudoState, uid: string, gone: string[]) =>
  state.players[uid]?.place === 0 && !isGone(state, uid, gone)

/** Players who haven't left (or been put out). */
export const contenders = (state: LudoState, gone: string[] = []) =>
  state.order.filter((uid) => !isGone(state, uid, gone))

/** `players` with `uid`'s missed-turn count cleared (they just played). */
function playedNow(state: LudoState, uid: string): Record<string, LudoPlayer> {
  const p = state.players[uid]
  if (!p?.missed) return state.players
  const rest = { ...p }
  delete rest.missed
  return { ...state.players, [uid]: rest }
}

/** Contenders still racing (not finished). */
export const racing = (state: LudoState, gone: string[] = []) =>
  state.order.filter((uid) => isRacing(state, uid, gone))

/** The game ends when at most one contender is still racing (so a 2-player game ends with the first finisher). */
export const isOver = (state: LudoState, gone: string[] = []) =>
  racing(state, gone).length <= 1

/**
 * Who plays after `from`: the next racing player in seat order, wrapping
 * around; `from` again when nobody else is left, or null when nobody is.
 */
export function nextTurn(
  state: LudoState,
  from: string,
  gone: string[] = []
): string | null {
  const n = state.order.length
  const start = state.order.indexOf(from)
  for (let k = 1; k <= n; k++) {
    const uid = state.order[(start + k) % n]
    if (isRacing(state, uid, gone)) return uid
  }
  return null
}

function pass(
  state: LudoState,
  from: string,
  last: LudoLast,
  ctx: LudoContext
): LudoState {
  const next: LudoState = {
    ...state,
    phase: "roll",
    turn: nextTurn(state, from, ctx.gone) ?? from,
    sixes: 0,
    turnAt: ctx.now,
    seq: state.seq + 1,
    last,
  }
  delete next.dice
  return next
}

/**
 * `uid` rolled `value`. Either they now pick a token ("move" phase), or the
 * turn passes right away: three 6s in a row, or nothing can move.
 */
export function applyRoll(
  state: LudoState,
  uid: string,
  value: number,
  ctx: LudoContext
): LudoState {
  if (state.phase !== "roll" || state.turn !== uid)
    throw new Error("Not your roll")
  if (!Number.isInteger(value) || value < 1 || value > 6)
    throw new Error("Bad dice")
  const sixes = value === 6 ? state.sixes + 1 : 0
  // Rolling counts as playing: the missed-turn count starts over
  const played: LudoState = { ...state, players: playedNow(state, uid) }
  if (sixes >= 3) return pass(played, uid, { type: "three_sixes", by: uid }, ctx)
  if (legalMoves(played, uid, value).length === 0)
    return pass(played, uid, { type: "no_move", by: uid, value }, ctx)
  return {
    ...played,
    phase: "move",
    sixes,
    dice: { value, by: uid, at: ctx.now },
    turnAt: ctx.now,
    seq: state.seq + 1,
    last: { type: "roll", by: uid, value },
  }
}

/**
 * `uid` moves `token` by `value`: captures on unsafe squares, home entry,
 * finishing, the bonus roll (6 / capture / home) and whose turn is next.
 */
export function applyMove(
  state: LudoState,
  uid: string,
  token: number,
  value: number,
  ctx: LudoContext
): LudoState {
  if (state.phase !== "move" || state.turn !== uid)
    throw new Error("Not your move")
  if (state.dice && state.dice.value !== value)
    throw new Error("That roll is gone")
  const me = state.players[uid]
  const from = me?.tokens[token]
  if (from === undefined || !canMove(from, value))
    throw new Error("That token can't move")
  const to = from < 0 ? 0 : from + value

  const players: Record<string, LudoPlayer> = {}
  for (const id of state.order)
    players[id] = {
      ...state.players[id],
      tokens: [...state.players[id].tokens],
    }
  players[uid].tokens[token] = to
  delete players[uid].missed

  // Capture: every rival token on the same shared square goes back to base, unless it's a safe square
  const captured: LudoCapture[] = []
  const square = trackIndex(me.colour, to)
  if (square >= 0 && !isSafe(square)) {
    for (const id of state.order) {
      // Tokens of players who left or are out are off the board
      if (id === uid || isGone(state, id, ctx.gone)) continue
      const rival = players[id]
      rival.tokens.forEach((pos, j) => {
        if (trackIndex(rival.colour, pos) === square) {
          rival.tokens[j] = -1
          captured.push({ uid: id, token: j })
        }
      })
    }
  }

  const home = to === HOME
  const finished = home && players[uid].tokens.every((t) => t === HOME)
  if (finished)
    players[uid].place =
      Math.max(0, ...state.order.map((id) => players[id].place)) + 1
  const bonus = !finished && (value === 6 || captured.length > 0 || home)

  const last: LudoMove = { type: "move", by: uid, value, token, from, to }
  if (captured.length) last.captured = captured
  if (home) last.home = true
  if (finished) last.finished = true
  if (bonus) last.bonus = true

  const next: LudoState = {
    ...state,
    players,
    phase: "roll",
    sixes: bonus ? state.sixes : 0,
    turnAt: ctx.now,
    seq: state.seq + 1,
    last,
  }
  delete next.dice
  if (isOver(next, ctx.gone)) {
    next.phase = "over"
    return next
  }
  if (!bonus) next.turn = nextTurn(next, uid, ctx.gone) ?? uid
  return next
}

/** The referee passes an idle / offline / departed player's turn (any pending roll is dropped). */
export function passTurn(
  state: LudoState,
  from: string,
  reason: LudoSkipReason,
  ctx: LudoContext
): LudoState {
  if (state.phase === "over" || state.turn !== from)
    throw new Error("Not their turn")
  if (reason === "left") return pass(state, from, { type: "skip", by: from, reason }, ctx)
  // Lost to the clock: a strike; the third in a row puts them out of the game
  const p = state.players[from]
  const missed = (p?.missed ?? 0) + 1
  const out = missed >= LUDO_MAX_MISSED
  const players = {
    ...state.players,
    [from]: out ? { ...p, missed, out: true as const } : { ...p, missed },
  }
  const last: LudoLast = { type: "skip", by: from, reason }
  if (out) last.out = true
  const next = pass({ ...state, players }, from, last, ctx)
  if (isOver(next, ctx.gone)) next.phase = "over"
  return next
}

/* ── Standings ───────────────────────────────────────────────────────── */

export const homeCount = (p: LudoPlayer) =>
  p.tokens.filter((t) => t === HOME).length

/** Squares travelled by all four tokens (a token in base counts 0, on its start square 1…). */
export const progressOf = (p: LudoPlayer) =>
  p.tokens.reduce((sum, t) => sum + (t < 0 ? 0 : t + 1), 0)

/** Finished players first (in order), then the rest by tokens home, then distance travelled; players who left come last. */
export function rankingOf(state: LudoState, gone: string[] = []): string[] {
  const byRace = (a: string, b: string) => {
    const pa = state.players[a]
    const pb = state.players[b]
    return (
      homeCount(pb) - homeCount(pa) ||
      progressOf(pb) - progressOf(pa) ||
      state.order.indexOf(a) - state.order.indexOf(b)
    )
  }
  const finished = state.order
    .filter((id) => state.players[id].place > 0)
    .sort((a, b) => state.players[a].place - state.players[b].place)
  const stillRacing = state.order
    .filter((id) => isRacing(state, id, gone))
    .sort(byRace)
  const left = state.order
    .filter((id) => state.players[id].place === 0 && isGone(state, id, gone))
    .sort(byRace)
  return [...finished, ...stillRacing, ...left]
}

/** What to hand to endGame. Without a reason: "all_home" once anyone finished, else "abandoned". */
export function resultOf(
  state: LudoState,
  gone: string[] = [],
  reason?: string
): LiveResult {
  const ranking = rankingOf(state, gone)
  const anyFinished = state.order.some((id) => state.players[id].place > 0)
  return {
    winnerIds: ranking.slice(0, 1),
    ranking,
    reason: reason ?? (anyFinished ? "all_home" : "abandoned"),
  }
}

export function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`
}

/** One line for the turn log, from `state.last`. */
export function describeLast(
  state: LudoState,
  nameOf: (uid: string) => string
): string {
  const last = state.last
  if (!last)
    return `${nameOf(state.turn)} starts — roll a 6 to bring a token out`
  const who = nameOf(last.by)
  switch (last.type) {
    case "roll":
      return `${who} rolled a ${last.value}`
    case "no_move":
      return `${who} rolled a ${last.value} — nothing could move`
    case "three_sixes":
      return `${who} rolled three 6s — turn lost`
    case "skip":
      if (last.out) return `${who} missed ${LUDO_MAX_MISSED} turns — out of the game`
      return last.reason === "idle"
        ? `${who} ran out of time — turn skipped`
        : last.reason === "offline"
          ? `${who} is offline — turn skipped`
          : `${who} left the game`
    case "move": {
      if (last.finished)
        return `${who} got all four home — finished ${ordinal(state.players[last.by]?.place ?? 0)}!`
      if (last.captured?.length) {
        const victims = [
          ...new Set(last.captured.map((c) => nameOf(c.uid))),
        ].join(" & ")
        const n = last.captured.length
        return `${who} captured ${victims}'s ${n > 1 ? `${n} tokens` : "token"} — rolls again`
      }
      if (last.home) return `${who} got a token home — rolls again`
      if (last.from < 0)
        return `${who} brought a token out${last.bonus ? " — rolls again" : ""}`
      return `${who} moved ${last.value}${last.bonus ? " — rolls again" : ""}`
    }
  }
}

/* ── Dice ────────────────────────────────────────────────────────────── */

/** A fair 1..6 from the browser's CSPRNG. Call from an event handler, never during render. */
export function rollDice(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % 6) + 1
}

/* ── Geometry: the standard 15×15 board ──────────────────────────────── */

/** A board cell; fractional values mark a spot between cells (base slots). Token centre = (col + 0.5, row + 0.5). */
export interface Cell {
  row: number
  col: number
}

/**
 * The shared track, clockwise from red's start square (row 6, col 1): along
 * the left arm, up the top arm, across, down, along the right arm… The
 * square just before a colour's own start is never visited by that colour —
 * it turns into its home column there.
 */
function buildTrack(): Cell[] {
  const t: Cell[] = []
  for (let c = 1; c <= 5; c++) t.push({ row: 6, col: c })
  for (let r = 5; r >= 0; r--) t.push({ row: r, col: 6 })
  t.push({ row: 0, col: 7 })
  for (let r = 0; r <= 5; r++) t.push({ row: r, col: 8 })
  for (let c = 9; c <= 14; c++) t.push({ row: 6, col: c })
  t.push({ row: 7, col: 14 })
  for (let c = 14; c >= 9; c--) t.push({ row: 8, col: c })
  for (let r = 9; r <= 14; r++) t.push({ row: r, col: 8 })
  t.push({ row: 14, col: 7 })
  for (let r = 14; r >= 9; r--) t.push({ row: r, col: 6 })
  for (let c = 5; c >= 0; c--) t.push({ row: 8, col: c })
  t.push({ row: 7, col: 0 })
  t.push({ row: 6, col: 0 })
  return t
}

export const TRACK: readonly Cell[] = buildTrack()

export const trackToCell = (index: number): Cell =>
  TRACK[((index % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH]

/** The five home-column cells of each colour, in walking order. */
export const HOME_COLUMN: Record<LudoColour, Cell[]> = {
  red: [1, 2, 3, 4, 5].map((col) => ({ row: 7, col })),
  green: [1, 2, 3, 4, 5].map((row) => ({ row, col: 7 })),
  yellow: [13, 12, 11, 10, 9].map((col) => ({ row: 7, col })),
  blue: [13, 12, 11, 10, 9].map((row) => ({ row, col: 7 })),
}

/** Top-left corner of each colour's 6×6 base. */
export const BASE_ORIGIN: Record<LudoColour, Cell> = {
  red: { row: 0, col: 0 },
  green: { row: 0, col: 9 },
  yellow: { row: 9, col: 9 },
  blue: { row: 9, col: 0 },
}

/** The four resting spots inside a base, relative to its origin. */
const BASE_SLOTS: Cell[] = [
  { row: 1.5, col: 1.5 },
  { row: 1.5, col: 3.5 },
  { row: 3.5, col: 1.5 },
  { row: 3.5, col: 3.5 },
]

/** Where finished tokens sit: each colour's triangle of the centre square. */
export const HOME_SPOT: Record<LudoColour, Cell> = {
  red: { row: 7, col: 6 },
  green: { row: 6, col: 7 },
  yellow: { row: 7, col: 8 },
  blue: { row: 8, col: 7 },
}

/** Board cell for a token of `colour` at `pos` (`token` picks the base slot). */
export function cellOf(colour: LudoColour, pos: number, token = 0): Cell {
  if (pos < 0) {
    const o = BASE_ORIGIN[colour]
    const s = BASE_SLOTS[((token % 4) + 4) % 4]
    return { row: o.row + s.row, col: o.col + s.col }
  }
  if (pos < HOME_COLUMN_START) return trackToCell(START_INDEX[colour] + pos)
  if (pos < HOME) return HOME_COLUMN[colour][pos - HOME_COLUMN_START]
  return HOME_SPOT[colour]
}
