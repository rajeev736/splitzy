"use client"

import * as React from "react"

import { useSession } from "@/components/providers/session-provider"
import { useExpenses, useFriendRequests, useGroupInvites } from "@/hooks/queries"

const SEEN_EVENT = "splitzy_expense_seen_change"

const seenKey = (uid: string) => `splitzy_seen_expenses_${uid}`

function readSeenRaw(uid: string | undefined): string | null {
  if (typeof window === "undefined" || !uid) return null
  try {
    return localStorage.getItem(seenKey(uid))
  } catch {
    return null
  }
}

function parseSeenSet(raw: string | null): Set<string> {
  try {
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function getSeenSet(uid: string): Set<string> {
  return parseSeenSet(readSeenRaw(uid))
}

function subscribeToSeen(onChange: () => void) {
  window.addEventListener(SEEN_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(SEEN_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function markExpenseAsSeen(uid: string | undefined, expenseId: string) {
  if (typeof window === "undefined" || !uid || !expenseId) return
  try {
    const set = getSeenSet(uid)
    if (!set.has(expenseId)) {
      set.add(expenseId)
      localStorage.setItem(seenKey(uid), JSON.stringify(Array.from(set)))
      window.dispatchEvent(new Event(SEEN_EVENT))
    }
  } catch {
    // Ignore storage quota/security errors
  }
}

export function useUnreadTracking() {
  const { user } = useSession()
  const uid = user?.uid
  const { data: expenses } = useExpenses()
  const { data: friendRequests } = useFriendRequests()
  const { data: groupInvites } = useGroupInvites()

  // Subscribe to the localStorage-backed seen list; the raw string is a stable snapshot
  const seenRaw = React.useSyncExternalStore(
    subscribeToSeen,
    () => readSeenRaw(uid),
    () => null
  )
  const seenSet = React.useMemo(() => parseSeenSet(seenRaw), [seenRaw])

  // Check if an expense in a group was created by someone else and not yet seen by the user
  const isExpenseUnread = React.useCallback(
    (expenseId: string) => {
      if (!uid) return false
      const exp = expenses.find((e) => e.id === expenseId)
      if (!exp || exp.deletedAt || !exp.groupId) return false
      // If user is payer or creator, they already created/seen it
      if (exp.payerId === uid || exp.createdBy === uid) return false
      return !seenSet.has(expenseId)
    },
    [expenses, uid, seenSet]
  )

  // Check if a specific group has unread expenses
  const hasGroupUnreadExpenses = React.useCallback(
    (groupId: string) => {
      if (!uid) return false
      return expenses.some(
        (exp) =>
          exp.groupId === groupId &&
          !exp.deletedAt &&
          exp.payerId !== uid &&
          exp.createdBy !== uid &&
          !seenSet.has(exp.id)
      )
    },
    [expenses, uid, seenSet]
  )

  // Check if ANY group has unread expenses
  const hasAnyGroupExpenseUnread = React.useMemo(() => {
    if (!uid) return false
    return expenses.some(
      (exp) =>
        Boolean(exp.groupId) &&
        !exp.deletedAt &&
        exp.payerId !== uid &&
        exp.createdBy !== uid &&
        !seenSet.has(exp.id)
    )
  }, [expenses, uid, seenSet])

  // Pending incoming friend requests
  const hasPendingFriendRequests = React.useMemo(() => {
    if (!uid) return false
    return friendRequests.some((r) => r.status === "PENDING" && r.receiverId === uid)
  }, [friendRequests, uid])

  // Pending group invitations
  const hasPendingGroupInvites = groupInvites.length > 0

  // Groups nav item needs a red dot if there are invites OR unread group expenses
  const hasGroupsBadge = hasPendingGroupInvites || hasAnyGroupExpenseUnread

  const markSeen = React.useCallback(
    (expenseId: string) => {
      if (uid) markExpenseAsSeen(uid, expenseId)
    },
    [uid]
  )

  return {
    isExpenseUnread,
    hasGroupUnreadExpenses,
    hasAnyGroupExpenseUnread,
    hasPendingFriendRequests,
    hasPendingGroupInvites,
    hasGroupsBadge,
    markSeen,
  }
}
