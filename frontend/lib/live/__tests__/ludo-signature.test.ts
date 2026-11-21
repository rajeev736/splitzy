/** npx tsx lib/live/__tests__/ludo-signature.test.ts — character signature powers and power-ups that fizzle out. */
import { CHARACTERS } from "../../../components/game-avatar/registry"
import { CHARACTER_POWER, characterPower } from "../character-powers"
import type { RoomPlayer } from "../types"
import {
  applyExpiry,
  applyMove,
  applyPower,
  applyRoll,
  applySignature,
  describeLast,
  heldPowers,
  initialLudoState,
  nextExpiry,
  passTurn,
  POWER_KINDS,
  POWER_TTL_MS,
  trackIndex,
  type LudoState,
  type PowerKind,
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

const player = (uid: string, seat: number, avatar?: string): RoomPlayer => ({
  uid,
  name: uid.toUpperCase(),
  seat,
  joinedAt: seat,
  online: true,
  lastSeen: 0,
  ...(avatar ? { avatar } : {}),
})
function withTokens(state: LudoState, tokens: Record<string, number[]>): LudoState {
  const players = { ...state.players }
  for (const [uid, t] of Object.entries(tokens)) players[uid] = { ...players[uid], tokens: [...t] }
  return { ...state, players }
}
/** The database drops `undefined`: no state we write may contain one. */
function noUndefined(v: unknown, path = "state"): void {
  if (v === undefined) throw new Error(`undefined at ${path}`)
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) noUndefined(x, `${path}.${k}`)
}

console.log("Running Ludo signature / power timer tests...\n")

// Every character has exactly one power; every kind comes with a basic (free or cheap) character
{
  for (const c of CHARACTERS) assert(POWER_KINDS.includes(CHARACTER_POWER[c.id]), `${c.id} has a power`)
  const ids = new Set(CHARACTERS.map((c) => c.id))
  for (const id of Object.keys(CHARACTER_POWER)) assert(ids.has(id), `${id} is a real character`)
  for (const kind of POWER_KINDS)
    assert(
      CHARACTERS.some((c) => c.tier === "basic" && CHARACTER_POWER[c.id] === kind),
      `${kind} comes with a basic character — a faked avatar buys little`
    )
  assert(characterPower("zenko") === "jump" && characterPower(undefined) === null, "lookup")
  assert(characterPower("nobody") === null && characterPower("toString") === null, "unknown ids get nothing")
}
console.log("✓ every character has one power")

// Game start: the equipped character's power, Power Ludo only
{
  const room = [player("a", 0, "zenko"), player("b", 1, "bijou"), player("c", 2)]
  const s = initialLudoState(room, { mode: "powers" }, "SEED")
  assert(s.players.a.signature?.kind === "jump" && s.players.a.signature.used === false, "Zenko jumps")
  assert(s.players.b.signature?.kind === "freeze", "Bijou freezes")
  assert(!s.players.c.signature, "no character, no signature")
  assert(!initialLudoState(room, {}, "SEED").players.a.signature, "classic Ludo has none")
  noUndefined(s)
}
console.log("✓ signature at the start")

// Using it: once per game, on your turn before rolling
{
  const c = { now: 1000, rand: () => 0.5 }
  const room = [player("a", 0, "bijou"), player("b", 1, "zenko"), player("c", 2)]
  const base = withTokens(initialLudoState(room, { mode: "powers" }, "SEED"), { a: [10, -1, -1, -1], b: [10, 20, -1, -1] })
  const f = applySignature(base, "a", { uid: "b", token: 0 }, c)
  assert(f.frozen?.["b:0"] === 3, "froze b's piece")
  assert(f.players.a.signature?.used === true && f.players.a.signature.kind === "freeze", "marked used")
  assert(f.turn === "a" && f.phase === "roll", "keeps the turn")
  assert(f.last?.type === "power" && f.last.signature === true && f.last.kind === "freeze", "the log knows it's a signature")
  assert(describeLast(f, (u) => u).startsWith("★"), "signature log line")
  throws(() => applySignature(f, "a", { uid: "b", token: 1 }, c), "can't use it twice")
  throws(() => applySignature(base, "b", { uid: "b", token: 0 }, c), "only on your turn")
  throws(() => applySignature(base, "c", null, c), "no character, no signature")
  throws(() => applySignature(base, "a", { uid: "a", token: 0 }, c), "same targets as the power-up: freeze needs a rival")
  const rolled = applyRoll(base, "a", 3, c)
  throws(() => applySignature(rolled, "a", { uid: "b", token: 0 }, c), "not after rolling")
  // Doesn't touch held powers, and held ones don't touch it
  const both: LudoState = { ...base, players: { ...base.players, a: { ...base.players.a, powers: ["freeze"] } } }
  const viaHeld = applyPower(both, "a", "freeze", { uid: "b", token: 0 }, c)
  assert(!viaHeld.players.a.powers && viaHeld.players.a.signature?.used === false, "a held freeze leaves the signature")
  const viaSig = applySignature(both, "a", { uid: "b", token: 0 }, c)
  assert(viaSig.players.a.powers?.[0] === "freeze", "the signature leaves held powers")
  // Zenko's jump on their own piece
  const j = applySignature({ ...base, turn: "b" }, "b", { uid: "b", token: 1 }, c)
  assert(j.players.b.tokens[1] === 24 && j.players.b.signature?.used, "jumped 4")
  noUndefined(f)
  noUndefined(j)
}
console.log("✓ signature once per game")

// Teams: a signature can't hit your partner
{
  const c = { now: 1000 }
  const room = [player("a", 0, "cinder"), player("b", 1), player("c", 2), player("d", 3)]
  let s = initialLudoState(room, { mode: "powers", teams: "2v2" }, "SEED")
  s = withTokens(s, { b: [5, -1, -1, -1], c: [8, -1, -1, -1] })
  assert(s.players.a.signature?.kind === "push", "Cinder pushes")
  throws(() => applySignature(s, "a", { uid: "c", token: 0 }, c), "can't push your partner back")
  const p = applySignature(s, "a", { uid: "b", token: 0 }, c)
  assert(p.players.b.tokens[0] === 0 && p.players.a.signature?.used, "pushed a rival")
  // Fuzzby's shield on a partner? Own pieces only
  const room2 = [player("a", 0, "fuzzby"), player("b", 1), player("c", 2), player("d", 3)]
  const t = withTokens(initialLudoState(room2, { mode: "powers", teams: "2v2" }, "SEED"), { a: [4, -1, -1, -1], c: [8, -1, -1, -1] })
  throws(() => applySignature(t, "a", { uid: "c", token: 0 }, c), "shield is for your own pieces")
  assert(applySignature(t, "a", { uid: "a", token: 0 }, c).shield?.["a:0"] === 3, "shielded your own")
}
console.log("✓ signatures and partners")

// Power-ups from the track fizzle out after POWER_TTL_MS
{
  const t0 = 50_000
  const c = { now: t0, rand: () => 0.5 }
  const room = [player("a", 0, "sheru"), player("b", 1), player("c", 2)]
  const base = withTokens(initialLudoState(room, { mode: "powers" }, "SEED"), { a: [10, -1, -1, -1], b: [10, 20, -1, -1] })
  const sq = trackIndex("red", 13)
  let s: LudoState = { ...base, spawns: [{ sq, kind: "shield" as PowerKind }] }
  s = applyMove(applyRoll(s, "a", 3, c), "a", 0, 3, c)
  assert(s.players.a.powers?.[0] === "shield" && s.players.a.until?.[0] === t0 + POWER_TTL_MS, "picked up with a deadline")
  assert(nextExpiry(s) === t0 + POWER_TTL_MS, "next expiry")
  noUndefined(s)
  // a got a 3: no bonus, so it's b's turn. Back to a later:
  const later = (ms: number) => ({ now: t0 + ms, rand: () => 0.5 })
  const aTurn: LudoState = { ...s, turn: "a", phase: "roll" }
  const ok = applyPower(aTurn, "a", "shield", { uid: "a", token: 0 }, later(POWER_TTL_MS - 1))
  assert(ok.shield?.["a:0"] === 3 && !ok.players.a.powers && !ok.players.a.until, "usable just before its time is up")
  throws(() => applyPower(aTurn, "a", "shield", { uid: "a", token: 0 }, later(POWER_TTL_MS)), "can't use it once it's gone")

  // Dropped by any step once expired, and the step's last says so
  const rolled = applyRoll({ ...s, turn: "b" }, "b", 2, later(POWER_TTL_MS + 5))
  assert(!rolled.players.a.powers && !rolled.players.a.until, "dropped on the next step")
  assert(rolled.last?.type === "roll" && rolled.last.expired?.[0]?.uid === "a" && rolled.last.expired[0].kind === "shield", "the roll carries the news")
  noUndefined(rolled)
  const passed = passTurn({ ...s, turn: "b" }, "b", "idle", later(POWER_TTL_MS + 5))
  assert(!passed.players.a.powers && passed.last?.expired?.length === 1, "and on a passed turn")

  // The referee drops it between moves, leaving the turn and its clock alone
  const mid = applyRoll({ ...s, turn: "b", turnAt: 777 }, "b", 2, later(1000))
  assert(mid.phase === "move", "b is choosing a piece")
  throws(() => applyExpiry(mid, later(2000)), "nothing to drop yet")
  const ex = applyExpiry({ ...mid, turnAt: 777 }, later(POWER_TTL_MS))
  assert(!ex.players.a.powers && ex.last?.type === "expired" && ex.last.by === "a", "expired event")
  assert(ex.turn === "b" && ex.phase === "move" && ex.dice === mid.dice && ex.turnAt === 777, "turn, roll and clock untouched")
  assert(ex.seq === mid.seq + 1, "a new state")
  assert(describeLast(ex, (u) => u.toUpperCase()) === "A's Shield fizzled out", "log line")
  assert(nextExpiry(ex) === null, "nothing left ticking")
  noUndefined(ex)

  // The signature never fizzles out
  const old = applySignature({ ...aTurn, turn: "a" }, "a", null, later(10 * POWER_TTL_MS))
  assert(old.players.a.double === true && old.players.a.signature?.used, "Sheru's double, long after")
  throws(() => applyExpiry({ ...base }, later(10 * POWER_TTL_MS)), "a signature isn't dropped")
}
console.log("✓ power-ups fizzle out")

// Two of a kind: the one closer to its deadline goes first; others keep ticking
{
  const c = { now: 10_000 }
  const room = [player("a", 0), player("b", 1)]
  let s = withTokens(initialLudoState(room, { mode: "powers" }, "SEED"), { a: [10, -1, -1, -1], b: [10, -1, -1, -1] })
  s = { ...s, players: { ...s.players, a: { ...s.players.a, powers: ["freeze", "double", "freeze"], until: [90_000, 0, 40_000] } } }
  const u = applyPower(s, "a", "freeze", { uid: "b", token: 0 }, c)
  assert(heldPowers(u.players.a).map((h) => `${h.kind}@${h.until}`).join() === "freeze@90000,double@0", "the sooner freeze went")
  // Older games: powers without deadlines never expire
  const legacy: LudoState = { ...s, players: { ...s.players, a: { ...s.players.a, powers: ["push"], until: undefined } } }
  delete legacy.players.a.until
  const kept = applyRoll(legacy, "a", 2, { now: 10 ** 12 })
  assert(kept.players.a.powers?.[0] === "push" && !kept.last?.expired, "no deadline, no expiry")
  // A new power next to an old one: the old one gets 0 (never), the new one a deadline
  const sq = trackIndex("red", 13)
  const mixed = applyMove(applyRoll({ ...legacy, spawns: [{ sq, kind: "jump" }] }, "a", 3, { now: 5 }), "a", 0, 3, { now: 5 })
  assert(mixed.players.a.until?.join() === `0,${5 + POWER_TTL_MS}`, "padded deadlines")
  noUndefined(mixed)
}
console.log("✓ deadlines with several powers")

console.log("\nAll Ludo signature tests passed.")
