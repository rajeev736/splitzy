import { ABANDON_MS } from "./room"
import { isPack, type ScribblePack } from "./scribble-words"
import type { LiveResult, RoomOptions, RoomPlayer } from "./types"

/**
 * Scribble: draw the secret word, everyone else guesses in the chat.
 *
 * Kept at rooms/{code}/state as three siblings, so the small turn record can
 * be watched without re-reading every stroke on each pen move:
 *
 *   game     the turn record below (ScribbleState)
 *   strokes  push()-ed drawing strokes, {u, c, w, p: [x,y,x,y,…], t?, g?} in 0..1000 canvas units
 *   correct  {uid: {at}} — who has guessed this turn's word (self-written, create-only; see rules)
 *
 * A turn goes choosing → drawing → turnEnd, then the next drawer. The drawer's
 * device picks the word (only a SHA-256 of it is public; the word itself sits
 * in secret/{drawer}), the referee device ends turns, moves to the next one
 * and declares the result. Points are a pure function of `correct[uid].at`.
 *
 * RTDB drops nulls and empty lists, so every optional field may be missing.
 */

export const CHOOSE_MS = 15_000
export const TURN_END_MS = 6_000
/** The referee skips an offline drawer this long after the choice deadline… */
export const CHOOSE_SKIP_OFFLINE_MS = 5_000
/** …and any drawer this long after it (their device should have auto-picked). */
export const CHOOSE_SKIP_ANY_MS = 12_000
/** Lets a guess sent in the last moment land before the referee ends the turn. */
export const DRAW_GRACE_MS = 1_000
export const CHOICES = 3
/** Fractions of the draw time at which a letter is revealed. */
export const HINT_REVEALS = [0.5, 0.75]
/** Points, a stroke this long is finished and a new one begins. */
export const MAX_STROKE_POINTS = 300
/** Pen-move batching while a stroke is in progress. */
export const STROKE_FLUSH_MS = 80

export type ScribblePhase = "choosing" | "drawing" | "turnEnd" | "over"
export type ScribbleEndReason = "rounds_over" | "abandoned"

/**
 * What a stroke draws (missing = a freehand pen / eraser line):
 * "f" a flood fill from p[0], p[1]; "l" a line, "r" a rectangle, "o" an
 * ellipse, each from corner (p[0], p[1]) to corner (p[2], p[3]). Shapes and
 * fills are written once, whole; only freehand strokes grow as you draw.
 * (A device on an older version draws a shape as a straight line and a fill
 * as nothing.)
 */
export type StrokeKind = "f" | "l" | "r" | "o"

export const isStrokeKind = (v: unknown): v is StrokeKind =>
  v === "f" || v === "l" || v === "r" || v === "o"

export interface ScribbleStroke {
  u: string
  /** "#rrggbb"; the eraser paints the background white. */
  c: string
  /** Width in canvas units (of 1000); 0 for a fill. */
  w: number
  /** x, y pairs, integers; x in 0..1000, y in 0..750. */
  p: number[]
  t?: StrokeKind
  /**
   * The rest of a long freehand line (split every MAX_STROKE_POINTS): the key
   * of its first piece, so undo takes the whole line back at once.
   */
  g?: string
}

export type CorrectMap = Record<string, { at: number }>

export interface ScribbleState {
  /** Everyone who started, in seat order; drawers rotate through it. */
  order: string[]
  rounds: number
  /** Seconds */
  drawTime: number
  pack: ScribblePack
  round: number
  turnIndex: number
  /** Running turn count, 1-based: keys per-turn work on every device. */
  turn: number
  drawer: string
  phase: ScribblePhase
  /** Server ms the current turn's choosing began; 0 = the game start (see meta.startedAt). */
  turnAt: number
  scores: Record<string, number>
  /** Words drawn so far, so they don't come up again. */
  used?: string[] | null
  // drawing
  wordHash?: string | null
  /** The word with letters masked as "_"; spaces and hyphens kept, letters revealed over time. */
  hint?: string | null
  wordLen?: number | null
  drawStartedAt?: number | null
  drawEndsAt?: number | null
  // turnEnd
  turnEndsAt?: number | null
  revealed?: string | null
  turnPoints?: Record<string, number> | null
  endReason?: ScribbleEndReason | null
}

export interface ScribbleRoot {
  game: ScribbleState
  strokes?: Record<string, ScribbleStroke> | null
  correct?: CorrectMap | null
}

export type RefereeAction = "turnEnd" | "advance" | "end"

/* ── Setup ───────────────────────────────────────────────────────────── */

function pickOption(v: unknown, allowed: number[], fallback: number) {
  return typeof v === "number" && allowed.includes(v) ? v : fallback
}

export function initialScribbleState(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): ScribbleRoot {
  void seed
  const order = players.filter((p) => !p.left).map((p) => p.uid)
  const scores: Record<string, number> = {}
  for (const uid of order) scores[uid] = 0
  return {
    game: {
      order,
      rounds: pickOption(options.rounds, [2, 3, 4, 5], 3),
      drawTime: pickOption(options.drawTime, [50, 80, 110], 80),
      pack: isPack(options.pack) ? options.pack : "mix",
      round: 1,
      turnIndex: 0,
      turn: 1,
      drawer: order[0],
      phase: "choosing",
      turnAt: 0,
      scores,
    },
  }
}

/** When the drawer must have picked a word. `startedAt` stands in for the first turn. */
export const chooseEndsAt = (s: ScribbleState, startedAt: number) =>
  (s.turnAt || startedAt) + CHOOSE_MS

/* ── Words & hints ───────────────────────────────────────────────────── */

/** Guesses and words compare after this: case, accents, punctuation and extra spaces don't matter. */
export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const isLetter = (ch: string) => ch !== " " && ch !== "-"

/** "pani puri" → "____ ____" */
export const maskWord = (word: string) =>
  Array.from(word, (ch) => (isLetter(ch) ? "_" : ch)).join("")

export const revealedCount = (hint: string) =>
  Array.from(hint).filter((ch) => isLetter(ch) && ch !== "_").length

export function unrevealedIndexes(hint: string, word: string): number[] {
  const out: number[] = []
  for (let i = 0; i < word.length; i++)
    if (hint[i] === "_" && isLetter(word[i])) out.push(i)
  return out
}

/** The hint with letter `i` of the word shown. */
export function revealAt(hint: string, word: string, i: number): string {
  if (i < 0 || i >= word.length || hint[i] !== "_") return hint
  return hint.slice(0, i) + word[i] + hint.slice(i + 1)
}

/** Never give the whole word away: at least one letter stays hidden. */
export const canReveal = (hint: string, word: string) =>
  unrevealedIndexes(hint, word).length > 1

/** How many letters should be showing by `now`. */
export function revealsDue(
  drawStartedAt: number,
  drawEndsAt: number,
  now: number
): number {
  const span = drawEndsAt - drawStartedAt
  if (span <= 0) return 0
  return HINT_REVEALS.filter((f) => now >= drawStartedAt + f * span).length
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = cur
  }
  return prev[b.length]
}

/** One letter off, or the first 60%+ of the word: worth a "close!" nudge. Never true for the word itself. */
export function isClose(guess: string, word: string): boolean {
  const g = normalize(guess)
  const w = normalize(word)
  if (!g || !w || g === w) return false
  if (levenshtein(g, w) === 1) return true
  return g.length >= Math.ceil(w.length * 0.6) && w.startsWith(g)
}

/* ── Scoring ─────────────────────────────────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n))

/** 500 for an instant guess down to 100 at the buzzer. */
export function guesserPoints(
  at: number,
  drawStartedAt: number,
  drawEndsAt: number
): number {
  const span = drawEndsAt - drawStartedAt
  if (span <= 0) return 100
  return clamp(100 + Math.round((400 * (drawEndsAt - at)) / span), 100, 500)
}

/** Up to 300 when everyone gets it; nothing when nobody does. */
export function drawerPoints(
  correctCount: number,
  activeGuessers: number
): number {
  if (correctCount <= 0 || activeGuessers <= 0) return 0
  return Math.round(
    (300 * Math.min(correctCount, activeGuessers)) / activeGuessers
  )
}

/** Players still to be guessed by this turn: in the game, not the drawer, not gone. */
export const activeGuessers = (s: ScribbleState, gone: readonly string[]) =>
  s.order.filter((u) => u !== s.drawer && !gone.includes(u))

/** Who earns what this turn, from when each guess landed. */
export function turnPoints(
  s: ScribbleState,
  correct: CorrectMap | null | undefined,
  gone: readonly string[]
) {
  const points: Record<string, number> = {}
  const start = s.drawStartedAt ?? 0
  const end = s.drawEndsAt ?? 0
  let count = 0
  for (const [uid, c] of Object.entries(correct ?? {})) {
    if (uid === s.drawer || !s.order.includes(uid) || typeof c?.at !== "number")
      continue
    points[uid] = guesserPoints(c.at, start, end)
    count++
  }
  // A guesser who dropped after getting it still counts: never more than 300 for the drawer
  const guessers = Math.max(activeGuessers(s, gone).length, count)
  const forDrawer = drawerPoints(count, guessers)
  if (forDrawer > 0) points[s.drawer] = forDrawer
  return points
}

export const everyoneGuessed = (
  s: ScribbleState,
  correct: CorrectMap | null | undefined,
  gone: readonly string[]
) => activeGuessers(s, gone).every((u) => !!correct?.[u])

/* ── Turn flow ───────────────────────────────────────────────────────── */

/** The drawer picked: the word's hash and mask go public, the clock starts. */
export function beginDrawing(
  s: ScribbleState,
  wordHash: string,
  word: string,
  now: number
): ScribbleState {
  return {
    ...s,
    phase: "drawing",
    wordHash,
    hint: maskWord(word),
    wordLen: word.length,
    drawStartedAt: now,
    drawEndsAt: now + s.drawTime * 1000,
    turnEndsAt: null,
    revealed: null,
    turnPoints: null,
  }
}

/** Drawing is over: points are banked. Null if the turn isn't in the drawing phase (already applied). */
export function applyTurnEnd(
  s: ScribbleState,
  correct: CorrectMap | null | undefined,
  gone: readonly string[],
  now: number
): ScribbleState | null {
  if (s.phase !== "drawing") return null
  const points = turnPoints(s, correct, gone)
  const scores = { ...s.scores }
  for (const [uid, p] of Object.entries(points))
    scores[uid] = (scores[uid] ?? 0) + p
  return {
    ...s,
    phase: "turnEnd",
    scores,
    turnPoints: Object.keys(points).length ? points : null,
    turnEndsAt: now + TURN_END_MS,
  }
}

/** The next seat after `from` that's still playing; `wrapped` when the round came back around. */
export function nextDrawer(
  order: readonly string[],
  from: number,
  gone: readonly string[]
) {
  for (let step = 1; step <= order.length; step++) {
    const index = (from + step) % order.length
    if (!gone.includes(order[index])) return { index, wrapped: index <= from }
  }
  return null
}

/** Everyone still in it. */
export const remaining = (s: ScribbleState, gone: readonly string[]) =>
  s.order.filter((u) => !gone.includes(u))

function clearTurn(s: ScribbleState): ScribbleState {
  return {
    ...s,
    wordHash: null,
    hint: null,
    wordLen: null,
    drawStartedAt: null,
    drawEndsAt: null,
    turnEndsAt: null,
    revealed: null,
    turnPoints: null,
  }
}

/**
 * On to the next drawer (skipping anyone gone), the next round when the
 * order wraps, or the end: after the last round, or when fewer than two
 * players are left.
 */
export function advanceTurn(
  s: ScribbleState,
  gone: readonly string[],
  now: number
): ScribbleState {
  const base = clearTurn(s)
  if (remaining(s, gone).length < 2)
    return { ...base, phase: "over", endReason: "abandoned" }
  const next = nextDrawer(s.order, s.turnIndex, gone)
  if (!next) return { ...base, phase: "over", endReason: "rounds_over" }
  let round = s.round
  if (next.wrapped) {
    round++
    if (round > s.rounds)
      return { ...base, phase: "over", endReason: "rounds_over" }
  }
  return {
    ...base,
    phase: "choosing",
    round,
    turnIndex: next.index,
    drawer: s.order[next.index],
    turn: s.turn + 1,
    turnAt: now,
  }
}

/* ── Results ─────────────────────────────────────────────────────────── */

/** Best first; equal scores keep seat order. */
export function rankingOf(s: ScribbleState): string[] {
  const score = (u: string) => s.scores?.[u] ?? 0
  return s.order
    .map((u, i) => ({ u, i }))
    .sort((a, b) => score(b.u) - score(a.u) || a.i - b.i)
    .map((x) => x.u)
}

export function resultOf(
  s: ScribbleState,
  gone: readonly string[]
): LiveResult {
  const reason: ScribbleEndReason = s.endReason ?? "rounds_over"
  const scores: Record<string, number> = {}
  for (const u of s.order) scores[u] = s.scores?.[u] ?? 0
  let ranking = rankingOf(s)
  let winnerIds: string[]
  if (reason === "abandoned") {
    // Whoever stayed wins, however the points stand
    const present = remaining(s, gone)
    winnerIds = present
    ranking = [
      ...ranking.filter((u) => present.includes(u)),
      ...ranking.filter((u) => !present.includes(u)),
    ]
  } else {
    const top = scores[ranking[0]] ?? 0
    winnerIds = ranking.filter((u) => scores[u] === top)
  }
  return { winnerIds, ranking, scores, reason }
}

/* ── The referee ─────────────────────────────────────────────────────── */

type Presence = Pick<RoomPlayer, "uid" | "left" | "online" | "lastSeen">

/** Players the game no longer waits for: left, or offline for a minute. */
export const goneUids = (players: readonly Presence[], now: number) =>
  players
    .filter(
      (p) => p.left || (!p.online && now - (p.lastSeen || 0) >= ABANDON_MS)
    )
    .map((p) => p.uid)

/**
 * What the referee device should do right now, if anything. Pure, so every
 * device agrees; the write itself is a transaction that re-checks the phase.
 */
export function refereeAction(
  s: ScribbleState,
  players: readonly Presence[],
  correct: CorrectMap | null | undefined,
  now: number,
  startedAt: number
): RefereeAction | null {
  if (s.phase === "over") return "end"
  const gone = goneUids(players, now)
  if (remaining(s, gone).length < 2) return "advance"
  const drawer = players.find((p) => p.uid === s.drawer)
  const drawerGone = !drawer || gone.includes(s.drawer)
  switch (s.phase) {
    case "choosing": {
      if (drawerGone) return "advance"
      const deadline = chooseEndsAt(s, startedAt)
      if (!drawer.online && now >= deadline + CHOOSE_SKIP_OFFLINE_MS)
        return "advance"
      return now >= deadline + CHOOSE_SKIP_ANY_MS ? "advance" : null
    }
    case "drawing": {
      if (drawerGone || everyoneGuessed(s, correct, gone)) return "turnEnd"
      return s.drawEndsAt != null && now >= s.drawEndsAt + DRAW_GRACE_MS
        ? "turnEnd"
        : null
    }
    case "turnEnd":
      return s.turnEndsAt == null || now >= s.turnEndsAt ? "advance" : null
  }
}
