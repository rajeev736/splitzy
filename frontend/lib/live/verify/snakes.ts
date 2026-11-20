import { seatOrder } from "../games"
import { ABANDONED_GAME_MS, EVERYONE_LEFT_REASON } from "../liveness"
import type { LogEntry } from "../log"
import { ABANDON_MS } from "../room"
import {
  applyRoll,
  isOver,
  passTurn,
  resultOf,
  SNAKES_AWAY_MS,
  SNAKES_IDLE_MS,
  type SnakesSkipReason,
  type SnakesState,
} from "../snakes"
import { initialStateFor } from "../start"
import type { RoomMeta, RoomPlayer } from "../types"
import { sameSet, type Verifier, type VerifyResult } from "./types"

/**
 * Snakes & Ladders ("snakes", the flat board, and "snakes3d", the tower with
 * its gate) replayed from the move log:
 *
 *   "r<1–6>"               a roll — written only by the server (app/api/live/roll)
 *   "s:<reason>[:<uid>]"   the referee passed the turn of <uid> (the player
 *                          whose turn it was): idle / offline / left
 *
 * Every step is replayed with the engine (lib/live/snakes); a skip counts only
 * if it was due when it was written. The replay must land on the stored board
 * and agree on the winner.
 */

/** Clocks in play: the server's (rolls), RTDB's (devices' entries), a device's estimate of it. */
const SLACK_MS = 3000
/** How long a player who joined as the game began may have been left out of it (a join racing the start). */
const LATE_JOIN_MS = 15_000

const fail = (reason: string): VerifyResult => ({ ok: false, reason })

/**
 * The move log exactly as written: entries 0…n−1, none missing (entries can
 * only be appended, so a gap means one was removed), each well-formed.
 * null when it isn't.
 */
export function strictLog(raw: unknown): LogEntry[] | null {
  if (raw === undefined || raw === null) return []
  if (typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const list: unknown[] = Array.isArray(raw) ? raw : Object.keys(obj).map((_, i) => obj[String(i)])
  const ok = list.every((e) => {
    const x = e as LogEntry | null | undefined
    return !!x && typeof x === "object" && typeof x.b === "string" && typeof x.a === "string" && typeof x.t === "number" && Number.isFinite(x.t)
  })
  return ok ? (list as LogEntry[]) : null
}

/** Entries in time order (with the clocks' slack), none before the start. */
export function logInOrder(log: LogEntry[], startedAt: number): string | null {
  for (let i = 0; i < log.length; i++) {
    if (log[i].t < startedAt - SLACK_MS) return `entry ${i} is before the start`
    if (i > 0 && log[i].t < log[i - 1].t - SLACK_MS) return `entry ${i} is out of order`
  }
  return null
}

/**
 * The seats a game started with (services/live-rooms startGame: everyone
 * seated, in seat order, at most five), checked against the game's own
 * `order`: the same players in the same order. A seat left out is allowed
 * only for someone who joined as the game began (their join raced the start).
 * Returns the players, or why not.
 */
export function startedWith(order: unknown, players: RoomPlayer[], meta: RoomMeta): RoomPlayer[] | string {
  if (!Array.isArray(order) || order.length === 0 || order.length > 5) return "no players in the game"
  if (!order.every((u) => typeof u === "string") || new Set(order).size !== order.length) return "a bad turn order"
  const seated = seatOrder(Object.fromEntries(players.map((p) => [p.uid, p])))
  let at = -1
  for (const uid of order as string[]) {
    const i = seated.findIndex((p) => p.uid === uid)
    if (i < 0) return "a player who had no seat"
    if (i <= at) return "not in seat order"
    at = i
  }
  const startedAt = meta.startedAt ?? 0
  const missing = seated.filter((p, i) => i < 5 && !order.includes(p.uid))
  if (missing.some((p) => p.joinedAt < startedAt - LATE_JOIN_MS)) return "a seated player was left out"
  return (order as string[]).map((uid) => seated.find((p) => p.uid === uid)!)
}

/**
 * A game closed because everyone walked away (lib/live/liveness): nobody
 * still in it had been around for ABANDONED_GAME_MS — so nobody still in it
 * wrote anything in that long before it was closed.
 */
export function abandonedInTime(meta: RoomMeta, log: LogEntry[], left: Set<string>): boolean {
  const startedAt = meta.startedAt ?? 0
  const lastActive = Math.max(startedAt, ...log.filter((e) => !left.has(e.b)).map((e) => e.t))
  return (meta.endedAt ?? 0) >= lastActive + ABANDONED_GAME_MS - 10_000
}

type Step =
  | { kind: "roll"; value: number }
  | { kind: "skip"; reason: SnakesSkipReason; target?: string }

function parse(a: string): Step | null {
  const r = /^r([1-6])$/.exec(a)
  if (r) return { kind: "roll", value: Number(r[1]) }
  const s = /^s:(idle|offline|left)(?::(.+))?$/.exec(a)
  if (s) return { kind: "skip", reason: s[1] as SnakesSkipReason, target: s[2] }
  return null
}

/** Every set of players gone from `base` on, adding those who left (fewest first). */
function goneSets(base: string[], left: string[]): string[][] {
  const extra = left.filter((u) => !base.includes(u))
  const out: string[][] = []
  for (let mask = 0; mask < 1 << extra.length; mask++) out.push([...base, ...extra.filter((_, k) => mask & (1 << k))])
  return out.sort((x, y) => x.length - y.length)
}

/** The parts of a board the moves decide (not the times). */
function sameBoard(a: SnakesState, b: Partial<SnakesState>): boolean {
  if (a.variant !== b.variant || a.phase !== b.phase || a.turn !== b.turn || a.seq !== b.seq || a.sixes !== (b.sixes ?? 0)) return false
  if (!Array.isArray(b.order) || a.order.join() !== b.order.join() || !b.players) return false
  return a.order.every((u) => {
    const x = a.players[u]
    const y = b.players![u]
    return (
      !!y &&
      x.pos === y.pos &&
      x.place === y.place &&
      !!x.out === !!y.out &&
      (x.missed ?? 0) === (y.missed ?? 0) &&
      (x.ladders ?? 0) === (y.ladders ?? 0) &&
      (x.snakes ?? 0) === (y.snakes ?? 0)
    )
  })
}

export const verifySnakes: Verifier = ({ code, meta, players, state }) => {
  if (meta.game !== "snakes" && meta.game !== "snakes3d") return fail("not a Snakes & Ladders game")
  const variant = meta.game === "snakes3d" ? "gate" : "flat"
  const final = state as (Partial<SnakesState> & { log?: unknown }) | null
  if (!final || typeof final !== "object" || !final.players) return fail("no board")
  if (final.variant !== variant) return fail("a board of the other game")
  const startedAt = meta.startedAt ?? 0

  const started = startedWith(final.order, players, meta)
  if (typeof started === "string") return fail(started)
  const log = strictLog(final.log)
  if (!log) return fail("the move log was tampered with")
  const order = logInOrder(log, startedAt)
  if (order) return fail(order)

  const seat = Object.fromEntries(players.map((p) => [p.uid, p])) as Record<string, RoomPlayer>
  const left = new Set(players.filter((p) => p.left).map((p) => p.uid))

  /** `uid` had been away from the room ABANDON_MS at `t` (an "offline" skip before the clock ran out). */
  const awayAt = (uid: string, t: number) => {
    const from = t - ABANDON_MS + SLACK_MS
    // Anything they did themselves in that minute (a roll, a referee's skip) says they were there
    if (log.some((e) => e.b === uid && e.t > from && e.t <= t)) return false
    // …and either the game had been on that long, or their seat still reads gone since before then
    const p = seat[uid]
    return t >= startedAt + ABANDON_MS - SLACK_MS || (!!p && !p.online && p.lastSeen <= from)
  }

  let s = initialStateFor(meta.game, started, meta.options ?? {}, code) as SnakesState
  let gone: string[] = []
  for (let i = 0; i < log.length; i++) {
    const e = log[i]
    const step = parse(e.a)
    if (!step) return fail(`entry ${i}: unknown move "${e.a.slice(0, 40)}"`)
    if (!seat[e.b]) return fail(`entry ${i}: written by someone without a seat`)
    if (s.phase !== "roll") return fail(`entry ${i}: a move after the game was over`)

    let base = gone
    if (step.kind === "roll") {
      if (e.b !== s.turn) return fail(`entry ${i}: a roll out of turn`)
    } else {
      const who = s.turn
      if (step.target !== undefined && step.target !== who) return fail(`entry ${i}: skips someone whose turn it wasn't`)
      const waited = e.t - (s.turnAt || startedAt)
      const due =
        step.reason === "left"
          ? left.has(who)
          : waited >= SNAKES_IDLE_MS - SLACK_MS ||
            (step.reason === "offline" && waited >= SNAKES_AWAY_MS - SLACK_MS && awayAt(who, e.t))
      if (!due) return fail(`entry ${i}: a turn skipped before it was due`)
      if (step.reason === "left" && !base.includes(who)) base = [...base, who]
    }

    // Who had left by then isn't written down: the fewest that explain the next step
    const next = log[i + 1]
    const nextStep = next ? parse(next.a) : null
    const fits = (n: SnakesState) =>
      next
        ? n.phase === "roll" &&
          (nextStep?.kind === "roll" ? n.turn === next.b : nextStep?.kind === "skip" && nextStep.target !== undefined ? n.turn === nextStep.target : true)
        : n.phase === final.phase && n.turn === final.turn
    let chosen: { s: SnakesState; gone: string[] } | null = null
    let why = next ? `entry ${i + 1} (${next.a.slice(0, 40)}) can't follow it` : "it doesn't lead to the board as it ended"
    for (const g of goneSets(base, [...left])) {
      let n: SnakesState
      try {
        n =
          step.kind === "roll"
            ? applyRoll(s, e.b, step.value, { now: e.t, gone: g })
            : passTurn(s, s.turn, step.reason, { now: e.t, gone: g })
      } catch (err) {
        why = err instanceof Error ? err.message : "not a legal move"
        continue
      }
      if (fits(n)) {
        chosen = { s: { ...n, turnAt: e.t }, gone: g }
        break
      }
    }
    if (!chosen) return fail(`entry ${i} (${e.a.slice(0, 40)}): ${why}`)
    s = chosen.s
    gone = chosen.gone
  }

  if (!sameBoard(s, final)) return fail("the board doesn't match its moves")

  const claimed = meta.result?.winnerIds ?? []
  // Closed because everyone walked away: nobody won
  if (meta.result?.reason === EVERYONE_LEFT_REASON && claimed.length === 0) {
    return abandonedInTime(meta, log, left) ? { ok: true, winners: [] } : fail("closed as abandoned while it was being played")
  }
  const allGone = [...left]
  if (s.phase !== "over" && !isOver(s, allGone)) return fail("ended before the game was over")
  const winners = resultOf(s, allGone).winnerIds
  if (!sameSet(winners, claimed)) return fail("the result doesn't match the game")
  return { ok: true, winners }
}
