"use client"

import * as React from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"

import { useSession } from "@/components/providers/session-provider"
import { db, isFirebaseConfigured } from "@/lib/firebase/config"
import { calculateNetBalances } from "@/lib/money"
import { queryKeys } from "@/lib/query/keys"
import { awaitRealtime, publish, publishError } from "@/lib/query/realtime"
import type { AppNotification, Expense, FriendRequest, Group, GroupInviteInfo, UserProfile } from "@/lib/types"
import { fetchExpenseById } from "@/services/expenses"
import { getMutualFriendSuggestions, searchUserBySplitzyId } from "@/services/friends"
import { fetchGroupById } from "@/services/groups"

const EMPTY: never[] = []

/**
 * Reads a collection kept fresh by `RealtimeSync`. Never refetches on its own —
 * Firestore pushes updates — but still exposes `isPending` / `isError`.
 */
function useRealtimeList<T>(keyFor: (uid: string) => QueryKey) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const query = useQuery({
    queryKey: keyFor(uid),
    queryFn: () => (isFirebaseConfigured ? awaitRealtime<T[]>(queryClient, keyFor(uid)) : Promise.resolve([] as T[])),
    enabled: !!uid,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
  return { ...query, data: (query.data ?? EMPTY) as T[] }
}

export const useFriends = () => useRealtimeList<UserProfile>(queryKeys.friends)
export const useFriendRequests = () => useRealtimeList<FriendRequest>(queryKeys.friendRequests)
export const useNotifications = () => useRealtimeList<AppNotification>(queryKeys.notifications)

/** Every synced group, including ones you're only invited to. */
const useAllGroups = () => useRealtimeList<Group>(queryKeys.groups)

/** Groups you're a member of. */
export function useGroups() {
  const { user } = useSession()
  const query = useAllGroups()
  const data = React.useMemo(
    () => (user ? query.data.filter((g) => g.members.includes(user.uid)) : EMPTY),
    [query.data, user]
  )
  return { ...query, data }
}

/** Groups you've been invited to but haven't joined yet. */
export function useGroupInvites() {
  const { user } = useSession()
  const query = useAllGroups()
  const data = React.useMemo(
    () =>
      user
        ? query.data.filter((g) => !g.members.includes(user.uid) && g.invitedMembers?.includes(user.uid))
        : EMPTY,
    [query.data, user]
  )
  return { ...query, data }
}

/**
 * Pending invitations you sent, across your groups. Invites from before
 * inviter tracking existed count as sent by the group creator.
 */
export function useSentGroupInvites() {
  const { user } = useSession()
  const query = useGroups()
  const data = React.useMemo(() => {
    if (!user) return [] as { group: Group; invite: GroupInviteInfo }[]
    return query.data.flatMap((group) =>
      (group.invitedMembers || [])
        .map((uid) => ({ group, invite: group.invitedMemberDetails?.[uid] ?? legacyInvite(group, uid) }))
        .filter(({ invite }) => invite.invitedBy === user.uid)
    )
  }, [query.data, user])
  return { ...query, data }
}

const legacyInvite = (group: Group, uid: string): GroupInviteInfo => ({
  uid,
  name: "Invited user",
  splitzyId: "",
  invitedBy: group.createdBy,
  invitedByName: group.creatorName || "",
  invitedAt: group.createdAt,
})

/** Every expense that involves you, including deleted ones — for history. */
export const useExpenseHistory = () => useRealtimeList<Expense>(queryKeys.expenses)

/** Live (not deleted) expenses that involve you. */
export function useExpenses() {
  const query = useExpenseHistory()
  const data = React.useMemo(() => query.data.filter((e) => !e.deletedAt), [query.data])
  return { ...query, data }
}

export function useUnreadCount() {
  const { data } = useNotifications()
  return React.useMemo(() => data.filter((n) => !n.read).length, [data])
}

/** Authoritative balances from the integer-paise money engine. */
export function useBalances() {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  return React.useMemo(
    () =>
      user
        ? calculateNetBalances(user.uid, expenses)
        : { netBalancePaise: 0, totalOwedToYouPaise: 0, totalYouOwePaise: 0 },
    [user, expenses]
  )
}

/**
 * A single group: served from the realtime list, otherwise fetched once
 * (e.g. a group you were removed from but still deep-link into).
 */
export function useGroup(groupId: string | undefined) {
  const { user } = useSession()
  const list = useAllGroups()
  const cached = React.useMemo(() => list.data.find((g) => g.id === groupId), [list.data, groupId])

  const single = useQuery({
    queryKey: queryKeys.group(user?.uid ?? "", groupId ?? ""),
    queryFn: () => fetchGroupById(groupId!),
    enabled: !!user && !!groupId && list.isSuccess && !cached,
  })

  return {
    data: cached ?? single.data ?? undefined,
    isPending: list.isPending || (!cached && single.isPending && single.fetchStatus !== "idle"),
    isError: list.isError || single.isError,
    error: list.error ?? single.error,
    refetch: single.refetch,
  }
}

/**
 * Every expense in a group (live). Opens a group-scoped listener while
 * mounted and merges it with the user's synced expenses for full coverage.
 */
export function useGroupExpenses(groupId: string | undefined) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const key = React.useMemo(() => queryKeys.groupExpenses(uid, groupId ?? ""), [uid, groupId])
  const { data: expenses } = useExpenses()

  React.useEffect(() => {
    if (!uid || !groupId || !isFirebaseConfigured || !db) return
    return onSnapshot(
      query(collection(db, "expenses"), where("groupId", "==", groupId)),
      (snap) => publish(queryClient, key, snap.docs.map((d) => d.data() as Expense)),
      (err) => {
        console.warn("Group expenses sync notice:", err)
        publishError(queryClient, key, err)
      }
    )
  }, [uid, groupId, key, queryClient])

  const direct = useQuery({
    queryKey: key,
    queryFn: () => (isFirebaseConfigured ? awaitRealtime<Expense[]>(queryClient, key) : Promise.resolve([])),
    enabled: !!uid && !!groupId,
    staleTime: Infinity,
    retry: false,
    meta: { errorMessage: false },
  })

  const merged = React.useMemo(() => {
    const map = new Map<string, Expense>()
    expenses.filter((e) => e.groupId === groupId).forEach((e) => map.set(e.id, e))
    direct.data?.forEach((e) => map.set(e.id, e))
    return Array.from(map.values())
      .filter((e) => !e.deletedAt)
      .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [expenses, direct.data, groupId])

  return { ...direct, data: merged }
}

/**
 * A single expense: served from the realtime list when available, otherwise
 * fetched once (e.g. deep links to an expense outside the synced set).
 */
export function useExpense(expenseId: string | undefined) {
  const { user } = useSession()
  const list = useExpenseHistory()
  const cached = React.useMemo(() => list.data.find((e) => e.id === expenseId), [list.data, expenseId])

  const single = useQuery({
    queryKey: queryKeys.expense(user?.uid ?? "", expenseId ?? ""),
    queryFn: () => fetchExpenseById(expenseId!),
    enabled: !!user && !!expenseId && list.isSuccess && !cached,
  })

  return {
    data: cached ?? single.data ?? undefined,
    isPending: list.isPending || (!cached && single.isPending && single.fetchStatus !== "idle"),
    isError: list.isError || single.isError,
    error: list.error ?? single.error,
    refetch: single.refetch,
  }
}

/** Exact JoySplit-ID lookup. Pass an empty string to stay idle. Results are cached per ID. */
export function useUserSearch(splitzyId: string) {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const { data: friendRequests } = useFriendRequests()
  const cleanId = splitzyId.trim().toUpperCase()

  return useQuery({
    queryKey: [...queryKeys.userSearch(user?.uid ?? "", cleanId), friends.length, friendRequests.length],
    queryFn: () => searchUserBySplitzyId({ user: user!, friends, friendRequests }, cleanId),
    enabled: !!user && !!cleanId,
    staleTime: 5 * 60 * 1000,
  })
}

/** "People you may know" — expensive fan-out, so cached for 5 minutes. */
export function useFriendSuggestions({ enabled = true } = {}) {
  const { user } = useSession()
  const { data: friends, isSuccess: friendsReady } = useFriends()
  const { data: friendRequests } = useFriendRequests()

  return useQuery({
    queryKey: [...queryKeys.suggestions(user?.uid ?? ""), friends.length],
    queryFn: () => getMutualFriendSuggestions({ user: user!, friends, friendRequests }),
    enabled: enabled && !!user && friendsReady,
    staleTime: 5 * 60 * 1000,
    meta: { errorMessage: false },
  })
}
