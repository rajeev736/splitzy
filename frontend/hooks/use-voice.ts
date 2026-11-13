"use client"

import * as React from "react"
import {
  onChildAdded,
  onDisconnect,
  push,
  remove,
  serverTimestamp,
} from "firebase/database"
import { toast } from "sonner"

import { auth } from "@/lib/firebase/config"
import type { RoomPlayer, VoiceState } from "@/lib/live/types"
import {
  iceServersFrom,
  isVoiceSupported,
  mediaErrorMessage,
  parseSignal,
  STUN_SERVERS,
  voicePeers,
  VoiceSession,
  type PeerStatus,
  type VoiceSnapshot,
} from "@/lib/live/voice"
import { roomRef, setVoiceState } from "@/services/live-rooms"

export interface VoiceHook {
  /** This browser can do WebRTC + microphone capture. */
  supported: boolean
  joined: boolean
  joining: boolean
  muted: boolean
  /** Uids talking right now, yours included. */
  speaking: Set<string>
  peers: Record<string, PeerStatus>
  error: string | null
  join: () => Promise<void>
  leave: () => Promise<void>
  toggleMute: () => void
}

const EMPTY: VoiceSnapshot = { muted: false, speaking: new Set(), peers: {} }
/** How long to wait for TURN credentials before going STUN-only. */
const TURN_TIMEOUT_MS = 4000
const noop = () => undefined
const subscribeNever = () => noop

/**
 * ICE servers for one voice session: Google STUN always, plus TURN relays
 * from /api/turn when the server has Cloudflare keys (404 = not configured).
 */
async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const idToken = await auth?.currentUser?.getIdToken()
    if (!idToken) return STUN_SERVERS
    const res = await fetch("/api/turn", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
    })
    if (!res.ok) return STUN_SERVERS
    return iceServersFrom(await res.json())
  } catch {
    return STUN_SERVERS
  }
}

/**
 * Voice chat for one room: a WebRTC mesh between everyone who tapped
 * "Join voice", signalled through rooms/{code}/signals. The session (all the
 * WebRTC objects) lives in lib/live/voice.ts; this hook joins it to the room:
 * who is in voice, my inbox of signals, my own voice/{uid} entry.
 */
export function useVoice(
  code: string,
  uid: string,
  players: RoomPlayer[],
  voice: Record<string, VoiceState> | undefined
): VoiceHook {
  // Server render says "not supported" so the first client render matches it
  const supported = React.useSyncExternalStore(
    subscribeNever,
    isVoiceSupported,
    () => false
  )
  const session = React.useRef<VoiceSession | null>(null)
  const [joined, setJoined] = React.useState(false)
  const [joining, setJoining] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [snap, setSnap] = React.useState<VoiceSnapshot>(EMPTY)

  const leave = React.useCallback(async () => {
    const s = session.current
    session.current = null
    s?.stop()
    setJoined(false)
    setSnap(EMPTY)
    if (!code || !uid) return
    await onDisconnect(roomRef(code, `voice/${uid}`))
      .cancel()
      .catch(noop)
    await setVoiceState(code, uid, null).catch(noop)
  }, [code, uid])

  const join = React.useCallback(async () => {
    if (session.current || !supported || !code || !uid) return
    setJoining(true)
    setError(null)
    const s = new VoiceSession({
      uid,
      iceServers: fetchIceServers(),
      send: (to, signal) =>
        void push(roomRef(code, `signals/${to}`), {
          ...signal,
          from: uid,
          at: serverTimestamp(),
        }).catch(noop),
      onChange: setSnap,
    })
    session.current = s
    try {
      // Mic + AudioContext first: they must start inside the tap that called us
      await s.start()
      // Anything addressed to me from an earlier session is stale
      await remove(roomRef(code, `signals/${uid}`)).catch(noop)
      // If this tab dies, the server takes me out of voice for everyone else
      await onDisconnect(roomRef(code, `voice/${uid}`)).remove()
      await setVoiceState(code, uid, { on: true, muted: false })
      setJoined(true)
    } catch (e) {
      s.stop()
      if (session.current === s) session.current = null
      const message = mediaErrorMessage(e)
      setError(message)
      toast.error(message)
    } finally {
      setJoining(false)
    }
  }, [code, uid, supported])

  const toggleMute = React.useCallback(() => {
    const s = session.current
    if (!s) return
    const muted = !s.muted
    s.setMuted(muted)
    void setVoiceState(code, uid, { on: true, muted }).catch(noop)
  }, [code, uid])

  // My inbox: every signal is handled once, then deleted (the rules let the addressee delete)
  React.useEffect(() => {
    if (!joined || !code || !uid) return
    const s = session.current
    if (!s) return
    return onChildAdded(
      roomRef(code, `signals/${uid}`),
      (child) => {
        const signal = parseSignal(child.val())
        void remove(child.ref).catch(noop)
        if (signal) s.handleSignal(signal)
      },
      noop
    )
  }, [joined, code, uid])

  // Who to be connected to: the other seated, online players with their mic on
  const peerKey = voicePeers(voice, players, uid).join(",")
  React.useEffect(() => {
    if (!joined) return
    session.current?.syncPeers(peerKey ? peerKey.split(",") : [])
  }, [joined, peerKey])

  // Closing the tab: a quick goodbye (voice/{uid} itself is cleared by onDisconnect)
  React.useEffect(() => {
    if (!joined) return
    const bye = () => session.current?.stop()
    window.addEventListener("beforeunload", bye)
    return () => window.removeEventListener("beforeunload", bye)
  }, [joined])

  // Unmounting (leaving the room) or switching rooms ends the session
  React.useEffect(() => {
    if (!code || !uid) return
    return () => {
      const s = session.current
      if (!s) return
      session.current = null
      s.stop()
      void onDisconnect(roomRef(code, `voice/${uid}`))
        .cancel()
        .catch(noop)
      void setVoiceState(code, uid, null).catch(noop)
    }
  }, [code, uid])

  return {
    supported,
    joined,
    joining,
    muted: snap.muted,
    speaking: snap.speaking,
    peers: snap.peers,
    error,
    join,
    leave,
    toggleMute,
  }
}
