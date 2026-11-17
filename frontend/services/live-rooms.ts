import {
  get,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Database,
  type DatabaseReference,
} from "firebase/database"

import { AppError } from "@/lib/errors"
import { rtdb } from "@/lib/firebase/config"
import { defaultOptions, seatOrder } from "@/lib/live/games"
import { AUTO_START_SECONDS, isJoinable, randomRoomCode } from "@/lib/live/room"
import { canMoveTo, canStart, isTeamRoom, resolveClash, seatsFor } from "@/lib/live/seats"
import { initialStateFor } from "@/lib/live/start"
import type {
  ChatMessage,
  LiveGameId,
  LiveResult,
  Reaction,
  RoomMeta,
  RoomOptions,
  RoomPlayer,
  VoiceState,
} from "@/lib/live/types"
import type { UserProfile } from "@/lib/types"
import { countLiveResult } from "./game-profile"

/**
 * Everything the app writes to a live room. Reads happen through the hooks in
 * hooks/use-live-room.ts. All of this is plain Realtime Database writes guarded
 * by database.rules.json — there is no server.
 */

export function liveDb(): Database {
  if (!rtdb)
    throw new AppError(
      "Live games aren't set up on this server yet (Realtime Database URL missing)"
    )
  return rtdb
}

export const roomRef = (code: string, path?: string): DatabaseReference =>
  ref(liveDb(), `rooms/${code}${path ? `/${path}` : ""}`)

const userRoomsRef = (uid: string) => ref(liveDb(), `userRooms/${uid}`)

/** The server's idea of "now", as a write-time placeholder. */
const ts = () => serverTimestamp() as unknown as number

function playerEntry(user: UserProfile, seat: number, level?: number): RoomPlayer {
  const entry: RoomPlayer = {
    uid: user.uid,
    name: user.displayName,
    seat,
    joinedAt: ts(),
    online: true,
    lastSeen: ts(),
  }
  // The database rejects `undefined` values: only send the photo when there is one
  if (user.photoURL) entry.photo = user.photoURL
  // The game profile: character and frame, drawn on every device without lookups
  if (user.gameAvatar) entry.avatar = user.gameAvatar
  if (user.frame) entry.frame = user.frame
  // …and the level (lib/live/levels) when the wallet it comes from has loaded
  if (level) entry.level = level
  return entry
}

/** Your game profile as it stands, for a seat you're coming back to (`null` clears a removed one). */
const gameProfilePatch = (user: UserProfile, level?: number) => ({
  avatar: user.gameAvatar || null,
  frame: user.frame || null,
  ...(level ? { level } : {}),
})

/** Your level on your seat, when it changed (a level-up, or the wallet loading after you joined). */
export const setPlayerLevel = (code: string, uid: string, level: number) =>
  update(roomRef(code, `players/${uid}`), { level })

/* ── Rooms ───────────────────────────────────────────────────────────── */

/** Opens a room for `game` with you in seat 0. Returns its code. */
export async function createRoom(
  user: UserProfile,
  game: LiveGameId,
  picked: RoomOptions = {},
  /** Your game level, for your seat (lib/live/levels). */
  level?: number
): Promise<string> {
  const options = defaultOptions(game, picked)
  // Team Ludo is always four seats (lib/live/seats)
  const { minPlayers, maxPlayers } = seatsFor(game, options)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomRoomCode()
    const meta: RoomMeta = {
      code,
      game,
      hostId: user.uid,
      hostName: user.displayName,
      createdAt: ts(),
      minPlayers,
      maxPlayers,
      status: "lobby",
      options,
    }
    // Only claim a code nobody else has
    const res = await runTransaction(roomRef(code, "meta"), (current) =>
      current === null ? meta : undefined
    )
    if (!res.committed) continue
    await set(roomRef(code, `players/${user.uid}`), playerEntry(user, 0, level))
    await set(ref(liveDb(), `userRooms/${user.uid}/${code}`), ts()).catch(
      () => undefined
    )
    return code
  }
  throw new AppError("Couldn't open a room — please try again")
}

export type JoinOutcome = "joined" | "not_found" | "full" | "started" | "ended"

/**
 * Takes a seat in the room (or comes back to yours). The seat count is also
 * checked by the security rules; the re-read afterwards settles the rare race
 * of two people grabbing the last seat at the same moment.
 */
export async function joinRoom(
  user: UserProfile,
  code: string,
  level?: number
): Promise<JoinOutcome> {
  const [metaSnap, playersSnap] = await Promise.all([
    get(roomRef(code, "meta")),
    get(roomRef(code, "players")),
  ])
  if (!metaSnap.exists()) return "not_found"
  const meta = metaSnap.val() as RoomMeta
  const players = (playersSnap.val() ?? {}) as Record<string, RoomPlayer>
  const me = players[user.uid]
  const playerRef = roomRef(code, `players/${user.uid}`)

  if (me) {
    // Back again: in the lobby a change of heart un-leaves you; mid-game "left" stands
    const patch: Record<string, unknown> = {
      online: true,
      lastSeen: ts(),
      name: user.displayName,
      ...gameProfilePatch(user, level),
    }
    if (user.photoURL) patch.photo = user.photoURL
    if (isJoinable(meta) && me.left) patch.left = null
    await update(playerRef, patch)
    void set(ref(liveDb(), `userRooms/${user.uid}/${code}`), ts()).catch(
      () => undefined
    )
    return "joined"
  }
  if (!isJoinable(meta)) return meta.status === "ended" ? "ended" : "started"

  const seated = seatOrder(players)
  if (seated.length >= meta.maxPlayers) return "full"
  const taken = new Set(seated.map((p) => p.seat))
  let seat = 0
  while (taken.has(seat)) seat++

  try {
    await set(playerRef, playerEntry(user, seat, level))
  } catch {
    // The rules refused: the room filled up or started between the read and the write
    const again = await get(roomRef(code, "meta"))
    const m = again.val() as RoomMeta | null
    return !m
      ? "not_found"
      : !isJoinable(m)
        ? m.status === "ended"
          ? "ended"
          : "started"
        : "full"
  }
  // Two people may have taken the last seat together: the later joiner steps back out
  const after = seatOrder(
    ((await get(roomRef(code, "players"))).val() ?? {}) as Record<
      string,
      RoomPlayer
    >
  )
  const byArrival = [...after].sort(
    (a, b) => a.joinedAt - b.joinedAt || a.uid.localeCompare(b.uid)
  )
  if (byArrival.findIndex((p) => p.uid === user.uid) >= meta.maxPlayers) {
    await remove(playerRef)
    return "full"
  }
  // …and two who picked the same free seat: the later one moves on to another
  await settleSeat(code, user.uid, meta).catch(() => undefined)
  void set(ref(liveDb(), `userRooms/${user.uid}/${code}`), ts()).catch(
    () => undefined
  )
  return "joined"
}

/**
 * Leaves. Before the game: your seat frees up (and the host role passes on, or
 * the room closes if you were alone). During the game: you forfeit — your
 * entry stays flagged `left` so the game can skip / award accordingly.
 */
/** Has `uid` already finished this game while others play on (a place in Ludo / Snakes, solved in Sudoku)? */
async function finishedIn(code: string, game: RoomMeta["game"], uid: string): Promise<boolean> {
  const path =
    game === "ludo" || game === "snakes" || game === "snakes3d"
      ? `state/players/${uid}/place`
      : game === "sudoku"
        ? `state/finished/${uid}`
        : null
  if (!path) return false
  const snap = await get(roomRef(code, path)).catch(() => null)
  const v = snap?.val() as unknown
  return game === "sudoku" ? v != null : typeof v === "number" && v > 0
}

export async function leaveRoom(uid: string, code: string): Promise<void> {
  const [metaSnap, playersSnap] = await Promise.all([
    get(roomRef(code, "meta")),
    get(roomRef(code, "players")),
  ])
  if (!metaSnap.exists()) return
  const meta = metaSnap.val() as RoomMeta
  const players = (playersSnap.val() ?? {}) as Record<string, RoomPlayer>
  if (!players[uid]) return

  if (meta.status === "playing") {
    // Already home (Ludo, Snakes) or solved (Sudoku)? Then this isn't giving up:
    // your place is kept for the final ranking, and you can come back to watch
    // the rest and see the result (counted then, like everyone else's).
    const finished = await finishedIn(code, meta.game, uid)
    await update(roomRef(code, `players/${uid}`), {
      left: true,
      online: false,
      lastSeen: ts(),
    })
    if (finished) return
    // Giving up counts as a loss on your live record (and ends a win streak)
    if (meta.startedAt)
      void countLiveResult(uid, { code, startedAt: meta.startedAt, game: meta.game, outcome: "lose" })
    // You're out of it for good: it isn't "your game in progress" any more
    await remove(ref(liveDb(), `userRooms/${uid}/${code}`)).catch(() => undefined)
    return
  }
  if (meta.status === "ended") {
    await remove(ref(liveDb(), `userRooms/${uid}/${code}`)).catch(
      () => undefined
    )
    return
  }

  const others = seatOrder(players).filter((p) => p.uid !== uid)
  if (others.length === 0) {
    await remove(roomRef(code))
  } else {
    const patch: Record<string, unknown> = { [`players/${uid}`]: null }
    if (meta.hostId === uid) {
      patch["meta/hostId"] = others[0].uid
      patch["meta/hostName"] = others[0].name
    }
    // No longer full: the countdown stops
    if (meta.status === "countdown") {
      patch["meta/status"] = "lobby"
      patch["meta/startsAt"] = null
    }
    await update(roomRef(code), patch)
  }
  await remove(ref(liveDb(), `userRooms/${uid}/${code}`)).catch(() => undefined)
}

/**
 * Team rooms: moves you to another seat in the lobby — a free one, or the
 * bench when every seat is taken (see lib/live/seats). If someone grabbed the
 * same seat at the same moment, the earlier claim keeps it and you go back.
 */
export async function moveSeat(code: string, uid: string, seat: number): Promise<boolean> {
  const [metaSnap, playersSnap] = await Promise.all([
    get(roomRef(code, "meta")),
    get(roomRef(code, "players")),
  ])
  const meta = metaSnap.val() as RoomMeta | null
  const players = seatOrder((playersSnap.val() ?? {}) as Record<string, RoomPlayer>)
  const from = players.find((p) => p.uid === uid)?.seat
  if (!meta || from === undefined || !canMoveTo(meta, players, uid, seat)) return false
  await update(roomRef(code, `players/${uid}`), { seat, seatAt: ts() })
  return (await settleSeat(code, uid, meta, from)) === null
}

/** Settles a seat clash for `uid` (see resolveClash); returns the seat they moved to, or null if they kept theirs. */
async function settleSeat(code: string, uid: string, meta: RoomMeta, from?: number): Promise<number | null> {
  const players = seatOrder(((await get(roomRef(code, "players"))).val() ?? {}) as Record<string, RoomPlayer>)
  const to = resolveClash(meta, players, uid, from)
  if (to === null) return null
  await update(roomRef(code, `players/${uid}`), { seat: to, seatAt: ts() })
  return to
}

/** Host removes someone from the lobby. */
export async function kickPlayer(code: string, uid: string): Promise<void> {
  await remove(roomRef(code, `players/${uid}`))
}

/** Every seat is taken: the game starts by itself in a few seconds. */
export const startCountdown = (code: string, serverNow: number) =>
  update(roomRef(code, "meta"), {
    status: "countdown",
    startsAt: serverNow + AUTO_START_SECONDS * 1000,
  })

export const cancelCountdown = (code: string) =>
  update(roomRef(code, "meta"), { status: "lobby", startsAt: null })

/** Writes the first game state and flips the room to playing, in one go. */
export async function startGame(
  code: string,
  meta: RoomMeta,
  players: RoomPlayer[]
): Promise<void> {
  const active = players.filter((p) => !p.left)
  if (!canStart(meta, players))
    throw new AppError(
      active.some((p) => p.seat >= meta.maxPlayers)
        ? "Someone is still on the bench"
        : isTeamRoom(meta)
          ? "Teams need all four players"
          : `Need at least ${meta.minPlayers} players`
    )
  await update(roomRef(code), {
    "meta/status": "playing",
    "meta/startedAt": ts(),
    "meta/startsAt": null,
    state: initialStateFor(meta.game, active, meta.options, code),
  })
}

/** Game over for everyone. Does nothing if the room already ended. */
export async function endGame(code: string, result: LiveResult): Promise<void> {
  const res = await runTransaction(
    roomRef(code, "meta"),
    (meta: RoomMeta | null) => {
      if (!meta || meta.status === "ended") return undefined
      return { ...meta, status: "ended", endedAt: ts(), result }
    }
  )
  if (!res.committed) return
}

/**
 * A finished room keeps only its meta (who won); the drawing, chat and
 * signalling go. Run by the referee a minute after the end.
 */
export async function cleanupRoom(code: string): Promise<void> {
  await update(roomRef(code), {
    state: null,
    chat: null,
    reactions: null,
    signals: null,
    secret: null,
  }).catch(() => undefined)
}

/** Deletes a room you host (lobby or ended) or any room past its time-to-live. */
export const deleteRoom = (code: string) => remove(roomRef(code))

/** Opens a fresh room with the same game and settings, and points this room at it. */
export async function rematch(
  user: UserProfile,
  meta: RoomMeta,
  level?: number
): Promise<string> {
  const code = await createRoom(user, meta.game, meta.options, level)
  await update(roomRef(meta.code, "meta"), { rematchCode: code }).catch(
    () => undefined
  )
  return code
}

/* ── Inside a room ───────────────────────────────────────────────────── */

export async function sendChat(
  code: string,
  user: Pick<UserProfile, "uid" | "displayName">,
  text: string,
  extra: Partial<Pick<ChatMessage, "kind">> & { for?: string } = {}
): Promise<void> {
  const clean = text.trim().slice(0, 200)
  if (!clean && extra.kind !== "close") return
  const msg: ChatMessage & { for?: string } = {
    uid: user.uid,
    name: user.displayName,
    text: clean,
    at: ts(),
    ...extra,
  }
  await push(roomRef(code, "chat"), msg)
}

export const sendReaction = (
  code: string,
  user: Pick<UserProfile, "uid" | "displayName">,
  sticker: string,
  /** For a throwable: who it's thrown at. */
  to?: string
) =>
  push(roomRef(code, "reactions"), {
    uid: user.uid,
    name: user.displayName,
    sticker,
    at: ts(),
    ...(to ? { to } : {}),
  } satisfies Reaction)

export const setVoiceState = (
  code: string,
  uid: string,
  state: VoiceState | null
) => set(roomRef(code, `voice/${uid}`), state)

/** Patches the game state. Keys may be nested paths, e.g. `{ "turn/phase": "drawing" }`. */
export const updateState = (code: string, patch: Record<string, unknown>) =>
  update(roomRef(code, "state"), patch)

/** Replaces the whole game state. */
export const setState = (code: string, state: object) =>
  set(roomRef(code, "state"), state)

/** Read-modify-write on the whole game state; return undefined from `fn` to abort. */
export const stateTransaction = <S>(
  code: string,
  fn: (current: S | null) => S | undefined
) => runTransaction(roomRef(code, "state"), fn)

/* ── Presence & clock ────────────────────────────────────────────────── */

/**
 * Keeps `players/{uid}.online` honest while this tab is open: true now, false
 * the moment the connection drops (set up server-side with onDisconnect).
 */
export function watchPresence(code: string, uid: string): () => void {
  const playerRef = roomRef(code, `players/${uid}`)
  const unsubscribe = onValue(ref(liveDb(), ".info/connected"), (snap) => {
    if (snap.val() !== true) return
    onDisconnect(playerRef)
      .update({ online: false, lastSeen: ts() })
      .then(() => update(playerRef, { online: true, lastSeen: ts() }))
      .catch(() => undefined)
  })
  return () => {
    unsubscribe()
    onDisconnect(playerRef)
      .cancel()
      .catch(() => undefined)
    update(playerRef, { online: false, lastSeen: ts() }).catch(() => undefined)
  }
}

/** Difference between the server clock and this device's, in ms. */
export const watchServerOffset = (cb: (offsetMs: number) => void) =>
  onValue(ref(liveDb(), ".info/serverTimeOffset"), (snap) =>
    cb((snap.val() as number) ?? 0)
  )

/** Codes of rooms you've been in, newest first (value = when you joined). */
export const watchUserRooms = (
  uid: string,
  cb: (codes: { code: string; joinedAt: number }[]) => void
) =>
  onValue(userRoomsRef(uid), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, number>
    cb(
      Object.entries(val)
        .map(([code, joinedAt]) => ({ code, joinedAt }))
        .sort((a, b) => b.joinedAt - a.joinedAt)
    )
  })

export const forgetUserRoom = (uid: string, code: string) =>
  remove(ref(liveDb(), `userRooms/${uid}/${code}`)).catch(() => undefined)

/* ── Group games ─────────────────────────────────────────────────────── */

export interface GroupRoom {
  code: string
  game: LiveGameId
  hostId: string
  hostName: string
  at: number
}

/** Lists a room under its group, so every member sees it on the group page. */
export const registerGroupRoom = (
  groupId: string,
  code: string,
  game: LiveGameId,
  host: Pick<UserProfile, "uid" | "displayName">
) =>
  set(ref(liveDb(), `groupRooms/${groupId}/${code}`), {
    game,
    hostId: host.uid,
    hostName: host.displayName,
    at: ts(),
  })

/** The group's most recent rooms, newest first. */
export function watchGroupRooms(
  groupId: string,
  cb: (rooms: GroupRoom[]) => void
) {
  return onValue(ref(liveDb(), `groupRooms/${groupId}`), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Omit<GroupRoom, "code">>
    cb(
      Object.entries(val)
        .map(([code, r]) => ({ code, ...r }))
        .sort((a, b) => b.at - a.at)
        .slice(0, 12)
    )
  })
}

/** Drops a finished or deleted room from the group's list. */
export const forgetGroupRoom = (groupId: string, code: string) =>
  remove(ref(liveDb(), `groupRooms/${groupId}/${code}`)).catch(() => undefined)
