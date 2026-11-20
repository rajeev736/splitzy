import { onDisconnect, onValue, ref, serverTimestamp, set } from "firebase/database"

import type { LiveGameId } from "@/lib/live/types"
import { liveDb } from "./live-rooms"

/**
 * Where people are, for invites: `status/{uid}` in the Realtime Database —
 *   online   the app is open
 *   room     in a game room (a lobby, or a group's game room) waiting to play
 *   game     playing a game right now (`game`: which)
 *   offline  the app is closed (set by the server the moment the connection drops)
 * Only you write yours; any signed-in user can read it.
 */
export type Activity = "online" | "room" | "game"
export type PresenceState = Activity | "offline"

export interface UserStatus {
  state: PresenceState
  /** Server ms of the last change. */
  at: number
  game?: LiveGameId
}

const statusRef = (uid: string) => ref(liveDb(), `status/${uid}`)
const ts = () => serverTimestamp() as unknown as number

let me: string | null = null
let connected = false
/** What open screens say you're doing; playing beats being in a room (a game inside a group's room: "game"). */
const claims: { id: number; state: Activity; game?: LiveGameId }[] = []
let nextClaim = 0
let shown = ""
const activity = () =>
  claims.findLast((c) => c.state === "game") ?? claims.findLast((c) => c.state === "room") ?? { state: "online" as Activity, game: undefined }

function write(force = false) {
  if (!me || !connected) return
  const { state, game } = activity()
  const key = `${state}:${game ?? ""}`
  if (!force && key === shown) return
  shown = key
  const value: Record<string, unknown> = { state, at: ts() }
  if (game) value.game = game
  void set(statusRef(me), value).catch(() => undefined)
}

/** Keeps your status while the app is open; offline when it closes. Returns the way out. */
export function startPresence(uid: string): () => void {
  me = uid
  const mine = statusRef(uid)
  const off = onValue(ref(liveDb(), ".info/connected"), (snap) => {
    connected = snap.val() === true
    if (!connected) return
    onDisconnect(mine)
      .set({ state: "offline", at: ts() })
      .then(() => write(true))
      .catch(() => undefined)
  })
  return () => {
    off()
    if (me === uid) {
      void set(mine, { state: "offline", at: ts() }).catch(() => undefined)
      me = null
      connected = false
      shown = ""
    }
  }
}

/**
 * Says what you're doing while a screen is open (a room: "room"; playing:
 * "game"). Returns the release; with nothing claimed you're just "online".
 */
export function claimActivity(state: Activity, game?: LiveGameId): () => void {
  const id = nextClaim++
  claims.push({ id, state, ...(state === "game" && game ? { game } : {}) })
  write()
  return () => {
    const i = claims.findIndex((c) => c.id === id)
    if (i >= 0) claims.splice(i, 1)
    write()
  }
}

/** Someone's status, live (`null` = never seen). */
export function watchStatus(uid: string, cb: (status: UserStatus | null) => void) {
  return onValue(
    statusRef(uid),
    (snap) => cb(snap.exists() ? (snap.val() as UserStatus) : null),
    () => cb(null)
  )
}
