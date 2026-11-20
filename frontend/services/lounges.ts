import {
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database"

import { LIVE_GAMES } from "@/lib/live/games"
import type { LiveGameId, RoomOptions } from "@/lib/live/types"
import type { UserProfile } from "@/lib/types"
import { createRoom, deleteRoom, liveDb, roomPhoto } from "./live-rooms"
import { sendNotification } from "./shared"

/**
 * A group's game room ("lounge"): always open, one per group, at
 * /lounge/{groupId}. Members drop in whenever they like; it points at the
 * room being played right now (an ordinary live room, services/live-rooms),
 * so whoever is in the lounge is taken into each new game, can watch one in
 * progress, and picks the next game when it ends — nobody has to leave.
 *
 *   lounges/{groupId}
 *     room      the current room's code (absent: nothing set up yet)
 *     game      its game
 *     by, byName, at   who set it up, when
 *     calledAt  when someone last called the group in (a throttle)
 *     here/{uid}  who is in the lounge now (removed on disconnect)
 */

export interface LoungeVisitor {
  name: string
  photo?: string
  avatar?: string
  frame?: string
  at: number
}

export interface Lounge {
  room?: string
  game?: LiveGameId
  by?: string
  byName?: string
  at?: number
  calledAt?: number
  here?: Record<string, LoungeVisitor>
}

const loungeRef = (groupId: string, path?: string) => ref(liveDb(), `lounges/${groupId}${path ? `/${path}` : ""}`)
const ts = () => serverTimestamp() as unknown as number

/** The lounge, live (`null` = never used). */
export function watchLounge(groupId: string, cb: (lounge: Lounge | null) => void, onError?: (e: Error) => void) {
  return onValue(
    loungeRef(groupId),
    (snap) => cb(snap.exists() ? (snap.val() as Lounge) : null),
    (e) => onError?.(e)
  )
}

/** Marks you as in the lounge while this screen is open (and connected). Returns the way out. */
export function enterLounge(groupId: string, user: Pick<UserProfile, "uid" | "displayName" | "photoURL" | "gameAvatar" | "frame">) {
  const me = loungeRef(groupId, `here/${user.uid}`)
  const visitor: Record<string, unknown> = { name: user.displayName.slice(0, 60), at: ts() }
  const photo = roomPhoto(user.photoURL)
  if (photo) visitor.photo = photo
  if (user.gameAvatar) visitor.avatar = user.gameAvatar
  if (user.frame) visitor.frame = user.frame
  const off = onValue(ref(liveDb(), ".info/connected"), (snap) => {
    if (snap.val() !== true) return
    onDisconnect(me)
      .remove()
      .then(() => set(me, visitor))
      .catch(() => undefined)
  })
  return () => {
    off()
    onDisconnect(me)
      .cancel()
      .catch(() => undefined)
    void remove(me).catch(() => undefined)
  }
}

/**
 * Starts the next game in the lounge: opens a room and points the lounge at
 * it — unless someone else got there first (`current` moved on since you
 * looked), in which case your room is dropped and theirs is returned, so
 * everyone ends up in the same one.
 */
export async function startLoungeGame(
  groupId: string,
  user: UserProfile,
  game: LiveGameId,
  options: RoomOptions,
  /** The lounge's room when you picked (a finished one, or none). */
  current: string | null,
  level?: number
): Promise<string> {
  const code = await createRoom(user, game, options, level)
  const res = await runTransaction(loungeRef(groupId, "room"), (now: string | null) =>
    (now ?? null) === current ? code : undefined
  )
  if (!res.committed) {
    void deleteRoom(code).catch(() => undefined)
    return (res.snapshot.val() as string | null) ?? code
  }
  await update(loungeRef(groupId), { game, by: user.uid, byName: user.displayName.slice(0, 60), at: ts() }).catch(
    () => undefined
  )
  return code
}

/**
 * Switches the game while the current one is still gathering players: the
 * lobby closes (its host drops it) and the lounge moves to a fresh room.
 */
export async function switchLoungeGame(
  groupId: string,
  user: UserProfile,
  game: LiveGameId,
  options: RoomOptions,
  current: string | null,
  level?: number
) {
  const code = await startLoungeGame(groupId, user, game, options, current, level)
  if (current && current !== code) void deleteRoom(current).catch(() => undefined)
  return code
}

/** How often the group can be called in. */
export const CALL_COOLDOWN_MS = 2 * 60 * 1000

/**
 * Calls the whole group into the lounge: a notification (and a phone push)
 * for every member but you. Throttled per lounge so the group isn't spammed.
 */
export async function callGroupToLounge(
  groupId: string,
  groupName: string,
  user: UserProfile,
  members: string[],
  game: LiveGameId | null
): Promise<{ sent: number; throttled: boolean }> {
  const stamp = await runTransaction(loungeRef(groupId, "calledAt"), (last: number | null) =>
    last && Date.now() - last < CALL_COOLDOWN_MS ? undefined : Date.now()
  )
  if (!stamp.committed) return { sent: 0, throttled: true }
  const what = game ? LIVE_GAMES[game].name : "a game"
  const results = await Promise.allSettled(
    members
      .filter((m) => m !== user.uid)
      .map((uid) =>
        sendNotification({
          userId: uid,
          title: `${user.displayName.split(" ")[0]} is calling ${groupName} to play`,
          message: `${what} in the group's game room — tap to jump in.`,
          type: "ROOM_INVITE",
          data: { groupId, lounge: true, actorId: user.uid, actorName: user.displayName },
        })
      )
  )
  return { sent: results.filter((r) => r.status === "fulfilled").length, throttled: false }
}
