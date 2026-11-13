"use client"

import * as React from "react"
import {
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onValue,
  query,
  type DataSnapshot,
} from "firebase/database"

import { useSession } from "@/components/providers/session-provider"
import { isLiveConfigured } from "@/lib/firebase/config"
import { seatOrder } from "@/lib/live/games"
import { refereeOf } from "@/lib/live/room"
import type { RoomMeta, RoomPlayer, VoiceState } from "@/lib/live/types"
import { roomRef, watchPresence, watchServerOffset } from "@/services/live-rooms"

/* ── Server clock ────────────────────────────────────────────────────── */

let offsetMs = 0
let offsetWatchers = 0
let stopOffset: (() => void) | null = null

/** Server time right now (ms). Accurate once the first room has opened. */
export const serverNow = () => Date.now() + offsetMs

/** A server-synced clock ticking once a second, shared by every timer in the room. */
export function useServerClock(tickMs = 1000) {
  const [now, setNow] = React.useState(() => serverNow())
  React.useEffect(() => {
    if (!isLiveConfigured) return
    if (offsetWatchers++ === 0) stopOffset = watchServerOffset((o) => (offsetMs = o))
    const id = window.setInterval(() => setNow(serverNow()), tickMs)
    return () => {
      window.clearInterval(id)
      if (--offsetWatchers === 0) {
        stopOffset?.()
        stopOffset = null
      }
    }
  }, [tickMs])
  return { now, serverNow }
}

/* ── Generic room reads ──────────────────────────────────────────────── */

/** One node of the room, live. `undefined` until the first value (or `null` when it doesn't exist). */
export function useRoomNode<T>(code: string | null, path: string): { data: T | null | undefined; error: Error | null } {
  const [state, setState] = React.useState<{ key: string; data: T | null | undefined; error: Error | null }>({
    key: "",
    data: undefined,
    error: null,
  })
  const key = code ? `${code}/${path}` : ""
  React.useEffect(() => {
    if (!code || !isLiveConfigured) return
    const unsubscribe = onValue(
      roomRef(code, path),
      (snap) => setState({ key, data: snap.exists() ? (snap.val() as T) : null, error: null }),
      (error) => setState({ key, data: null, error })
    )
    return unsubscribe
  }, [code, path, key])
  return state.key === key ? { data: state.data, error: state.error } : { data: undefined, error: null }
}

export interface Keyed<T> {
  key: string
  value: T
}

/**
 * An append-only list node (chat, strokes, reactions), streamed child by child
 * so each new entry arrives alone instead of the whole list again.
 * Pass `last` to only follow the most recent N.
 */
export function useRoomChildren<T>(code: string | null, path: string, last?: number): Keyed<T>[] {
  // Keyed by subscription, so switching rooms never shows the previous room's list
  const sub = code ? `${code}/${path}/${last ?? "all"}` : ""
  const [state, setState] = React.useState<{ sub: string; items: Keyed<T>[] }>({ sub: "", items: [] })
  React.useEffect(() => {
    if (!code || !isLiveConfigured) return
    const base = roomRef(code, path)
    const q = last ? query(base, limitToLast(last)) : base
    const upsert = (snap: DataSnapshot) => {
      const key = snap.key!
      const value = snap.val() as T
      setState((prev) => {
        const list = prev.sub === sub ? prev.items : []
        const i = list.findIndex((x) => x.key === key)
        if (i < 0) return { sub, items: [...list, { key, value }] }
        const next = list.slice()
        next[i] = { key, value }
        return { sub, items: next }
      })
    }
    const removeOne = (snap: DataSnapshot) =>
      setState((prev) => ({ sub, items: (prev.sub === sub ? prev.items : []).filter((x) => x.key !== snap.key) }))
    const offs = [onChildAdded(q, upsert), onChildChanged(q, upsert), onChildRemoved(q, removeOne)]
    return () => offs.forEach((off) => off())
  }, [code, path, last, sub])
  return state.sub === sub ? state.items : EMPTY_LIST
}

const EMPTY_LIST: never[] = []

/* ── The room itself ─────────────────────────────────────────────────── */

export interface LiveRoom {
  code: string
  meta: RoomMeta | null
  /** Seat order; includes players who left (flagged). */
  players: RoomPlayer[]
  playersById: Record<string, RoomPlayer>
  voice: Record<string, VoiceState>
  uid: string
  me: RoomPlayer | null
  isHost: boolean
  isReferee: boolean
  /** The first read has happened. */
  loaded: boolean
  notFound: boolean
  error: Error | null
  now: number
  serverNow: () => number
}

/**
 * Subscribes to a room's meta, players and voice, and keeps your presence up
 * to date while you're seated in it. The game state is read by each game
 * through `useRoomNode` / `useRoomChildren`.
 */
export function useLiveRoom(code: string | null): LiveRoom {
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const metaQ = useRoomNode<RoomMeta>(code, "meta")
  const playersQ = useRoomNode<Record<string, RoomPlayer>>(code, "players")
  const voiceQ = useRoomNode<Record<string, VoiceState>>(code, "voice")
  const clock = useServerClock()

  const playersById = React.useMemo(() => playersQ.data ?? {}, [playersQ.data])
  const players = React.useMemo(() => seatOrder(playersById), [playersById])
  const me = (uid && playersById[uid]) || null
  const meta = metaQ.data ?? null
  const seated = !!me && !me.left
  const active = meta?.status !== "ended"

  // Presence: only while seated in a room that's still going
  React.useEffect(() => {
    if (!code || !uid || !seated || !active) return
    return watchPresence(code, uid)
  }, [code, uid, seated, active])

  return {
    code: code ?? "",
    meta,
    players,
    playersById,
    voice: voiceQ.data ?? {},
    uid,
    me,
    isHost: !!meta && meta.hostId === uid,
    isReferee: !!uid && refereeOf(players) === uid,
    loaded: metaQ.data !== undefined && playersQ.data !== undefined,
    notFound: metaQ.data === null,
    error: metaQ.error ?? playersQ.error,
    now: clock.now,
    serverNow,
  }
}
