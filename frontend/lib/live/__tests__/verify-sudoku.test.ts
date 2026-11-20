/** npx tsx lib/live/__tests__/verify-sudoku.test.ts — checking finished Sudoku races from their move log. */
import { ABANDONED_GAME_MS, EVERYONE_LEFT_REASON } from "../liveness"
import { withLog, type LogEntry } from "../log"
import { initialStateFor } from "../start"
import { blanksOf, isSolved, makePuzzle, packAnswer, resultOf, unpackAnswer, type SudokuLevel, type SudokuState } from "../sudoku"
import type { LiveResult, RoomMeta, RoomOptions, RoomPlayer } from "../types"
import { SUDOKU_MIN_MS_PER_BLANK, verifySudoku } from "../verify/sudoku"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const CODE = "SDK234"
const T0 = 1_700_000_000_000
type Logged = SudokuState & { log?: LogEntry[] }

const player = (uid: string, seat: number): RoomPlayer => ({
  uid,
  name: uid,
  seat,
  joinedAt: T0 - 60_000 + seat,
  online: true,
  lastSeen: T0 - 30_000,
})
const seats = (n: number) => Array.from({ length: n }, (_, i) => player(`p${i}`, i))

console.log("Running Sudoku race checks...\n")

// The packed answer: short enough for a log entry, and back again
for (const level of ["easy", "medium", "hard"] as SudokuLevel[]) {
  const { puzzle, solution } = makePuzzle(CODE, level)
  const packed = packAnswer(solution, puzzle)
  assert(`f:${packed}`.length <= 40, `${level}: the entry fits the rules (${packed.length + 2} chars, ${blanksOf(puzzle)} blanks)`)
  assert(unpackAnswer(packed, puzzle) === solution, `${level}: unpacks to the same grid`)
}
assert(unpackAnswer("zz!", makePuzzle(CODE, "easy").puzzle) === null, "junk doesn't unpack")
console.log("  ✓ answers pack into a log entry and back")

const options: RoomOptions = { level: "medium", minutes: 10 }
const { puzzle, solution } = makePuzzle(CODE, "medium")

/** sudoku-game.tsx: the finish written in one go — the time, the progress, the log entry. */
function finish(cur: Logged, uid: string, grid: string, t: number): Logged {
  const done: Logged = {
    ...cur,
    progress: { ...cur.progress, [uid]: blanksOf(cur.puzzle) },
    finished: { ...cur.finished, [uid]: t },
  }
  return withLog(done, cur, uid, `f:${packAnswer(grid, cur.puzzle)}`, t)
}

function race(n: number, finishes: [string, number][], grid = solution): Logged {
  let s = initialStateFor("sudoku", seats(n), options, CODE) as Logged
  s = { ...s, progress: Object.fromEntries(seats(n).map((p) => [p.uid, 10])) }
  for (const [uid, at] of finishes) s = finish(s, uid, grid, T0 + at)
  return s
}

function metaFor(result: LiveResult, extra: Partial<RoomMeta> = {}): RoomMeta {
  return {
    code: CODE,
    game: "sudoku",
    hostId: "p0",
    hostName: "p0",
    createdAt: T0 - 120_000,
    minPlayers: 1,
    maxPlayers: 5,
    status: "ended",
    options,
    startedAt: T0,
    endedAt: T0 + 10 * 60_000 + 2000,
    result,
    ...extra,
  }
}

const check = (state: unknown, meta: RoomMeta, players: RoomPlayer[]) =>
  verifySudoku({ code: CODE, meta, players, state: JSON.parse(JSON.stringify(state)) })

function accepted(state: Logged, meta: RoomMeta, players: RoomPlayer[], what: string) {
  const r = check(state, meta, players)
  assert(r.ok, `${what}: accepted (${r.ok ? "" : r.reason})`)
  if (r.ok) assert(r.winners.join() === (meta.result?.winnerIds ?? []).join(), `${what}: the same winners`)
  console.log(`  ✓ ${what}`)
}
function rejected(state: unknown, meta: RoomMeta, players: RoomPlayer[], what: string) {
  const r = check(state, meta, players)
  assert(!r.ok, `${what}: rejected`)
  console.log(`  ✓ ${what} — rejected (${r.ok ? "" : r.reason})`)
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const resultFor = (s: SudokuState, reason?: string) => resultOf(s, [], reason)

/* ── Honest races ─────────────────────────────────────────────────────── */

{
  const s = race(2, [["p1", 300_000], ["p0", 420_000]])
  accepted(s, metaFor(resultFor(s, "all_solved"), { endedAt: T0 + 421_500 }), seats(2), "2 players, both solved (p1 first)")
}
{
  const s = race(4, [["p2", 250_000], ["p0", 260_000]])
  accepted(s, metaFor(resultFor(s, "time_up")), seats(4), "4 players, two solved before time ran out")
}
{
  const s = race(3, [])
  accepted(s, metaFor(resultFor(s, "time_up")), seats(3), "nobody solved it: no winner")
}
{
  const s = race(1, [["p0", 200_000]])
  accepted(s, metaFor(resultFor(s, "all_solved")), seats(1), "solo")
}
{
  // The winner solved it, then left; the others carried on
  const players = seats(3)
  players[0].left = true
  const s = race(3, [["p0", 200_000], ["p2", 400_000]])
  accepted(s, metaFor(resultOf(s, ["p0"], "all_solved")), players, "the winner left after solving it")
}
{
  const s = race(2, [["p1", 100_000]])
  accepted(s, metaFor({ winnerIds: [], reason: EVERYONE_LEFT_REASON }, { endedAt: T0 + 100_000 + ABANDONED_GAME_MS + 1000 }), seats(2), "closed as abandoned long after the last finish")
  rejected(s, metaFor({ winnerIds: [], reason: EVERYONE_LEFT_REASON }, { endedAt: T0 + 120_000 }), seats(2), "closed as abandoned right after a finish")
}

/* ── Tampering ────────────────────────────────────────────────────────── */

{
  const s = race(2, [["p1", 300_000], ["p0", 420_000]])
  const meta = metaFor(resultFor(s, "all_solved"))

  rejected(s, metaFor({ winnerIds: ["p0"] }), seats(2), "a forged winner")
  rejected(s, metaFor({ winnerIds: [] }), seats(2), "no winner though someone solved it")

  // A grid with two digits swapped: not a solution
  const i = puzzle.indexOf(".")
  let j = puzzle.indexOf(".", i + 1)
  while (solution[i] === solution[j]) j = puzzle.indexOf(".", j + 1)
  const wrongGrid = solution.split("")
  ;[wrongGrid[i], wrongGrid[j]] = [wrongGrid[j], wrongGrid[i]]
  assert(!isSolved(wrongGrid.join(""), puzzle), "test setup: a wrong grid")
  const wrong = race(2, [["p1", 300_000]], wrongGrid.join(""))
  rejected(wrong, metaFor(resultFor(wrong)), seats(2), "a wrong grid")

  // Finished claimed on the board without a log entry (or at another time)
  const noEntry = clone(s)
  noEntry.finished = { ...noEntry.finished, p0: T0 + 100_000 }
  rejected(noEntry, metaFor({ winnerIds: ["p0"] }), seats(2), "a finish time edited on the board")
  const unlogged = race(2, [["p1", 300_000]])
  unlogged.finished = { ...unlogged.finished, p0: T0 + 200_000 }
  rejected(unlogged, metaFor({ winnerIds: ["p0"] }), seats(2), "a finish with no log entry")

  // The rival's finish removed from the log
  const removed = clone(s) as unknown as { log: Record<string, LogEntry>; finished: Record<string, number> }
  removed.log = { "1": s.log![1] }
  delete removed.finished.p1
  rejected(removed, metaFor({ winnerIds: ["p0"] }), seats(2), "a rival's finish removed")

  const fast = race(2, [["p0", blanksOf(puzzle) * SUDOKU_MIN_MS_PER_BLANK - 1000]])
  rejected(fast, metaFor(resultFor(fast)), seats(2), "solved faster than it can be typed")

  const late = race(2, [["p0", 10 * 60_000 + 60_000]])
  rejected(late, metaFor(resultFor(late)), seats(2), "solved after time was up")

  const other = clone(s)
  other.puzzle = makePuzzle("OTHER2", "medium").puzzle
  rejected(other, meta, seats(2), "another room's puzzle")

  const stranger = clone(s)
  stranger.log!.push({ b: "zz", a: `f:${packAnswer(solution, puzzle)}`, t: T0 + 500_000 })
  rejected(stranger, meta, seats(2), "a finish by someone not in the race")

  rejected(s, meta, [...seats(2), player("p9", 2)], "a seated player left out of the race")
}

console.log("\nAll Sudoku race checks passed.")
