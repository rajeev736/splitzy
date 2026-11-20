import {
  applyMove,
  boardOf,
  CHECKERS_LOG,
  historyOf,
  moveFromNotation,
  notation,
  opponentOf,
  sideOf,
  type CheckersResult,
  type CheckersState,
} from "../checkers"
import { readLog } from "../log"
import { fail, same, settleWinners, startOf, wasAway } from "./duel"
import type { Verifier } from "./types"

/**
 * Replays a finished Checkers game from its move log (see ./types and
 * lib/live/checkers CHECKERS_LOG): every move through the same engine the
 * boards play by (compulsory captures, crowning, the quiet-move draw), every
 * draw offer / answer, resignation and walk-away claim checked against the
 * game as it stood. The replay must end on the stored board, side to move,
 * move counters, history and result, and the room's winner must be its.
 * Checkers has no clock, so nothing here depends on time but a walk-away claim.
 */
export const verifyCheckers: Verifier = ({ code, meta, players, state }) => {
  const stored = state as (CheckersState & { log?: unknown }) | null
  if (!stored || stored.board == null) return fail("no checkers game in the room")
  const start = startOf<CheckersState>("checkers", code, meta, players, (s) => s.light === stored.light && s.dark === stored.dark)
  if (!start) return fail("the sides aren't the ones the room dealt")

  let cur: CheckersState = { ...start, startedAt: 0, lastMoveAt: 0 }
  const log = readLog(stored.log)
  for (let i = 0; i < log.length; i++) {
    const { b: by, a: action, t } = log[i]
    const at = `entry ${i + 1} (${action})`
    if (typeof t !== "number") return fail(`${at}: no server time`)
    if (cur.result) return fail(`${at}: played after the game was decided`)
    if (!sideOf(cur, by)) return fail(`${at}: not one of the two players`)
    const other = opponentOf(cur, by)

    switch (action) {
      case CHECKERS_LOG.drawOffer:
        if (cur.drawOffer) return fail(`${at}: a draw was already on offer`)
        cur = { ...cur, drawOffer: by }
        continue
      case CHECKERS_LOG.drawAccept:
        if (cur.drawOffer !== other) return fail(`${at}: no draw offer to accept`)
        cur = end(cur, { winner: null, reason: "draw_agreed" })
        continue
      case CHECKERS_LOG.drawDecline:
        if (cur.drawOffer !== other) return fail(`${at}: no draw offer to decline`)
        cur = { ...cur, drawOffer: null }
        continue
      case CHECKERS_LOG.resign:
        cur = end(cur, { winner: other, reason: "resign" })
        continue
      case CHECKERS_LOG.left:
        if (!wasAway(players, other, t)) return fail(`${at}: claimed the other side had left, but they hadn't`)
        cur = end(cur, { winner: by, reason: "abandoned" })
        continue
    }

    // A move, in standard notation: whose turn it is is checked by applyMove
    const move = moveFromNotation(boardOf(cur), cur.turn, action)
    if (!move || notation(move) !== action) return fail(`${at}: not a legal move then`)
    const next = applyMove(cur, by, move, t)
    if (!next) return fail(`${at}: not that player's move`)
    cur = next
  }

  // The replay must land where the stored game is
  if (!same(boardOf(cur), boardOf(stored))) return fail("the board isn't where the moves lead")
  if (cur.turn !== stored.turn) return fail("the side to move doesn't match")
  if (cur.moves !== stored.moves || cur.quiet !== stored.quiet) return fail("the move counters don't match")
  if (!same(historyOf(cur), historyOf(stored))) return fail("the move list doesn't match the moves")
  if (!same(cur.lastMove ?? null, stored.lastMove ?? null)) return fail("the last move doesn't match")
  if ((cur.drawOffer ?? null) !== (stored.drawOffer ?? null)) return fail("the draw offer doesn't match")
  if (!sameResult(cur.result, stored.result)) return fail("the result isn't the one the moves give")

  return settleWinners(meta, cur.result ? (cur.result.winner ? [cur.result.winner] : []) : null)
}

/** The game decided (as the boards write it: any draw offer goes). */
const end = (s: CheckersState, result: CheckersResult): CheckersState => ({ ...s, result, drawOffer: null })

const sameResult = (a: CheckersResult | null | undefined, b: CheckersResult | null | undefined) =>
  !a || !b ? !a && !b : (a.winner ?? null) === (b.winner ?? null) && a.reason === b.reason
