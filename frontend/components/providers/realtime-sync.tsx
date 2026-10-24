"use client"

import * as React from "react"
import { collection, onSnapshot, query, where, type Query } from "firebase/firestore"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { db, isFirebaseConfigured } from "@/lib/firebase/config"
import { queryKeys } from "@/lib/query/keys"
import { publish, publishError } from "@/lib/query/realtime"
import { notificationHref, registerServiceWorker, showSystemNotification } from "@/lib/system-notifications"
import type { AppNotification, Challenge, Expense, FriendRequest, Group, UserProfile } from "@/lib/types"
import { toChallenge } from "@/services/challenges"
import { fetchUserProfile } from "@/services/shared"
import { useSession } from "./session-provider"

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

const isActiveGroup = (g: Group) => g.status !== "ARCHIVED" && g.status !== "DELETED"

/** Only notifications this fresh are announced (not old ones arriving after being offline). */
const ANNOUNCE_WITHIN_MS = 5 * 60 * 1000

/**
 * Opens one Firestore listener per collection for the signed-in user and
 * streams every snapshot into the TanStack Query cache. Mounted once in the
 * root providers; renders nothing.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const uid = user?.uid
  // Read inside the listener without re-subscribing when the router object changes
  const router = useRouter()
  const routerRef = React.useRef(router)
  React.useEffect(() => {
    routerRef.current = router
  }, [router])

  // The notification bar needs the service worker (it shows and opens notifications)
  React.useEffect(() => registerServiceWorker(), [])

  React.useEffect(() => {
    if (!isFirebaseConfigured || !db || !uid) return
    const firestore = db

    /**
     * New notifications, like a phone app: in the notification bar while the
     * app is in the background, a toast while you're looking at it. The first
     * snapshot is what you already had, so it's never announced.
     */
    let notificationsLoaded = false
    const announced = new Set<string>()
    const announceNew = (added: AppNotification[]) => {
      if (!notificationsLoaded) {
        notificationsLoaded = true
        added.forEach((n) => announced.add(n.id))
        return
      }
      for (const n of added) {
        if (announced.has(n.id) || n.read) continue
        announced.add(n.id)
        if (Date.now() - new Date(n.createdAt).getTime() > ANNOUNCE_WITHIN_MS) continue
        if (document.visibilityState === "hidden") {
          void showSystemNotification(n).catch(() => undefined)
        } else {
          toast(n.title, {
            description: n.message,
            action: { label: "View", onClick: () => routerRef.current.push(notificationHref(n)) },
          })
        }
      }
    }

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

    /**
     * Group expenses: one `groupId ==` listener per group. Security rules check
     * group membership with a lookup on the expense's groupId, which Firestore
     * can only verify for an equality filter (not `in`). Only changed groups
     * are re-subscribed.
     */
    const syncGroupExpenseSources = (groupIds: string[]) => {
      const next = Array.from(new Set(groupIds)).sort()
      if (next.join() === groupSourceIds.join()) return
      const wanted = new Set(next)
      groupSourceIds.filter((id) => !wanted.has(id)).forEach((id) => stopSource(`group:${id}`))
      next
        .filter((id) => !sourceUnsubs.has(`group:${id}`))
        .forEach((id) => listenExpenses(`group:${id}`, query(expensesCol, where("groupId", "==", id))))
      groupSourceIds = next
      expectedSources = 4 + next.length
      publishExpenses()
    }

    const publishGroups = () => {
      const map = new Map<string, Group>()
      ;[...memberGroups, ...invitedGroups].filter(isActiveGroup).forEach((g) => map.set(g.id, g))
      publish(queryClient, groupsKey, Array.from(map.values()).sort(byNewest))
      // Pending invitees can see the group but not its expenses until they join
      syncGroupExpenseSources(memberGroups.filter(isActiveGroup).map((g) => g.id))
    }

    const notificationsKey = queryKeys.notifications(uid)
    const challengesKey = queryKeys.challenges(uid)
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
          announceNew(snap.docChanges().filter((c) => c.type === "added").map((c) => c.doc.data() as AppNotification))
        },
        onError(notificationsKey)
      ),
      // Settle-up games you host or play in
      onSnapshot(
        query(collection(firestore, "challenges"), where("participants", "array-contains", uid)),
        (snap) => {
          // A just-resolved game's resolvedAt is a pending server timestamp: without
          // "estimate" it reads as null and the fresh discount looks already expired
          const list: Challenge[] = snap.docs
            .map((d) => toChallenge(d.data({ serverTimestamps: "estimate" })))
            .sort(byNewest)
          publish(queryClient, challengesKey, list)
        },
        onError(challengesKey)
      ),
      // Canonical friendships → hydrate each active friend's profile
      onSnapshot(
        query(collection(firestore, "friendships"), where("users", "array-contains", uid)),
        (snap) => {
          const active: { uid: string; activityAt?: string }[] = []
          snap.forEach((d) => {
            const data = d.data()
            const other = (data.users as string[] | undefined)?.find((u) => u !== uid)
            if (other && data.status === "ACTIVE") {
              active.push({ uid: other, activityAt: (data.lastActivityAt as string) || (data.createdAt as string) })
            }
          })

          Promise.all(
            active.map(({ uid: fUid, activityAt }) =>
              fetchUserProfile(fUid)
                .then((p): UserProfile | null => (p ? { ...p, friendActivityAt: activityAt } : null))
                .catch((e) => {
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
