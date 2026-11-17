/** npx tsx lib/live/__tests__/ludo-teams.test.ts */
import type { RoomMeta, RoomPlayer } from "../types"
import {
  applyMove,
  applyPower,
  applyRoll,
  areTeammates,
  describeLast,
  initialLudoState,
  isOver,
  nextTurn,
  rankingOf,
  resultOf,
  trackIndex,
  winningTeam,
  type LudoState,
} from "../ludo"
import {
  benchedPlayer,
  canMoveTo,
  canStart,
  freeSeats,
  isFull,
  isTeamRoom,
  resolveClash,
  seatsFor,
  teamOfSeat,
} from "../seats"

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

const player = (uid: string, seat: number, extra: Partial<RoomPlayer> = {}): RoomPlayer => ({
  uid,
  name: uid.toUpperCase(),
  seat,
  joinedAt: seat,
  online: true,
  lastSeen: 0,
  ...extra,
})
const four = () => Array.from({ length: 4 }, (_, i) => player("abcd"[i], i))
const teams = (options: Record<string, string> = {}) =>
  initialLudoState(four(), { teams: "2v2", ...options }, "SEED")

function withTokens(state: LudoState, tokens: Record<string, number[]>): LudoState {
  const players = { ...state.players }
  for (const [uid, t] of Object.entries(tokens)) players[uid] = { ...players[uid], tokens: [...t] }
  return { ...state, players }
}
const ctx = { now: 1000 }
function noUndefined(v: unknown, path = "state"): void {
  if (v === undefined) throw new Error(`undefined at ${path}`)
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) noUndefined(x, `${path}.${k}`)
}

console.log("Running Ludo team tests...\n")

// Setup: seats 0 + 2 against 1 + 3, partners opposite
{
  const s = teams()
  assert(s.teams === true, "a team game")
  assert(s.players.a.team === 0 && s.players.c.team === 0, "seats 0 and 2 are Team A")
  assert(s.players.b.team === 1 && s.players.d.team === 1, "seats 1 and 3 are Team B")
  assert(
    s.players.a.colour === "red" && s.players.c.colour === "yellow" && s.players.b.colour === "green" && s.players.d.colour === "blue",
    "partners' colours face each other across the board"
  )
  assert(areTeammates(s, "a", "c") && areTeammates(s, "b", "d") && !areTeammates(s, "a", "b") && !areTeammates(s, "a", "a"), "teammates")
  assert(nextTurn(s, "a") === "b" && nextTurn(s, "b") === "c" && nextTurn(s, "c") === "d", "turns alternate between the teams")
  noUndefined(s)
  // Teams need exactly four
  const three = initialLudoState(four().slice(0, 3), { teams: "2v2" }, "SEED")
  assert(!three.teams && three.players.a.team === undefined, "no teams with three players")
  assert(!initialLudoState(four(), {}, "SEED").teams, "no teams without the option")
  assert(!initialLudoState(four(), { teams: "solo" }, "SEED").teams, "no teams when solo")
  // Power Ludo and teams together
  const both = teams({ mode: "powers" })
  assert(both.teams && both.mode === "powers" && (both.spawns?.length ?? 0) > 0, "Power Ludo works with teams")
  noUndefined(both)
}
console.log("✓ setup")

// Partners never cut each other; rivals still do
{
  // Yellow (c) at position 4 = absolute 30 (not safe); red (a) at 27 rolls a 3
  let s = withTokens(teams(), { a: [27, -1, -1, -1], c: [4, -1, -1, -1] })
  assert(trackIndex("yellow", 4) === 30 && trackIndex("red", 30) === 30, "same square")
  s = applyMove(applyRoll(s, "a", 3, ctx), "a", 0, 3, ctx)
  assert(s.players.c.tokens[0] === 4, "partner's piece stays")
  assert(!s.last || s.last.type !== "move" || !s.last.captured, "no capture")
  assert((s.players.a.kills ?? 0) === 0 && (s.players.c.deaths ?? 0) === 0, "no cut counted")
  assert(s.turn === "b", "no bonus roll for landing on a partner")

  // Green (b) at 17 = absolute 30: red cuts it
  let r = withTokens(teams(), { a: [27, -1, -1, -1], b: [17, -1, -1, -1] })
  r = applyMove(applyRoll(r, "a", 3, ctx), "a", 0, 3, ctx)
  assert(r.players.b.tokens[0] === -1 && r.players.a.kills === 1, "rivals are still cut")

  // Partner and rival on one square: only the rival goes back
  let m = withTokens(teams(), { a: [27, -1, -1, -1], b: [17, -1, -1, -1], c: [4, -1, -1, -1] })
  m = applyMove(applyRoll(m, "a", 3, ctx), "a", 0, 3, ctx)
  assert(m.players.b.tokens[0] === -1 && m.players.c.tokens[0] === 4, "only the rival is cut")
  noUndefined(m)
}
console.log("✓ no cutting partners")

// Rival powers can't target a partner
{
  let s = teams({ mode: "powers" })
  s = withTokens(s, { b: [5, -1, -1, -1], c: [5, -1, -1, -1] })
  s = { ...s, players: { ...s.players, a: { ...s.players.a, powers: ["freeze", "push"] } } }
  throws(() => applyPower(s, "a", "freeze", { uid: "c", token: 0 }, ctx), "can't freeze your partner")
  throws(() => applyPower(s, "a", "push", { uid: "c", token: 0 }, ctx), "can't push your partner back")
  const f = applyPower(s, "a", "freeze", { uid: "b", token: 0 }, ctx)
  assert(f.frozen?.["b:0"] === 3, "rivals can be frozen")
}
console.log("✓ powers and partners")

// A partner who finishes sits out; the team wins when both are home
{
  let s = withTokens(teams(), { a: [56, 56, 56, 55] })
  s = applyMove(applyRoll(s, "a", 1, ctx), "a", 3, 1, ctx)
  assert(s.players.a.place === 1, "a finished")
  assert(s.phase === "roll" && !isOver(s), "one partner home isn't a win")
  assert(s.turn === "b", "the turn passes")
  assert(nextTurn(s, "b") === "c" && nextTurn(s, "d") === "b", "the finished partner is skipped")
  assert(describeLast(s, (id) => id).includes("partner"), "log: over to the partner")

  // Now c gets the last one home
  s = withTokens({ ...s, turn: "c" }, { c: [56, 56, 56, 55] })
  s = applyMove(applyRoll(s, "c", 1, ctx), "c", 3, 1, ctx)
  assert(s.phase === "over" && isOver(s), "both partners home: game over")
  assert(winningTeam(s) === 0, "Team A won")
  const res = resultOf(s)
  assert(res.winnerIds.join() === "a,c", "both partners are winners")
  assert(res.reason === "all_home", "reason")
  assert(res.ranking!.slice(0, 2).sort().join() === "a,c" && res.ranking!.length === 4, "the winning pair ranks first")
  assert(describeLast(s, (id) => id).includes("Team A wins"), "log: Team A wins")
  noUndefined(s)
}
console.log("✓ team win")

// Even when a rival finishes first, the team that completes both wins
{
  let s = teams()
  s = { ...s, players: { ...s.players, b: { ...s.players.b, tokens: [56, 56, 56, 56], place: 1 } } }
  assert(!isOver(s) && winningTeam(s) === null, "a lone finisher doesn't win")
  s = withTokens({ ...s, players: { ...s.players, a: { ...s.players.a, place: 2 } } }, { a: [56, 56, 56, 56], c: [56, 56, 56, 55] })
  s = { ...s, turn: "c" }
  s = applyMove(applyRoll(s, "c", 1, ctx), "c", 3, 1, ctx)
  assert(winningTeam(s) === 0 && resultOf(s).winnerIds.join() === "a,c", "Team A completes first")
  assert(rankingOf(s)[2] === "b", "the losing team ranks below, finisher first")
}
console.log("✓ first full team wins")

// A team that loses a player forfeits
{
  const s = teams()
  assert(!isOver(s, []), "everyone here: game on")
  assert(isOver(s, ["d"]) && winningTeam(s, ["d"]) === 0, "Team B lost a player: Team A wins")
  const res = resultOf(s, ["d"])
  assert(res.winnerIds.join() === "a,c" && res.reason === "abandoned", "forfeit result")
  const out = { ...s, players: { ...s.players, c: { ...s.players.c, out: true as const } } }
  assert(winningTeam(out) === 1, "a partner out for missed turns forfeits too")
  assert(resultOf(s, ["a", "b", "c", "d"]).winnerIds.length === 0, "nobody left: nobody wins")
}
console.log("✓ forfeit")

// Finishing, then leaving: your place is kept
{
  // Solo, 3 players: a finishes 1st and leaves; the game goes on and a stays the winner
  let s = withTokens(initialLudoState(four().slice(0, 3), {}, "SEED"), { a: [56, 56, 56, 55] })
  s = applyMove(applyRoll(s, "a", 1, ctx), "a", 3, 1, ctx)
  assert(s.players.a.place === 1 && s.phase === "roll", "a finished 1st, b and c race on")
  const gone = ["a"]
  assert(!isOver(s, gone), "a leaving doesn't end it")
  assert(nextTurn(s, "c", gone) === "b", "a is skipped")
  s = withTokens({ ...s, turn: "b" }, { b: [56, 56, 56, 55] })
  s = applyMove(applyRoll(s, "b", 1, { ...ctx, gone }), "b", 3, 1, { ...ctx, gone })
  assert(isOver(s, gone) && s.phase === "over", "b finishing 2nd ends it")
  const res = resultOf(s, gone)
  assert(res.winnerIds[0] === "a" && res.ranking!.join() === "a,b,c", "a who left is still 1st")

  // Teams: a finishes and leaves; c gets home later and Team A wins
  let t = withTokens(teams(), { a: [56, 56, 56, 55] })
  t = applyMove(applyRoll(t, "a", 1, ctx), "a", 3, 1, ctx)
  const left = ["a"]
  assert(!isOver(t, left) && winningTeam(t, left) === null, "a finished partner leaving doesn't forfeit")
  assert(nextTurn(t, "b", left) === "c", "c plays on")
  t = withTokens({ ...t, turn: "c" }, { c: [56, 56, 56, 55] })
  t = applyMove(applyRoll(t, "c", 1, { ...ctx, gone: left }), "c", 3, 1, { ...ctx, gone: left })
  assert(t.phase === "over" && winningTeam(t, left) === 0, "Team A wins")
  const tr = resultOf(t, left)
  assert(tr.winnerIds.join() === "a,c" && tr.reason === "all_home", "both partners win, the one who left too")
  assert(tr.ranking!.slice(0, 2).join() === "a,c", "the pair ranks first")
  // …but a partner leaving before finishing still forfeits
  assert(winningTeam(teams(), ["c"]) === 1, "unfinished partner leaving forfeits")
}
console.log("✓ finish, then leave")

// Lobby seats and the bench
{
  const meta = (extra: Partial<RoomMeta> = {}): RoomMeta => ({
    code: "ABCDEF",
    game: "ludo",
    hostId: "a",
    hostName: "A",
    createdAt: 0,
    minPlayers: 4,
    maxPlayers: 4,
    status: "lobby",
    options: { mode: "classic", teams: "2v2" },
    ...extra,
  })
  const m = meta()
  assert(isTeamRoom(m) && !isTeamRoom(meta({ options: { teams: "solo" } })), "team room")
  assert(seatsFor("ludo", { teams: "2v2" }).maxPlayers === 4 && seatsFor("ludo", { teams: "2v2" }).minPlayers === 4, "team rooms have 4 seats")
  assert(seatsFor("ludo", {}).maxPlayers === 5 && seatsFor("ludo", {}).minPlayers === 2, "solo Ludo keeps 2–5")
  assert(seatsFor("chess", { teams: "2v2" }).maxPlayers === 2, "only Ludo has teams")
  assert(teamOfSeat(0) === 0 && teamOfSeat(2) === 0 && teamOfSeat(1) === 1 && teamOfSeat(3) === 1, "seat teams")

  // Three players: anyone may take the free seat; the bench isn't needed
  const three = [player("a", 0), player("b", 1), player("c", 2)]
  assert(freeSeats(m, three).join() === "3", "seat 3 free")
  assert(canMoveTo(m, three, "a", 3) && canMoveTo(m, three, "b", 3), "move to the free seat")
  assert(!canMoveTo(m, three, "a", 1), "not onto someone")
  assert(!canMoveTo(m, three, "a", 4), "no bench while a seat is free")
  assert(!canMoveTo(m, three, "a", 0), "not to your own seat")
  assert(!canMoveTo(m, three, "a", 5) && !canMoveTo(m, three, "a", -1), "no seats out of range")
  assert(!canStart(m, three) && !isFull(m, three), "three can't start a team game")

  // Full: a swap goes through the bench
  const full = [...three, player("d", 3)]
  assert(isFull(m, full) && canStart(m, full), "four seated: ready")
  assert(canMoveTo(m, full, "b", 4), "b may step onto the bench")
  const benched = full.map((p) => (p.uid === "b" ? { ...p, seat: 4, seatAt: 10 } : p))
  assert(benchedPlayer(m, benched)?.uid === "b", "b on the bench")
  assert(!isFull(m, benched) && !canStart(m, benched), "can't start with someone on the bench")
  assert(!canMoveTo(m, benched, "a", 4), "one bench only")
  assert(canMoveTo(m, benched, "a", 1), "a switches into the freed seat")
  const switched = benched.map((p) => (p.uid === "a" ? { ...p, seat: 1, seatAt: 11 } : p))
  assert(canMoveTo(m, switched, "b", 0), "b takes a's old seat")
  const done = switched.map((p) => (p.uid === "b" ? { ...p, seat: 0, seatAt: 12 } : p))
  assert(canStart(m, done) && teamOfSeat(done.find((p) => p.uid === "a")!.seat) === 1, "swapped and ready")

  // Not in solo rooms, not once playing
  const solo = meta({ options: { teams: "solo" }, maxPlayers: 5, minPlayers: 2 })
  assert(!canMoveTo(solo, three, "a", 3), "solo rooms keep their seats")
  assert(!canMoveTo(meta({ status: "playing" }), three, "a", 3), "no moving once playing")
  assert(canStart(solo, three.slice(0, 2)), "solo rooms start with the minimum")

  // Two grab the same seat: the earlier claim keeps it, the later goes back
  const clash = [player("a", 0), player("b", 3, { seatAt: 50 }), player("c", 3, { seatAt: 40 })]
  assert(resolveClash(m, clash, "b", 1) === 1, "b goes back to seat 1")
  assert(resolveClash(m, clash, "c", 2) === null, "c keeps the seat")
  assert(resolveClash(m, [player("a", 0), player("b", 1)], "b") === null, "no clash")
  const benchClash = [...full.slice(0, 2).map((p) => ({ ...p })), player("c", 4, { seatAt: 5 }), player("d", 4, { seatAt: 6 })]
  assert(resolveClash(m, benchClash, "d", 3) === 3, "two on the bench: the later one goes back")
}
console.log("✓ lobby seats")

console.log("\nAll Ludo team tests passed.")
