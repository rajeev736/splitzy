/** npx tsx lib/games/__tests__/games.test.ts */
import type { Challenge } from "../../types"
import { activeDiscountPaise, DISCOUNT_WINDOW_MS, gameStats, scoreLuckyNumber, scoreRps } from "../index"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

console.log("Running game logic tests...\n")

// Stone Paper Scissors, best of 3
let s = scoreRps(["rock", "rock", "rock"], ["paper", "scissors", "rock"])
assert(s.playerWins === 1 && s.hostWins === 1 && !s.playerWon, "1–1 with a draw is not a win")
s = scoreRps(["rock", "paper", "scissors"], ["paper", "scissors", "scissors"])
assert(s.playerWins === 2 && s.playerWon, "2 round wins beat the host")
s = scoreRps(["paper", "paper", "paper"], ["rock", "rock", "scissors"])
assert(s.hostWins === 2 && s.playerWins === 1 && !s.playerWon, "host wins 2–1")
console.log("✓ Stone Paper Scissors scoring")

// Lucky number: closest wins, ties share
let l = scoreLuckyNumber(40, { a: 30, b: 45, c: 90 })
assert(l.winners.join() === "b" && l.winningDistance === 5, "closest guess wins")
l = scoreLuckyNumber(50, { a: 45, b: 55, c: 10 })
assert(l.winners.sort().join() === "a,b", "equally close guesses both win")
console.log("✓ Lucky Number scoring")

// Discount only for winners, only inside the window
const resolvedAt = new Date("2026-10-23T10:00:00Z")
const game: Challenge = {
  id: "c1", kind: "friend", game: "rps", hostId: "h", hostName: "Host", players: ["p"], playerNames: { p: "P" },
  participants: ["h", "p"], discountPercent: 25, bases: { p: 40000 }, status: "DONE", moves: {},
  result: { winners: ["p"] }, resolvedAt: resolvedAt.toISOString(), createdAt: resolvedAt.toISOString(),
}
assert(activeDiscountPaise(game, "p", resolvedAt.getTime() + 60_000) === 10000, "25% of ₹400 = ₹100 right after")
assert(activeDiscountPaise(game, "p", resolvedAt.getTime() + DISCOUNT_WINDOW_MS) === 0, "gone once the window ends")
assert(activeDiscountPaise(game, "h", resolvedAt.getTime()) === 0, "host gets nothing")
assert(activeDiscountPaise({ ...game, result: { winners: [] } }, "p", resolvedAt.getTime()) === 0, "losers get nothing")
assert(activeDiscountPaise({ ...game, redeemed: { p: 10000 } }, "p", resolvedAt.getTime()) === 0, "a used discount is gone")
console.log("✓ Discount window")

// Savings stats
const games: Challenge[] = [
  { ...game, id: "w1", moves: { p: ["paper", "paper", "paper"] }, redeemed: { p: 10000 } },
  { ...game, id: "w2", moves: { p: ["rock", "rock", "rock"] } }, // won but never paid with it
  { ...game, id: "l1", moves: { p: ["rock", "rock", "rock"] }, result: { winners: [] } },
  { ...game, id: "h1", hostId: "p", players: ["x"], moves: { x: ["rock", "rock", "rock"] }, result: { winners: ["x"] }, redeemed: { x: 5000 } },
]
const st = gameStats(games, "p")
assert(st.savedPaise === 10000, "only discounts actually used count as saved")
assert(st.played === 3 && st.won === 2 && st.winRate === 67, "win rate 2 of 3")
assert(st.hosted === 1 && st.givenPaise === 5000, "discounts given as host")
console.log("✓ Game savings stats")

console.log("\n🎉 ALL GAME TESTS PASSED!")
