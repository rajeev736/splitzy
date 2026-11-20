import { EVERYONE_LEFT_REASON } from "../liveness"
import { initialStateFor } from "../start"
import { blanksOf, isSolved, resultOf, unpackAnswer, type SudokuState } from "../sudoku"
import { abandonedInTime, logInOrder, startedWith, strictLog } from "./snakes"
import { sameSet, type Verifier, type VerifyResult } from "./types"

/**
 * Sudoku race. Solving can't be replayed for skill (a solver app fills a grid
 * as well as anyone), so this checks that the result is plausible:
 *
 *   "f:<grid>"   a player solved it, at the entry's time (the server's clock);
 *                <grid> is their finished grid (lib/live/sudoku packAnswer)
 *
 * Every finish must be this room's puzzle correctly solved, after the start
 * (no faster than a few taps per blank) and before the time ran out; the
 * board's finish times must be the log's; and the winner — the first to
 * finish — must be the one the room reported.
 */

/** The fastest anyone fills a blank: pick the cell, tap the digit. */
export const SUDOKU_MIN_MS_PER_BLANK = 300
/** A device's clock estimate and the time to write: a finish this late after time's up still counts. */
const LATE_MS = 10_000

const fail = (reason: string): VerifyResult => ({ ok: false, reason })

export const verifySudoku: Verifier = ({ code, meta, players, state }) => {
  if (meta.game !== "sudoku") return fail("not a Sudoku game")
  const final = state as (Partial<SudokuState> & { log?: unknown }) | null
  if (!final || typeof final !== "object") return fail("no board")
  const startedAt = meta.startedAt ?? 0

  const started = startedWith(final.order, players, meta)
  if (typeof started === "string") return fail(started)
  const start = initialStateFor("sudoku", started, meta.options ?? {}, code) as SudokuState
  if (final.puzzle !== start.puzzle) return fail("not this room's puzzle")
  const log = strictLog(final.log)
  if (!log) return fail("the move log was tampered with")
  const order = logInOrder(log, startedAt)
  if (order) return fail(order)

  const fastest = blanksOf(start.puzzle) * SUDOKU_MIN_MS_PER_BLANK
  const deadline = startedAt + start.minutes * 60_000 + LATE_MS
  const finished: Record<string, number> = {}
  for (let i = 0; i < log.length; i++) {
    const e = log[i]
    const m = /^f:([0-9a-z]+)$/.exec(e.a)
    if (!m) return fail(`entry ${i}: unknown move "${e.a.slice(0, 40)}"`)
    if (!start.order.includes(e.b)) return fail(`entry ${i}: a finish by someone not in the race`)
    // Written once per player; a second one (shouldn't happen) changes nothing
    if (finished[e.b] !== undefined) continue
    const grid = unpackAnswer(m[1], start.puzzle)
    if (!grid || !isSolved(grid, start.puzzle)) return fail(`entry ${i}: the grid isn't solved`)
    if (e.t - startedAt < fastest) return fail(`entry ${i}: solved faster than it can be filled in`)
    if (e.t > deadline) return fail(`entry ${i}: finished after time was up`)
    finished[e.b] = e.t
  }

  // The board shows the same finishes, at the same times, as the log
  const shown = (final.finished ?? {}) as Record<string, unknown>
  const everyone = new Set([...Object.keys(shown), ...Object.keys(finished)])
  for (const u of everyone) if (shown[u] !== finished[u]) return fail("the finish times don't match the log")

  const claimed = meta.result?.winnerIds ?? []
  if (meta.result?.reason === EVERYONE_LEFT_REASON && claimed.length === 0) {
    const left = new Set(players.filter((p) => p.left).map((p) => p.uid))
    return abandonedInTime(meta, log, left) ? { ok: true, winners: [] } : fail("closed as abandoned while it was being played")
  }
  const gone = players.filter((p) => p.left).map((p) => p.uid)
  const winners = resultOf({ ...start, finished, progress: final.progress }, gone).winnerIds
  if (!sameSet(winners, claimed)) return fail("the result doesn't match the race")
  return { ok: true, winners }
}
