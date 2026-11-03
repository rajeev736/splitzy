"use client"

import * as React from "react"
import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useSession } from "@/components/providers/session-provider"
import { BADGE_IDS, badgeTier, type BadgeId, type BadgeTier } from "@/lib/fun/catalog"
import { db, isFirebaseConfigured } from "@/lib/firebase/config"
import { queryKeys } from "@/lib/query/keys"
import { awaitRealtime } from "@/lib/query/realtime"
import type { BadgeEvent, CoinTx, Friendship, Moment, UserProfile, Wallet } from "@/lib/types"
import { friendshipId } from "@/services/shared"

const EMPTY: never[] = []

/**
 * Live value of one Firestore listener, keyed so that switching to another
 * doc never shows the previous one's data. `undefined` while loading.
 */
function useLive<T>(key: string | null, listen: (set: (value: T) => void) => () => void): T | undefined {
  const [state, setState] = React.useState<{ key: string; value: T } | null>(null)
  const listenRef = React.useRef(listen)
  React.useEffect(() => {
    listenRef.current = listen
  })
  React.useEffect(() => {
    if (!key || !isFirebaseConfigured || !db) return
    return listenRef.current((value) => setState({ key, value }))
  }, [key])
  return state && state.key === key ? state.value : undefined
}

/** Anyone's coins (yours by default), live. */
export function useWallet(uid?: string) {
  const { user } = useSession()
  const target = uid ?? user?.uid ?? null
  return useLive<Wallet | null>(target ? `wallet:${target}` : null, (set) =>
    onSnapshot(
      doc(db!, "wallets", target!),
      (snap) => set(snap.exists() ? (snap.data() as Wallet) : null),
      () => set(null)
    )
  )
}

/** A person's public profile, live (mood, frame, birthday change while you look). */
export function useLiveProfile(uid: string | undefined) {
  return useLive<UserProfile | null>(uid ? `user:${uid}` : null, (set) =>
    onSnapshot(
      doc(db!, "users", uid!),
      (snap) => set(snap.exists() ? (snap.data() as UserProfile) : null),
      () => set(null)
    )
  )
}

/** Your friendship docs (bonds, requests, counters), kept fresh by RealtimeSync. */
export function useFriendships() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const q = useQuery({
    queryKey: queryKeys.friendships(uid),
    queryFn: () =>
      isFirebaseConfigured ? awaitRealtime<Friendship[]>(queryClient, queryKeys.friendships(uid)) : Promise.resolve([]),
    enabled: !!uid,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
  return { ...q, data: (q.data ?? EMPTY) as Friendship[] }
}

/** Your friendship with one person (active or not). */
export function useFriendship(friendUid: string | undefined) {
  const { user } = useSession()
  const { data, isPending } = useFriendships()
  const id = user && friendUid ? friendshipId(user.uid, friendUid) : ""
  return { friendship: data.find((f) => f.id === id), isPending }
}

/** Moments between you and a friend, newest first. */
export function useMoments(friendUid: string | undefined, max = 60) {
  const { user } = useSession()
  const fid = user && friendUid ? friendshipId(user.uid, friendUid) : null
  return useLive<Moment[]>(fid ? `moments:${fid}:${max}` : null, (set) =>
    onSnapshot(
      query(collection(db!, "friendships", fid!, "moments"), orderBy("createdAt", "desc"), limit(max)),
      (snap) => set(snap.docs.map((d) => d.data() as Moment)),
      () => set([])
    )
  )
}

export interface BadgeSummary {
  id: BadgeId
  count: number
  tier: 0 | BadgeTier
}

/**
 * Someone's badges, with how many times each was earned. `loveBonds` is how
 * many love bonds they have (Lovebird), when known.
 */
export function useBadges(uid: string | undefined, loveBonds = 0) {
  const events = useLive<BadgeEvent[]>(uid ? `badges:${uid}` : null, (set) =>
    onSnapshot(
      query(collection(db!, "users", uid!, "badges"), limit(500)),
      (snap) => set(snap.docs.map((d) => ({ ...(d.data() as BadgeEvent), id: d.id }))),
      () => set([])
    )
  )
  return React.useMemo(() => {
    if (!events) return undefined
    const counts: Record<BadgeId, number> = { earlybird: 0, swift: 0, champ: 0, bigheart: 0, lovebird: loveBonds }
    for (const e of events) if (e.type in counts) counts[e.type] += 1
    const summary: BadgeSummary[] = BADGE_IDS.map((id) => ({ id, count: counts[id], tier: badgeTier(id, counts[id]) }))
    const earlyBird = events.find((e) => e.type === "earlybird")?.i
    return { summary, ids: new Set(events.map((e) => e.id)), earlyBird }
  }, [events, loveBonds])
}

/** How many love bonds someone has (their friendships are readable for friend suggestions). */
export function useLoveBondCount(uid: string | undefined) {
  return useLive<number>(uid ? `love:${uid}` : null, (set) =>
    onSnapshot(
      query(collection(db!, "friendships"), where("users", "array-contains", uid!)),
      (snap) =>
        set(
          snap.docs.filter((d) => {
            const f = d.data() as Friendship
            return f.status === "ACTIVE" && f.bond?.type === "love"
          }).length
        ),
      () => set(0)
    )
  )
}

/** Your coin history, newest first. */
export function useCoinHistory(max = 100) {
  const { user } = useSession()
  const uid = user?.uid
  return useLive<CoinTx[]>(uid ? `txs:${uid}:${max}` : null, (set) =>
    onSnapshot(
      query(collection(db!, "wallets", uid!, "txs"), orderBy("createdAt", "desc"), limit(max)),
      (snap) => set(snap.docs.map((d) => d.data() as CoinTx)),
      () => set([])
    )
  )
}

/** Games you've recorded as played (ids), for the "games played" milestones. */
export function useMyPlayed() {
  const { user } = useSession()
  const uid = user?.uid
  return useLive<Set<string>>(uid ? `played:${uid}` : null, (set) =>
    onSnapshot(
      query(collection(db!, "users", uid!, "played"), limit(2000)),
      (snap) => set(new Set(snap.docs.map((d) => d.id))),
      () => set(new Set())
    )
  )
}

/** Whether you've tapped "excited" for a friend's birthday this year (live). */
export function useMyBirthdayCheer(friendUid: string | undefined, year: number | undefined) {
  const { user } = useSession()
  const me = user?.uid
  const key = me && friendUid && year ? `cheer:${friendUid}:${year}:${me}` : null
  return useLive<boolean>(key, (set) =>
    onSnapshot(
      doc(db!, "users", friendUid!, "cheers", `${year}_${me}`),
      (snap) => set(snap.exists()),
      () => set(false)
    )
  )
}

export interface BirthdayCheer {
  from: string
  fromName?: string
  year: number
  at: string
}

/** Friends excited for your next birthday (only you can read these). */
export function useMyBirthdayCheers(year: number | undefined) {
  const { user } = useSession()
  const uid = user?.uid
  return useLive<BirthdayCheer[]>(uid && year ? `cheers:${uid}:${year}` : null, (set) =>
    onSnapshot(
      query(collection(db!, "users", uid!, "cheers"), where("year", "==", year!), limit(500)),
      (snap) => set(snap.docs.map((d) => d.data() as BirthdayCheer).sort((a, b) => b.at.localeCompare(a.at))),
      () => set([])
    )
  )
}
