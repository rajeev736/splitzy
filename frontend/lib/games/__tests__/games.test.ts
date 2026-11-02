/** npx tsx lib/games/__tests__/games.test.ts */
import type { Challenge } from "../../types"
import {
  activeDiscountPaise,
  computeResult,
  DISCOUNT_WINDOW_MS,
  GAME_IDS,
  GAMES,
  gameStats,
  hasHostRounds,
  hiloCallRight,
  hostRoundDocs,
  huntHint,
  huntRange,
  isHiloCalls,
  isHiloCards,
  isHuntGuesses,
  isPenaltyDirs,
  isRoundGame,
  isTileGame,
  isValidMove,
  randomDives,
  randomHiloCards,
  randomHuntNumber,
  scoreHilo,
  scoreHunt,
  scorePenalty,
  tileDocs,
  cardRank,
  isCoinCalls,
  isRpsMoves,
  isRpsPlays,
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
// A round the player ran out of time on always goes to the host
s = scoreRps(["rock", "rock", "rock"], ["paper", "none", "none"])
assert(s.playerWins === 1 && s.hostWins === 2 && !s.playerWon, "timed-out rounds are lost")
s = scoreRps(["rock", "rock", "rock"], ["paper", "paper", "none"])
assert(s.playerWins === 2 && s.playerWon, "two wins beat one timeout")
assert(isRpsPlays(["none", "rock", "none"]) && !isRpsMoves(["none", "rock", "paper"]), "only players can time out")
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

// Penalty Shootout: a goal unless the keeper dives the same way; 3 of 5 wins
let p = scorePenalty(["L", "C", "R", "L", "C"], ["L", "R", "L", "R", "R"])
assert(p.goals === 4 && p.saves === 1 && p.won, "4 goals, 1 save wins")
p = scorePenalty(["L", "L", "L", "L", "L"], ["L", "L", "L", "R", "C"])
assert(p.goals === 2 && !p.won, "2 goals loses")
p = scorePenalty(["L", "C", "R", "L", "C"], ["R", "R", "L"])
assert(p.goals === 3 && p.won && p.kicks.length === 3, "partial shootout: 3 goals already wins")
assert(p.kicks[1].dive === "C" && p.kicks[1].goal, "each kick has its dive")
assert(isPenaltyDirs(randomDives()) && !isPenaltyDirs(["L", "C"]) && !isPenaltyDirs(["L", "C", "R", "L", "X"]), "5 dives L/C/R")
r = computeResult(
  { kind: "group", game: "penalty", players: ["a", "b", "c"], moves: { a: ["R", "R", "L", "R", "R"], b: ["L", "C", "R", "L", "C"] } },
  { dives: ["L", "C", "R", "L", "C"] }
)
assert(r.winners.join() === "a" && r.dives?.join("") === "LCRLC", "penalty result reveals the dives")
console.log("✓ Penalty Shootout")

// Higher or Lower: 6 cards, 5 calls, 3 right wins
const deck = [7, 12, 3, 4, 14, 2]
let h = scoreHilo(deck, ["H", "L", "H", "H", "L"])
assert(h.right === 5 && h.won, "all 5 right")
h = scoreHilo(deck, ["L", "H", "L", "H", "L"])
assert(h.right === 2 && !h.won, "2 right loses")
h = scoreHilo(deck, ["H", "H"])
assert(h.right === 1 && h.rounds[1].from === 12 && h.rounds[1].to === 3 && !h.rounds[1].right, "partial calls")
assert(hiloCallRight("H", 2, 14) && hiloCallRight("L", 14, 2) && !hiloCallRight("H", 9, 3), "higher / lower")
assert(isHiloCards(deck) && !isHiloCards([7, 7, 3, 4, 14, 2]), "never the same card twice in a row")
assert(!isHiloCards([1, 12, 3, 4, 14, 2]) && !isHiloCards([7, 12, 3, 4, 15, 2]) && !isHiloCards(deck.slice(0, 5)), "6 cards, 2–14")
for (let i = 0; i < 50; i++) assert(isHiloCards(randomHiloCards()), "random cards are valid")
assert(isHiloCalls(["H", "L", "H", "H", "L"]) && !isHiloCalls(["H", "L"]), "5 calls")
assert(cardRank(2) === "2" && cardRank(10) === "10" && cardRank(11) === "J" && cardRank(14) === "A", "card ranks")
r = computeResult({ kind: "friend", game: "hilo", players: ["a"], moves: { a: ["H", "L", "H", "L", "L"] } }, { cards: deck })
assert(r.winners.join() === "a" && r.cards?.join() === deck.join(), "hilo result reveals the cards")
console.log("✓ Higher or Lower")

// Number Hunt: 1–60, 5 guesses, each with a hint
assert(huntHint(37, 20) === "higher" && huntHint(37, 45) === "lower" && huntHint(37, 37) === "found", "hints")
let n = scoreHunt(37, [20, 45, 37])
assert(n.won && n.over && n.foundAt === 2, "found on the 3rd guess")
n = scoreHunt(37, [20, 45])
assert(!n.won && !n.over, "still hunting")
n = scoreHunt(60, [1, 2, 3, 4, 5])
assert(!n.won && n.over, "5 misses is a loss")
assert(!scoreHunt(6, [1, 2, 3, 4, 5, 6]).won, "a 6th guess doesn't count")
assert(isHuntGuesses([1, 60]) && !isHuntGuesses([]) && !isHuntGuesses([0]) && !isHuntGuesses([61]), "guesses 1–60")
assert(!isHuntGuesses([5, 5]) && !isHuntGuesses([1, 2, 3, 4, 5, 6]), "different guesses, at most 5")
const range = huntRange([{ guess: 20, hint: "higher" }, { guess: 45, hint: "lower" }, { guess: 30, hint: "higher" }])
assert(range.low === 31 && range.high === 44, "hints narrow the range")
for (let i = 0; i < 50; i++) {
  const x = randomHuntNumber()
  assert(x >= 1 && x <= 60, "random number in range")
}
r = computeResult(
  { kind: "group", game: "number_hunt", players: ["a", "b"], moves: { a: [30, 15, 22], b: [1, 2, 3, 4, 5] } },
  { number: 22 }
)
assert(r.winners.join() === "a" && r.number === 22, "number hunt result")
console.log("✓ Number Hunt")

// New games: moves, secrets, and the per-step docs (mirrors firestore.rules)
assert(isValidMove("penalty", ["L", "C", "R", "L", "C"]) && !isValidMove("penalty", ["H", "L", "H", "H", "L"]), "penalty moves")
assert(isValidMove("hilo", ["H", "L", "H", "H", "L"]) && !isValidMove("hilo", ["L", "C", "R", "L", "C"]), "hilo moves")
assert(isValidMove("number_hunt", [4, 9]) && !isValidMove("number_hunt", 4), "number hunt moves are the guesses")
assert(newSecretFor("penalty", { dives: ["R", "R", "C", "L", "L"] }).dives?.join("") === "RRCLL", "host's dives")
assert(isPenaltyDirs(newSecretFor("penalty").dives), "random dives by default")
assert(newSecretFor("hilo", { cards: deck }).cards?.join() === deck.join(), "host's cards")
assert(isHiloCards(newSecretFor("hilo").cards), "random cards by default")
assert(newSecretFor("number_hunt", { number: 60 }).number === 60, "host's number")
const hunted = newSecretFor("number_hunt").number ?? 0
assert(hunted >= 1 && hunted <= 60, "random number by default")
assert(throws(() => newSecretFor("hilo", { cards: [5, 5, 6, 7, 8, 9] })), "no repeated card in a row")
assert(throws(() => newSecretFor("number_hunt", { number: 61 })), "number must be 1–60")
assert(throws(() => newSecretFor("penalty", { dives: ["L"] as never })), "all 5 dives needed")

assert(hasHostRounds({ game: "rps", kind: "friend" }) && !hasHostRounds({ game: "rps", kind: "group" }), "RPS rounds: friend only")
assert(hasHostRounds({ game: "penalty", kind: "friend" }) && !hasHostRounds({ game: "penalty", kind: "group" }), "dives: friend only")
assert(hasHostRounds({ game: "hilo", kind: "friend" }) && hasHostRounds({ game: "hilo", kind: "group" }), "cards: always")
assert(!hasHostRounds({ game: "coin_toss", kind: "friend" }), "no rounds for coin toss")
assert(!GAMES.hilo.groupDiscount && !GAMES.number_hunt.groupDiscount && GAMES.penalty.groupDiscount, "group discounts")
assert(isRoundGame("penalty") && isRoundGame("hilo") && !isRoundGame("number_hunt"), "round games")
assert(isTileGame("number_hunt") && isTileGame("minefield") && !isTileGame("hilo"), "tile games")
assert(GAME_IDS.length === Object.keys(GAMES).length && new Set(GAME_IDS).size === GAME_IDS.length, "every game listed once")

const dives = hostRoundDocs({ game: "penalty", kind: "friend" }, { dives: ["L", "C", "R", "L", "C"] })
assert(dives.length === 5 && dives[2][0] === 2 && dives[2][1].move === "R", "a doc per dive")
assert(hostRoundDocs({ game: "penalty", kind: "group" }, { dives: ["L", "C", "R", "L", "C"] }).length === 0, "no dives in groups")
const cardDocs = hostRoundDocs({ game: "hilo", kind: "group" }, { cards: deck })
assert(cardDocs.length === 6 && cardDocs[0][1].card === 7 && cardDocs[5][1].card === 2, "a doc per card")
assert(hostRoundDocs({ game: "rps", kind: "friend" }, { moves: ["rock", "paper", "rock"] })[1][1].move === "paper", "RPS rounds")
const hints = tileDocs("number_hunt", { number: 22 })
assert(hints.length === 60 && hints[0][0] === 1 && hints[59][0] === 60, "a hint for each of 1–60")
assert(hints.every(([k, d]) => d.hint === (k < 22 ? "higher" : k > 22 ? "lower" : "found")), "hints match the number")
const grid = tileDocs("minefield", { cells: [0, 5, 10] })
assert(grid.length === 16 && grid[5][1].hit === true && grid[6][1].hit === false, "grid tiles")
assert(tileDocs("hilo", { cards: deck }).length === 0, "no tiles for hilo")
console.log("✓ New games' secrets & per-step docs")

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
