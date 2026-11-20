import type { SeatColour } from "./room"
import { characterPower } from "./character-powers"
import { TEAM_NAMES, type TeamIndex } from "./seats"
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
/** The four colours of the classic square board. */
export type SquareColour = Exclude<LudoColour, "purple">

export const TRACK_LENGTH = 52
export const HOME_COLUMN_START = 51
export const HOME = 56
export const TOKENS_PER_PLAYER = 4
/** Absolute track squares where nobody can be captured: the 4 starts and the 4 stars. */
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47]
/** Where each colour's path begins, in absolute track squares. */
export const START_INDEX: Record<SquareColour, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}

/**
 * A board's shape for the rules: arms of 13 squares each (out along one lane,
 * the tip, back along the other), so the track is 13 × arms long; a colour
 * walks track − 1 squares, then 5 in its home column, then home.
 * Classic: 4 arms. With 5 players: a 5-armed (pentagon) board.
 */
export interface LudoGeo {
  arms: number
  track: number
  /** First home-column position (= track − 1). */
  colStart: number
  /** Home (= colStart + 5). */
  home: number
  start: Partial<Record<LudoColour, number>>
  /** Starts and stars. */
  safe: number[]
}

export const SQUARE_GEO: LudoGeo = {
  arms: 4,
  track: TRACK_LENGTH,
  colStart: HOME_COLUMN_START,
  home: HOME,
  start: START_INDEX,
  safe: SAFE_SQUARES,
}

/** The five colours of the 5-player board, clockwise. */
export const PENTA_COLOURS: LudoColour[] = ["red", "green", "yellow", "blue", "purple"]

export const PENTA_GEO: LudoGeo = {
  arms: 5,
  track: 65,
  colStart: 64,
  home: 69,
  start: { red: 0, green: 13, yellow: 26, blue: 39, purple: 52 },
  safe: [0, 8, 13, 21, 26, 34, 39, 47, 52, 60],
}

/** The board a game is played on: 5 players get the pentagon, otherwise the classic square. */
export const geoOf = (s: { board?: "penta" }): LudoGeo => (s.board === "penta" ? PENTA_GEO : SQUARE_GEO)
/** An online player gets this long to roll or move before the referee passes their turn. */
export const LUDO_IDLE_MS = 45_000
/** Ludo King style: a roll with exactly one possible move plays itself after this. */
export const LUDO_AUTO_MOVE_MS = 700
/** Turns in a row a player may lose to the clock before they're out of the game. */
export const LUDO_MAX_MISSED = 3

/* ── Power Ludo ──────────────────────────────────────────────────────── */

/**
 * Power Ludo (room option "mode": "powers"): power-ups appear on squares of
 * the track; the first piece to land on one picks it up. The first player to
 * bring a piece out and the first to get one home also get a power. You use
 * a power on your turn, before rolling — it doesn't use up the turn. A power
 * from the track fizzles out POWER_TTL_MS after you get it. Your game
 * character also brings one signature power of its own (lib/live/character-powers):
 * once per game, and it never fizzles out.
 */
export const POWER_KINDS = ["freeze", "lock", "push", "jump", "shield", "double"] as const
export type PowerKind = (typeof POWER_KINDS)[number]

export const POWER_INFO: Record<
  PowerKind,
  { name: string; blurb: string; target: "rival" | "own" | "none" }
> = {
  freeze: { name: "Freeze", blurb: "A rival's piece can't move for 3 of their turns", target: "rival" },
  lock: { name: "Number lock", blurb: "A rival's piece moves only once they roll a set number", target: "rival" },
  push: { name: "Push back", blurb: "Knock a rival's piece back 5 squares", target: "rival" },
  jump: { name: "Jump", blurb: "One of your pieces leaps 4 squares ahead", target: "own" },
  shield: { name: "Shield", blurb: "Your piece can't be cut or hit for 3 of your turns", target: "own" },
  double: { name: "Double dice", blurb: "Your next roll counts twice", target: "none" },
}
/** Powers a player can hold at once. */
export const MAX_POWERS = 3
export const FREEZE_TURNS = 3
export const SHIELD_TURNS = 3
export const PUSH_BACK = 5
export const JUMP_BY = 4
/** A new power-up appears every this many turns (while fewer than MAX_SPAWNS are on the board). */
export const SPAWN_EVERY = 3
export const MAX_SPAWNS = 3
/**
 * A power picked up (or earned) on the track fizzles out this long after —
 * use it or lose it. A character's signature power never does.
 */
export const POWER_TTL_MS = 120_000

/** A random power a player holds, with its deadline. */
export interface HeldPower {
  kind: PowerKind
  /** Server ms it fizzles out; 0 = never (games started before the timer). */
  until: number
}

/** A power that fizzled out, and whose it was. */
export interface LudoLost {
  uid: string
  kind: PowerKind
}

/**
 * The power a player's game character brings (lib/live/character-powers):
 * theirs once per game, on their turn before rolling, and it never fizzles out.
 */
export interface LudoSignature {
  kind: PowerKind
  used: boolean
}

export interface LudoSpawn {
  /** Absolute track square. */
  sq: number
  kind: PowerKind
}

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
  /** Rival pieces this player cut. */
  kills?: number
  /** Times this player's pieces were cut. */
  deaths?: number
  /** Rolls in a row without a 6 (the dice's mercy for a player stuck in base). */
  noSix?: number
  /** Power Ludo: powers held, oldest first. */
  powers?: PowerKind[]
  /**
   * Power Ludo: when each held power fizzles out (server ms), index for index
   * with `powers`; 0 = never. Absent = none of them do (older games).
   */
  until?: number[]
  /** Power Ludo: the character's own power (absent = no character). */
  signature?: LudoSignature
  /** Power Ludo: the next roll counts twice. */
  double?: true
  /** Teams 2v2: 0 = Team A, 1 = Team B (teammates sit opposite). */
  team?: TeamIndex
}

export interface LudoDice {
  value: number
  /** Who rolled — the security rules only let the roller write this. */
  by: string
  /** Server ms */
  at: number
  /** Doubled by a power (value is already the doubled number). */
  x2?: true
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
  /** Power Ludo: a power-up picked up on the landing square… */
  picked?: PowerKind
  /** …or earned for the first piece out / first piece home. */
  earned?: PowerKind
}

export interface LudoPowerUse {
  type: "power"
  by: string
  kind: PowerKind
  /** The piece it was used on. */
  target?: LudoCapture
  /** Number lock: the number the piece now needs. Push / jump: where it went. */
  value?: number
  from?: number
  to?: number
  captured?: LudoCapture[]
  /** The character's signature power (not a held one). */
  signature?: true
}

/**
 * The latest thing that happened: the log line and the token animation come
 * from it. Any of them may also carry the powers that fizzled out on the way
 * (`expired`); "expired" alone is the referee dropping them between moves.
 */
export type LudoLast = (
  | { type: "roll"; by: string; value: number; x2?: true }
  | LudoMove
  | { type: "no_move"; by: string; value: number; x2?: true }
  | { type: "three_sixes"; by: string }
  | { type: "skip"; by: string; reason: LudoSkipReason; out?: true }
  | LudoPowerUse
  | { type: "expired"; by: string }
) & { expired?: LudoLost[] }

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
  /** Turns played so far (power-ups appear on a schedule). */
  turnNo?: number
  /** "powers" = Power Ludo; absent = classic. */
  mode?: "powers"
  /** "penta" = the 5-player board; absent = the classic square. */
  board?: "penta"
  /** Power-ups waiting on the track. */
  spawns?: LudoSpawn[]
  /** `${uid}:${token}` → owner's turns left frozen. */
  frozen?: Record<string, number>
  /** `${uid}:${token}` → the number its owner must roll before it can move. */
  locked?: Record<string, number>
  /** `${uid}:${token}` → owner's turns left shielded. */
  shield?: Record<string, number>
  /** Who brought the first piece out / got the first piece home (each earns a power). */
  firstOut?: string
  firstHome?: string
  /** Teams 2v2 (room option "teams"): every player has a `team`. */
  teams?: true
}

export interface LudoContext {
  /** Server ms (the component swaps in a serverTimestamp placeholder before writing). */
  now: number
  /** Players who left for good: skipped in the rotation. */
  gone?: string[]
  /** Random number in [0, 1) for power-ups (defaults to Math.random). */
  rand?: () => number
}

/** The key for one piece in the effect maps. */
export const pieceKey = (uid: string, token: number) => `${uid}:${token}`
export const isFrozen = (s: LudoState, uid: string, token: number) => (s.frozen?.[pieceKey(uid, token)] ?? 0) > 0
export const lockOf = (s: LudoState, uid: string, token: number) => s.locked?.[pieceKey(uid, token)] ?? 0
export const isShielded = (s: LudoState, uid: string, token: number) => (s.shield?.[pieceKey(uid, token)] ?? 0) > 0

/** A player's random powers with their deadlines, oldest first. */
export const heldPowers = (p: LudoPlayer | undefined): HeldPower[] =>
  (p?.powers ?? []).map((kind, i) => ({ kind, until: p?.until?.[i] ?? 0 }))

/** Past its deadline (signature powers and older games' powers have none). */
export const isExpired = (h: HeldPower, now: number) => h.until > 0 && now >= h.until

/** `p` holding `held` (both arrays dropped when there's nothing to keep — the database drops empty ones). */
function withHeld(p: LudoPlayer, held: HeldPower[]): LudoPlayer {
  const out = { ...p }
  delete out.powers
  delete out.until
  if (held.length) out.powers = held.map((h) => h.kind)
  if (held.some((h) => h.until > 0)) out.until = held.map((h) => h.until)
  return out
}

/** The soonest deadline of any held power (server ms), or null when none is ticking. */
export function nextExpiry(state: LudoState): number | null {
  let min = Infinity
  for (const id of state.order)
    for (const t of state.players[id]?.until ?? []) if (t > 0 && t < min) min = t
  return min === Infinity ? null : min
}

/** Drops every held power that's past its deadline at `now`. */
export function dropExpired(state: LudoState, now: number): { state: LudoState; lost: LudoLost[] } {
  const lost: LudoLost[] = []
  let players: Record<string, LudoPlayer> | null = null
  for (const id of state.order) {
    const p = state.players[id]
    if (!p?.until) continue
    const held = heldPowers(p)
    const keep = held.filter((h) => !isExpired(h, now))
    if (keep.length === held.length) continue
    for (const h of held) if (isExpired(h, now)) lost.push({ uid: id, kind: h.kind })
    players = players ?? { ...state.players }
    players[id] = withHeld(p, keep)
  }
  return players ? { state: { ...state, players }, lost } : { state, lost }
}

/** Runs a step on the state with fizzled powers dropped first; its `last` says which went. */
function expiring(state: LudoState, ctx: LudoContext, step: (s: LudoState) => LudoState): LudoState {
  const { state: s, lost } = dropExpired(state, ctx.now)
  const next = step(s)
  if (lost.length && next.last) next.last = { ...next.last, expired: lost }
  return next
}

/* ── Teams 2v2 ───────────────────────────────────────────────────────── */

/**
 * Teams (room option "teams": "2v2", exactly 4 players): seats 0 + 2 (red +
 * yellow) against 1 + 3 (green + blue), so partners sit opposite and turns
 * alternate between the teams. Partners never cut each other, and rival
 * powers can't target a partner. A partner who gets all four home sits out
 * while the other plays on; the team wins once both have all four home.
 * A team that loses a player still racing (left, or out for missed turns)
 * forfeits; a partner who already finished may leave without harm.
 * Works together with Power Ludo.
 */
export const teamOf = (s: LudoState, uid: string): TeamIndex | undefined =>
  s.teams ? s.players[uid]?.team : undefined

/** Two different players on the same team. */
export const areTeammates = (s: LudoState, a: string, b: string) =>
  a !== b && !!s.teams && teamOf(s, a) !== undefined && teamOf(s, a) === teamOf(s, b)

/** Someone `uid` may cut or aim a rival power at: not themselves, not their partner. */
export const isRival = (s: LudoState, uid: string, other: string) =>
  other !== uid && !areTeammates(s, uid, other)

export const teamMembers = (s: LudoState, team: TeamIndex) =>
  s.order.filter((id) => s.players[id]?.team === team)

/** "Team A" / "Team B". */
export const teamName = (team: TeamIndex) => TEAM_NAMES[team]

/**
 * The team that won: both partners home, or the only team still complete
 * (the other lost a player). Null while it's open, or when nobody's left.
 */
export function winningTeam(s: LudoState, gone: string[] = []): TeamIndex | null {
  if (!s.teams) return null
  const teams: TeamIndex[] = [0, 1]
  const home = teams.find((t) => teamMembers(s, t).every((id) => s.players[id].place > 0))
  if (home !== undefined) return home
  // A partner who finished and then left still counts: their four are home
  const standing = teams.filter((t) =>
    teamMembers(s, t).every((id) => s.players[id].place > 0 || !isGone(s, id, gone))
  )
  return standing.length === 1 ? standing[0] : null
}

/* ── Setup ───────────────────────────────────────────────────────────── */

/** Colours by player count: two players sit in opposite corners. */
export function coloursFor(count: number): LudoColour[] {
  if (count === 5) return PENTA_COLOURS
  if (count <= 2) return ["red", "yellow"]
  if (count === 3) return ["red", "green", "yellow"]
  return ["red", "green", "yellow", "blue"]
}

export function initialLudoState(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): LudoState {
  const powers = options.mode === "powers"
  const order = players.slice(0, 5).map((p) => p.uid)
  const colours = coloursFor(order.length)
  const entries: Record<string, LudoPlayer> = {}
  order.forEach((uid, i) => {
    entries[uid] = {
      uid,
      colour: colours[i],
      tokens: [-1, -1, -1, -1],
      place: 0,
    }
    // Power Ludo: the equipped character's own power, once per game
    const kind = powers ? characterPower(players[i].avatar) : null
    if (kind) entries[uid].signature = { kind, used: false }
  })
  const state: LudoState = {
    phase: "roll",
    order,
    players: entries,
    turn: order[0],
    sixes: 0,
    turnAt: 0,
    seq: 0,
    turnNo: 0,
  }
  // Five players play on the 5-armed board
  if (order.length === 5) state.board = "penta"
  // Teams 2v2: seats 0 + 2 against 1 + 3, so partners' colours face each other across the board
  if (options.teams === "2v2" && order.length === 4) {
    state.teams = true
    order.forEach((uid, i) => (entries[uid].team = (i % 2) as TeamIndex))
  }
  if (!powers) return state
  // Power Ludo: two power-ups on the board from the start
  const rand = seededRandom(seed)
  let out: LudoState = { ...state, mode: "powers" }
  out = spawnPower(out, rand)
  out = spawnPower(out, rand)
  return out
}

/** A repeatable random sequence from a string (every device builds the same start). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length) % list.length]

/** A random power. */
export const randomPower = (rand: () => number): PowerKind => pick(POWER_KINDS, rand)

/**
 * Puts a power-up on a random free square of the track: not a safe square,
 * not under a piece, not where one already waits.
 */
export function spawnPower(state: LudoState, rand: () => number): LudoState {
  const spawns = state.spawns ?? []
  if (spawns.length >= MAX_SPAWNS) return state
  const taken = new Set(spawns.map((s) => s.sq))
  const g = geoOf(state)
  for (const id of state.order) {
    const p = state.players[id]
    if (!p) continue
    for (const pos of p.tokens) {
      const sq = trackIndex(p.colour, pos, g)
      if (sq >= 0) taken.add(sq)
    }
  }
  const free: number[] = []
  for (let sq = 0; sq < g.track; sq++) if (!g.safe.includes(sq) && !taken.has(sq)) free.push(sq)
  if (free.length === 0) return state
  return { ...state, spawns: [...spawns, { sq: pick(free, rand), kind: randomPower(rand) }] }
}

/* ── Rules ───────────────────────────────────────────────────────────── */

/** A 6 brings a token out; otherwise the token can't overshoot home. */
export function canMove(pos: number, dice: number, g: LudoGeo = SQUARE_GEO): boolean {
  const HOME = g.home
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
  // Power Ludo: frozen pieces sit still; a number-locked piece waits for its number
  return p.tokens.flatMap((pos, i) =>
    canMove(pos, dice, geoOf(state)) && !isFrozen(state, uid, i) && lockOf(state, uid, i) === 0 ? [i] : []
  )
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
export const trackIndex = (colour: LudoColour, pos: number, g: LudoGeo = SQUARE_GEO): number =>
  pos >= 0 && pos < g.colStart
    ? ((g.start[colour] ?? 0) + pos) % g.track
    : -1

export const isSafe = (track: number, g: LudoGeo = SQUARE_GEO) => g.safe.includes(track)

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

/**
 * The game ends when at most one contender is still racing (so a 2-player
 * game ends with the first finisher) — in teams, once a team has won.
 */
export const isOver = (state: LudoState, gone: string[] = []) =>
  state.teams
    ? winningTeam(state, gone) !== null || racing(state, gone).length === 0
    : racing(state, gone).length <= 1

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

/**
 * The end of `from`'s turn: their frozen / shielded counters tick down, the
 * turn count goes up, and in Power Ludo a new power-up may appear.
 */
function endTurn(state: LudoState, from: string, ctx: LudoContext): LudoState {
  const tick = (map: Record<string, number> | undefined) => {
    if (!map) return map
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(map)) {
      const left = k.startsWith(`${from}:`) ? v - 1 : v
      if (left > 0) out[k] = left
    }
    return Object.keys(out).length ? out : undefined
  }
  const next: LudoState = { ...state, turnNo: (state.turnNo ?? 0) + 1 }
  const frozen = tick(state.frozen)
  const shield = tick(state.shield)
  if (frozen) next.frozen = frozen
  else delete next.frozen
  if (shield) next.shield = shield
  else delete next.shield
  if (next.mode === "powers" && (next.turnNo ?? 0) % SPAWN_EVERY === 0)
    return spawnPower(next, ctx.rand ?? Math.random)
  return next
}

function pass(
  state: LudoState,
  from: string,
  last: LudoLast,
  ctx: LudoContext
): LudoState {
  const next: LudoState = {
    ...endTurn(state, from, ctx),
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
 * Power Ludo: a "double" power doubles it; rolling a piece's lock number unlocks it.
 */
export function applyRoll(
  state: LudoState,
  uid: string,
  value: number,
  ctx: LudoContext
): LudoState {
  return expiring(state, ctx, (s) => rollStep(s, uid, value, ctx))
}

function rollStep(
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
  const players = { ...playedNow(state, uid) }
  const me = { ...players[uid] }
  me.noSix = value === 6 ? 0 : (me.noSix ?? 0) + 1
  const x2 = !!me.double
  delete me.double
  players[uid] = me
  const played: LudoState = { ...state, players }
  // The number a locked piece was waiting for: it's free again
  if (state.locked) {
    const locked = { ...state.locked }
    for (const [k, need] of Object.entries(locked)) if (k.startsWith(`${uid}:`) && need === value) delete locked[k]
    if (Object.keys(locked).length) played.locked = locked
    else delete played.locked
  }
  const effective = x2 ? value * 2 : value
  const flag = x2 ? { x2: true as const } : {}
  if (sixes >= 3) return pass(played, uid, { type: "three_sixes", by: uid }, ctx)
  if (legalMoves(played, uid, effective).length === 0)
    return pass(played, uid, { type: "no_move", by: uid, value: effective, ...flag }, ctx)
  return {
    ...played,
    phase: "move",
    sixes,
    dice: { value: effective, by: uid, at: ctx.now, ...flag },
    turnAt: ctx.now,
    seq: state.seq + 1,
    last: { type: "roll", by: uid, value: effective, ...flag },
  }
}

/** Every player, with their own copy of tokens (to change safely). */
function copyPlayers(state: LudoState): Record<string, LudoPlayer> {
  const players: Record<string, LudoPlayer> = {}
  for (const id of state.order)
    players[id] = { ...state.players[id], tokens: [...state.players[id].tokens] }
  return players
}

/**
 * `uid`'s piece lands on `to`: cuts rival pieces on an unsafe shared square
 * (shielded ones survive) and counts the cuts. Mutates `players`.
 */
function landOn(
  state: LudoState,
  players: Record<string, LudoPlayer>,
  uid: string,
  to: number,
  ctx: LudoContext
): LudoCapture[] {
  const captured: LudoCapture[] = []
  const g = geoOf(state)
  const square = trackIndex(players[uid].colour, to, g)
  if (square < 0 || isSafe(square, g)) return captured
  for (const id of state.order) {
    // Tokens of players who left or are out are off the board; partners never cut each other
    if (!isRival(state, uid, id) || isGone(state, id, ctx.gone)) continue
    const rival = players[id]
    rival.tokens.forEach((pos, j) => {
      if (trackIndex(rival.colour, pos, g) === square && !isShielded(state, id, j)) {
        rival.tokens[j] = -1
        captured.push({ uid: id, token: j })
      }
    })
  }
  if (captured.length) {
    players[uid] = { ...players[uid], kills: (players[uid].kills ?? 0) + captured.length }
    for (const c of captured) players[c.uid] = { ...players[c.uid], deaths: (players[c.uid].deaths ?? 0) + 1 }
  }
  return captured
}

/** Drops the effect-map entries of pieces that were sent back to base. */
function clearEffects(state: LudoState, pieces: LudoCapture[]) {
  for (const map of ["frozen", "locked", "shield"] as const) {
    const m = state[map]
    if (!m) continue
    const copy = { ...m }
    for (const c of pieces) delete copy[pieceKey(c.uid, c.token)]
    if (Object.keys(copy).length) state[map] = copy
    else delete state[map]
  }
}

/** Power Ludo: picks up a power-up on `uid`'s landing square, if any (it fizzles out POWER_TTL_MS after `now`). */
function pickUp(
  state: LudoState,
  players: Record<string, LudoPlayer>,
  uid: string,
  to: number,
  now: number
): PowerKind | undefined {
  if (state.mode !== "powers" || !state.spawns?.length) return undefined
  const square = trackIndex(players[uid].colour, to, geoOf(state))
  const i = state.spawns.findIndex((s) => s.sq === square)
  if (i < 0) return undefined
  const kind = state.spawns[i].kind
  const spawns = state.spawns.filter((_, j) => j !== i)
  if (spawns.length) state.spawns = spawns
  else delete state.spawns
  give(players, uid, kind, now)
  return kind
}

/** Hands `uid` a power (unless their hands are full), ticking from `now`. Mutates `players`. */
function give(players: Record<string, LudoPlayer>, uid: string, kind: PowerKind, now: number) {
  const held = heldPowers(players[uid])
  if (held.length >= MAX_POWERS) return
  players[uid] = withHeld(players[uid], [...held, { kind, until: now + POWER_TTL_MS }])
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
  return expiring(state, ctx, (s) => moveStep(s, uid, token, value, ctx))
}

function moveStep(
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
  if (from === undefined || !legalMoves(state, uid, value).includes(token))
    throw new Error("That token can't move")
  const to = from < 0 ? 0 : from + value

  const players = copyPlayers(state)
  players[uid].tokens[token] = to
  delete players[uid].missed
  const work: LudoState = { ...state }
  const captured = landOn(state, players, uid, to, ctx)
  clearEffects(work, captured)
  const picked = pickUp(work, players, uid, to, ctx.now)

  // Power Ludo: the first piece out and the first piece home each earn a power
  let earned: PowerKind | undefined
  if (work.mode === "powers") {
    const rand = ctx.rand ?? Math.random
    if (from < 0 && !work.firstOut) {
      work.firstOut = uid
      earned = randomPower(rand)
      give(players, uid, earned, ctx.now)
    } else if (to === geoOf(state).home && !work.firstHome) {
      work.firstHome = uid
      earned = randomPower(rand)
      give(players, uid, earned, ctx.now)
    }
  }

  const home = to === geoOf(state).home
  const finished = home && players[uid].tokens.every((t) => t === geoOf(state).home)
  if (finished)
    players[uid].place =
      Math.max(0, ...state.order.map((id) => players[id].place)) + 1
  // A doubled roll's bonus counts on the dice actually thrown
  const thrown = state.dice?.x2 ? value / 2 : value
  const bonus = !finished && (thrown === 6 || captured.length > 0 || home)

  const last: LudoMove = { type: "move", by: uid, value, token, from, to }
  if (captured.length) last.captured = captured
  if (home) last.home = true
  if (finished) last.finished = true
  if (bonus) last.bonus = true
  if (picked) last.picked = picked
  if (earned) last.earned = earned

  let next: LudoState = {
    ...work,
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
  if (!bonus) {
    next = endTurn(next, uid, ctx)
    next.turn = nextTurn(next, uid, ctx.gone) ?? uid
  }
  return next
}

/**
 * Power Ludo: `uid` uses one of their powers, on their turn before rolling
 * (it doesn't use up the turn). `target` is the piece it's used on — a
 * rival's for freeze / lock / push, your own for jump / shield. Holding two
 * of a kind, the one closer to fizzling out goes first.
 */
export function applyPower(
  state: LudoState,
  uid: string,
  kind: PowerKind,
  target: LudoCapture | null,
  ctx: LudoContext
): LudoState {
  if (state.phase !== "roll" || state.turn !== uid) throw new Error("Use powers before you roll")
  const held = heldPowers(state.players[uid]).filter((h) => h.kind === kind)
  if (!held.length) throw new Error("You don't have that power")
  if (held.every((h) => isExpired(h, ctx.now))) throw new Error("That power fizzled out")
  return expiring(state, ctx, (s) => {
    const mine = heldPowers(s.players[uid])
    const deadline = (h: HeldPower) => (h.until > 0 ? h.until : Infinity)
    let at = -1
    mine.forEach((h, i) => {
      if (h.kind === kind && (at < 0 || deadline(h) < deadline(mine[at]))) at = i
    })
    const players = { ...s.players, [uid]: withHeld(s.players[uid], mine.filter((_, i) => i !== at)) }
    return powerEffect({ ...s, players }, uid, kind, target, ctx, false)
  })
}

/**
 * Power Ludo: `uid` uses their character's signature power — once per game,
 * when a held power could be used (their turn, before rolling); same targets
 * and effects as the power-up of that kind, and it never fizzles out.
 */
export function applySignature(
  state: LudoState,
  uid: string,
  target: LudoCapture | null,
  ctx: LudoContext
): LudoState {
  if (state.phase !== "roll" || state.turn !== uid) throw new Error("Use powers before you roll")
  const sig = state.players[uid]?.signature
  if (!sig || state.mode !== "powers") throw new Error("Your character has no power here")
  if (sig.used) throw new Error("Already used — it's once per game")
  return expiring(state, ctx, (s) => {
    const players = { ...s.players, [uid]: { ...s.players[uid], signature: { kind: sig.kind, used: true } } }
    return powerEffect({ ...s, players }, uid, sig.kind, target, ctx, true)
  })
}

/** What a power does (the power itself is already spent in `state`). */
function powerEffect(
  state: LudoState,
  uid: string,
  kind: PowerKind,
  target: LudoCapture | null,
  ctx: LudoContext,
  signature: boolean
): LudoState {
  const info = POWER_INFO[kind]
  const players = copyPlayers(state)
  const next: LudoState = { ...state, players, seq: state.seq + 1, turnAt: ctx.now }
  const last: LudoPowerUse = { type: "power", by: uid, kind }
  if (signature) last.signature = true

  if (info.target !== "none") {
    if (!target) throw new Error("Pick a piece")
    const owner = state.players[target.uid]
    const pos = owner?.tokens[target.token]
    if (pos === undefined) throw new Error("No such piece")
    if (info.target === "rival" && (!isRival(state, uid, target.uid) || isGone(state, target.uid, ctx.gone)))
      throw new Error("Pick a rival's piece")
    if (info.target === "own" && target.uid !== uid) throw new Error("Pick one of your pieces")
    // Only pieces out on the shared track (not in base, not in the home column)
    if (pos < 0 || pos >= geoOf(state).colStart) throw new Error("That piece is out of reach")
    if (info.target === "rival" && isShielded(state, target.uid, target.token))
      throw new Error("That piece is shielded")
    last.target = target
    const key = pieceKey(target.uid, target.token)
    if (kind === "freeze") next.frozen = { ...state.frozen, [key]: FREEZE_TURNS }
    else if (kind === "shield") next.shield = { ...state.shield, [key]: SHIELD_TURNS }
    else if (kind === "lock") {
      const need = 1 + Math.floor((ctx.rand ?? Math.random)() * 6)
      next.locked = { ...state.locked, [key]: need }
      last.value = need
    } else if (kind === "push") {
      const to = Math.max(0, pos - PUSH_BACK)
      players[target.uid].tokens[target.token] = to
      last.from = pos
      last.to = to
    } else if (kind === "jump") {
      const to = pos + JUMP_BY
      if (to >= geoOf(state).colStart) throw new Error("Too close to home to jump")
      players[uid].tokens[target.token] = to
      const captured = landOn(next, players, uid, to, ctx)
      clearEffects(next, captured)
      pickUp(next, players, uid, to, ctx.now)
      last.from = pos
      last.to = to
      if (captured.length) last.captured = captured
    }
  } else if (kind === "double") {
    players[uid] = { ...players[uid], double: true }
  }
  next.players = players
  next.last = last
  return next
}

/* ── Dice ─────────────────────────────────────────────────────────────── */

/**
 * The roll, weighted to keep games lively (Ludo King does much the same):
 * every face starts equal, then —
 *  - mercy six: stuck in base, each roll without a 6 makes a 6 likelier
 *    (up to about 1 in 3 after four misses) — and more so the further the
 *    others have got (still in base while they're nearly home: close to 1 in 2);
 *  - catch-up: the further behind the best rival still racing, the likelier
 *    the big numbers (6s most — and a 6 rolls again);
 *  - the hunt: a number that would land one of your pieces on a rival's
 *    (unsafe) square gets more likely — more so when you're behind;
 *  - far in front: 6s get a little rarer, so the leader can be caught;
 *  - no déjà vu: the face you just rolled is a little less likely.
 * Never certain, never impossible — every face keeps a real chance.
 * `rand` is a uniform [0, 1) source (the component passes the CSPRNG).
 */
export function rollFor(state: LudoState, uid: string, rand: () => number): number {
  const w = [0, 1, 1, 1, 1, 1, 1]
  const me = state.players[uid]
  const g = geoOf(state)
  if (me) {
    // How far behind (or ahead of) the best rival still in the race, 0..1
    const maxProgress = 4 * (g.home + 1)
    const rivals = state.order.filter(
      (id) => id !== uid && isRival(state, uid, id) && state.players[id] && !state.players[id].out && state.players[id].place === 0
    )
    const mine = progressOf(me)
    const best = rivals.length ? Math.max(...rivals.map((id) => progressOf(state.players[id]))) : mine
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
    const behind = rivals.length ? clamp01(((best - mine) / maxProgress - 0.08) / 0.35) : 0
    const ahead = rivals.length ? clamp01(((mine - best) / maxProgress - 0.1) / 0.3) : 0

    const onBoard = me.tokens.some((t) => t >= 0 && t < g.home)
    if (!onBoard) w[6] += Math.min(me.noSix ?? 0, 4) * 0.5 + behind * 0.8

    // Catch-up: big numbers for whoever is trailing
    w[6] += behind
    w[5] += behind * 0.5
    w[4] += behind * 0.25
    // Far in front: a few less 6s (never fewer than most faces)
    if (ahead > 0) {
      w[6] = Math.max(0.65, w[6] - ahead * 0.35)
      w[1] += ahead * 0.2
    }

    // Rival pieces 1–6 squares ahead of one of mine on an unsafe square
    const bumped = new Set<number>()
    for (const pos of me.tokens) {
      if (pos < 0 || pos >= g.colStart) continue
      for (let d = 1; d <= 6; d++) {
        const to = pos + d
        const sq = trackIndex(me.colour, to, g)
        if (sq < 0 || isSafe(sq, g) || bumped.has(d)) continue
        const prey = state.order.some(
          (id) =>
            isRival(state, uid, id) &&
            state.players[id] &&
            !state.players[id].out &&
            state.players[id].tokens.some((p, j) => trackIndex(state.players[id].colour, p, g) === sq && !isShielded(state, id, j))
        )
        if (prey) {
          w[d] += 0.5 + behind * 0.4
          bumped.add(d)
        }
      }
    }

    // Less of the same face twice in a row
    const last = state.last
    if (last && last.by === uid && (last.type === "roll" || last.type === "no_move") && !last.x2)
      w[last.value] = Math.max(0.6, w[last.value] - 0.3)
  }
  const total = w.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let face = 1; face <= 6; face++) {
    r -= w[face]
    if (r < 0) return face
  }
  return 6
}

/** The referee passes an idle / offline / departed player's turn (any pending roll is dropped). */
export function passTurn(
  state: LudoState,
  from: string,
  reason: LudoSkipReason,
  ctx: LudoContext
): LudoState {
  return expiring(state, ctx, (s) => passStep(s, from, reason, ctx))
}

function passStep(
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

/**
 * Power Ludo: the referee drops held powers that ran out of time, as soon as
 * they do, so everyone sees them go. The turn, its phase, the pending roll and
 * the turn clock (`turnAt`) stay as they are. Throws when nothing ran out.
 */
export function applyExpiry(state: LudoState, ctx: LudoContext): LudoState {
  if (state.phase === "over") throw new Error("Game over")
  const { state: next, lost } = dropExpired(state, ctx.now)
  if (!lost.length) throw new Error("Nothing ran out")
  return { ...next, seq: state.seq + 1, last: { type: "expired", by: lost[0].uid, expired: lost } }
}

/* ── Standings ───────────────────────────────────────────────────────── */

export const homeCount = (p: LudoPlayer, g: LudoGeo = SQUARE_GEO) =>
  p.tokens.filter((t) => t === g.home).length

/** Squares travelled by all four tokens (a token in base counts 0, on its start square 1…). */
export const progressOf = (p: LudoPlayer) =>
  p.tokens.reduce((sum, t) => sum + (t < 0 ? 0 : t + 1), 0)

/** Finished players first (in order), then the rest by tokens home, then distance travelled; players who left come last. */
export function rankingOf(state: LudoState, gone: string[] = []): string[] {
  const byRace = (a: string, b: string) => {
    const pa = state.players[a]
    const pb = state.players[b]
    return (
      homeCount(pb, geoOf(state)) - homeCount(pa, geoOf(state)) ||
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
  const all = [...finished, ...stillRacing, ...left]
  // Teams: the winning pair takes the top two places
  const won = winningTeam(state, gone)
  if (won === null) return all
  return [
    ...all.filter((id) => state.players[id].team === won),
    ...all.filter((id) => state.players[id].team !== won),
  ]
}

/** What to hand to endGame. Without a reason: "all_home" once anyone finished, else "abandoned". */
export function resultOf(
  state: LudoState,
  gone: string[] = [],
  reason?: string
): LiveResult {
  const ranking = rankingOf(state, gone)
  const anyFinished = state.order.some((id) => state.players[id].place > 0)
  // Cuts made / taken, for the result screen
  const stats: Record<string, Record<string, number>> = {}
  for (const id of state.order) {
    const p = state.players[id]
    stats[id] = { kills: p?.kills ?? 0, deaths: p?.deaths ?? 0 }
  }
  if (state.teams) {
    // Partners win together; nobody when no team is left standing
    const won = winningTeam(state, gone)
    const bothHome =
      won !== null && teamMembers(state, won).every((id) => state.players[id].place > 0)
    return {
      winnerIds: won === null ? [] : teamMembers(state, won),
      ranking,
      reason: reason ?? (bothHome ? "all_home" : "abandoned"),
      stats,
    }
  }
  return {
    winnerIds: ranking.slice(0, 1),
    ranking,
    reason: reason ?? (anyFinished ? "all_home" : "abandoned"),
    stats,
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
      if (last.finished && state.teams) {
        const team = teamOf(state, last.by)
        return state.phase === "over" && team !== undefined
          ? `${who} got all four home — ${teamName(team)} wins!`
          : `${who} got all four home — over to their partner`
      }
      if (last.finished)
        return `${who} got all four home — finished ${ordinal(state.players[last.by]?.place ?? 0)}!`
      if (last.captured?.length) {
        const victims = [
          ...new Set(last.captured.map((c) => nameOf(c.uid))),
        ].join(" & ")
        const n = last.captured.length
        return `${who} captured ${victims}'s ${n > 1 ? `${n} tokens` : "token"} — rolls again`
      }
      if (last.picked || last.earned)
        return `${who} got a power: ${POWER_INFO[(last.picked ?? last.earned)!].name}!`
      if (last.home) return `${who} got a token home — rolls again`
      if (last.from < 0)
        return `${who} brought a token out${last.bonus ? " — rolls again" : ""}`
      return `${who} moved ${last.value}${last.bonus ? " — rolls again" : ""}`
    }
    case "power": {
      const p = POWER_INFO[last.kind].name
      const whose = last.target ? `${nameOf(last.target.uid)}'s piece` : ""
      // A character's own power gets a star
      const star = last.signature ? "★ " : ""
      switch (last.kind) {
        case "freeze":
          return `${star}${who} froze ${whose} for ${FREEZE_TURNS} turns`
        case "lock":
          return `${star}${who} locked ${whose} — it needs a ${last.value} to move`
        case "push":
          return `${star}${who} pushed ${whose} back ${PUSH_BACK} squares`
        case "jump":
          return `${star}${who} jumped a piece ${JUMP_BY} squares${last.captured?.length ? " and cut a rival!" : ""}`
        case "shield":
          return `${star}${who} shielded a piece for ${SHIELD_TURNS} turns`
        default:
          return `${star}${who} used ${p} — next roll counts twice`
      }
    }
    case "expired":
      return describeExpired(last.expired ?? [], nameOf)
  }
}

/** "Asha's Freeze fizzled out" (several: "Asha's Freeze and Ravi's Jump fizzled out"). */
export function describeExpired(lost: LudoLost[], nameOf: (uid: string) => string): string {
  const parts = lost.map((l) => `${nameOf(l.uid)}'s ${POWER_INFO[l.kind].name}`)
  if (parts.length === 0) return "A power fizzled out"
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
  return `${list} fizzled out`
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
export const HOME_COLUMN: Record<SquareColour, Cell[]> = {
  red: [1, 2, 3, 4, 5].map((col) => ({ row: 7, col })),
  green: [1, 2, 3, 4, 5].map((row) => ({ row, col: 7 })),
  yellow: [13, 12, 11, 10, 9].map((col) => ({ row: 7, col })),
  blue: [13, 12, 11, 10, 9].map((row) => ({ row, col: 7 })),
}

/** Top-left corner of each colour's 6×6 base. */
export const BASE_ORIGIN: Record<SquareColour, Cell> = {
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
export const HOME_SPOT: Record<SquareColour, Cell> = {
  red: { row: 7, col: 6 },
  green: { row: 6, col: 7 },
  yellow: { row: 7, col: 8 },
  blue: { row: 8, col: 7 },
}

/** Board cell for a token of `colour` at `pos` (`token` picks the base slot). */
/** Board cell on the classic square board. */
export function cellOf(colour: SquareColour, pos: number, token = 0): Cell {
  if (pos < 0) {
    const o = BASE_ORIGIN[colour]
    const s = BASE_SLOTS[((token % 4) + 4) % 4]
    return { row: o.row + s.row, col: o.col + s.col }
  }
  if (pos < HOME_COLUMN_START) return trackToCell(START_INDEX[colour] + pos)
  if (pos < HOME) return HOME_COLUMN[colour][pos - HOME_COLUMN_START]
  return HOME_SPOT[colour]
}
