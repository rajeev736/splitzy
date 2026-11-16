/** npx tsx lib/live/__tests__/sudoku.test.ts */
import { allDone, blanksOf, conflicts, filledCount, initialSudokuState, isSolved, makePuzzle, PEERS, rankingOf, resultOf, type SudokuState } from "../sudoku"
import type { RoomPlayer } from "../types"

function assert(c: unknown, m: string) {
  if (!c) throw new Error(`Assertion failed: ${m}`)
}
const player = (uid: string, seat: number): RoomPlayer => ({ uid, name: uid, seat, joinedAt: 0, online: true, lastSeen: 0 })

console.log("Running Sudoku tests...\n")
assert(PEERS.every((p) => p.length === 20), "20 peers each")

for (const level of ["easy", "medium", "hard"] as const) {
  const t0 = Date.now()
  const { puzzle, solution } = makePuzzle("JOY7K9", level)
  const ms = Date.now() - t0
  assert(puzzle.length === 81 && solution.length === 81, "81 cells")
  assert(isSolved(solution, puzzle), `${level}: the solution solves it`)
  for (let i = 0; i < 81; i++) if (puzzle[i] !== ".") assert(puzzle[i] === solution[i], "givens match the solution")
  const again = makePuzzle("JOY7K9", level)
  assert(again.puzzle === puzzle, `${level}: same room, same puzzle`)
  assert(makePuzzle("OTHER1", level).puzzle !== puzzle, "another room, another puzzle")
  console.log(`  ${level}: ${81 - blanksOf(puzzle)} givens, built in ${ms}ms`)
  assert(ms < 3000, "fast enough to build on a phone")
}

const { puzzle, solution } = makePuzzle("ROOM42", "medium")
const wrong = solution.slice(0, 80) + (solution[80] === "1" ? "2" : "1")
assert(!isSolved(wrong, puzzle), "a clash isn't solved")
assert(conflicts(wrong).size > 0, "and the clash shows")
assert(!isSolved(puzzle, puzzle), "blanks aren't solved")
assert(filledCount(solution, puzzle) === blanksOf(puzzle), "progress counts blanks filled")

let s: SudokuState = initialSudokuState(["a", "b", "c"].map(player), { level: "easy", minutes: 10 }, "X1")
assert(s.level === "easy" && s.minutes === 10 && s.order.length === 3, "options")
s = { ...s, finished: { b: 200, a: 300 }, progress: { c: 10 } }
assert(rankingOf(s).join() === "b,a,c", "finish order, then progress")
assert(!allDone(s) && allDone(s, ["c"]), "done once everyone still here finished")
const r = resultOf(s, ["c"])
assert(r.winnerIds[0] === "b" && r.reason === "all_solved", "first finisher wins")
const none = resultOf({ ...s, finished: {} }, [], "time_up")
assert(none.winnerIds.length === 0 && none.reason === "time_up", "nobody finished: no winner")
console.log("\nAll Sudoku tests passed.")
