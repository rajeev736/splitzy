import { randomInt } from "node:crypto"
import type { App } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"

import { colorClashEngine } from "@/lib/live/colorclash"
import type { HostedAction, HostedEngine, HostedStep, HostedTable } from "@/lib/live/hosted"
import { memoryEngine } from "@/lib/live/memory"
import { canStart } from "@/lib/live/seats"
import type { LiveGameId, RoomMeta, RoomPlayer } from "@/lib/live/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEngine = HostedEngine<HostedTable, any, any>

const ENGINES: Partial<Record<LiveGameId, AnyEngine>> = {
  colorclash: colorClashEngine as AnyEngine,
  memory: memoryEngine as AnyEngine,
}

const serverRand = () => randomInt(0, 2 ** 31) / 2 ** 31

export type HostedOutcome = { ok: true; seq: number } | { ok: false; status: number; reason: string }

type Stored = HostedStep<HostedTable, unknown, unknown>

/**
 * Runs a hosted game's step on the server (see lib/live/hosted): the server's
 * own copy (hosted/{code}) changes in one transaction, then the public table
 * and each player's private part are copied out to the room for devices to
 * read — newer copies never overwritten by older ones (by `seq`). A finished
 * game ends the room with its result.
 */
export async function runHosted(app: App, uid: string, code: string, action: HostedAction): Promise<HostedOutcome> {
  const db = getDatabase(app)
  const room = db.ref(`rooms/${code}`)
  const own = db.ref(`hosted/${code}`)
  const [metaSnap, playersSnap] = await Promise.all([room.child("meta").get(), room.child("players").get(), own.get()])
  const meta = metaSnap.val() as RoomMeta | null
  if (!meta) return { ok: false, status: 404, reason: "no room" }
  const engine = ENGINES[meta.game]
  if (!engine) return { ok: false, status: 400, reason: "not a hosted game" }
  const players = Object.values((playersSnap.val() ?? {}) as Record<string, RoomPlayer>)
  const me = players.find((p) => p.uid === uid)
  if (!me) return { ok: false, status: 403, reason: "not in this room" }
  const gone = players.filter((p) => p.left).map((p) => p.uid)

  if (action.type === "start") return startHosted(db, code, meta, players, uid, engine)
  if (meta.status !== "playing") return { ok: false, status: 409, reason: "not playing" }
  if (me.left && action.type !== "tick") return { ok: false, status: 403, reason: "you left this game" }

  let refusal: HostedOutcome | null = null
  let next: Stored | null = null
  const res = await own.transaction((cur: Stored | null) => {
    refusal = null
    next = null
    if (cur === null) return cur
    if (action.type !== "tick" && typeof action.seq === "number" && action.seq !== cur.state.seq) {
      refusal = { ok: false, status: 409, reason: "stale" }
      return undefined
    }
    try {
      const step = engine.act({ ...cur, secrets: cur.secrets ?? {}, uid, action, now: Date.now(), gone, rand: serverRand })
      // Nothing changed (an early tick): leave it
      if (step.state.seq === cur.state.seq) {
        refusal = { ok: false, status: 409, reason: "nothing to do" }
        return undefined
      }
      next = step
      return step
    } catch (e) {
      refusal = { ok: false, status: 409, reason: e instanceof Error ? e.message : "not allowed" }
      return undefined
    }
  })
  const done = next as Stored | null
  if (!res.committed || !done) return refusal ?? { ok: false, status: 409, reason: "not applied" }
  await publish(db, code, meta, done)
  return { ok: true, seq: done.state.seq }
}

/** The lobby is full (or the host starts): deal, and the room is playing. Once. */
async function startHosted(
  db: ReturnType<typeof getDatabase>,
  code: string,
  meta: RoomMeta,
  players: RoomPlayer[],
  uid: string,
  engine: AnyEngine
): Promise<HostedOutcome> {
  if (meta.status !== "lobby" && meta.status !== "countdown") return { ok: false, status: 409, reason: "already started" }
  if (!canStart(meta, players)) return { ok: false, status: 409, reason: "not enough players" }
  if (!players.some((p) => p.uid === uid && !p.left)) return { ok: false, status: 403, reason: "not seated" }
  // Claim the start (two devices may ask at once)
  const claim = await db.ref(`rooms/${code}/meta/status`).transaction((s: string | null) =>
    s === "lobby" || s === "countdown" ? "playing" : undefined
  )
  if (!claim.committed) return { ok: false, status: 409, reason: "already started" }
  const seated = players.filter((p) => !p.left && p.seat < meta.maxPlayers).sort((a, b) => a.seat - b.seat || a.joinedAt - b.joinedAt)
  const now = Date.now()
  const step = engine.start({
    players: seated.map((p) => p.uid),
    names: Object.fromEntries(seated.map((p) => [p.uid, p.name])),
    options: meta.options ?? {},
    rand: serverRand,
    now,
  }) as Stored
  await db.ref(`hosted/${code}`).set(step)
  await db.ref(`rooms/${code}`).update({ "meta/startedAt": now, "meta/startsAt": null })
  await publish(db, code, { ...meta, status: "playing", startedAt: now }, step)
  return { ok: true, seq: step.state.seq }
}

/** Copies the table and the private parts out to the room (never older over newer), and ends a finished game. */
async function publish(db: ReturnType<typeof getDatabase>, code: string, meta: RoomMeta, step: Stored) {
  const room = db.ref(`rooms/${code}`)
  await room.child("state").transaction((cur: HostedTable | null) => (cur && cur.seq >= step.state.seq ? undefined : step.state))
  await Promise.all(
    Object.entries(step.secrets ?? {}).map(([p, secret]) =>
      room.child(`secret/${p}`).transaction((cur: { seq?: number } | null) =>
        cur && (cur.seq ?? -1) >= step.state.seq ? undefined : { ...(secret as object), seq: step.state.seq }
      )
    )
  )
  const result = step.state.result
  if (result && meta.status !== "ended") {
    await room.child("meta").transaction((m: RoomMeta | null) =>
      !m || m.status === "ended" ? undefined : { ...m, status: "ended", endedAt: Date.now(), result }
    )
    // The game is over: the server's own copy (the deck, the layout) isn't needed any more
    await db.ref(`hosted/${code}`).remove().catch(() => undefined)
  }
}
