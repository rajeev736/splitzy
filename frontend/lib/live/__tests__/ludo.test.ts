/** npx tsx lib/live/__tests__/ludo.test.ts */
import type { RoomPlayer } from "../types"
import {
  applyMove,
  applyRoll,
  canMove,
  cellOf,
  coloursFor,
  describeLast,
  distinctMoves,
  HOME,
  HOME_COLUMN,
  initialLudoState,
  isOver,
  isSafe,
  legalMoves,
  nextTurn,
  passTurn,
  rankingOf,
  resultOf,
  SAFE_SQUARES,
  START_INDEX,
  TRACK,
  TRACK_LENGTH,
  trackIndex,
  trackToCell,
  type LudoState,
} from "../ludo"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

function throws(fn: () => unknown, message: string) {
  let threw = false
  try {
    fn()
  } catch {
    threw = true
  }
  assert(threw, message)
}

const player = (uid: string, seat: number): RoomPlayer => ({
  uid,
  name: uid.toUpperCase(),
  seat,
  joinedAt: 0,
  online: true,
  lastSeen: 0,
})
const fresh = (n: number) =>
  initialLudoState(
    Array.from({ length: n }, (_, i) => player("abcd"[i], i)),
    {},
    "SEED"
  )
/** A state with hand-placed tokens (anything not given stays in base). */
function withTokens(
  state: LudoState,
  tokens: Record<string, number[]>
): LudoState {
  const players = { ...state.players }
  for (const [uid, t] of Object.entries(tokens))
    players[uid] = { ...players[uid], tokens: [...t] }
  return { ...state, players }
}
const ctx = { now: 1000 }
/** The database drops `undefined`: no state we write may contain one. */
function noUndefined(v: unknown, path = "state"): void {
  if (v === undefined) throw new Error(`undefined at ${path}`)
  if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) noUndefined(x, `${path}.${k}`)
}

console.log("Running Ludo tests...\n")

// Setup
let s = fresh(2)
assert(
  s.players.a.colour === "red" && s.players.b.colour === "yellow",
  "2 players sit in opposite corners"
)
assert(
  coloursFor(3).join() === "red,green,yellow" && coloursFor(4).length === 4,
  "3 and 4 player colours"
)
assert(
  s.turn === "a" && s.phase === "roll" && s.seq === 0 && s.dice === undefined,
  "red starts, waiting for a roll"
)
assert(
  s.players.a.tokens.every((t) => t === -1),
  "tokens start in base"
)
noUndefined(s)
console.log("✓ setup")

// Entering on a 6
s = fresh(2)
s = applyRoll(s, "a", 3, ctx)
assert(
  s.phase === "roll" && s.turn === "b" && s.last?.type === "no_move",
  "a 3 with everything in base passes the turn"
)
assert(s.dice === undefined && s.seq === 1, "no pending dice after a pass")
s = fresh(2)
s = applyRoll(s, "a", 6, ctx)
assert(
  s.phase === "move" &&
    s.dice?.value === 6 &&
    s.dice.by === "a" &&
    s.sixes === 1,
  "a 6 can be played"
)
assert(
  legalMoves(s, "a", 6).join() === "0,1,2,3" &&
    distinctMoves(s, "a", 6).join() === "0",
  "all base tokens are the same move"
)
s = applyMove(s, "a", 2, 6, ctx)
assert(
  s.players.a.tokens[2] === 0 &&
    s.phase === "roll" &&
    s.turn === "a" &&
    s.last?.type === "move" &&
    s.last.bonus,
  "token out on the start square, roll again"
)
assert(s.sixes === 1, "the six still counts towards three in a row")
throws(() => applyRoll(fresh(2), "b", 6, ctx), "only the current player rolls")
throws(() => applyMove(fresh(2), "a", 0, 6, ctx), "no move without a roll")
noUndefined(s)
console.log("✓ entering on a 6")

// Three sixes forfeit the turn, moves already made stand
s = fresh(2)
s = applyMove(applyRoll(s, "a", 6, ctx), "a", 0, 6, ctx)
s = applyMove(applyRoll(s, "a", 6, ctx), "a", 0, 6, ctx)
assert(
  s.players.a.tokens[0] === 6 && s.sixes === 2 && s.turn === "a",
  "two sixes played"
)
s = applyRoll(s, "a", 6, ctx)
assert(
  s.turn === "b" &&
    s.phase === "roll" &&
    s.sixes === 0 &&
    s.last?.type === "three_sixes",
  "third 6 forfeits the turn"
)
assert(s.players.a.tokens[0] === 6, "earlier moves stand")
// A non-six in between resets the count
s = fresh(2)
s = applyMove(applyRoll(s, "a", 6, ctx), "a", 0, 6, ctx)
s = applyRoll(s, "a", 2, ctx)
assert(s.sixes === 0 && s.phase === "move", "a 2 after a 6 resets the run")
console.log("✓ three sixes")

// Bonus rolls: a 6, a capture, a token home — but not after finishing
s = withTokens(fresh(2), { a: [10, -1, -1, -1] })
s = applyMove(applyRoll(s, "a", 4, ctx), "a", 0, 4, ctx)
assert(
  s.turn === "b" && s.players.a.tokens[0] === 14,
  "an ordinary move passes the turn"
)
s = withTokens(fresh(2), { a: [10, -1, -1, -1] })
s = applyMove(applyRoll(s, "a", 6, ctx), "a", 0, 6, ctx)
assert(
  s.turn === "a" &&
    s.phase === "roll" &&
    s.last?.type === "move" &&
    s.last.bonus,
  "moving with a 6 rolls again"
)
s = withTokens(fresh(2), { a: [52, HOME, HOME, -1] })
s = applyMove(applyRoll(s, "a", 4, ctx), "a", 0, 4, ctx)
assert(
  s.players.a.tokens[0] === HOME &&
    s.turn === "a" &&
    s.last?.type === "move" &&
    s.last.home &&
    s.last.bonus,
  "a token home rolls again"
)
console.log("✓ bonus rolls")

// Exact roll into home, no overshooting
assert(
  canMove(53, 3) && !canMove(53, 4) && !canMove(HOME, 1) && canMove(50, 6),
  "exact home entry"
)
s = withTokens(fresh(2), { a: [54, HOME, HOME, HOME] })
s = applyRoll(s, "a", 3, ctx)
assert(
  s.phase === "roll" && s.turn === "b" && s.last?.type === "no_move",
  "overshoot = no move, turn passes"
)
s = withTokens(fresh(2), { a: [54, 55, HOME, HOME] })
s = applyRoll(s, "a", 2, ctx)
assert(
  legalMoves(s, "a", 2).join() === "0",
  "only the token that lands exactly can move"
)
console.log("✓ exact home entry")

// Capture sends every rival token on that square back; own tokens stack
s = fresh(2)
// yellow pos 10 is absolute square 36; red reaches 36 at pos 36
s = withTokens(s, { a: [30, -1, -1, -1], b: [10, 10, -1, -1] })
assert(
  trackIndex("yellow", 10) === 36 &&
    trackIndex("red", 36) === 36 &&
    !isSafe(36),
  "same square, not safe"
)
s = applyRoll(s, "a", 6, ctx)
s = applyMove(s, "a", 0, 6, ctx)
assert(
  s.players.b.tokens[0] === -1 && s.players.b.tokens[1] === -1,
  "both yellow tokens go back to base"
)
assert(
  s.last?.type === "move" &&
    s.last.captured?.length === 2 &&
    s.last.bonus &&
    s.turn === "a",
  "capture is recorded and rolls again"
)
s = withTokens(fresh(2), { a: [5, 7, -1, -1] })
s = applyMove(applyRoll(s, "a", 2, ctx), "a", 0, 2, ctx)
assert(
  s.players.a.tokens[0] === 7 && s.players.a.tokens[1] === 7 && s.turn === "b",
  "own tokens stack, no capture, no bonus"
)
// A token in the home column can't be captured even if a rival "passes" that geometry
s = withTokens(fresh(2), { a: [40, -1, -1, -1], b: [52, -1, -1, -1] })
s = applyMove(applyRoll(s, "a", 3, ctx), "a", 0, 3, ctx)
assert(s.players.b.tokens[0] === 52, "home column tokens are untouchable")
console.log("✓ capture")

// Safe squares: starts and stars
assert(
  SAFE_SQUARES.length === 8 &&
    Object.values(START_INDEX).every((i) => isSafe(i)),
  "every start square is safe"
)
s = fresh(2)
// yellow's start (abs 26) = red pos 26
s = withTokens(s, { a: [22, -1, -1, -1], b: [0, -1, -1, -1] })
s = applyMove(applyRoll(s, "a", 4, ctx), "a", 0, 4, ctx)
assert(
  s.players.b.tokens[0] === 0 && s.players.a.tokens[0] === 26 && s.turn === "b",
  "no capture on a start square"
)
assert(
  s.last?.type === "move" && !s.last.captured,
  "nothing recorded as captured"
)
// Star at absolute 8: yellow pos 34 (26+34=60%52=8), red pos 8
s = withTokens(fresh(2), { a: [6, -1, -1, -1], b: [34, -1, -1, -1] })
s = applyMove(applyRoll(s, "a", 2, ctx), "a", 0, 2, ctx)
assert(s.players.b.tokens[0] === 34, "no capture on a star")
console.log("✓ safe squares")

// Finishing order, ranking, game end
s = fresh(3)
s = withTokens(s, {
  a: [HOME, HOME, HOME, 50],
  b: [HOME, HOME, 30, 20],
  c: [HOME, 40, -1, -1],
})
s = applyMove(applyRoll(s, "a", 6, ctx), "a", 3, 6, ctx)
assert(
  s.players.a.place === 1 &&
    s.last?.type === "move" &&
    s.last.finished &&
    !s.last.bonus,
  "all four home = finished first, no bonus"
)
assert(
  s.phase === "roll" && s.turn === "b" && !isOver(s),
  "two still racing, b is next"
)
assert(rankingOf(s).join() === "a,b,c", "finisher first, then by tokens home")
assert(
  nextTurn(s, "b") === "c" && nextTurn(s, "c") === "b",
  "finished players are out of the rotation"
)
s = applyRoll(s, "b", 1, ctx)
assert(s.phase === "move" && s.turn === "b", "b rolls normally")
s = withTokens(s, { b: [HOME, HOME, HOME, 55] })
s = applyMove(s, "b", 3, 1, ctx)
assert(
  s.players.b.place === 2 && s.phase === "over" && isOver(s),
  "second finisher ends a 3-player game"
)
let r = resultOf(s)
assert(
  r.winnerIds.join() === "a" &&
    r.ranking?.join() === "a,b,c" &&
    r.reason === "all_home",
  "result: winner, ranking, reason"
)
assert(
  describeLast(s, (id) => id).includes("finished 2nd"),
  "log line for finishing"
)
// Ranking by progress when tokens home tie
s = withTokens(fresh(3), {
  a: [HOME, 5, -1, -1],
  b: [HOME, 30, -1, -1],
  c: [40, 40, 10, -1],
})
assert(
  rankingOf(s).join() === "b,a,c",
  "tie on tokens home → further along wins; two home beat none"
)
noUndefined(s)
console.log("✓ finishing & ranking")

// Two players: the first finisher ends the game
s = withTokens(fresh(2), { a: [HOME, HOME, HOME, 53], b: [10, -1, -1, -1] })
s = applyMove(applyRoll(s, "a", 3, ctx), "a", 3, 3, ctx)
assert(
  s.phase === "over" && s.players.a.place === 1,
  "2-player game ends with the first finisher"
)
r = resultOf(s)
assert(
  r.winnerIds.join() === "a" && r.ranking?.join() === "a,b",
  "2-player result"
)
console.log("✓ two players")

// Left players: skipped, and a lone contender ends it
s = fresh(3)
assert(nextTurn(s, "a", ["b"]) === "c", "left players are skipped")
s = passTurn(s, "a", "idle", { now: 5, gone: ["b"] })
assert(
  s.turn === "c" &&
    s.last?.type === "skip" &&
    s.last.reason === "idle" &&
    s.seq === 1,
  "referee passes an idle turn"
)
throws(() => passTurn(s, "a", "idle", ctx), "can't pass someone else's turn")
s = applyRoll(s, "c", 6, { now: 5, gone: ["b"] })
s = passTurn(s, "c", "offline", { now: 5, gone: ["b"] })
assert(
  s.dice === undefined && s.turn === "a",
  "a pending roll is dropped when the turn is passed"
)
assert(!isOver(s, ["b"]) && isOver(s, ["b", "c"]), "one racer left = over")
r = resultOf(s, ["b", "c"])
assert(
  r.winnerIds.join() === "a" &&
    r.reason === "abandoned" &&
    r.ranking?.join() === "a,b,c",
  "lone contender wins by abandonment, leavers last (seat order on a tie)"
)
s = withTokens(s, { c: [12, -1, -1, -1] })
assert(
  resultOf(s, ["b", "c"]).ranking?.join() === "a,c,b",
  "leavers are ordered by progress"
)
console.log("✓ left players")

// Geometry
assert(TRACK.length === TRACK_LENGTH, "52 track squares")
assert(
  new Set(TRACK.map((c) => `${c.row},${c.col}`)).size === TRACK_LENGTH,
  "no two track squares overlap"
)
assert(
  TRACK.every((c) => c.row >= 0 && c.row < 15 && c.col >= 0 && c.col < 15),
  "track stays on the board"
)
const starts = {
  red: [6, 1],
  green: [1, 8],
  yellow: [8, 13],
  blue: [13, 6],
} as const
for (const [colour, [row, col]] of Object.entries(starts)) {
  const c = trackToCell(START_INDEX[colour as keyof typeof START_INDEX])
  assert(c.row === row && c.col === col, `${colour} starts at (${row},${col})`)
}
// Each colour's pos 50 sits right outside its home column, next to the first column cell
for (const colour of ["red", "green", "yellow", "blue"] as const) {
  const before = cellOf(colour, 50)
  const first = HOME_COLUMN[colour][0]
  assert(
    Math.abs(before.row - first.row) + Math.abs(before.col - first.col) === 1,
    `${colour} turns into its home column`
  )
  assert(
    cellOf(colour, 51).row === first.row &&
      cellOf(colour, 51).col === first.col,
    `${colour} pos 51 = first column cell`
  )
  assert(
    HOME_COLUMN[colour].every(
      (c) => c.row >= 1 && c.row <= 13 && c.col >= 1 && c.col <= 13
    ),
    `${colour} column inside the arm`
  )
}
assert(
  cellOf("red", -1, 0).row === 1.5 && cellOf("green", -1, 3).col === 12.5,
  "base slots sit inside the bases"
)
assert(
  cellOf("yellow", HOME).row === 7 && cellOf("yellow", HOME).col === 8,
  "yellow finishes in the right-hand triangle"
)
console.log("✓ geometry")

console.log("\nAll Ludo tests passed.")
