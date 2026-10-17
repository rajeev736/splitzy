import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore"

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
 * Writes a notification for `userId`. Id format matches the original app:
 * `notif_<timestamp>_<userId>` (or `notif_<timestamp>` when `scoped` is false).
 */
export async function sendNotification(input: NotificationInput, { scoped = true } = {}) {
  const firestore = getDb()
  if (!firestore) return
  const id = input.id ?? (scoped ? `notif_${Date.now()}_${input.userId}` : `notif_${Date.now()}`)
  await setDoc(doc(firestore, "notifications", id), {
    ...input,
    id,
    read: false,
    createdAt: input.createdAt ?? nowIso(),
  })
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const firestore = getDb()
  if (!firestore) return null
  const snap = await getDoc(doc(firestore, "users", uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

/** Exact JoySplit-ID lookup: `splitzyIds` index first, then a `users` query fallback. */
export async function fetchUserBySplitzyId(splitzyId: string): Promise<UserProfile | null> {
  const firestore = getDb()
  if (!firestore) return null
  const cleanId = splitzyId.trim().toUpperCase()

  const idDoc = await getDoc(doc(firestore, "splitzyIds", cleanId))
  if (idDoc.exists()) {
    return fetchUserProfile(idDoc.data().uid)
  }

  const snap = await getDocs(query(collection(firestore, "users"), where("splitzyId", "==", cleanId)))
  return snap.empty ? null : (snap.docs[0].data() as UserProfile)
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

/** Creates (or re-activates) the canonical bidirectional friendship record. */
export async function activateFriendship(uidA: string, uidB: string, { merge = false } = {}) {
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
      createdAt: now,
      updatedAt: now,
    },
    merge ? { merge: true } : {}
  )
}
