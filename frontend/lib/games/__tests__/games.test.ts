/** npx tsx lib/games/__tests__/games.test.ts */
import type { Challenge } from "../../types"
import {
  activeDiscountPaise,
  computeResult,
  DISCOUNT_WINDOW_MS,
  gameStats,
  isCoinCalls,
  isValidCells,
  isValidDigs,
  newSecretFor,
  scoreGrid,
  isForFun,
  isTreasurePick,
  randomFlips,
  randomTreasureBoxes,
  scoreCoin,
  scoreLuckyNumber,
  scoreRps,
  stakeLabel,
} from "../index"

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

// Coin toss: 3 of 5 calls right wins
assert(scoreCoin(["H", "H", "T", "T", "H"], ["H", "H", "T", "H", "T"]).won, "3 of 5 right wins")
assert(!scoreCoin(["H", "H", "T", "T", "H"], ["T", "H", "H", "H", "T"]).won, "1 of 5 right loses")
assert(isCoinCalls(randomFlips()) && !isCoinCalls(["H", "H"]), "5 flips are valid calls")
console.log("✓ Coin Toss scoring")

// Treasure: 3 different boxes out of 9
for (let i = 0; i < 50; i++) {
  const boxes = randomTreasureBoxes()
  assert(new Set(boxes).size === 3 && boxes.every((b) => b >= 0 && b < 9), "3 distinct boxes in range")
}
assert(isTreasurePick(0) && isTreasurePick(8) && !isTreasurePick(9) && !isTreasurePick(1.5), "picks are boxes 0–8")
console.log("✓ Treasure Hunt boxes")

// Results: every game but group Lucky Number scores each player on their own
const base = { players: ["a", "b", "c"] }
let r = computeResult(
  { ...base, kind: "group", game: "rps", moves: { a: ["paper", "paper", "paper"], b: ["scissors", "scissors", "scissors"] } },
  { moves: ["rock", "rock", "rock"] }
)
assert(r.winners.join() === "a" && r.hostMoves?.join() === "rock,rock,rock", "group RPS: only players who beat the host")
r = computeResult(
  { ...base, kind: "group", game: "coin_toss", moves: { a: ["H", "H", "H", "T", "T"], b: ["T", "T", "T", "H", "H"], c: ["H", "H", "H", "H", "H"] } },
  { flips: ["H", "H", "H", "H", "H"] }
)
assert(r.winners.sort().join() === "a,c" && r.flips?.length === 5, "coin: everyone with 3+ right wins")
r = computeResult({ ...base, kind: "friend", game: "treasure", players: ["a"], moves: { a: 4 } }, { boxes: [1, 4, 7] })
assert(r.winners.join() === "a" && r.boxes?.join() === "1,4,7", "treasure: a treasure box wins")
r = computeResult({ ...base, kind: "friend", game: "lucky_number", players: ["a"], moves: { a: 61 } }, { number: 50 })
assert(r.winners.length === 0 && r.number === 50, "lucky one-on-one: 11 away loses")
r = computeResult({ ...base, kind: "friend", game: "lucky_number", players: ["a"], moves: { a: 60 } }, { number: 50 })
assert(r.winners.join() === "a", "lucky one-on-one: 10 away wins")
r = computeResult({ ...base, kind: "group", game: "lucky_number", moves: { a: 10, b: 45 } }, { number: 50 })
assert(r.winners.join() === "b" && r.winningDistance === 5, "lucky group: closest wins, non-players ignored")
console.log("✓ Results for every game")

// Minefield: 3 bombs; lose at the 3rd, win once all 13 safe tiles are open
const bombs = [0, 5, 10]
const safe = Array.from({ length: 16 }, (_, i) => i).filter((i) => !bombs.includes(i))
let g = scoreGrid("minefield", bombs, [0, 5, 1, 10])
assert(g.hits === 3 && g.over && !g.won, "3rd bomb ends the game")
g = scoreGrid("minefield", bombs, [0, 5, ...safe])
assert(g.won && g.over && g.hits === 2, "all safe tiles with 2 bombs hit wins")
g = scoreGrid("minefield", bombs, safe.slice(0, 12))
assert(!g.over && !g.won, "12 of 13 safe tiles: still playing")
r = computeResult({ kind: "friend", game: "minefield", players: ["a"], moves: { a: [5, ...safe] } }, { cells: bombs })
assert(r.winners.join() === "a" && r.cells?.join() === "0,5,10", "minefield result")
console.log("✓ Minefield")

// Gold Rush: 4 coins, 5 digs, 2 coins win
const gold = [3, 6, 9, 12]
g = scoreGrid("gold_rush", gold, [1, 3, 6])
assert(g.won && g.over, "2nd coin wins straight away")
g = scoreGrid("gold_rush", gold, [0, 1, 2, 3, 4])
assert(!g.won && g.over, "5 digs with 1 coin loses")
r = computeResult(
  { kind: "group", game: "gold_rush", players: ["a", "b", "c"], moves: { a: [3, 6], b: [0, 1, 2, 3, 4] } },
  { cells: gold }
)
assert(r.winners.join() === "a", "gold rush: every player scored on their own")
console.log("✓ Gold Rush")

// Grid validation
assert(isValidCells("minefield", [1, 2, 3]) && !isValidCells("minefield", [1, 1, 2]), "3 different bombs")
assert(isValidCells("gold_rush", [0, 5, 10, 15]) && !isValidCells("gold_rush", [0, 5, 10, 16]), "4 coins on the grid")
assert(isValidDigs("gold_rush", [1, 2]) && !isValidDigs("gold_rush", [1, 2, 3, 4, 5, 6]), "at most 5 digs")
assert(!isValidDigs("minefield", []) && !isValidDigs("minefield", [4, 4]), "digs are non-empty and different")
assert(newSecretFor("minefield", { cells: [9, 2, 4] }).cells?.join() === "2,4,9", "host's cells are stored sorted")
console.log("✓ Grid validation")

// The host's own secret for every game; flips, boxes and the number default to random
assert(newSecretFor("coin_toss", { flips: ["H", "T", "H", "T", "H"] }).flips?.join("") === "HTHTH", "host's flips")
assert(newSecretFor("treasure", { boxes: [8, 0, 4] }).boxes?.join() === "0,4,8", "host's boxes, sorted")
assert(newSecretFor("lucky_number", { number: 42 }).number === 42, "host's number")
assert(isCoinCalls(newSecretFor("coin_toss").flips), "random flips by default")
assert(newSecretFor("treasure").boxes?.length === 3, "random boxes by default")
const throws = (fn: () => unknown) => {
  try {
    fn()
    return false
  } catch {
    return true
  }
}
assert(throws(() => newSecretFor("treasure", { boxes: [1, 1, 2] })), "boxes must differ")
assert(throws(() => newSecretFor("lucky_number", { number: 0 })), "number must be 1–100")
assert(throws(() => newSecretFor("coin_toss", { flips: ["H", "H"] as never })), "all 5 flips needed")
assert(throws(() => newSecretFor("rps")), "RPS needs the host's moves")
console.log("✓ Host-picked secrets")

// Games for fun never give a discount
const funWin: Challenge = {
  id: "f1", kind: "friend", game: "coin_toss", hostId: "h", hostName: "Host", players: ["p"], playerNames: { p: "P" },
  participants: ["h", "p"], discountPercent: 0, bases: { p: 0 }, status: "DONE", moves: {},
  result: { winners: ["p"] }, resolvedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
}
assert(isForFun(funWin) && activeDiscountPaise(funWin, "p") === 0, "a fun win is worth no discount")
assert(stakeLabel(funWin) === "Just for fun" && stakeLabel({ discountPercent: 20 }) === "20% off", "stake labels")
console.log("✓ Games for fun")

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
assert(
  activeDiscountPaise({ ...game, discountPercent: 100 }, "p", resolvedAt.getTime() + 24 * 60 * 60 * 1000) === 40000,
  "a 100% win never expires: it settles whenever the winner's app sees it"
)
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
