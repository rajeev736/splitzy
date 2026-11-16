/** npx tsx lib/live/__tests__/snakes.test.ts */
import { applyRoll, describeLast, initialSnakesState, isOver, LADDERS, passTurn, rankingOf, resultOf, SNAKES, SNAKES_MAX_MISSED, type SnakesState } from "../snakes"
import type { RoomPlayer } from "../types"

function assert(c: unknown, m: string) {
  if (!c) throw new Error(`Assertion failed: ${m}`)
}
function throws(fn: () => unknown, m: string) {
  let t = false
  try { fn() } catch { t = true }
  assert(t, m)
}
const player = (uid: string, seat: number): RoomPlayer => ({ uid, name: uid, seat, joinedAt: 0, online: true, lastSeen: 0 })
const ctx = { now: 1 }
const fresh = (n: number, variant: "flat" | "gate" = "flat") => initialSnakesState(Array.from({ length: n }, (_, i) => player("abcde"[i], i)), {}, "S", variant)
const at = (s: SnakesState, pos: Record<string, number>): SnakesState => ({ ...s, players: Object.fromEntries(Object.entries(s.players).map(([u, p]) => [u, { ...p, pos: pos[u] ?? p.pos }])) })

console.log("Running Snakes & Ladders tests...\n")
assert(Object.keys(LADDERS).every((k) => LADDERS[+k] > +k) && Object.keys(SNAKES).every((k) => SNAKES[+k] < +k), "ladders up, snakes down")
assert(Object.keys(LADDERS).every((k) => !SNAKES[+k] && !SNAKES[LADDERS[+k]] || LADDERS[+k] === 100), "no ladder lands on a snake")

let s = fresh(5)
assert(s.order.length === 5 && s.players.e.colour === "purple", "five players")
s = applyRoll(s, "a", 3, ctx)
assert(s.players.a.pos === 3 && s.turn === "b", "flat: any roll comes in")
s = applyRoll(s, "b", 4, ctx)
assert(s.players.b.pos === 14 && s.last?.type === "move" && s.last.via === "ladder" && s.players.b.ladders === 1, "ladder 4 → 14")
s = applyRoll(at({ ...s, turn: "c" }, { c: 12 }), "c", 5, ctx)
assert(s.players.c.pos === 7 && s.last?.type === "move" && s.last.via === "snake", "snake 17 → 7")
let six = applyRoll({ ...s, turn: "d" }, "d", 6, ctx)
assert(six.turn === "d" && six.last?.type === "move" && six.last.bonus, "a 6 rolls again")
six = applyRoll(applyRoll(six, "d", 6, ctx), "d", 6, ctx)
assert(six.turn !== "d" && six.last?.type === "three_sixes", "three 6s lose the turn")
const over = applyRoll(at({ ...s, turn: "e" }, { e: 97 }), "e", 5, ctx)
assert(over.players.e.pos === 97 && over.last?.type === "move" && over.last.stuck, "overshoot stays put")
throws(() => applyRoll(s, "a", 3, ctx), "only on your turn")

// Gate (3D): only a 1 opens it
let g = fresh(2, "gate")
g = applyRoll(g, "a", 5, ctx)
assert(g.players.a.pos === 0 && g.last?.type === "blocked" && g.turn === "b", "the gate stays shut on a 5")
g = applyRoll({ ...g, turn: "a" }, "a", 1, ctx)
// square 1 has a ladder to 38
assert(g.last?.type === "move" && g.last.gate && g.players.a.pos === 38, "a 1 opens the gate (and square 1's ladder)")
assert(describeLast(fresh(2, "gate"), (u) => u).includes("roll a 1"), "how to start")

// Finishing and the end
let f = applyRoll(at(fresh(3), { a: 96 }), "a", 4, ctx)
assert(f.players.a.place === 1 && f.phase === "roll", "first home, game goes on with 3")
f = applyRoll(at({ ...f, turn: "b" }, { b: 94 }), "b", 6, ctx)
assert(f.players.b.place === 2 && f.phase === "over" && isOver(f), "second home: only one left, over")
assert(rankingOf(f).join() === "a,b,c" && resultOf(f).winnerIds[0] === "a", "ranking")
assert(resultOf(f).stats?.a !== undefined, "stats")

// Missed turns
let m = fresh(2)
for (let k = 0; k < SNAKES_MAX_MISSED; k++) {
  m = passTurn({ ...m, turn: "a" }, "a", "idle", ctx)
}
assert(m.players.a.out && m.phase === "over", "3 misses: out; with 2 players that ends it")
console.log("All Snakes & Ladders tests passed.")
