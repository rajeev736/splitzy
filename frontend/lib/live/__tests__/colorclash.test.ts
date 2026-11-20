/** npx tsx lib/live/__tests__/colorclash.test.ts */
import {
  CC_COLOURS,
  CC_DECK_SIZE,
  CC_ROUND_BREAK_MS,
  CC_TURN_MS,
  canPlayOn,
  cardOf,
  colorClashEngine as engine,
  playableCards,
  type CCColour,
  type CCKind,
  type ColorClashHand,
  type ColorClashHidden,
  type ColorClashState,
} from "../colorclash"
import type { HostedAction, HostedStep } from "../hosted"

type Step = HostedStep<ColorClashState, ColorClashHand, ColorClashHidden>

function assert(c: unknown, m: string) {
  if (!c) throw new Error(`Assertion failed: ${m}`)
}
function throws(fn: () => unknown, m: string) {
  try {
    fn()
  } catch {
    return
  }
  throw new Error(`Expected a refusal: ${m}`)
}

/** A seeded random (mulberry32), so runs repeat. */
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

/** The id of a card: the n-th of its kind (0-based) of a colour. */
function find(colour: CCColour | null, kind: CCKind, value = -1, nth = 0): number {
  let seen = 0
  for (let id = 0; id < CC_DECK_SIZE; id++) {
    const c = cardOf(id)
    if (c.colour === colour && c.kind === kind && (kind !== "num" || c.value === value)) {
      if (seen === nth) return id
      seen++
    }
  }
  throw new Error("no such card")
}
const R = (v: number, n = 0) => find("red", "num", v, n)
const B = (v: number, n = 0) => find("blue", "num", v, n)
const G = (v: number, n = 0) => find("green", "num", v, n)
const Y = (v: number, n = 0) => find("yellow", "num", v, n)

let now = 1_000_000
const rand = seeded(7)

function move(step: Step, uid: string, action: HostedAction, gone: string[] = []): Step {
  return engine.act({ ...step, uid, action: { seq: step.state.seq, ...action }, now, gone, rand })
}

/**
 * A hand-built table: `hands` in seat order, `top` showing (in `colour`),
 * `draw` the pile (top = last). Turn: the first player.
 */
function table(hands: Record<string, number[]>, top: number, opts: Partial<ColorClashState> & { draw?: number[]; discard?: number[] } = {}): Step {
  const order = Object.keys(hands)
  const used = new Set([...Object.values(hands).flat(), top, ...(opts.discard ?? [])])
  const draw = opts.draw ?? Array.from({ length: CC_DECK_SIZE }, (_, i) => i).filter((i) => !used.has(i))
  const zero = () => Object.fromEntries(order.map((p) => [p, 0]))
  const state: ColorClashState = {
    seq: 5,
    phase: "play",
    turn: order[0],
    turnAt: now,
    order,
    direction: 1,
    dealer: order[order.length - 1],
    top,
    colour: cardOf(top).colour ?? "red",
    discardCount: 1,
    drawCount: draw.length,
    counts: Object.fromEntries(order.map((p) => [p, hands[p].length])),
    round: 1,
    rounds: 1,
    wins: zero(),
    points: zero(),
    ...opts,
  }
  delete (state as Partial<typeof opts>).draw
  delete (state as Partial<typeof opts>).discard
  return {
    state,
    secrets: Object.fromEntries(order.map((p) => [p, { hand: [...hands[p]] }])),
    hidden: { draw: [...draw], discard: [...(opts.discard ?? []), top] },
  }
}
const hand = (s: Step, p: string) => s.secrets[p]?.hand ?? []

/* ── Deck and dealing ─────────────────────────────────────────────────── */
{
  const kinds: Record<string, number> = {}
  for (let id = 0; id < CC_DECK_SIZE; id++) {
    const c = cardOf(id)
    const k = `${c.colour ?? "wild"}:${c.kind}:${c.value}`
    kinds[k] = (kinds[k] ?? 0) + 1
  }
  for (const col of CC_COLOURS) {
    assert(kinds[`${col}:num:0`] === 1, `one ${col} 0`)
    for (let v = 1; v <= 9; v++) assert(kinds[`${col}:num:${v}`] === 2, `two ${col} ${v}`)
    for (const k of ["skip", "reverse", "draw2"]) assert(kinds[`${col}:${k}:-1`] === 2, `two ${col} ${k}`)
  }
  assert(kinds["wild:wild:-1"] === 4 && kinds["wild:wild4:-1"] === 4, "4 Wild + 4 Wild +4")

  for (let seed = 1; seed <= 40; seed++) {
    const players = ["a", "b", "c", "d", "e", "f"].slice(0, 2 + (seed % 5))
    const s = engine.start({ players, names: {}, options: { rounds: 3 }, rand: seeded(seed), now })
    const all = [...players.flatMap((p) => hand(s, p)), ...s.hidden.draw, ...s.hidden.discard]
    assert(all.length === CC_DECK_SIZE && new Set(all).size === CC_DECK_SIZE, "every card exactly once")
    assert(cardOf(s.state.top).kind !== "wild4", "never starts on a Wild +4")
    assert(s.state.rounds === 3 && s.state.round === 1 && s.state.seq === 1, "best of 3, round 1")
    const top = cardOf(s.state.top)
    for (const p of players) {
      const extra = top.kind === "draw2" && p === s.state.order[(s.state.order.indexOf(s.state.dealer) + 1) % players.length] ? 2 : 0
      assert(hand(s, p).length === 7 + extra && s.state.counts[p] === 7 + extra, "7 each (+2 for a Draw Two start)")
    }
    assert(s.state.drawCount === s.hidden.draw.length && s.state.discardCount === 1, "pile counts")
    assert(!("draw" in s.state) && !JSON.stringify(s.state).includes('"hand"'), "no cards on the public table")
    if (top.kind === "wild") assert(s.state.phase === "choose", "a Wild start: choose a colour")
  }
  // Odd option values fall back to one round
  assert(engine.start({ players: ["a", "b"], names: {}, options: { rounds: 4 }, rand, now }).state.rounds === 1, "rounds 4 → 1")
}

/* ── First card effects ───────────────────────────────────────────────── */
{
  // Search seeds for each kind of first card (3 players; dealer → first is next)
  const seen = new Set<string>()
  for (let seed = 1; seed < 3000 && seen.size < 5; seed++) {
    const s = engine.start({ players: ["a", "b", "c"], names: {}, options: {}, rand: seeded(seed), now })
    const kind = cardOf(s.state.top).kind
    if (seen.has(kind)) continue
    seen.add(kind)
    const o = s.state.order
    const d = o.indexOf(s.state.dealer)
    const first = o[(d + 1) % 3]
    const second = o[(d + 2) % 3]
    if (kind === "num") assert(s.state.turn === first && s.state.phase === "play", "number: left of dealer starts")
    if (kind === "skip") assert(s.state.turn === second, "skip: first player skipped")
    if (kind === "reverse") assert(s.state.turn === s.state.dealer && s.state.direction === -1, "reverse: dealer starts, other way")
    if (kind === "draw2") assert(s.state.turn === second && s.state.counts[first] === 9, "draw two: first draws 2, skipped")
    if (kind === "wild") {
      assert(s.state.turn === first && s.state.phase === "choose", "wild: first player chooses")
      throws(() => move(s, first, { type: "play", card: hand(s, first)[0] }), "no playing before the colour")
      const t = move(s, first, { type: "choose", colour: "green" })
      assert(t.state.phase === "play" && t.state.colour === "green" && t.state.turn === first, "chose green, still their turn")
    }
  }
  assert(seen.size === 5, "found every first-card kind")
}

/* ── Legal plays ──────────────────────────────────────────────────────── */
{
  const s = table({ a: [R(5), B(7), G(3), find(null, "wild")], b: [Y(1), Y(2)] }, B(5))
  throws(() => move(s, "b", { type: "play", card: Y(1) }), "out of turn")
  throws(() => move(s, "a", { type: "play", card: G(3) }), "no match")
  throws(() => move(s, "a", { type: "play", card: Y(1) }), "not in hand")
  throws(() => move(s, "a", { type: "play", card: find(null, "wild") }), "wild needs a colour")
  const byNumber = move(s, "a", { type: "play", card: R(5) })
  assert(byNumber.state.top === R(5) && byNumber.state.colour === "red" && byNumber.state.turn === "b", "same number, colour changes")
  assert(byNumber.state.seq === 6 && byNumber.state.counts.a === 3 && hand(byNumber, "a").length === 3, "counted")
  assert(byNumber.state.last?.[0]?.t === "play", "last: play")
  const byColour = move(s, "a", { type: "play", card: B(7) })
  assert(byColour.state.top === B(7), "same colour")
  const wild = move(s, "a", { type: "play", card: find(null, "wild"), colour: "yellow" })
  assert(wild.state.colour === "yellow" && wild.state.turn === "b", "wild picks the colour")
  assert(playableCards(s.state, hand(s, "a")).size === 3, "R5, B7, Wild playable")
  // Symbols match symbols
  assert(canPlayOn(cardOf(find("red", "skip")), cardOf(find("blue", "skip")), "blue"), "skip on skip")
  assert(!canPlayOn(cardOf(find("red", "skip")), cardOf(find("blue", "reverse")), "blue"), "skip not on reverse")
  // The secret is only the hand
  assert(Object.keys(byNumber.secrets.a).join() === "hand", "secret = hand only")
}

/* ── Action cards ─────────────────────────────────────────────────────── */
{
  const three = (a: number[], top: number, opts: Partial<ColorClashState> = {}) =>
    table({ a, b: [G(1), G(2), G(3)], c: [Y(1), Y(2), Y(3)] }, top, opts)
  // Skip
  let s = move(three([find("red", "skip"), R(1)], R(9)), "a", { type: "play", card: find("red", "skip") })
  assert(s.state.turn === "c", "skip skips b")
  // Reverse (3 players): direction flips, back to c
  s = move(three([find("red", "reverse"), R(1)], R(9)), "a", { type: "play", card: find("red", "reverse") })
  assert(s.state.direction === -1 && s.state.turn === "c", "reverse: c next")
  s = move(s, "c", { type: "draw" })
  assert(s.state.turn === "b" || s.state.drew === true, "then b (going backwards)")
  // Draw Two
  s = move(three([find("red", "draw2"), R(1)], R(9)), "a", { type: "play", card: find("red", "draw2") })
  assert(s.state.counts.b === 5 && s.state.turn === "c", "b draws 2 and is skipped")
  assert(s.state.last?.some((e) => e.t === "draw" && e.by === "b" && e.n === 2), "draw event")
  // No stacking: b can't answer a +2 (it's not b's turn)
  // Wild +4, accepted
  const w4 = find(null, "wild4")
  s = move(three([w4, R(1)], R(9)), "a", { type: "play", card: w4, colour: "blue" })
  assert(s.state.phase === "challenge" && s.state.turn === "b" && s.state.colour === "blue", "+4 waits on b")
  throws(() => move(s, "b", { type: "draw" }), "b must answer the +4")
  const took = move(s, "b", { type: "accept" })
  assert(took.state.counts.b === 7 && took.state.turn === "c" && took.state.phase === "play", "b takes 4, skipped")
  // Wild +4, challenged — guilty (a held a red)
  const caught = move(s, "b", { type: "challenge" })
  assert(caught.state.counts.a === 5 && caught.state.counts.b === 3 && caught.state.turn === "b", "a draws 4, b plays on")
  assert(caught.state.last?.some((e) => e.t === "challenge" && e.guilty), "guilty")
  // Wild +4, challenged — innocent (a held no red)
  s = move(three([w4, B(1)], R(9)), "a", { type: "play", card: w4, colour: "green" })
  const wrong = move(s, "b", { type: "challenge" })
  assert(wrong.state.counts.b === 9 && wrong.state.turn === "c" && wrong.state.counts.a === 1, "b draws 6, skipped")
  // 2 players: reverse = skip
  s = table({ a: [find("red", "reverse"), R(1)], b: [G(1), G(2)] }, R(9))
  s = move(s, "a", { type: "play", card: find("red", "reverse") })
  assert(s.state.turn === "a", "2p reverse: your turn again")
  s = table({ a: [find("red", "skip"), R(1)], b: [G(1), G(2)] }, R(9))
  assert(move(s, "a", { type: "play", card: find("red", "skip") }).state.turn === "a", "2p skip: again")
  s = table({ a: [find("red", "draw2"), R(1)], b: [G(1), G(2)] }, R(9))
  s = move(s, "a", { type: "play", card: find("red", "draw2") })
  assert(s.state.turn === "a" && s.state.counts.b === 4, "2p draw two: b draws, a again")
}

/* ── Draw, then play or pass ──────────────────────────────────────────── */
{
  // Draw pile top (last) is a playable R3
  let s = table({ a: [G(1), G(2)], b: [Y(1), Y(2)] }, R(9), { draw: [B(4), R(3)] })
  throws(() => move(s, "a", { type: "pass" }), "can't pass before drawing")
  s = move(s, "a", { type: "draw" })
  assert(s.state.drew === true && s.state.turn === "a" && hand(s, "a").at(-1) === R(3), "drew a playable R3")
  assert(playableCards(s.state, hand(s, "a")).has(R(3)) && playableCards(s.state, hand(s, "a")).size === 1, "only it")
  throws(() => move(s, "a", { type: "draw" }), "one draw a turn")
  throws(() => move(s, "a", { type: "play", card: G(1) }), "only the drawn card")
  const played = move(s, "a", { type: "play", card: R(3) })
  assert(played.state.top === R(3) && played.state.turn === "b" && !played.state.drew, "played it")
  const passed = move(s, "a", { type: "pass" })
  assert(passed.state.turn === "b" && passed.state.counts.a === 3, "or passed")
  // Unplayable: the turn passes at once
  s = table({ a: [G(1), G(2)], b: [Y(1), Y(2)] }, R(9), { draw: [R(3), B(4)] })
  s = move(s, "a", { type: "draw" })
  assert(s.state.turn === "b" && !s.state.drew && s.state.counts.a === 3, "B4 unplayable: b's turn")
}

/* ── Reshuffle ────────────────────────────────────────────────────────── */
{
  // Empty draw pile; the discard pile holds 3 under the top
  let s = table({ a: [G(1), G(2)], b: [Y(1), Y(2)] }, R(9), { draw: [], discard: [B(1), B(2), B(3)] })
  s = move(s, "a", { type: "draw" })
  assert(s.state.counts.a === 3, "drew from the reshuffled discards")
  assert(s.hidden.discard.length === 1 && s.hidden.discard[0] === R(9) && s.state.top === R(9), "top card stays")
  assert(s.state.drawCount === 2 && s.state.discardCount === 1, "pile counts after reshuffle")
  assert(s.state.last?.some((e) => e.t === "reshuffle"), "reshuffle event")
  // Nothing to draw at all: just passes
  s = table({ a: [G(1), G(2)], b: [Y(1), Y(2)] }, R(9), { draw: [], discard: [] })
  s = move(s, "a", { type: "draw" })
  assert(s.state.turn === "b" && s.state.counts.a === 2, "nothing to draw: pass")
}

/* ── One! and Catch! ──────────────────────────────────────────────────── */
{
  const base = () => table({ a: [R(1), R(2)], b: [G(1), G(2), G(3)], c: [Y(1), Y(2), Y(3)] }, R(9), { draw: [B(1), B(2), B(3), B(4), B(5), B(6)] })
  // Forgot: caught by c before b acts
  let s = move(base(), "a", { type: "play", card: R(1) })
  assert(s.state.exposed === "a", "a forgot")
  throws(() => move(s, "a", { type: "catch" }), "can't catch yourself")
  const caught = move(s, "c", { type: "catch", target: "a" })
  assert(caught.state.counts.a === 3 && !caught.state.exposed && caught.state.turn === "b", "a draws 2")
  assert(caught.state.last?.some((e) => e.t === "catch" && e.by === "c" && e.target === "a"), "catch event")
  // Called it late but before anyone caught: safe
  const saved = move(s, "a", { type: "one" })
  assert(!saved.state.exposed && saved.state.one?.a, "a called it")
  throws(() => move(saved, "c", { type: "catch" }), "too late to catch")
  // The next player acted: window closed
  const acted = move(s, "b", { type: "draw" })
  assert(!acted.state.exposed, "b acted: a is safe")
  throws(() => move(acted, "c", { type: "catch" }), "window closed")
  // Called at two on their turn: safe after playing
  s = move(base(), "a", { type: "one" })
  assert(s.state.one?.a, "called at two")
  s = move(s, "a", { type: "play", card: R(1) })
  assert(!s.state.exposed && s.state.one?.a, "safe at one")
  // Not allowed with three cards, nor at two off turn
  throws(() => move(base(), "b", { type: "one" }), "three cards")
  // A call at two that turns into a draw is forgotten
  s = move(base(), "a", { type: "one" })
  s = move(s, "a", { type: "draw" })
  assert(!s.state.one?.a, "drew: the call is gone")
}

/* ── Going out, scoring, best of ──────────────────────────────────────── */
{
  const w = find(null, "wild")
  // b holds: 7 + Skip (20) + Wild (50) = 77; c: 0 + 9 = 9 → 86
  let s = table({ a: [R(1)], b: [G(7), find("green", "skip"), w], c: [Y(0), Y(9)] }, R(9), { rounds: 3, one: { a: true } })
  s = move(s, "a", { type: "play", card: R(1) })
  assert(s.state.phase === "roundOver" && s.state.turn === "" && s.state.wins.a === 1 && s.state.points.a === 86, "a scores 86")
  assert(s.state.summary?.winner === "a" && s.state.summary.points === 86 && s.state.summary.hands.b.length === 3, "summary shows hands")
  assert(s.state.last?.some((e) => e.t === "roundWon"), "roundWon event")
  // Tick before the break is over: nothing; after: round 2
  assert(move(s, "b", { type: "tick" }).state.seq === s.state.seq, "too early")
  now += CC_ROUND_BREAK_MS
  let r2 = move(s, "b", { type: "tick" })
  assert(r2.state.round === 2 && (r2.state.phase === "play" || r2.state.phase === "choose"), "round 2 dealt")
  assert(r2.state.dealer !== s.state.dealer, "the deal moves on")
  assert(["a", "b", "c"].every((p) => r2.state.counts[p] >= 7), "fresh hands")
  // "next" starts it too
  r2 = move(s, "c", { type: "next" })
  assert(r2.state.round === 2, "next round on request")
  // Second win of three: match over
  let m = table({ a: [R(1)], b: [G(7)] }, R(9), { rounds: 3, one: { a: true }, wins: { a: 1, b: 0 }, points: { a: 10, b: 0 }, round: 2 })
  m = move(m, "a", { type: "play", card: R(1) })
  assert(m.state.phase === "over" && m.state.result?.winnerIds.join() === "a" && m.state.result.reason === "rounds_over", "a wins the match 2–0")
  assert(m.state.result?.scores?.a === 17, "points as scores")
  throws(() => move(m, "b", { type: "draw" }), "game over")
  // One round: over at once
  m = table({ a: [R(1)], b: [G(7)] }, R(9), { one: { a: true } })
  assert(move(m, "a", { type: "play", card: R(1) }).state.phase === "over", "single round")
  // Best of 3 with 3 players, three different winners: most points wins
  m = table({ a: [R(1)], b: [G(7)], c: [Y(5)] }, R(9), { rounds: 3, round: 3, one: { a: true }, wins: { a: 0, b: 1, c: 1 }, points: { a: 0, b: 30, c: 5 } })
  m = move(m, "a", { type: "play", card: R(1) })
  assert(m.state.phase === "over" && m.state.result?.winnerIds.join() === "b", "after 3 rounds: most wins, then points (b 30)")
  // Going out on a +2 still makes the next player draw
  m = table({ a: [find("red", "draw2")], b: [G(7)] }, R(9), { one: { a: true } })
  m = move(m, "a", { type: "play", card: find("red", "draw2") })
  assert(m.state.counts.b === 3 && m.state.result?.scores?.a === 7 + (m.state.summary?.hands.b ?? []).slice(1).reduce((t, id) => t + (cardOf(id).kind === "num" ? cardOf(id).value : cardOf(id).kind.startsWith("wild") ? 50 : 20), 0), "+2 counts")
}

/* ── Idle turns ───────────────────────────────────────────────────────── */
{
  let s = table({ a: [R(1), R(2)], b: [G(1), G(2)] }, R(9), { draw: [B(1), R(3)] })
  assert(move(s, "b", { type: "tick" }).state.seq === s.state.seq, "not yet")
  now += CC_TURN_MS
  s = move(s, "b", { type: "tick" })
  assert(s.state.turn === "b" && s.state.counts.a === 3 && !s.state.drew, "a drew one and passed (even a playable one)")
  assert(s.state.last?.some((e) => e.t === "timeout" && e.by === "a"), "timeout event")
  // Idle on a +4: takes it
  const w4 = find(null, "wild4")
  s = table({ a: [w4, R(1)], b: [G(1), G(2)] }, R(9))
  s = move(s, "a", { type: "play", card: w4, colour: "blue" })
  now += CC_TURN_MS
  s = move(s, "a", { type: "tick" })
  assert(s.state.counts.b === 6 && s.state.turn === "a" && s.state.phase === "play", "idle b took the 4")
  // Idle after drawing a playable card: passes
  s = table({ a: [G(1), G(2)], b: [Y(1), Y(2)] }, R(9), { draw: [R(3)] })
  s = move(s, "a", { type: "draw" })
  now += CC_TURN_MS
  s = move(s, "b", { type: "tick" })
  assert(s.state.turn === "b" && s.state.counts.a === 3, "drew, then idle: passed")
  // Idle choosing the first colour: a colour is picked, then draw and pass
  s = table({ a: [G(1), G(2), B(3)], b: [Y(1), Y(2)] }, find(null, "wild"), { phase: "choose" })
  now += CC_TURN_MS
  s = move(s, "b", { type: "tick" })
  assert(s.state.colour === "green" && s.state.turn === "b" && s.state.counts.a === 4, "picked green (most held), drew and passed")
}

/* ── Players who left ─────────────────────────────────────────────────── */
{
  let s = table({ a: [R(1), R(2)], b: [G(1), G(2)], c: [Y(1), Y(2)] }, R(9))
  s = move(s, "a", { type: "play", card: R(1) }, ["b"])
  assert(s.state.turn === "c", "b left: skipped")
  // b's turn when b leaves: the next tick moves on at once
  s = table({ a: [R(1), R(2)], b: [G(1), G(2)], c: [Y(1), Y(2)] }, R(9), { turn: "b" })
  const t = move(s, "a", { type: "tick" }, ["b"])
  assert(t.state.turn === "c" && t.state.seq === s.state.seq + 1, "gone player's turn passes")
  throws(() => move(s, "b", { type: "draw" }, ["b"]), "gone can't play")
  // Only one left: they win
  const last = move(s, "a", { type: "tick" }, ["b", "c"])
  assert(last.state.phase === "over" && last.state.result?.winnerIds.join() === "a" && last.state.result.reason === "abandoned", "last one in wins")
  // Next round deals only to who's still in
  s = table({ a: [R(1)], b: [G(1), G(2)], c: [Y(1), Y(2)] }, R(9), { rounds: 3, one: { a: true } })
  s = move(s, "a", { type: "play", card: R(1) }, ["c"])
  s = move(s, "b", { type: "next" }, ["c"])
  assert(s.state.counts.c === 0 && s.state.counts.a >= 7 && s.state.turn !== "c", "c dealt out")
}

/* ── A full random game always ends cleanly ───────────────────────────── */
{
  for (let seed = 1; seed <= 30; seed++) {
    const r = seeded(seed * 31)
    const players = ["a", "b", "c", "d"].slice(0, 2 + (seed % 3))
    let s: Step = engine.start({ players, names: {}, options: { rounds: 3 }, rand: r, now })
    for (let i = 0; i < 4000 && s.state.phase !== "over"; i++) {
      const st = s.state
      const step = (uid: string, action: HostedAction) => engine.act({ ...s, uid, action, now, gone: [], rand: r })
      if (st.phase === "roundOver") s = step(players[0], { type: "next" })
      else if (st.phase === "choose") s = step(st.turn, { type: "choose", colour: CC_COLOURS[i % 4] })
      else if (st.phase === "challenge") s = step(st.turn, { type: i % 2 ? "challenge" : "accept" })
      else {
        const h = hand(s, st.turn)
        if (h.length === 2 && i % 3 === 0 && !st.one?.[st.turn]) s = step(st.turn, { type: "one" })
        else if (st.exposed && i % 2) s = step(players.find((p) => p !== st.exposed)!, { type: "catch" })
        else {
          const can = [...playableCards(st, h)]
          if (can.length) s = step(st.turn, { type: "play", card: can[0], colour: CC_COLOURS[i % 4] })
          else s = step(st.turn, { type: st.drew ? "pass" : "draw" })
        }
      }
      const cards = [...players.flatMap((p) => hand(s, p)), ...s.hidden.draw, ...s.hidden.discard]
      assert(cards.length === CC_DECK_SIZE && new Set(cards).size === CC_DECK_SIZE, `seed ${seed}: 108 cards always`)
      for (const p of players) assert(s.state.counts[p] === hand(s, p).length, "counts match")
    }
    assert(s.state.phase === "over" && !!s.state.result, `seed ${seed}: the match ended`)
  }
}

console.log("colorclash: all tests passed")
