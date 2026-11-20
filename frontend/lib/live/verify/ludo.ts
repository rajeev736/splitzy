import { readLog, type LogEntry } from "../log"
import { EVERYONE_LEFT_REASON } from "../liveness"
import {
  applyExpiry,
  applyMove,
  applyPower,
  applyRoll,
  applySignature,
  isOver,
  LUDO_IDLE_MS,
  passTurn,
  POWER_KINDS,
  resultOf,
  seededRandom,
  type LudoCapture,
  type LudoContext,
  type LudoSkipReason,
  type LudoState,
  type PowerKind,
} from "../ludo"
import { ABANDON_MS } from "../room"
import { initialStateFor } from "../start"
import type { RoomPlayer } from "../types"
import { sameSet, type Verifier } from "./types"

/**
 * Ludo's move log (lib/live/log) and its replay on the server.
 *
 * ── The codes ──────────────────────────────────────────────────────────
 * Every step a device writes adds one entry `{ b: its uid, a, t: server ms }`:
 *
 *   r<v>             a roll of v (1..6) — only the server writes these (app/api/live/roll)
 *   m<t>             move token t (0..3) by the dice in play
 *   p<k>[<i><t>]     Power Ludo: use a held power, k = index in POWER_KINDS,
 *                    aimed at token t of the player at index i of `order`
 *   c[<i><t>]        Power Ludo: the character's signature power (its kind is in the state)
 *   k<r><i>          the referee passes the turn of the player at index i of
 *                    `order`; r = i(dle) / o(ffline) / l(eft)
 *   x                the referee drops power-ups that ran out of time
 *
 * followed by
 *   @<ms>            Power Ludo only: the device's clock (ctx.now) — power-ups
 *                    fizzle out by it, so the replay must use the same number
 *   g<i…>            who the device counted as gone (left), as `order` indexes
 *
 * e.g. "m2", "p013@1732101234567g2", "ki1". Never longer than ~25 characters.
 *
 * ── The replay ─────────────────────────────────────────────────────────
 * The game is rebuilt from its start (initialStateFor with the room code as
 * seed, the roster from the state's own `order`) and every entry is applied
 * with the engine, random draws seeded by `${code}:${seq}` as on the devices.
 * Checked on the way: a claimed clock within CLOCK_SLACK_MS of the entry's
 * server time; "gone" only for players who did leave; a turn skipped for
 * being idle / offline only once the clock allowed it. At the end the
 * replayed board must be the stored one, and the winners the room's.
 */

/** A device's clock (claimed in "@<ms>") may be this far off the server's. */
export const CLOCK_SLACK_MS = 5_000
/** Turn clocks: a skip may come this much before its threshold (device clocks, the 1 s tick). */
export const SKIP_SLACK_MS = 3_000

export type LudoAction =
  | { type: "move"; token: number }
  | { type: "power"; kind: PowerKind; target: LudoCapture | null }
  | { type: "signature"; target: LudoCapture | null }
  | { type: "skip"; reason: LudoSkipReason; who: string }
  | { type: "expire" }

const REASON_CODE: Record<LudoSkipReason, string> = { idle: "i", offline: "o", left: "l" }
const CODE_REASON: Record<string, LudoSkipReason> = { i: "idle", o: "offline", l: "left" }

/**
 * The log code for a step taken on `state` (the state BEFORE it) with `ctx` —
 * the same `now` and `gone` the engine got. Call after the engine accepted the step.
 */
export function encodeLudoAction(
  state: LudoState,
  action: LudoAction,
  ctx: Pick<LudoContext, "now" | "gone">
): string {
  const idx = (uid: string) => state.order.indexOf(uid)
  const piece = (t: LudoCapture | null) => (t ? `${idx(t.uid)}${t.token}` : "")
  let code: string
  switch (action.type) {
    case "move":
      code = `m${action.token}`
      break
    case "power":
      code = `p${POWER_KINDS.indexOf(action.kind)}${piece(action.target)}`
      break
    case "signature":
      code = `c${piece(action.target)}`
      break
    case "skip":
      code = `k${REASON_CODE[action.reason]}${idx(action.who)}`
      break
    case "expire":
      code = "x"
      break
  }
  if (state.mode === "powers") code += `@${Math.round(ctx.now)}`
  const gone = [...new Set((ctx.gone ?? []).map(idx).filter((i) => i >= 0))].sort().join("")
  if (gone) code += `g${gone}`
  return code
}

export interface DecodedLudoAction {
  action: LudoAction
  /** The device's clock, when it gave one. */
  now?: number
  gone: string[]
}

const CODE = /^([mpckx])([0-9ilo]*)(?:@(\d{1,16}))?(?:g([0-9]{1,5}))?$/

/** Reads a device's log code against the state it was written on. Throws on anything malformed. */
export function decodeLudoAction(state: LudoState, a: string): DecodedLudoAction {
  const m = CODE.exec(a)
  if (!m) throw new Error("unreadable step")
  const [, kind, body, clock, goneIdx] = m
  const uidAt = (c: string) => {
    const uid = state.order[Number(c)]
    if (uid === undefined) throw new Error("no such player")
    return uid
  }
  const target = (s: string): LudoCapture | null => {
    if (s === "") return null
    if (!/^\d[0-3]$/.test(s)) throw new Error("bad piece")
    return { uid: uidAt(s[0]), token: Number(s[1]) }
  }
  let action: LudoAction
  switch (kind) {
    case "m":
      if (!/^[0-3]$/.test(body)) throw new Error("bad token")
      action = { type: "move", token: Number(body) }
      break
    case "p": {
      const k = POWER_KINDS[Number(body[0])]
      if (!k || !/^\d$/.test(body[0] ?? "")) throw new Error("bad power")
      action = { type: "power", kind: k, target: target(body.slice(1)) }
      break
    }
    case "c":
      action = { type: "signature", target: target(body) }
      break
    case "k": {
      const reason = CODE_REASON[body[0] ?? ""]
      if (!reason || !/^\d$/.test(body.slice(1))) throw new Error("bad skip")
      action = { type: "skip", reason, who: uidAt(body.slice(1)) }
      break
    }
    default:
      if (body !== "") throw new Error("bad step")
      action = { type: "expire" }
  }
  const gone = goneIdx ? [...new Set([...goneIdx].map(uidAt))] : []
  return { action, now: clock === undefined ? undefined : Number(clock), gone }
}

/* ── Replay ──────────────────────────────────────────────────────────── */

class Refused extends Error {}
const refuse = (reason: string): never => {
  throw new Refused(reason)
}

/**
 * Who the server counted as gone for a roll by `from`: it only matters when
 * the roll passes the turn (nothing to move, three 6s), and then only for who
 * plays next. The log doesn't carry it, so it's read off whoever plays next
 * (`want`): the players the rotation went past must have left (by the end).
 */
function goneForRoll(s: LudoState, from: string, left: string[], want: string | null): string[] {
  if (!want) return []
  const n = s.order.length
  const start = s.order.indexOf(from)
  const passed: string[] = []
  for (let k = 1; k <= n; k++) {
    const id = s.order[(start + k) % n]
    const p = s.players[id]
    if (!p || p.place !== 0 || p.out) continue
    if (id === want) return passed
    if (!left.includes(id)) return []
    passed.push(id)
  }
  return []
}

/** Whose turn it is by the log from entry `from` on (expiries say nothing; the end: the stored state). */
function turnFromLog(s: LudoState, log: LogEntry[], from: number, stored: LudoState): string | null {
  for (let j = from; j < log.length; j++) {
    const e = log[j]
    if (e.a.startsWith("r")) return e.b
    try {
      const { action } = decodeLudoAction(s, e.a)
      if (action.type === "expire") continue
      return action.type === "skip" ? action.who : e.b
    } catch {
      return null
    }
  }
  return typeof stored.turn === "string" ? stored.turn : null
}

/* ── Comparing boards ── */

/** As the database keeps it: no null / undefined / empty arrays or maps; numeric-keyed maps are arrays. */
function clean(v: unknown): unknown {
  if (v === null || v === undefined) return undefined
  if (Array.isArray(v)) {
    const out = v.map(clean)
    return out.length ? out : undefined
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    const keys = Object.keys(o)
    if (keys.length && keys.every((k, i) => k === String(i))) return clean(keys.map((k) => o[k]))
    const out: Record<string, unknown> = {}
    for (const k of keys.sort()) {
      const c = clean(o[k])
      if (c !== undefined) out[k] = c
    }
    return Object.keys(out).length ? out : undefined
  }
  return v
}

const same = (a: unknown, b: unknown) => JSON.stringify(clean(a)) === JSON.stringify(clean(b))

const STATE_KEYS = [
  "phase",
  "order",
  "turn",
  "sixes",
  "seq",
  "turnNo",
  "mode",
  "board",
  "teams",
  "spawns",
  "frozen",
  "locked",
  "shield",
  "firstOut",
  "firstHome",
] as const
const PLAYER_KEYS = [
  "uid",
  "colour",
  "tokens",
  "place",
  "missed",
  "out",
  "kills",
  "deaths",
  "noSix",
  "powers",
  "until",
  "signature",
  "double",
  "team",
] as const

/** The first thing the replayed board and the stored one disagree on (timestamps and the log line aside), or null. */
function difference(replayed: LudoState, stored: LudoState): string | null {
  const r = replayed as unknown as Record<string, unknown>
  const s = stored as unknown as Record<string, unknown>
  for (const k of STATE_KEYS) if (!same(r[k], s[k])) return k
  const dice = (d: LudoState["dice"]) => (d ? { value: d.value, by: d.by, x2: d.x2 } : undefined)
  if (!same(dice(replayed.dice), dice(stored.dice))) return "dice"
  const ids = new Set([...Object.keys(replayed.players ?? {}), ...Object.keys(stored.players ?? {})])
  for (const id of ids) {
    const a = (replayed.players?.[id] ?? {}) as unknown as Record<string, unknown>
    const b = (stored.players?.[id] ?? {}) as unknown as Record<string, unknown>
    for (const k of PLAYER_KEYS) if (!same(a[k], b[k])) return `players.${id}.${k}`
  }
  return null
}

/* ── The verifier ── */

/** The players the game started with, in its order (startGame: everyone seated and not gone, by seat). */
function rosterOf(stored: LudoState, players: RoomPlayer[], startedAt: number | undefined): RoomPlayer[] {
  const order = stored.order
  if (!Array.isArray(order) || order.length < 2 || order.length > 5 || new Set(order).size !== order.length)
    refuse("the game's players don't add up")
  const seated = [...players].sort((a, b) => a.seat - b.seat || a.joinedAt - b.joinedAt)
  const roster = seated.filter((p) => order.includes(p.uid))
  if (roster.length !== order.length || roster.some((p, i) => p.uid !== order[i]))
    refuse("the game's players don't match the room")
  // Everyone seated at the start played: only a seat already given up, or one
  // taken as the game began, may be missing from it
  for (const p of seated)
    if (!order.includes(p.uid) && !p.left && !(startedAt && p.joinedAt >= startedAt - CLOCK_SLACK_MS))
      refuse("a player is missing from the game")
  return roster
}

/**
 * Power Ludo: each character's own power, as the game knew it. Seats show the
 * character a player has on now (it can change when they come back), and
 * every power kind comes with a free character anyway — so the kind is taken
 * from the state, unused, as at the start.
 */
function withSignatures(s: LudoState, stored: LudoState): LudoState {
  const players = { ...s.players }
  for (const id of s.order) {
    const p = { ...players[id] }
    const kind = stored.players?.[id]?.signature?.kind
    if (kind && (POWER_KINDS as readonly string[]).includes(kind)) p.signature = { kind, used: false }
    else delete p.signature
    players[id] = p
  }
  return { ...s, players }
}

function replay({ code, meta, players, state }: Parameters<Verifier>[0]): ReturnType<Verifier> {
  const stored = state as LudoState & { log?: unknown }
  if (!stored || typeof stored !== "object") refuse("no game state")
  const log = readLog(stored.log)
  const left = players.filter((p) => p.left).map((p) => p.uid)
  const byUid = new Map(players.map((p) => [p.uid, p]))
  const roster = rosterOf(stored, players, meta.startedAt)

  let s = initialStateFor("ludo", roster, meta.options ?? {}, code) as LudoState
  if (s.mode === "powers") s = withSignatures(s, stored)

  // Server ms the current decision began (what the referee's turn clock counts from)
  let turnAt = meta.startedAt ?? 0
  // Server ms of each player's latest step (an offline player writes nothing)
  const lastStep = new Map<string, number>()

  for (let i = 0; i < log.length; i++) {
    const e = log[i]
    const at = `step ${i + 1} (${e.a})`
    if (typeof e.b !== "string" || !byUid.has(e.b)) refuse(`${at}: not a player`)
    if (typeof e.t !== "number" || !Number.isFinite(e.t)) refuse(`${at}: no time`)
    if (s.phase === "over") refuse(`${at}: the game was already over`)
    const rand = seededRandom(`${code}:${s.seq}`)
    let expiry = false
    try {
      if (e.a.startsWith("r")) {
        const m = /^r([1-6])$/.exec(e.a)
        if (!m) refuse(`${at}: bad roll`)
        const gone = goneForRoll(s, e.b, left, turnFromLog(s, log, i + 1, stored))
        s = applyRoll(s, e.b, Number(m![1]), { now: e.t, gone, rand })
      } else {
        const d = decodeLudoAction(s, e.a)
        if (d.now !== undefined && Math.abs(d.now - e.t) > CLOCK_SLACK_MS) refuse(`${at}: the clock was off`)
        for (const g of d.gone) if (!left.includes(g)) refuse(`${at}: counted someone as gone who never left`)
        const ctx: LudoContext = { now: d.now ?? e.t, gone: d.gone, rand }
        const a = d.action
        switch (a.type) {
          case "move":
            s = applyMove(s, e.b, a.token, s.dice?.value ?? 0, ctx)
            break
          case "power":
            s = applyPower(s, e.b, a.kind, a.target, ctx)
            break
          case "signature":
            s = applySignature(s, e.b, a.target, ctx)
            break
          case "skip": {
            if (a.who !== s.turn) refuse(`${at}: not their turn`)
            const waited = e.t - turnAt
            const idleOk = waited >= LUDO_IDLE_MS - SKIP_SLACK_MS
            if (a.reason === "left" && !left.includes(a.who)) refuse(`${at}: they never left`)
            if (a.reason === "idle" && !idleOk) refuse(`${at}: skipped before their time was up`)
            if (a.reason === "offline" && !idleOk) {
              // Offline for ABANDON_MS: they wrote nothing in that time — and they
              // weren't connected all along (still online at the end, since before this)
              const quiet = e.t - (lastStep.get(a.who) ?? -Infinity) >= ABANDON_MS - SKIP_SLACK_MS
              const p = byUid.get(a.who)
              const connected = !!p?.online && !p.left && p.lastSeen < e.t - SKIP_SLACK_MS
              if (!quiet || connected) refuse(`${at}: skipped as offline while they were playing`)
            }
            s = passTurn(s, a.who, a.reason, ctx)
            break
          }
          case "expire":
            s = applyExpiry(s, ctx)
            expiry = true
            break
        }
      }
    } catch (err) {
      if (err instanceof Refused) throw err
      refuse(`${at}: ${err instanceof Error ? err.message : "not allowed"}`)
    }
    // Every step but an expiry restarts the turn clock (the device stamps turnAt with the server's time)
    if (!expiry) turnAt = e.t
    lastStep.set(e.b, e.t)
  }

  const diff = difference(s, stored)
  if (diff) refuse(`the board doesn't match its moves (${diff})`)

  const claimed = meta.result?.winnerIds ?? []
  const over = s.phase === "over" || isOver(s, left)
  // Closed with nobody in it (lib/live/liveness): no winner, as long as the board hadn't named one
  if (claimed.length === 0 && (!over || (s.phase !== "over" && meta.result?.reason === EVERYONE_LEFT_REASON)))
    return { ok: true, winners: [] }
  if (!over) refuse("the game wasn't over")
  const winners = resultOf(s, left).winnerIds
  if (!sameSet(winners, claimed)) refuse("the winners don't match the board")
  return { ok: true, winners }
}

/** Replays a finished Ludo game from its move log (see above and ./types). */
export const verifyLudo: Verifier = (input) => {
  try {
    return replay(input)
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "replay failed" }
  }
}
