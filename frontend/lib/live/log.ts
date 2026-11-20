/**
 * The move log of a live game: every step that changed the board, in order,
 * kept in the game state itself (`state.log`). The server replays it at the
 * end (lib/live/verify) to check the result before it counts — so a board
 * written by hand, or a dice nobody rolled, doesn't win anything.
 *
 *   b   who did it (their uid)
 *   a   what, as a short code (per game: lib/live/verify/<game>.ts), e.g.
 *       "r6" a dice roll of 6 (written only by the server: app/api/live/roll),
 *       "m2" Ludo: move token 2, "e2e4" a chess move, "s:idle" a turn skipped
 *   t   when, in server ms (the rules make clients send the server's clock)
 *
 * Append-only (database.rules.json): entries can't be changed or removed,
 * clients can't write a roll, and each entry carries its writer's own uid.
 */
export interface LogEntry {
  b: string
  a: string
  t: number
}

export type MoveLog = LogEntry[]

/** The log as stored: RTDB hands an array back as an object when it has gaps. */
export function readLog(raw: unknown): LogEntry[] {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : Object.keys(raw as object).sort((x, y) => Number(x) - Number(y)).map((k) => (raw as Record<string, unknown>)[k])
  return list.filter((e): e is LogEntry => !!e && typeof e === "object" && typeof (e as LogEntry).a === "string")
}

/**
 * `next` with one more log entry. `t` is the server clock: on a device, the
 * RTDB serverTimestamp placeholder; on the server, Date.now().
 */
export function withLog<S extends object>(next: S, prev: object | null | undefined, by: string, action: string, t: number): S {
  const log = readLog((prev as { log?: unknown } | null | undefined)?.log)
  return { ...next, log: [...log, { b: by, a: action, t }] }
}
