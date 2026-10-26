import { doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore"

import { db, isFirebaseConfigured } from "@/lib/firebase/config"
import { AppError } from "@/lib/errors"
import type { AppNotification, Expense, Group, UserProfile } from "@/lib/types"

/** Firestore instance, or `null` when Firebase is not configured (offline/demo mode). */
export function getDb(): Firestore | null {
  return isFirebaseConfigured && db ? db : null
}

export function requireUser<T>(user: T | null | undefined, message = "Not logged in"): T {
  if (!user) throw new AppError(message)
  return user
}

export const nowIso = () => new Date().toISOString()

/** Display-friendly rupee amount used in notification copy, e.g. 25000 → "250". */
export const rupees = (paise = 0) => (paise / 100).toFixed(0)

/** Canonical friendship document id: both uids sorted and joined. */
export const friendshipId = (a: string, b: string) => [a, b].sort().join("_")

type NotificationInput = Omit<AppNotification, "id" | "read" | "createdAt" | "data"> & {
  id?: string
  data?: Record<string, unknown>
  createdAt?: string
}

/**
 * Writes a notification for `userId`. Ids carry a random suffix so two
 * notifications written in the same millisecond never overwrite each other.
 */
export async function sendNotification(input: NotificationInput) {
  const firestore = getDb()
  if (!firestore) return
  const id = input.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${input.userId}`
  await setDoc(doc(firestore, "notifications", id), {
    ...input,
    id,
    read: false,
    createdAt: input.createdAt ?? nowIso(),
  })
  const actorId = input.data?.actorId
  if (typeof actorId === "string") await touchFriendship(actorId, input.userId)
}

/**
 * Stamps the latest activity between two friends (payments, reminders,
 * confirmations, new splits — anything one sends the other) so the friends
 * list can show the most recent first. Best effort: non-friends have no
 * friendship to stamp.
 */
async function touchFriendship(a: string, b: string) {
  const firestore = getDb()
  if (!firestore || a === b) return
  await updateDoc(doc(firestore, "friendships", friendshipId(a, b)), { lastActivityAt: nowIso() }).catch(() => {})
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const firestore = getDb()
  if (!firestore) return null
  const snap = await getDoc(doc(firestore, "users", uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

/** Exact JoySplit-ID lookup through the `splitzyIds` index. */
export async function fetchUserBySplitzyId(splitzyId: string): Promise<UserProfile | null> {
  const firestore = getDb()
  if (!firestore) return null
  const cleanId = splitzyId.trim().toUpperCase()

  // Profiles can only be read one at a time (they can't be searched or listed),
  // so the splitzyIds index is the way from an ID to a person
  const idDoc = await getDoc(doc(firestore, "splitzyIds", cleanId))
  return idDoc.exists() ? fetchUserProfile(idDoc.data().uid) : null
}

/** Use the cached copy when present, otherwise read the document once. */
export async function resolveExpense(expenseId: string, cached: Expense[]): Promise<Expense | null> {
  const local = cached.find((e) => e.id === expenseId)
  if (local) return local
  const firestore = getDb()
  if (!firestore) return null
  try {
    const snap = await getDoc(doc(firestore, "expenses", expenseId))
    return snap.exists() ? (snap.data() as Expense) : null
  } catch (e) {
    console.warn("Could not fetch expense:", e)
    return null
  }
}

export async function resolveGroup(groupId: string, cached: Group[]): Promise<Group | null> {
  const local = cached.find((g) => g.id === groupId)
  if (local) return local
  const firestore = getDb()
  if (!firestore) return null
  const snap = await getDoc(doc(firestore, "groups", groupId))
  return snap.exists() ? (snap.data() as Group) : null
}

/**
 * Creates (or re-activates) the canonical bidirectional friendship record.
 * `requestId` is the friend request just accepted; security rules check it so
 * nobody can make themselves someone's friend without that person accepting.
 */
export async function activateFriendship(
  uidA: string,
  uidB: string,
  { requestId, merge = false }: { requestId: string; merge?: boolean }
) {
  const firestore = getDb()
  if (!firestore) return
  const id = friendshipId(uidA, uidB)
  const now = nowIso()
  await setDoc(
    doc(firestore, "friendships", id),
    {
      id,
      users: [uidA, uidB],
      userA: uidA < uidB ? uidA : uidB,
      userB: uidA < uidB ? uidB : uidA,
      status: "ACTIVE",
      requestId,
      createdAt: now,
      updatedAt: now,
    },
    merge ? { merge: true } : {}
  )
}
