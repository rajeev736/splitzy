import { readLog } from "../log"
import {
  applyMark,
  matchOver,
  matchResult,
  nextRound,
  TTT_LOG,
  type TicTacToeState,
} from "../tictactoe"
import { fail, listOf, same, settleWinners, startOf, wasAway } from "./duel"
import type { Verifier } from "./types"

/**
 * Replays a finished Tic Tac Toe match from its move log (see ./types and
 * lib/live/tictactoe TTT_LOG): every mark through the same rules the boards
 * play by, every new round started only once the last one was over (and the
 * match wasn't), and a forfeit only when that player had really walked away.
 * The replay must end on the stored board, round, score and marks, and the
 * room's winner must be the match's: whoever won more rounds once the match
 * was decided, or the one left standing after a forfeit.
 */
export const verifyTictactoe: Verifier = ({ code, meta, players, state }) => {
  const stored = state as (TicTacToeState & { log?: unknown }) | null
  if (!stored || typeof stored.board !== "string") return fail("no tic tac toe match in the room")
  const seats = listOf<string>(stored.players)
  const start = startOf<TicTacToeState>("tictactoe", code, meta, players, (s) => same(s.players, seats))
  if (!start) return fail("the players aren't the ones the room seated")
  if (start.players.length !== 2) return fail("not a two-player match")

  let cur: TicTacToeState = start
  const log = readLog(stored.log)
  for (let i = 0; i < log.length; i++) {
    const { b: by, a: action, t } = log[i]
    const at = `entry ${i + 1} (${action})`
    if (typeof t !== "number") return fail(`${at}: no server time`)
    if (cur.forfeit) return fail(`${at}: played after the match was forfeited`)
    if (!cur.players.includes(by)) return fail(`${at}: not one of the two players`)

    if (action === TTT_LOG.next) {
      if (!cur.roundOver || matchOver(cur)) return fail(`${at}: a new round before the last one was over`)
      cur = nextRound(cur)
      continue
    }
    const left = action.match(/^end:left:([01])$/)
    if (left) {
      if (matchOver(cur)) return fail(`${at}: a forfeit after the match was decided`)
      const gone = cur.players[Number(left[1])]
      if (!wasAway(players, gone, t)) return fail(`${at}: claimed a player had left, but they hadn't`)
      cur = { ...cur, forfeit: gone, seq: cur.seq + 1 }
      continue
    }
    const mark = action.match(/^m([0-8])$/)
    if (!mark) return fail(`${at}: not a move`)
    const next = applyMark(cur, by, Number(mark[1]))
    if (!next) return fail(`${at}: not a legal mark then`)
    cur = next
  }

  // The replay must land where the stored match is
  if (cur.board !== stored.board) return fail("the board isn't where the marks lead")
  if (cur.xPlayer !== stored.xPlayer || cur.turn !== stored.turn) return fail("whose mark it is doesn't match")
  if (cur.round !== stored.round || cur.bestOf !== stored.bestOf || cur.seq !== stored.seq)
    return fail("the round count doesn't match")
  if (!cur.players.every((p) => (cur.wins[p] ?? 0) === (stored.wins?.[p] ?? 0))) return fail("the score isn't the one the marks give")
  if ((cur.roundOver ?? null) !== (stored.roundOver ?? null)) return fail("the round's result doesn't match")
  if (!same(cur.winLine ?? null, stored.winLine ?? null)) return fail("the winning line doesn't match")
  if ((cur.forfeit ?? null) !== (stored.forfeit ?? null)) return fail("the forfeit doesn't match")

  const winners = cur.forfeit
    ? cur.players.filter((p) => p !== cur.forfeit)
    : matchOver(cur)
      ? matchResult(cur).winnerIds
      : null
  return settleWinners(meta, winners)
}
