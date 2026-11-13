/** npx tsx lib/live/__tests__/tictactoe.test.ts */
import {
  applyMark,
  initialTicTacToeState,
  matchOver,
  matchResult,
  nextRound,
  winnerOf,
} from "../tictactoe"
import type { RoomPlayer } from "../types"

function assert(c: boolean, m: string) {
  if (!c) throw new Error(`Assertion failed: ${m}`)
}
const p = (uid: string, seat: number): RoomPlayer => ({
  uid,
  name: uid,
  seat,
  joinedAt: 0,
  online: true,
  lastSeen: 0,
})

let s = initialTicTacToeState([p("a", 0), p("b", 1)], { bestOf: 3 }, "ABCDEF")
const x = s.xPlayer
const o = x === "a" ? "b" : "a"
assert(applyMark(s, o, 0) === null, "O can't move first")
for (const [who, cell] of [
  [x, 0],
  [o, 3],
  [x, 1],
  [o, 4],
  [x, 2],
] as const)
  s = applyMark(s, who, cell)!
assert(
  s.roundOver === "x" && s.wins[x] === 1 && s.winLine?.join() === "0,1,2",
  "X wins the top row"
)
assert(applyMark(s, o, 5) === null, "no moves after the round ends")
assert(!matchOver(s), "best of 3 isn't over at 1-0")
s = nextRound(s)
assert(
  s.xPlayer === o && s.board === "........." && s.round === 2,
  "loser plays X next round"
)
assert(winnerOf("xoxxoooxo") === null, "a full board with no line is a draw")
s = { ...s, wins: { [x]: 2, [o]: 0 }, roundOver: "o" }
assert(
  matchOver(s) && matchResult(s).winnerIds.join() === x,
  "first to 2 wins the match"
)
console.log("🎉 ALL TIC TAC TOE TESTS PASSED!")
