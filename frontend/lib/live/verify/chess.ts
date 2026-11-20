import { Chess, type PieceSymbol, type Square } from "chess.js"

import {
  applyMove,
  CHESS_LOG,
  colourOf,
  flaggedSide,
  moveCode,
  movesOf,
  opponentOf,
  timeoutResult,
  type ChessResult,
  type ChessState,
} from "../chess"
import { readLog } from "../log"
import {
  claimFits,
  CLOCK_SLACK_MS,
  fail,
  same,
  settleWinners,
  splitClaim,
  startOf,
  wasAway,
} from "./duel"
import type { Verifier } from "./types"

/** Clocks may land this far from the stored ones (they're worked out from server times; a tamper this small wins nothing). */
const CLOCK_MATCH_MS = 1000
const UCI = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/

/**
 * Replays a finished Chess game from its move log (see ./types and
 * lib/live/chess CHESS_LOG): every move through the same engine the boards
 * play by — in a timed game at the time the mover's device claimed (within a
 * few seconds of when the server got it), so the clocks come out exactly as
 * written — every draw offer / answer, resignation, flag and walk-away claim
 * checked against the game as it stood. The replay must end on the stored
 * position, moves, clocks and result, and the room's winner must be its.
 */
export const verifyChess: Verifier = ({ code, meta, players, state }) => {
  const stored = state as (ChessState & { log?: unknown }) | null
  if (!stored || typeof stored.fen !== "string") return fail("no chess game in the room")
  const start = startOf<ChessState>("chess", code, meta, players, (s) => s.white === stored.white && s.black === stored.black)
  if (!start) return fail("the colours aren't the ones the room dealt")

  const startedAt = typeof meta.startedAt === "number" ? meta.startedAt : stored.startedAt
  if (typeof startedAt !== "number") return fail("no start time")
  let cur: ChessState = { ...start, lastMoveAt: startedAt, startedAt }
  // The game as it stands, kept alongside the state (rebuilding it for every move is slow)
  const game = new Chess()

  const log = readLog(stored.log)
  for (let i = 0; i < log.length; i++) {
    const { b: by, a: action, t } = log[i]
    const at = `entry ${i + 1} (${action})`
    if (typeof t !== "number") return fail(`${at}: no server time`)
    if (cur.result) return fail(`${at}: played after the game was decided`)
    const mine = colourOf(cur, by)
    if (!mine) return fail(`${at}: not one of the two players`)
    const other = opponentOf(cur, by)

    switch (action) {
      case CHESS_LOG.drawOffer:
        if (cur.drawOffer) return fail(`${at}: a draw was already on offer`)
        cur = { ...cur, drawOffer: by }
        continue
      case CHESS_LOG.drawAccept:
        if (cur.drawOffer !== other) return fail(`${at}: no draw offer to accept`)
        cur = end(cur, { winner: null, reason: "draw_agreed" })
        continue
      case CHESS_LOG.drawDecline:
        if (cur.drawOffer !== other) return fail(`${at}: no draw offer to decline`)
        cur = { ...cur, drawOffer: null }
        continue
      case CHESS_LOG.resign:
        cur = end(cur, { winner: other, reason: "resign" })
        continue
      case CHESS_LOG.flag: {
        // The side to move must really be out of time when the claim reached the server
        const side = cur.clock ? flaggedSide(cur, t + CLOCK_SLACK_MS) : null
        if (!side) return fail(`${at}: claimed a flag that hadn't fallen`)
        cur = end(cur, timeoutResult(cur, side))
        continue
      }
      case CHESS_LOG.left:
        if (!wasAway(players, other, t)) return fail(`${at}: claimed the other side had left, but they hadn't`)
        cur = end(cur, { winner: by, reason: "abandoned" })
        continue
    }

    // A move: "e2e4", "e7e8q"; "@<ms>" when the game is timed
    const { what, at: claimed } = splitClaim(action)
    const uci = what.match(UCI)
    if (!uci) return fail(`${at}: not a move`)
    let now = t
    if (cur.clock) {
      if (claimed === null) return fail(`${at}: a timed move without its time`)
      if (!claimFits(claimed, t)) return fail(`${at}: the move's time is off from when it was played`)
      now = claimed
    } else if (claimed !== null) return fail(`${at}: a time on an untimed move`)
    const played = applyMove(
      cur,
      by,
      { from: uci[1] as Square, to: uci[2] as Square, promotion: uci[3] as PieceSymbol | undefined },
      now,
      game
    )
    if (!played) return fail(`${at}: not a legal move then`)
    if (moveCode(played.move, null) !== what) return fail(`${at}: not written the way the move is`)
    cur = { ...played.state, lastMoveAt: t }
  }

  // The replay must land where the stored game is
  if (cur.fen !== stored.fen) return fail("the board isn't where the moves lead")
  if (!same(movesOf(cur), movesOf(stored))) return fail("the move list doesn't match the moves")
  if (!same(cur.last ?? null, stored.last ?? null)) return fail("the last move doesn't match")
  if ((cur.drawOffer ?? null) !== (stored.drawOffer ?? null)) return fail("the draw offer doesn't match")
  if (!sameResult(cur.result, stored.result)) return fail("the result isn't the one the moves give")
  if (!sameClock(cur, stored)) return fail("the clocks don't match the moves")

  return settleWinners(meta, cur.result ? (cur.result.winner ? [cur.result.winner] : []) : null)
}

/** The game decided (as the boards write it: any draw offer goes). */
const end = (s: ChessState, result: ChessResult): ChessState => ({ ...s, result, drawOffer: null })

const sameResult = (a: ChessResult | null | undefined, b: ChessResult | null | undefined) =>
  !a || !b ? !a && !b : (a.winner ?? null) === (b.winner ?? null) && a.reason === b.reason

function sameClock(replayed: ChessState, stored: ChessState) {
  const a = replayed.clock ?? null
  const b = stored.clock ?? null
  if (!a || !b) return !a && !b
  return (
    a.baseMs === b.baseMs &&
    a.incMs === b.incMs &&
    typeof b.w === "number" &&
    typeof b.b === "number" &&
    Math.abs(a.w - b.w) <= CLOCK_MATCH_MS &&
    Math.abs(a.b - b.b) <= CLOCK_MATCH_MS
  )
}
