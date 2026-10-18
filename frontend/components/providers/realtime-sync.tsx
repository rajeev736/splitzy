"use client"

import * as React from "react"
import { collection, onSnapshot, query, where, type Query } from "firebase/firestore"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

import { db, isFirebaseConfigured } from "@/lib/firebase/config"
import { queryKeys } from "@/lib/query/keys"
import { publish, publishError } from "@/lib/query/realtime"
import type { AppNotification, Expense, FriendRequest, Group, UserProfile } from "@/lib/types"
import { fetchUserProfile } from "@/services/shared"
import { useSession } from "./session-provider"

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

const isActiveGroup = (g: Group) => g.status !== "ARCHIVED" && g.status !== "DELETED"

/**
 * Opens one Firestore listener per collection for the signed-in user and
 * streams every snapshot into the TanStack Query cache. Mounted once in the
 * root providers; renders nothing.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const uid = user?.uid

  React.useEffect(() => {
    if (!isFirebaseConfigured || !db || !uid) return
    const firestore = db

    const onError = (key: QueryKey) => (err: unknown) => {
      console.warn("Firestore sync notice:", (err as Error)?.message || err)
      publishError(queryClient, key, err)
    }

    // ── Friend requests: incoming + outgoing merged into one list ──
    let incoming: FriendRequest[] = []
    let outgoing: FriendRequest[] = []
    const requestsKey = queryKeys.friendRequests(uid)
    const publishRequests = () => {
      const map = new Map<string, FriendRequest>()
      ;[...incoming, ...outgoing].forEach((r) => map.set(r.id, r))
      const seenSent = new Set<string>()
      const seenReceived = new Set<string>()
      const list = Array.from(map.values())
        .sort(byNewest)
        .filter((r) => {
          if (r.status !== "PENDING") return true
          if (r.senderId === uid) {
            const key = r.receiverId || r.receiverSplitzyId || r.id
            if (seenSent.has(key)) return false
            seenSent.add(key)
            return true
          }
          if (r.receiverId === uid) {
            const key = r.senderId || r.senderSplitzyId || r.id
            if (seenReceived.has(key)) return false
            seenReceived.add(key)
            return true
          }
          return true
        })
      publish(queryClient, requestsKey, list)
    }

    // ── Groups (member OR invited) ──
    let memberGroups: Group[] = []
    let invitedGroups: Group[] = []
    const groupsKey = queryKeys.groups(uid)

    // ── Expenses: only the ones that involve this user ──
    // Several targeted queries instead of reading the whole collection: it
    // keeps other users' expenses off this device, scales, and works with
    // security rules that only allow reading your own expenses. Each source
    // succeeds or fails on its own; the list is the de-duplicated union.
    const expensesKey = queryKeys.expenses(uid)
    const expenseSources = new Map<string, Expense[]>()
    const failedSources = new Map<string, unknown>()
    const sourceUnsubs = new Map<string, () => void>()
    let groupSourceIds: string[] = []
    let expectedSources = 4

    const publishExpenses = () => {
      if (expenseSources.size + failedSources.size < expectedSources) return // wait for first round
      if (expenseSources.size === 0 && failedSources.size > 0) {
        publishError(queryClient, expensesKey, failedSources.values().next().value)
        return
      }
      const map = new Map<string, Expense>()
      expenseSources.forEach((list) => list.forEach((e) => map.set(e.id, e)))
      publish(queryClient, expensesKey, Array.from(map.values()).sort(byNewest))
    }

    const listenExpenses = (sourceId: string, q: Query) => {
      sourceUnsubs.set(
        sourceId,
        onSnapshot(
          q,
          (snap) => {
            failedSources.delete(sourceId)
            expenseSources.set(sourceId, snap.docs.map((d) => d.data() as Expense))
            publishExpenses()
          },
          (err) => {
            console.warn(`Expense sync notice (${sourceId}):`, err?.message || err)
            expenseSources.delete(sourceId)
            failedSources.set(sourceId, err)
            publishExpenses()
          }
        )
      )
    }

    const stopSource = (sourceId: string) => {
      sourceUnsubs.get(sourceId)?.()
      sourceUnsubs.delete(sourceId)
      expenseSources.delete(sourceId)
      failedSources.delete(sourceId)
    }

    const expensesCol = collection(firestore, "expenses")
    listenExpenses("participant", query(expensesCol, where("participantUids", "array-contains", uid)))
    listenExpenses("creator", query(expensesCol, where("createdBy", "==", uid)))
    listenExpenses("payer", query(expensesCol, where("payerId", "==", uid)))
    listenExpenses("recipient", query(expensesCol, where("recipientId", "==", uid)))

    /** Group expenses: one `in` query per 30 group ids (Firestore limit), re-subscribed when groups change. */
    const syncGroupExpenseSources = (groupIds: string[]) => {
      const next = [...groupIds].sort()
      if (next.join() === groupSourceIds.join()) return
      groupSourceIds = next

      Array.from(sourceUnsubs.keys())
        .filter((id) => id.startsWith("group:"))
        .forEach(stopSource)

      const chunks: string[][] = []
      for (let i = 0; i < next.length; i += 30) chunks.push(next.slice(i, i + 30))
      expectedSources = 4 + chunks.length
      chunks.forEach((ids, i) => listenExpenses(`group:${i}`, query(expensesCol, where("groupId", "in", ids))))
      publishExpenses()
    }

    const publishGroups = () => {
      const map = new Map<string, Group>()
      ;[...memberGroups, ...invitedGroups].filter(isActiveGroup).forEach((g) => map.set(g.id, g))
      publish(queryClient, groupsKey, Array.from(map.values()).sort(byNewest))
      syncGroupExpenseSources([...memberGroups, ...invitedGroups].map((g) => g.id))
    }

    const notificationsKey = queryKeys.notifications(uid)
    const friendsKey = queryKeys.friends(uid)

    const unsubscribers = [
      onSnapshot(
        query(collection(firestore, "friendRequests"), where("receiverId", "==", uid)),
        (snap) => {
          incoming = snap.docs.map((d) => d.data() as FriendRequest)
          publishRequests()
        },
        onError(requestsKey)
      ),
      onSnapshot(
        query(collection(firestore, "friendRequests"), where("senderId", "==", uid)),
        (snap) => {
          outgoing = snap.docs.map((d) => d.data() as FriendRequest)
          publishRequests()
        },
        onError(requestsKey)
      ),
      onSnapshot(
        query(collection(firestore, "groups"), where("members", "array-contains", uid)),
        (snap) => {
          memberGroups = snap.docs.map((d) => d.data() as Group)
          publishGroups()
        },
        onError(groupsKey)
      ),
      onSnapshot(
        query(collection(firestore, "groups"), where("invitedMembers", "array-contains", uid)),
        (snap) => {
          invitedGroups = snap.docs.map((d) => d.data() as Group)
          publishGroups()
        },
        onError(groupsKey)
      ),
      onSnapshot(
        query(collection(firestore, "notifications"), where("userId", "==", uid)),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as AppNotification).sort(byNewest)
          publish(queryClient, notificationsKey, list)
        },
        onError(notificationsKey)
      ),
      // Canonical friendships → hydrate each active friend's profile
      onSnapshot(
        query(collection(firestore, "friendships"), where("users", "array-contains", uid)),
        (snap) => {
          const activeUids: string[] = []
          snap.forEach((d) => {
            const data = d.data()
            const other = (data.users as string[] | undefined)?.find((u) => u !== uid)
            if (other && data.status === "ACTIVE") activeUids.push(other)
          })

          Promise.all(
            activeUids.map((fUid) =>
              fetchUserProfile(fUid).catch((e) => {
                console.warn(`Failed to fetch friend profile ${fUid}:`, e)
                return null
              })
            )
          ).then((list) => {
            publish(queryClient, friendsKey, list.filter((f): f is UserProfile => f !== null))
          })
        },
        onError(friendsKey)
      ),
    ]

    return () => {
      unsubscribers.forEach((unsub) => unsub())
      sourceUnsubs.forEach((unsub) => unsub())
    }
  }, [uid, queryClient])

  return null
}
