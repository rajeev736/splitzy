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
import { gameNameOf } from "@/lib/game-name"
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
 *     leader    who leads: picks the game and starts it (see leaderOf)
 *     game, options   the game the leader picked, and its settings
 *     round     when it was picked (or the last game started): ready/{uid}
 *               equal to it = ready for this one
 *     ready/{uid}
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
  leader?: string
  game?: LiveGameId
  options?: RoomOptions
  round?: number
  ready?: Record<string, number>
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
export function enterLounge(groupId: string, user: Pick<UserProfile, "uid" | "displayName" | "gameName" | "photoURL" | "gameAvatar" | "frame">) {
  const me = loungeRef(groupId, `here/${user.uid}`)
  const ready = loungeRef(groupId, `ready/${user.uid}`)
  const visitor: Record<string, unknown> = { name: gameNameOf(user).slice(0, 60), at: ts() }
  const photo = roomPhoto(user.photoURL)
  if (photo) visitor.photo = photo
  if (user.gameAvatar) visitor.avatar = user.gameAvatar
  if (user.frame) visitor.frame = user.frame
  const off = onValue(ref(liveDb(), ".info/connected"), (snap) => {
    if (snap.val() !== true) return
    onDisconnect(ready).remove().catch(() => undefined)
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
    onDisconnect(ready)
      .cancel()
      .catch(() => undefined)
    void remove(ready).catch(() => undefined)
    void remove(me).catch(() => undefined)
  }
}

/**
 * Who leads the room: the one recorded, while they're still here — else
 * whoever has been here longest. Every device works it out the same way, so
 * the room agrees even before the new leader's claim is written.
 */
export function leaderOf(lounge: Lounge | null | undefined): string | null {
  const here = lounge?.here ?? {}
  if (lounge?.leader && here[lounge.leader]) return lounge.leader
  const first = Object.entries(here).sort((a, b) => a[1].at - b[1].at)[0]
  return first ? first[0] : null
}

/** Who's here, longest first — the leader always on top. */
export function hereInOrder(lounge: Lounge | null | undefined): [string, LoungeVisitor][] {
  const leader = leaderOf(lounge)
  return Object.entries(lounge?.here ?? {}).sort((a, b) =>
    a[0] === leader ? -1 : b[0] === leader ? 1 : a[1].at - b[1].at
  )
}

/** Ready for the game that's picked now (a new pick, or a game started, asks again). */
export const isReady = (lounge: Lounge | null | undefined, uid: string) =>
  !!lounge?.round && lounge.ready?.[uid] === lounge.round

/** Takes the lead when it's yours by turn (the leader left). */
export const claimLead = (groupId: string, uid: string) => set(loungeRef(groupId, "leader"), uid)

/** The leader hands the room to someone else here. */
export const handOverLead = (groupId: string, to: string) => set(loungeRef(groupId, "leader"), to)

/** The leader picks (or re-sets) the game: everyone sees it, and is asked to get ready again. */
export const pickLoungeGame = (groupId: string, game: LiveGameId, options: RoomOptions) =>
  update(loungeRef(groupId), { game, options, round: ts() })

/** Ready for the picked game (`round`), or not any more (null). */
export const setLoungeReady = (groupId: string, uid: string, round: number | null) =>
  set(loungeRef(groupId, `ready/${uid}`), round)

/**
 * The leader starts the picked game with everyone here: a room only they
 * can sit in, which starts by itself as soon as they're all seated (no
 * lobby in between). Anyone over the game's seats watches. Readiness resets
 * for the next game.
 */
export async function startLoungeRound(
  groupId: string,
  user: UserProfile,
  game: LiveGameId,
  options: RoomOptions,
  /** Who plays, leader first. */
  players: string[],
  /** The lounge's room when you started (a finished one, or none). */
  current: string | null,
  level?: number
): Promise<string> {
  const code = await createRoom(user, game, options, level, undefined, { groupId, only: players })
  const res = await runTransaction(loungeRef(groupId, "room"), (now: string | null) =>
    (now ?? null) === current ? code : undefined
  )
  if (!res.committed) {
    void deleteRoom(code).catch(() => undefined)
    return (res.snapshot.val() as string | null) ?? code
  }
  await update(loungeRef(groupId), {
    by: user.uid,
    byName: user.displayName.slice(0, 60),
    at: ts(),
    round: ts(),
  }).catch(() => undefined)
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
