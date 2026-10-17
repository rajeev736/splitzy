import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { canRemoveFriend } from "@/lib/money"
import type { Expense, FriendRequest, UserProfile } from "@/lib/types"
import {
  activateFriendship,
  fetchUserBySplitzyId,
  friendshipId,
  getDb,
  nowIso,
  sendNotification,
} from "./shared"

export type SearchStatus = "SELF" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED" | "CAN_ADD"

export interface UserSearchResult {
  found: boolean
  user?: Partial<UserProfile>
  status?: SearchStatus
  requestId?: string
  message?: string
}

export interface FriendSuggestion {
  user: UserProfile
  mutualCount: number
  mutualFriendNames: string[]
}

interface FriendsContext {
  user: UserProfile
  friends: UserProfile[]
  friendRequests: FriendRequest[]
}

/** Send friend request by JoySplit ID. Returns the created request. */
export async function sendFriendRequest(
  ctx: FriendsContext,
  targetSplitzyId: string
): Promise<{ request: FriendRequest; message: string }> {
  const { user, friends, friendRequests } = ctx
  const cleanId = targetSplitzyId.trim().toUpperCase()

  if (cleanId === user.splitzyId.toUpperCase()) {
    throw new AppError("You cannot add yourself as a friend!")
  }
  if (friends.some((f) => f.splitzyId.toUpperCase() === cleanId)) {
    throw new AppError("This user is already in your friends list")
  }
  const pending = friendRequests.some(
    (r) =>
      r.status === "PENDING" &&
      ((r.senderSplitzyId === user.splitzyId && r.receiverSplitzyId === cleanId) ||
        (r.receiverSplitzyId === user.splitzyId && r.senderSplitzyId === cleanId))
  )
  if (pending) throw new AppError("A friend request is already pending with this user")

  const target = await fetchUserBySplitzyId(cleanId)
  if (!target) {
    throw new AppError(`No user found with JoySplit ID "${cleanId}". Make sure the ID is correct.`)
  }

  const reqId = `freq_${Date.now()}`
  const request: FriendRequest = {
    id: reqId,
    senderId: user.uid,
    senderName: user.displayName,
    senderSplitzyId: user.splitzyId,
    senderPhoto: user.photoURL,
    receiverId: target.uid,
    receiverName: target.displayName,
    receiverSplitzyId: target.splitzyId,
    status: "PENDING",
    createdAt: nowIso(),
  }

  const firestore = getDb()
  if (firestore) {
    await setDoc(doc(firestore, "friendRequests", reqId), request)
    await sendNotification(
      {
        userId: target.uid,
        title: "New Friend Request",
        message: `${user.displayName} (${user.splitzyId}) sent you a friend request`,
        type: "FRIEND_REQUEST",
        data: { requestId: reqId, actorId: user.uid, actorName: user.displayName },
      },
      { scoped: false }
    )
  }

  return { request, message: `Friend request sent to ${target.displayName}!` }
}

/** Accept a friend request. Returns the optimistic friend profile to add locally. */
export async function acceptFriendRequest(ctx: FriendsContext, requestId: string): Promise<UserProfile | null> {
  const { user, friendRequests } = ctx
  const req = friendRequests.find((r) => r.id === requestId)
  if (!req) return null
  const now = nowIso()

  const firestore = getDb()
  if (firestore) {
    await updateDoc(doc(firestore, "friendRequests", requestId), { status: "ACCEPTED" })
    await activateFriendship(user.uid, req.senderId)
    await sendNotification(
      {
        userId: req.senderId,
        title: "Friend Request Accepted",
        message: `${user.displayName} accepted your friend request!`,
        type: "FRIEND_ACCEPTED",
        data: { actorId: user.uid, actorName: user.displayName },
        createdAt: now,
      },
      { scoped: false }
    )
  }

  return {
    uid: req.senderId,
    displayName: req.senderName,
    splitzyId: req.senderSplitzyId,
    email: `${req.senderSplitzyId.toLowerCase()}@joysplit.app`,
    upiId: `${req.senderName.toLowerCase().replace(/\s+/g, "")}@upi`,
    photoURL: req.senderPhoto || "/assets/avatar_glasses.jpg",
    createdAt: now,
  }
}

export async function cancelFriendRequest(requestId: string) {
  const firestore = getDb()
  if (firestore) {
    try {
      await updateDoc(doc(firestore, "friendRequests", requestId), {
        status: "CANCELLED",
        updatedAt: nowIso(),
      })
    } catch {
      await deleteDoc(doc(firestore, "friendRequests", requestId))
    }
  }
}

export async function rejectFriendRequest(requestId: string, currentUid?: string) {
  const firestore = getDb()
  if (firestore) {
    if (currentUid) {
      try {
        const snap = await getDoc(doc(firestore, "friendRequests", requestId))
        if (snap.exists() && snap.data()?.senderId === currentUid) {
          return cancelFriendRequest(requestId)
        }
      } catch {}
    }
    try {
      await updateDoc(doc(firestore, "friendRequests", requestId), {
        status: "REJECTED",
        updatedAt: nowIso(),
      })
    } catch {
      await deleteDoc(doc(firestore, "friendRequests", requestId))
    }
  }
}

/** Remove a friend, guarded by the unsettled-balance invariant. */
export async function removeFriend(user: UserProfile, friendUid: string, expenses: Expense[]) {
  const check = canRemoveFriend(user.uid, friendUid, expenses)
  if (!check.allowed) throw new AppError(check.reason || "You can't remove this friend right now")

  const firestore = getDb()
  if (firestore) {
    const id = friendshipId(user.uid, friendUid)
    await setDoc(
      doc(firestore, "friendships", id),
      { id, users: [user.uid, friendUid], status: "REMOVED", updatedAt: nowIso() },
      { merge: true }
    )

    // Clean up any old friendRequests between these two users
    try {
      const qReqsA = query(
        collection(firestore, "friendRequests"),
        where("senderId", "==", user.uid),
        where("receiverId", "==", friendUid)
      )
      const qReqsB = query(
        collection(firestore, "friendRequests"),
        where("senderId", "==", friendUid),
        where("receiverId", "==", user.uid)
      )
      const [snapA, snapB] = await Promise.all([getDocs(qReqsA), getDocs(qReqsB)])
      for (const d of [...snapA.docs, ...snapB.docs]) {
        await deleteDoc(d.ref).catch(() => {})
      }
    } catch (cleanErr) {
      console.warn("Notice: could not delete old friend requests on removal:", cleanErr)
    }
  }
}

/**
 * Local status for a JoySplit ID (self / already friends / pending request),
 * or `null` when a remote lookup is needed.
 */
export function resolveLocalSearch(ctx: FriendsContext, cleanId: string): UserSearchResult | null {
  const { user, friends, friendRequests } = ctx

  if (cleanId === user.splitzyId.toUpperCase()) {
    return {
      found: true,
      status: "SELF",
      user: { uid: user.uid, displayName: user.displayName, splitzyId: user.splitzyId, photoURL: user.photoURL },
      message: "This is your own JoySplit ID",
    }
  }

  const existingFriend = friends.find((f) => f.splitzyId.toUpperCase() === cleanId)
  if (existingFriend) {
    return {
      found: true,
      status: "FRIENDS",
      user: {
        uid: existingFriend.uid,
        displayName: existingFriend.displayName,
        splitzyId: existingFriend.splitzyId,
        photoURL: existingFriend.photoURL,
      },
      message: "You are already friends",
    }
  }

  const outgoing = friendRequests.find(
    (r) => r.status === "PENDING" && r.senderId === user.uid && r.receiverSplitzyId?.toUpperCase() === cleanId
  )
  if (outgoing) {
    return {
      found: true,
      status: "REQUEST_SENT",
      user: { uid: outgoing.receiverId, displayName: outgoing.receiverName, splitzyId: outgoing.receiverSplitzyId },
      requestId: outgoing.id,
      message: "Friend request sent",
    }
  }

  const incoming = friendRequests.find(
    (r) => r.status === "PENDING" && r.receiverId === user.uid && r.senderSplitzyId?.toUpperCase() === cleanId
  )
  if (incoming) {
    return {
      found: true,
      status: "REQUEST_RECEIVED",
      user: {
        uid: incoming.senderId,
        displayName: incoming.senderName,
        splitzyId: incoming.senderSplitzyId,
        photoURL: incoming.senderPhoto,
      },
      requestId: incoming.id,
      message: "This user sent you a friend request",
    }
  }

  return null
}

/** Real user discovery using JoySplit ID (exact match, privacy protected). */
export async function searchUserBySplitzyId(ctx: FriendsContext, splitzyId: string): Promise<UserSearchResult> {
  const cleanId = splitzyId.trim().toUpperCase()
  if (!cleanId) return { found: false, message: "Please enter a JoySplit ID" }

  const local = resolveLocalSearch(ctx, cleanId)
  if (local) {
    // Friend-request records don't store the receiver's photo — fill it from the profile
    if (local.user && !local.user.photoURL) {
      const profile = await fetchUserBySplitzyId(cleanId).catch(() => null)
      if (profile?.photoURL) local.user = { ...local.user, photoURL: profile.photoURL }
    }
    return local
  }

  const target = await fetchUserBySplitzyId(cleanId)
  if (target) {
    return {
      found: true,
      status: "CAN_ADD",
      user: { uid: target.uid, displayName: target.displayName, splitzyId: target.splitzyId, photoURL: target.photoURL },
    }
  }

  return {
    found: false,
    message: `No user found with JoySplit ID "${cleanId}". Make sure the ID is correct.`,
  }
}

/** Mutual friends / People You May Know. */
export async function getMutualFriendSuggestions(ctx: FriendsContext): Promise<FriendSuggestion[]> {
  const { user, friends, friendRequests } = ctx
  const firestore = getDb()
  if (!firestore) return []

  const activeFriendshipsOf = (uid: string) =>
    getDocs(
      query(
        collection(firestore, "friendships"),
        where("users", "array-contains", uid),
        where("status", "==", "ACTIVE")
      )
    )

  const directFriendUids = new Set<string>()
  const directFriendMap = new Map<string, string>()
  friends.forEach((f) => {
    directFriendUids.add(f.uid)
    directFriendMap.set(f.uid, f.displayName)
  })

  const mine = await activeFriendshipsOf(user.uid)
  mine.forEach((d) => {
    const otherUid = (d.data().users as string[] | undefined)?.find((u) => u !== user.uid)
    if (otherUid) directFriendUids.add(otherUid)
  })
  if (directFriendUids.size === 0) return []

  const candidateMutuals = new Map<string, Set<string>>()
  for (const fUid of directFriendUids) {
    const friendName = directFriendMap.get(fUid) || "Friend"
    const snap = await activeFriendshipsOf(fUid)
    snap.forEach((d) => {
      const candidateUid = (d.data().users as string[] | undefined)?.find((u) => u !== fUid)
      if (candidateUid && candidateUid !== user.uid && !directFriendUids.has(candidateUid)) {
        if (!candidateMutuals.has(candidateUid)) candidateMutuals.set(candidateUid, new Set())
        candidateMutuals.get(candidateUid)!.add(friendName)
      }
    })
  }

  const pendingUids = new Set(
    friendRequests
      .filter((r) => r.status === "PENDING")
      .map((r) => (r.senderId === user.uid ? r.receiverId : r.senderId))
  )

  const suggestions: FriendSuggestion[] = []
  for (const [candUid, names] of candidateMutuals.entries()) {
    if (pendingUids.has(candUid)) continue
    const candDoc = await getDoc(doc(firestore, "users", candUid))
    if (candDoc.exists()) {
      const mutualFriendNames = Array.from(names)
      suggestions.push({
        user: candDoc.data() as UserProfile,
        mutualCount: mutualFriendNames.length,
        mutualFriendNames,
      })
    }
  }

  return suggestions.sort((a, b) => b.mutualCount - a.mutualCount)
}
