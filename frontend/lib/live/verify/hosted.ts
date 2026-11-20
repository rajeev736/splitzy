import type { HostedTable } from "../hosted"
import { sameSet, type Verifier } from "./types"

/**
 * Games the server runs (lib/live/hosted): every move was the server's, and
 * only it writes the table (database.rules.json) — so the table's own result
 * is the truth. The room's result must agree; a game everyone walked away
 * from ends with no winner.
 */
export const verifyHosted: Verifier = ({ meta, state }) => {
  const table = state as HostedTable | null
  const claimed = meta.result?.winnerIds ?? []
  if (table?.result) {
    const winners = table.result.winnerIds ?? []
    return sameSet(winners, claimed) ? { ok: true, winners } : { ok: false, reason: "the room's result isn't the table's" }
  }
  if (meta.result?.reason === "everyone_left" && claimed.length === 0) return { ok: true, winners: [] }
  return { ok: false, reason: "the game wasn't finished on the table" }
}
