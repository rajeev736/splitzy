import type { LiveResult, RoomOptions, RoomPlayer } from "./types"

/**
 * Sudoku race: everyone gets the same puzzle (made from the room code, so
 * every device builds it identically, with exactly one solution) and solves
 * it on their own board. First to finish is 1st, then 2nd… When the clock
 * runs out, the rest are ranked by how much of their grid they filled.
 *
 * The state holds only the puzzle and who finished when (plus each player's
 * progress) — never the solution; a finished grid is checked by the rules of
 * Sudoku itself.
 */

export type SudokuLevel = "easy" | "medium" | "hard"

export interface SudokuState {
  /** 81 characters, "1"–"9" for a given, "." for a blank. */
  puzzle: string
  level: SudokuLevel
  order: string[]
  /** Server ms the race started; it ends at `startedAt + minutes`. */
  startedAt: number
  minutes: number
  /** uid → server ms when they finished. */
  finished?: Record<string, number>
  /** uid → blanks filled so far (for the others to see). */
  progress?: Record<string, number>
}

/** Givens left in the puzzle, by level. */
const CLUES: Record<SudokuLevel, number> = { easy: 40, medium: 32, hard: 27 }

/* ── Random, repeatable ───────────────────────────────────────────────── */

function seeded(seed: string): () => number {
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

function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── Grid rules ───────────────────────────────────────────────────────── */

const ROW = (i: number) => Math.floor(i / 9)
const COL = (i: number) => i % 9
const BOX = (i: number) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3)

/** The 20 cells sharing a row, column or box with each cell. */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = []
  for (let j = 0; j < 81; j++)
    if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) out.push(j)
  return out
})

/** Digits (1–9) that may go in cell `i` of `g` (0 = blank). */
function candidates(g: number[], i: number): number[] {
  const used = new Set(PEERS[i].map((j) => g[j]))
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d)
  return out
}

/** Counts solutions up to `limit` (fewest-candidates-first backtracking). */
function countSolutions(g: number[], limit: number): number {
  let best = -1
  let bestC: number[] = []
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue
    const c = candidates(g, i)
    if (c.length === 0) return 0
    if (best < 0 || c.length < bestC.length) {
      best = i
      bestC = c
      if (c.length === 1) break
    }
  }
  if (best < 0) return 1
  let n = 0
  for (const d of bestC) {
    g[best] = d
    n += countSolutions(g, limit - n)
    g[best] = 0
    if (n >= limit) break
  }
  return n
}

function fill(g: number[], rand: () => number): boolean {
  const i = g.indexOf(0)
  if (i < 0) return true
  for (const d of shuffle(candidates(g, i), rand)) {
    g[i] = d
    if (fill(g, rand)) return true
  }
  g[i] = 0
  return false
}

/**
 * A puzzle with exactly one solution: fill a random full grid, then blank
 * cells in a random order, keeping each blank only while the answer stays unique.
 */
export function makePuzzle(seed: string, level: SudokuLevel): { puzzle: string; solution: string } {
  const rand = seeded(`${seed}:${level}`)
  const solved = new Array<number>(81).fill(0)
  fill(solved, rand)
  const g = solved.slice()
  let clues = 81
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rand)) {
    if (clues <= CLUES[level]) break
    const keep = g[i]
    g[i] = 0
    if (countSolutions(g.slice(), 2) !== 1) g[i] = keep
    else clues--
  }
  return { puzzle: g.map((d) => (d ? String(d) : ".")).join(""), solution: solved.join("") }
}

/** Cells of a grid (81 chars, "." blank) that clash with a peer holding the same digit. */
export function conflicts(grid: string): Set<number> {
  const bad = new Set<number>()
  for (let i = 0; i < 81; i++) {
    const d = grid[i]
    if (d === ".") continue
    for (const j of PEERS[i]) if (grid[j] === d) bad.add(i)
  }
  return bad
}

/** Done: every cell filled, the givens untouched, no clashes. */
export function isSolved(grid: string, puzzle: string): boolean {
  if (grid.length !== 81 || grid.includes(".")) return false
  for (let i = 0; i < 81; i++) if (puzzle[i] !== "." && grid[i] !== puzzle[i]) return false
  return conflicts(grid).size === 0
}

/** Blanks of the puzzle filled in `grid`. */
export const filledCount = (grid: string, puzzle: string) => {
  let n = 0
  for (let i = 0; i < 81; i++) if (puzzle[i] === "." && grid[i] !== ".") n++
  return n
}

export const blanksOf = (puzzle: string) => puzzle.split("").filter((c) => c === ".").length

/**
 * A finished grid in a few characters, for the move log (entries are at most
 * 40 characters): the digits in the puzzle's blanks, read as one base-9
 * number (first blank lowest), written in base 36 — 34 characters at most
 * (54 blanks). Only the blanks: the givens are the puzzle's.
 */
export function packAnswer(grid: string, puzzle: string): string {
  const nine = BigInt(9)
  let n = BigInt(0)
  for (let i = 80; i >= 0; i--) {
    if (puzzle[i] !== ".") continue
    const d = Number(grid[i])
    n = n * nine + BigInt(d >= 1 && d <= 9 ? d - 1 : 0)
  }
  return n.toString(36)
}

/** The grid a packAnswer stands for on `puzzle` — or null when it isn't one. */
export function unpackAnswer(packed: string, puzzle: string): string | null {
  if (!/^[0-9a-z]{1,40}$/.test(packed) || puzzle.length !== 81) return null
  const nine = BigInt(9)
  const base = BigInt(36)
  let n = BigInt(0)
  for (const ch of packed) n = n * base + BigInt(parseInt(ch, 36))
  const out = puzzle.split("")
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] !== ".") continue
    out[i] = String(Number(n % nine) + 1)
    n = n / nine
  }
  return n === BigInt(0) ? out.join("") : null
}

/* ── The race ─────────────────────────────────────────────────────────── */

export function initialSudokuState(players: RoomPlayer[], options: RoomOptions, seed: string): SudokuState {
  const level: SudokuLevel = options.level === "easy" || options.level === "hard" ? options.level : "medium"
  const minutes = typeof options.minutes === "number" ? options.minutes : 20
  return {
    puzzle: makePuzzle(seed, level).puzzle,
    level,
    order: players.slice(0, 5).map((p) => p.uid),
    startedAt: 0,
    minutes,
  }
}

/** Finish order: by time; then everyone else by progress. */
export function rankingOf(s: SudokuState, gone: string[] = []): string[] {
  const fin = s.finished ?? {}
  const done = s.order.filter((u) => fin[u] !== undefined).sort((a, b) => fin[a] - fin[b])
  const rest = s.order
    .filter((u) => fin[u] === undefined)
    .sort((a, b) => Number(gone.includes(a)) - Number(gone.includes(b)) || (s.progress?.[b] ?? 0) - (s.progress?.[a] ?? 0))
  return [...done, ...rest]
}

/** Over: everyone still here has finished. */
export const allDone = (s: SudokuState, gone: string[] = []) =>
  s.order.filter((u) => !gone.includes(u)).every((u) => s.finished?.[u] !== undefined)

export function resultOf(s: SudokuState, gone: string[] = [], reason?: string): LiveResult {
  const ranking = rankingOf(s, gone)
  const fin = s.finished ?? {}
  const scores: Record<string, number> = {}
  for (const u of s.order) scores[u] = fin[u] !== undefined ? 100 : Math.round(((s.progress?.[u] ?? 0) / blanksOf(s.puzzle)) * 100)
  return {
    winnerIds: ranking.length && fin[ranking[0]] !== undefined ? ranking.slice(0, 1) : [],
    ranking,
    scores,
    reason: reason ?? (allDone(s, gone) ? "all_solved" : "time_up"),
  }
}
