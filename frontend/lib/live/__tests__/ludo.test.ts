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
  LUDO_MAX_MISSED,
  applyPower,
  FREEZE_TURNS,
  rollFor,
  type PowerKind,
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

/* ── Missed turns ────────────────────────────────────────────────────── */
{
  const c = { now: 1 }
  // Three players: A misses twice, rolls (count resets), then misses three in a row and is out
  let m = fresh(3)
  m = passTurn(m, "a", "idle", c)
  assert(m.players.a.missed === 1 && !m.players.a.out, "first miss is a strike")
  m = passTurn(m, "b", "idle", c)
  m = passTurn(m, "c", "idle", c)
  m = passTurn(m, "a", "offline", c)
  assert(m.players.a.missed === 2, "offline skips count too")
  m = passTurn(m, "b", "idle", c)
  m = passTurn(m, "c", "idle", c)
  m = applyRoll(m, "a", 3, c)
  assert(!m.players.a.missed, "rolling clears the count")
  m = applyRoll(applyRoll(m, "b", 1, c), "c", 1, c)
  noUndefined(m)
  for (let k = 0; k < LUDO_MAX_MISSED; k++) {
    assert(m.turn === "a", "back to A")
    m = passTurn(m, "a", "idle", c)
    if (k < LUDO_MAX_MISSED - 1) {
      m = applyRoll(m, m.turn, 1, c) // B and C play (no token out: the turn passes)
      m = applyRoll(m, m.turn, 1, c)
    }
  }
  assert(m.players.a.out === true, "third miss in a row: out")
  assert(m.last?.type === "skip" && m.last.out === true, "the log says so")
  assert(describeLast(m, (u) => u).includes("out of the game"), "log line")
  assert(nextTurn(m, "c") === "b" && nextTurn(m, "b") === "c", "A is skipped from now on")
  assert(rankingOf(m).at(-1) === "a", "out players rank last")
  assert(m.phase !== "over", "two still racing")
  noUndefined(m)

  // Two players: the other one being put out ends the game, and the one left wins
  let t = fresh(2)
  for (let k = 0; k < LUDO_MAX_MISSED; k++) {
    t = passTurn(t, "a", "idle", c)
    if (k < LUDO_MAX_MISSED - 1) t = applyRoll(t, "b", 2, c)
  }
  assert(t.players.a.out && t.phase === "over", "2 players: game over")
  assert(resultOf(t).winnerIds[0] === "b", "the remaining player wins")

  // An out player's tokens are off the board: landing on them captures nothing
  // (red pos 5 = square 5; green pos 44 = square (13 + 44) % 52 = 5)
  let u = withTokens(fresh(3), { a: [5, -1, -1, -1], b: [42, -1, -1, -1] })
  u = { ...u, turn: "b", players: { ...u.players, a: { ...u.players.a, out: true } } }
  u = applyMove(applyRoll(u, "b", 2, c), "b", 0, 2, c)
  assert(u.last?.type === "move" && !u.last.captured, "no capture of an out player")
  assert(u.players.a.tokens[0] === 5, "their token stays where it was")
}
console.log("✓ missed turns")

/* ── Stats ───────────────────────────────────────────────────────────── */
{
  const c = { now: 1 }
  // red pos 5 = square 5; green pos 44 = square (13 + 44) % 52 = 5
  let s1 = withTokens(fresh(3), { a: [5, -1, -1, -1], b: [42, -1, -1, -1] })
  s1 = { ...s1, turn: "b" }
  s1 = applyMove(applyRoll(s1, "b", 2, c), "b", 0, 2, c)
  assert(s1.players.b.kills === 1 && s1.players.a.deaths === 1, "a cut counts for both sides")
  const r = resultOf(s1)
  assert(r.stats?.b.kills === 1 && r.stats?.a.deaths === 1 && r.stats?.c.kills === 0, "stats in the result")
  noUndefined(s1)
}
console.log("✓ stats")

/* ── Power Ludo ──────────────────────────────────────────────────────── */
{
  const three = Array.from({ length: 3 }, (_, i) => player("abc"[i], i))
  const p1 = initialLudoState(three, { mode: "powers" }, "SEED")
  const p2 = initialLudoState(three, { mode: "powers" }, "SEED")
  assert(p1.mode === "powers" && p1.spawns?.length === 2, "two power-ups at the start")
  assert(JSON.stringify(p1.spawns) === JSON.stringify(p2.spawns), "same room seed, same start on every device")
  assert(p1.spawns!.every((sp) => !SAFE_SQUARES.includes(sp.sq)), "never on a safe square")
  assert(!fresh(3).spawns && !fresh(3).mode, "classic has no powers")
  noUndefined(p1)

  const c = { now: 1, rand: () => 0.5 }
  const give = (s: LudoState, uid: string, powers: PowerKind[]): LudoState => ({
    ...s,
    players: { ...s.players, [uid]: { ...s.players[uid], powers } },
  })
  const base = { ...withTokens(fresh(3), { a: [10, -1, -1, -1], b: [10, 20, -1, -1], c: [] }), mode: "powers" as const }

  // Freeze: the piece can't move for 3 of its owner's turns
  let f = applyPower(give(base, "a", ["freeze"]), "a", "freeze", { uid: "b", token: 0 }, c)
  assert(!f.players.a.powers, "the power is used up")
  assert(f.turn === "a" && f.phase === "roll", "using a power keeps your turn")
  f = { ...f, turn: "b" }
  assert(!legalMoves(f, "b", 3).includes(0) && legalMoves(f, "b", 3).includes(1), "frozen piece can't move")
  for (let k = 0; k < FREEZE_TURNS; k++) {
    f = passTurn({ ...f, turn: "b", phase: "roll" }, "b", "left", c)
  }
  assert(legalMoves(f, "b", 3).includes(0), "thawed after its owner's 3 turns")
  noUndefined(f)

  // Number lock: needs that number (rand 0.5 → 4)
  let l = applyPower(give(base, "a", ["lock"]), "a", "lock", { uid: "b", token: 0 }, c)
  assert(l.last?.type === "power" && l.last.value === 4, "lock number")
  l = { ...l, turn: "b" }
  const l3 = applyRoll(l, "b", 3, c)
  assert(l3.dice && !legalMoves(l3, "b", 3).includes(0), "locked: a 3 can't move it")
  const l4 = applyRoll(l, "b", 4, c)
  assert(!l4.locked && legalMoves(l4, "b", 4).includes(0), "rolling the number unlocks it")

  // Push back 5, never below the start square
  const pb = applyPower(give(base, "a", ["push"]), "a", "push", { uid: "b", token: 1 }, c)
  assert(pb.players.b.tokens[1] === 15, "pushed back 5")
  const pz = applyPower(give(withTokens(base, { b: [3, -1, -1, -1] }), "a", ["push"]), "a", "push", { uid: "b", token: 0 }, c)
  assert(pz.players.b.tokens[0] === 0, "no further than its start square")

  // Shield: can't be cut, can't be targeted
  const sh = applyPower({ ...give(base, "b", ["shield"]), turn: "b" }, "b", "shield", { uid: "b", token: 1 }, c)
  const shOk = { ...sh, turn: "a" }
  throws(() => applyPower(give(shOk, "a", ["push"]), "a", "push", { uid: "b", token: 1 }, c), "shielded pieces can't be hit")
  // a's piece lands on b's shielded piece (red 10 + 7 → square 17; green 20 → square 33… use a direct landing instead)
  const aAt = (13 + 20 - 0) % TRACK_LENGTH // green pos 20 = square 33; red pos 33 = square 33
  const land = applyMove(applyRoll(withTokens({ ...shOk, phase: "roll" }, { a: [aAt - 3, -1, -1, -1] }), "a", 3, c), "a", 0, 3, c)
  assert(land.players.b.tokens[1] === 20 && !(land.last?.type === "move" && land.last.captured), "a shielded piece survives")

  // Jump 4, and it can cut
  const jp = applyPower(give(withTokens(base, { a: [16, -1, -1, -1], b: [20, -1, -1, -1] }), "a", ["jump"]), "a", "jump", { uid: "a", token: 0 }, c)
  // red 20 = square 20; green 20 = square 33 → no cut here; check the move
  assert(jp.players.a.tokens[0] === 20, "jumped 4")
  throws(() => applyPower(give(withTokens(base, { a: [49, -1, -1, -1] }), "a", ["jump"]), "a", "jump", { uid: "a", token: 0 }, c), "no jumping into the home column")

  // Double: the next roll counts twice; its bonus goes by the dice thrown
  let d = applyPower(give(withTokens(base, { a: [10, -1, -1, -1] }), "a", ["double"]), "a", "double", null, c)
  d = applyRoll(d, "a", 3, c)
  assert(d.dice?.value === 6 && d.dice.x2, "3 doubled to 6")
  d = applyMove(d, "a", 0, 6, c)
  assert(d.players.a.tokens[0] === 16 && !(d.last?.type === "move" && d.last.bonus), "moved 6, no bonus for a doubled 3")

  // Picking up a power-up by landing on it
  const sq = trackIndex("red", 13)
  let pu: LudoState = { ...withTokens(base, { a: [10, -1, -1, -1] }), spawns: [{ sq, kind: "shield" as PowerKind }] }
  pu = applyMove(applyRoll(pu, "a", 3, c), "a", 0, 3, c)
  assert(pu.players.a.powers?.[0] === "shield" && !pu.spawns, "picked up")
  assert(pu.last?.type === "move" && pu.last.picked === "shield", "and the log knows")

  // First piece out earns a power
  let fo: LudoState = { ...fresh(3), mode: "powers" }
  fo = applyMove(applyRoll(fo, "a", 6, c), "a", 0, 6, c)
  assert(fo.firstOut === "a" && fo.players.a.powers?.length === 1, "first out earns a power")

  // Rules
  throws(() => applyPower(give(base, "b", ["freeze"]), "b", "freeze", { uid: "a", token: 0 }, c), "only on your turn")
  throws(() => applyPower(base, "a", "freeze", { uid: "b", token: 0 }, c), "only powers you hold")
  throws(() => applyPower(give(base, "a", ["freeze"]), "a", "freeze", { uid: "a", token: 0 }, c), "freeze needs a rival")
  throws(() => applyPower(give(base, "a", ["freeze"]), "a", "freeze", { uid: "b", token: 2 }, c), "not a piece in base")
  assert(describeLast(pb, (u) => u).includes("pushed"), "power log line")
}
console.log("✓ power ludo")

/* ── Dice ────────────────────────────────────────────────────────────── */
{
  const count = (s: LudoState, uid: string, n = 30000) => {
    const seen = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < n; i++) seen[rollFor(s, uid, Math.random)]++
    return seen.map((x) => x / n)
  }
  const even = count(fresh(2), "a")
  assert(even.slice(1).every((p) => p > 0.1), "every face can come up")
  // Stuck in base after four misses: a 6 is about 3 in 8
  const stuck = fresh(2)
  stuck.players.a = { ...stuck.players.a, noSix: 4 }
  const p6 = count(stuck, "a")[6]
  assert(p6 > 0.32 && p6 < 0.43, `mercy six (${p6.toFixed(3)})`)
  // A rival 3 ahead on an unsafe square: a 3 is a bit likelier
  const hunt = withTokens(fresh(3), { a: [2, -1, -1, -1], b: [44 - 2, -1, -1, -1] })
  // red 5 = square 5; green 42 = square 55 % 52 = 3 → put green on square 5 instead: pos 44
  const hunt2 = withTokens(hunt, { b: [44, -1, -1, -1] })
  const h = count(hunt2, "a")
  assert(h[3] > h[1] + 0.03, `the hunt (${h[3].toFixed(3)} vs ${h[1].toFixed(3)})`)
  noUndefined(applyRoll(stuck, "a", rollFor(stuck, "a", Math.random), { now: 1 }))
}
console.log("✓ dice")

console.log("\nAll Ludo tests passed.")
