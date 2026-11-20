/** npx tsx lib/live/__tests__/memory.test.ts */
import type { HostedAction } from "../hosted"
import {
  dealLayout,
  matchedTiles,
  MEMORY_IDLE_MS,
  MEMORY_PEEK_MS,
  MEMORY_PICTURES,
  MEMORY_ROUND_PAUSE_MS,
  memoryEngine,
  normalize,
  type MemoryHidden,
  type MemoryState,
} from "../memory"

function assert(c: boolean, m: string) {
  if (!c) throw new Error(`Assertion failed: ${m}`)
}
function throws(fn: () => unknown, re: RegExp, m: string) {
  try {
    fn()
  } catch (e) {
    assert(re.test((e as Error).message), `${m} (got "${(e as Error).message}")`)
    return
  }
  throw new Error(`Assertion failed: ${m} (didn't throw)`)
}

/** Deterministic randomness (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Step = { state: MemoryState; secrets: Record<string, never>; hidden: MemoryHidden }
let clock = 1_000_000
const rand = seeded(7)

/** Like the server: a JSON round trip (the database drops empty arrays / objects; undefined is refused). */
function roundTrip<T>(v: T): T {
  const json = JSON.stringify(v, (_k, x) => {
    if (x === undefined) throw new Error("undefined in the stored state")
    if (Array.isArray(x) && x.length === 0) return undefined
    if (x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).length === 0) return undefined
    return x
  })
  return JSON.parse(json ?? "null") as T
}

function begin(players: string[], options: Record<string, number>): Step {
  return roundTrip(memoryEngine.start({ players, names: {}, options, rand, now: clock }) as Step)
}
function act(step: Step, uid: string, action: HostedAction, gone: string[] = []): Step {
  const next = memoryEngine.act({ ...step, secrets: step.secrets ?? {}, uid, action, now: clock, gone, rand }) as Step
  return roundTrip(next)
}
const flip = (step: Step, uid: string, tile: number, gone: string[] = []) =>
  act(step, uid, { type: "flip", tile, seq: step.state.seq }, gone)
const tick = (step: Step, gone: string[] = []) => act(step, "anyone", { type: "tick" }, gone)

/** Two face-down tiles with the same picture / with different pictures. */
function pairOf(step: Step): [number, number] {
  const up = matchedTiles(normalize(step.state))
  const layout = step.hidden.layout
  for (let i = 0; i < layout.length; i++)
    for (let j = i + 1; j < layout.length; j++) if (!up.has(i) && !up.has(j) && layout[i] === layout[j]) return [i, j]
  throw new Error("no pair left")
}
function missOf(step: Step): [number, number] {
  const up = matchedTiles(normalize(step.state))
  const layout = step.hidden.layout
  for (let i = 0; i < layout.length; i++)
    for (let j = i + 1; j < layout.length; j++) if (!up.has(i) && !up.has(j) && layout[i] !== layout[j]) return [i, j]
  throw new Error("no miss left")
}
const S = (step: Step) => normalize(step.state)

/* ── Dealing ─────────────────────────────────────────────────────── */

for (const size of [16, 24, 36]) {
  const layout = dealLayout(size, seeded(size))
  const counts = new Map<number, number>()
  for (const p of layout) counts.set(p, (counts.get(p) ?? 0) + 1)
  assert(layout.length === size, `${size}: ${size} tiles`)
  assert(counts.size === size / 2 && [...counts.values()].every((n) => n === 2), `${size}: every picture exactly twice`)
  assert([...counts.keys()].every((p) => p >= 0 && p < MEMORY_PICTURES), `${size}: known pictures`)
}

let g = begin(["a", "b", "c"], { size: 16, rounds: 1 })
assert(S(g).size === 16 && S(g).rounds === 1 && S(g).round === 1 && S(g).phase === "play", "16 tiles, 1 round")
assert(["a", "b", "c"].includes(S(g).turn), "someone starts")
assert(begin(["a", "b"], { size: 99 }).state.size === 24, "unknown size: 24")
assert(begin(["a", "b"], { size: 36, rounds: 3 }).state.rounds === 3, "best of 3")
assert(begin(["a", "b"], {}).state.rounds === 1, "default: 1 round")

/* ── The layout never reaches the table ──────────────────────────── */

const pub = JSON.stringify(g.state)
assert(!/layout/.test(pub), "no layout on the table")
assert(S(g).flipped.length === 0 && S(g).matched.length === 0, "nothing face up at the start")
assert(Object.keys(g.secrets ?? {}).length === 0, "nothing private per player")

/* ── Flip rules ──────────────────────────────────────────────────── */

// Put "a" on turn for the rest
while (S(g).turn !== "a") {
  clock += MEMORY_IDLE_MS
  g = tick(g)
}
const other = S(g).players.find((p) => p !== "a")!
throws(() => flip(g, other, 0), /not your turn/, "out of turn refused")
throws(() => flip(g, "a", 16), /no such tile/, "off the board refused")
throws(() => flip(g, "a", 1.5), /no such tile/, "not a tile refused")
throws(() => act(g, "a", { type: "dance" }), /unknown/, "unknown move refused")

let [x, y] = pairOf(g)
g = flip(g, "a", x)
assert(S(g).flipped.length === 1 && S(g).flipped[0].tile === x && S(g).flipped[0].pic === g.hidden.layout[x], "first flip shows its picture")
assert(JSON.stringify(g.state).match(/"pic"/g)!.length === 1, "only the flipped tile's picture is public")
throws(() => flip(g, "a", x), /already up/, "flipping the same tile again refused")
const seqBefore = g.state.seq
g = flip(g, "a", y)
assert(g.state.seq === seqBefore + 1, "every change bumps seq")
assert(S(g).matched.length === 1 && S(g).matched[0].by === "a" && S(g).pairs.a === 1 && S(g).total.a === 1, "a match is a's pair")
assert(S(g).turn === "a" && S(g).phase === "play" && S(g).flipped.length === 0, "a match keeps the turn")
throws(() => flip(g, "a", x), /already up/, "a matched tile can't be flipped")

// A miss: peek, then the turn passes
;[x, y] = missOf(g)
g = flip(g, "a", x)
g = flip(g, "a", y)
const nextUp = S(g).turn
assert(S(g).phase === "peek" && S(g).flipped.length === 2 && S(g).peekBy === "a", "a miss is shown (peek)")
assert(nextUp !== "a" && S(g).peekUntil === clock + MEMORY_PEEK_MS, "the turn moves on, the peek has a deadline")
throws(() => flip(g, nextUp, pairOf(g)[0]), /flipping back/, "no flips during the peek")
function tickNoop(step: Step) {
  const out = memoryEngine.act({ ...step, secrets: {}, uid: "x", action: { type: "tick" }, now: clock, gone: [], rand })
  return out.state.seq === step.state.seq
}
assert(tickNoop(g), "an early tick changes nothing")
clock += MEMORY_PEEK_MS
const afterPeek = tick(g)
assert(S(afterPeek).phase === "play" && S(afterPeek).flipped.length === 0 && S(afterPeek).turn === nextUp, "the tick flips the miss back")
// …or the next player's flip resolves it first
const [p1] = missOf(g)
g = flip(g, nextUp, p1)
assert(S(g).phase === "play" && S(g).flipped.length === 1 && S(g).flipped[0].tile === p1, "the next flip after the peek flips back first")

/* ── Idle ────────────────────────────────────────────────────────── */

const idler = S(g).turn
clock += MEMORY_IDLE_MS - 1
assert(tickNoop(g), "not idle yet")
clock += 1
g = tick(g)
assert(S(g).turn !== idler && S(g).flipped.length === 0 && S(g).phase === "play", "an idle turn passes and the tile flips back")
throws(() => flip(g, idler, 0), /not your turn/, "the idler can't flip any more")

/* ── Leaving ─────────────────────────────────────────────────────── */

const leaver = S(g).turn
g = tick(g, [leaver])
assert(S(g).turn !== leaver, "a player who left is skipped")
const stay = S(g).players.filter((p) => p !== leaver)
g = tick(g, [leaver, stay[0]])
assert(S(g).phase === "over" && S(g).result!.winnerIds.join() === stay[1] && S(g).result!.reason === "abandoned", "the last one standing wins")
throws(() => tick(g), /over/, "nothing after the end")
const ghosts = tick(begin(["a", "b"], {}), ["a", "b"])
assert((ghosts.state.result!.winnerIds ?? []).length === 0 && ghosts.state.result!.reason === "everyone_left", "everyone left: no winner")

/* ── Rounds ──────────────────────────────────────────────────────── */

/** Plays a round out: `who` finds `n` pairs (on their turns), the other the rest. */
function playRound(step: Step, finder: (pairNo: number) => string): Step {
  let k = 0
  while (S(step).phase === "play") {
    const want = finder(k)
    // Get `want` on turn by missing
    let guard = 0
    while (S(step).turn !== want) {
      const [m1, m2] = missOf(step)
      const t = S(step).turn
      step = flip(step, t, m1)
      step = flip(step, t, m2)
      clock += MEMORY_PEEK_MS
      step = tick(step)
      if (++guard > 10) throw new Error("can't get the turn")
    }
    const [a1, a2] = pairOf(step)
    step = flip(step, want, a1)
    step = flip(step, want, a2)
    k++
  }
  return step
}

let m = begin(["a", "b"], { size: 16, rounds: 3 })
m = playRound(m, (k) => (k < 5 ? "a" : "b")) // a 5, b 3
assert(S(m).phase === "roundover" && S(m).wins.a === 1 && S(m).wins.b === 0 && S(m).lastWinners.join() === "a", "round 1 to a")
assert(S(m).turn === "", "nobody's turn between rounds")
throws(() => flip(m, "a", 0), /round is over/, "no flips between rounds")
assert(tickNoop(m), "the next round waits for its pause")
clock += MEMORY_ROUND_PAUSE_MS
const r1Layout = m.hidden.layout.join()
m = tick(m)
assert(S(m).round === 2 && S(m).phase === "play" && S(m).matched.length === 0 && S(m).pairs.a === 0 && S(m).total.a === 5, "round 2 dealt fresh")
assert(m.hidden.layout.join() !== r1Layout, "a new layout")
m = playRound(m, (k) => (k < 4 ? "a" : "b")) // 4–4: shared
assert(S(m).wins.a === 2 && S(m).wins.b === 1 && S(m).lastWinners.length === 2, "a tied round counts for both")
clock += MEMORY_ROUND_PAUSE_MS
m = tick(m)
assert(S(m).phase === "over" && m.state.result!.winnerIds.join() === "a" && m.state.result!.reason === "rounds_over", "first to 2 takes best of 3")
assert(m.state.result!.stats!.a.pairs === 9 && m.state.result!.stats!.a.rounds === 2, "stats: pairs and rounds")

// Best of 1, a tie: draw
let d = begin(["a", "b"], { size: 16, rounds: 1 })
d = playRound(d, (k) => (k < 4 ? "a" : "b"))
clock += MEMORY_ROUND_PAUSE_MS
d = tick(d)
assert((d.state.result!.winnerIds ?? []).length === 0 && d.state.result!.reason === "draw", "4–4 in one round: a draw")

// Three rounds, 1–1–1 across three players: most pairs overall wins
let t = begin(["a", "b", "c"], { size: 16, rounds: 3 })
t = playRound(t, (k) => (k < 6 ? "a" : "b")) // a 6, b 2
clock += MEMORY_ROUND_PAUSE_MS
t = tick(t)
t = playRound(t, (k) => (k < 5 ? "b" : "c")) // b 5, c 3
clock += MEMORY_ROUND_PAUSE_MS
t = tick(t)
t = playRound(t, (k) => (k < 5 ? "c" : "a")) // c 5, a 3
assert(S(t).wins.a === 1 && S(t).wins.b === 1 && S(t).wins.c === 1, "1–1–1")
clock += MEMORY_ROUND_PAUSE_MS
t = tick(t)
assert(t.state.result!.winnerIds.join() === "a", "tiebreak: most pairs overall (a 9)")
assert(t.state.result!.ranking!.join() === "a,c,b", "ranked by rounds, then pairs")

console.log("memory: all tests passed")
