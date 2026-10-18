import { deleteField, doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { sanitizeForFirestore } from "@/lib/expenses/builder"
import { canDeleteGroup, canUserLeaveGroup } from "@/lib/money"
import type { Expense, FriendRequest, Group, GroupInviteInfo, GroupMemberInfo, UserProfile } from "@/lib/types"
import { sendFriendRequest } from "./friends"
import {
  activateFriendship,
  fetchUserBySplitzyId,
  fetchUserProfile,
  getDb,
  nowIso,
  resolveGroup,
  sendNotification,
} from "./shared"

export type InviteOption = "GROUP_ONLY" | "FRIEND_ONLY" | "COMBINED"

type PublicProfile = Pick<UserProfile, "uid" | "displayName" | "splitzyId" | "photoURL">

/**
 * Someone picked while creating a group. Everyone joins by invitation —
 * friends and non-friends alike — and non-friends can also get a friend request.
 */
export interface PendingGroupInvite {
  user: PublicProfile
  /** Also send a friend request (accepted independently of the group invite). */
  sendFriendRequest: boolean
}

export interface CreateGroupInput {
  name: string
  description: string
  icon: string
  invites: PendingGroupInvite[]
}

const toMemberInfo = (p: PublicProfile, role: GroupMemberInfo["role"]): GroupMemberInfo => ({
  uid: p.uid,
  name: p.displayName,
  splitzyId: p.splitzyId,
  photoURL: p.photoURL,
  role,
})

const toInviteInfo = (target: PublicProfile, inviter: UserProfile): GroupInviteInfo => ({
  uid: target.uid,
  name: target.displayName,
  splitzyId: target.splitzyId,
  photoURL: target.photoURL,
  invitedBy: inviter.uid,
  invitedByName: inviter.displayName,
  invitedAt: nowIso(),
})

/** A friend request that travels with a group invitation (shown linked on both sides). */
async function writeGroupFriendRequest(
  firestore: Firestore,
  user: UserProfile,
  target: PublicProfile,
  group: Pick<Group, "id" | "name">
): Promise<FriendRequest> {
  const request: FriendRequest = {
    id: `freq_grp_${Date.now()}_${target.uid}`,
    senderId: user.uid,
    senderName: user.displayName,
    senderSplitzyId: user.splitzyId,
    senderPhoto: user.photoURL,
    receiverId: target.uid,
    receiverName: target.displayName,
    receiverSplitzyId: target.splitzyId,
    status: "PENDING",
    groupId: group.id,
    groupName: group.name,
    createdAt: nowIso(),
  }
  await setDoc(doc(firestore, "friendRequests", request.id), sanitizeForFirestore(request))
  await sendNotification(
    {
      id: `notif_${request.id}`,
      userId: target.uid,
      title: "New Friend Request",
      message: `${user.displayName} (${user.splitzyId}) sent you a friend request`,
      type: "FRIEND_REQUEST",
      data: { requestId: request.id, actorId: user.uid, actorName: user.displayName },
    }
  )
  return request
}

async function sendGroupInviteNotification(user: UserProfile, targetUid: string, group: Pick<Group, "id" | "name">) {
  await sendNotification({
    id: `notif_grpinv_${group.id}_${targetUid}_${Date.now()}`,
    userId: targetUid,
    title: "Group Invitation",
    message: `${user.displayName} invited you to join group "${group.name}"`,
    type: "GROUP_INVITE",
    data: {
      groupId: group.id,
      groupName: group.name,
      actorId: user.uid,
      actorName: user.displayName,
      inviteType: "GROUP_ONLY",
    },
  })
}

/** True when a friend request is already pending between the two users (either direction). */
const hasPendingRequest = (requests: FriendRequest[], a: string, b: string) =>
  requests.some(
    (r) =>
      r.status === "PENDING" &&
      ((r.senderId === a && r.receiverId === b) || (r.senderId === b && r.receiverId === a))
  )

export async function createGroup(
  user: UserProfile,
  ctx: { friends: UserProfile[]; friendRequests: FriendRequest[] },
  input: CreateGroupInput
): Promise<Group> {
  const { name, description, icon } = input
  const { friends, friendRequests } = ctx
  const groupId = `grp_${Date.now()}`

  const seen = new Set([user.uid])
  const invites = input.invites.filter((p) => !seen.has(p.user.uid) && seen.add(p.user.uid))

  const group: Group = {
    id: groupId,
    name,
    description,
    icon,
    createdBy: user.uid,
    creatorName: user.displayName,
    members: [user.uid],
    invitedMembers: invites.map((p) => p.user.uid),
    invitedMemberDetails: Object.fromEntries(invites.map((p) => [p.user.uid, toInviteInfo(p.user, user)])),
    memberDetails: { [user.uid]: toMemberInfo(user, "admin") },
    status: "ACTIVE",
    createdAt: nowIso(),
  }

  const firestore = getDb()
  if (!firestore) return group

  await setDoc(doc(firestore, "groups", groupId), sanitizeForFirestore(group))

  for (const invite of invites) {
    await sendGroupInviteNotification(user, invite.user.uid, group)
    const wantsFriendRequest =
      invite.sendFriendRequest &&
      !friends.some((f) => f.uid === invite.user.uid) &&
      !hasPendingRequest(friendRequests, user.uid, invite.user.uid)
    if (wantsFriendRequest) await writeGroupFriendRequest(firestore, user, invite.user, group)
  }

  return group
}

export function fetchGroupById(groupId: string): Promise<Group | null> {
  return resolveGroup(groupId, [])
}

export async function updateGroup(groupId: string, updates: Partial<Group>) {
  const firestore = getDb()
  if (firestore) await updateDoc(doc(firestore, "groups", groupId), updates)
}

export async function leaveGroup(user: UserProfile, group: Group | undefined, expenses: Expense[]) {
  if (!group) throw new AppError("Group not found")
  const check = canUserLeaveGroup(user.uid, group, expenses)
  if (!check.allowed) throw new AppError(check.reason || "You can't leave this group yet")

  const updatedDetails = { ...group.memberDetails }
  delete updatedDetails[user.uid]

  const firestore = getDb()
  if (!firestore) return

  await updateDoc(doc(firestore, "groups", group.id), {
    members: group.members.filter((m) => m !== user.uid),
    invitedMembers: (group.invitedMembers || []).filter((id) => id !== user.uid),
    formerMembers: Array.from(new Set([...(group.formerMembers || []), user.uid])),
    memberDetails: updatedDetails,
    formerMemberDetails: {
      ...(group.formerMemberDetails || {}),
      [user.uid]: group.memberDetails?.[user.uid] || toMemberInfo(user, "member"),
    },
  })

  // Notify ONLY remaining members (excluding the departing user)
  const now = nowIso()
  for (const memberUid of group.members.filter((m) => m !== user.uid)) {
    try {
      await sendNotification({
        userId: memberUid,
        title: "Member Left Group",
        message: `${user.displayName} left the group "${group.name}"`,
        type: "GROUP_MEMBER_LEFT",
        data: { groupId: group.id, groupName: group.name, actorId: user.uid, actorName: user.displayName },
        createdAt: now,
      })
    } catch (nErr) {
      console.warn("Failed to send leave notification:", nErr)
    }
  }
}

/** Archive a group (creator only, zero unsettled balances). */
export async function deleteGroup(user: UserProfile, group: Group | undefined, expenses: Expense[]) {
  if (!group) throw new AppError("Group not found")
  const check = canDeleteGroup(user.uid, group, expenses)
  if (!check.allowed) throw new AppError(check.reason || "This group can't be deleted yet")

  const firestore = getDb()
  if (!firestore) return
  await updateDoc(doc(firestore, "groups", group.id), {
    status: "ARCHIVED",
    archivedAt: nowIso(),
    members: [],
    invitedMembers: [],
    invitedMemberDetails: {},
    formerMembers: Array.from(new Set([...(group.formerMembers || []), ...(group.members || [])])),
  })
}

export interface InviteResult {
  /** New pending-invite list, or null when no group invitation was sent. */
  invitedMembers: string[] | null
  invitedMemberDetails?: Record<string, GroupInviteInfo>
  friendRequest?: FriendRequest
  message: string
}

/**
 * Invite someone by uid or JoySplit ID.
 * GROUP_ONLY = group invitation, FRIEND_ONLY = friend request, COMBINED = both.
 * Each part is skipped (not an error) when it's already done — e.g. a pending
 * group invite plus COMBINED just sends the friend request.
 */
export async function inviteGroupMember(
  ctx: { user: UserProfile; groups: Group[]; friends: UserProfile[]; friendRequests: FriendRequest[] },
  groupId: string,
  targetUidOrSplitzyId: string,
  option: InviteOption = "GROUP_ONLY"
): Promise<InviteResult> {
  const { user, groups, friends, friendRequests } = ctx
  const group = await resolveGroup(groupId, groups)
  if (!group) throw new AppError("Group not found")

  const cleanId = targetUidOrSplitzyId.trim()
  const target =
    friends.find((f) => f.uid === cleanId || f.splitzyId.toUpperCase() === cleanId.toUpperCase()) ||
    (await fetchUserProfile(cleanId)) ||
    (await fetchUserBySplitzyId(cleanId))

  if (!target) throw new AppError(`User "${cleanId}" not found`)
  if (target.uid === user.uid) throw new AppError("You cannot invite yourself")

  const isMember = group.members.includes(target.uid)
  const isInvited = !!group.invitedMembers?.includes(target.uid)
  const isFriend = friends.some((f) => f.uid === target.uid)
  const requestPending = hasPendingRequest(friendRequests, user.uid, target.uid)

  const wantsGroup = option !== "FRIEND_ONLY"
  const wantsFriend = option !== "GROUP_ONLY"
  const sendGroup = wantsGroup && !isMember && !isInvited
  const sendFriend = wantsFriend && !isFriend && !requestPending

  if (!sendGroup && !sendFriend) {
    if (wantsGroup && isMember) throw new AppError(`${target.displayName} is already a member of this group`)
    if (wantsGroup && isInvited && !wantsFriend)
      throw new AppError(`${target.displayName} has already been invited to this group`)
    if (isFriend) throw new AppError(`${target.displayName} is already your friend`)
    throw new AppError(`A friend request is already pending with ${target.displayName}`)
  }

  const firestore = getDb()
  let invitedMembers: string[] | null = null
  let invitedMemberDetails: Record<string, GroupInviteInfo> | undefined
  let friendRequest: FriendRequest | undefined

  if (sendGroup) {
    invitedMembers = Array.from(new Set([...(group.invitedMembers || []), target.uid]))
    const info = toInviteInfo(target, user)
    invitedMemberDetails = { ...(group.invitedMemberDetails || {}), [target.uid]: info }
    if (firestore) {
      await updateDoc(doc(firestore, "groups", groupId), {
        invitedMembers,
        [`invitedMemberDetails.${target.uid}`]: sanitizeForFirestore(info),
      })
      await sendGroupInviteNotification(user, target.uid, group)
    }
  }

  if (sendFriend) {
    if (sendGroup && firestore) {
      friendRequest = await writeGroupFriendRequest(firestore, user, target, group)
    } else {
      friendRequest = (await sendFriendRequest(ctx, target.splitzyId)).request
    }
  }

  const parts = [sendGroup && "Group invitation", sendFriend && "friend request"].filter(Boolean).join(" and ")
  return {
    invitedMembers,
    invitedMemberDetails,
    friendRequest,
    message: `${parts.charAt(0).toUpperCase()}${parts.slice(1)} sent to ${target.displayName}!`,
  }
}

/** Removes a pending invitation (any member can withdraw one). */
export async function cancelGroupInvite(user: UserProfile, groups: Group[], groupId: string, targetUid: string) {
  const group = await resolveGroup(groupId, groups)
  if (!group) throw new AppError("Group not found")
  if (!group.members.includes(user.uid)) throw new AppError("Only group members can cancel invitations")

  const invitedMembers = (group.invitedMembers || []).filter((id) => id !== targetUid)
  const invitedMemberDetails = { ...(group.invitedMemberDetails || {}) }
  delete invitedMemberDetails[targetUid]

  const firestore = getDb()
  if (firestore) {
    await updateDoc(doc(firestore, "groups", groupId), {
      invitedMembers,
      [`invitedMemberDetails.${targetUid}`]: deleteField(),
    })
  }
  return { invitedMembers, invitedMemberDetails }
}

export async function acceptGroupInvite(
  user: UserProfile,
  groups: Group[],
  groupId: string,
  options?: { friendRequestId?: string }
): Promise<{
  patch: Pick<Group, "members" | "invitedMembers" | "memberDetails" | "invitedMemberDetails">
  message: string
}> {
  const group = await resolveGroup(groupId, groups)
  if (!group) throw new AppError("Group not found")
  if (group.status === "ARCHIVED" || group.status === "DELETED") throw new AppError("This group has been deleted")

  const alreadyMember = group.members.includes(user.uid)
  if (!alreadyMember && !group.invitedMembers?.includes(user.uid)) {
    throw new AppError("This invitation is no longer pending")
  }

  const invitedMemberDetails = { ...(group.invitedMemberDetails || {}) }
  const invite = invitedMemberDetails[user.uid]
  delete invitedMemberDetails[user.uid]
  const patch = {
    members: Array.from(new Set([...(group.members || []), user.uid])),
    invitedMembers: (group.invitedMembers || []).filter((id) => id !== user.uid),
    memberDetails: { ...group.memberDetails, [user.uid]: toMemberInfo(user, "member") },
    invitedMemberDetails,
  }

  const firestore = getDb()
  if (firestore && !alreadyMember) {
    await updateDoc(doc(firestore, "groups", groupId), {
      members: patch.members,
      invitedMembers: patch.invitedMembers,
      [`memberDetails.${user.uid}`]: sanitizeForFirestore(patch.memberDetails[user.uid]),
      [`invitedMemberDetails.${user.uid}`]: deleteField(),
    })

    // Tell whoever sent the invite (and the creator, if different)
    const notify = new Set([invite?.invitedBy, group.createdBy].filter((id): id is string => !!id && id !== user.uid))
    for (const uid of notify) {
      await sendNotification({
        userId: uid,
        title: "Group Invitation Accepted",
        message: `${user.displayName} joined "${group.name}"!`,
        type: "GROUP_ACCEPTED",
        data: { groupId, groupName: group.name, actorId: user.uid, actorName: user.displayName },
      })
    }
  }

  // Also accept the linked friend request when asked to
  if (firestore && options?.friendRequestId) {
    await acceptLinkedFriendRequest(user, options.friendRequestId)
  }

  return { patch, message: alreadyMember ? `You're already in ${group.name}` : `You have joined ${group.name}!` }
}

/** Accepts the friend request attached to a group invite, if it is still pending. */
async function acceptLinkedFriendRequest(user: UserProfile, requestId: string) {
  const firestore = getDb()
  if (!firestore) return
  const snap = await getDoc(doc(firestore, "friendRequests", requestId))
  if (!snap.exists()) return
  const req = snap.data() as FriendRequest
  if (req.status !== "PENDING" || req.receiverId !== user.uid) return

  await updateDoc(doc(firestore, "friendRequests", requestId), { status: "ACCEPTED", updatedAt: nowIso() })
  await activateFriendship(user.uid, req.senderId, { merge: true })
  await sendNotification(
    {
      userId: req.senderId,
      title: "Friend Request Accepted",
      message: `${user.displayName} accepted your friend request!`,
      type: "FRIEND_ACCEPTED",
      data: { actorId: user.uid, actorName: user.displayName },
    },
    { scoped: false }
  )
}

/** Declines only the group invitation; a linked friend request stays pending on its own. */
export async function declineGroupInvite(user: UserProfile, groups: Group[], groupId: string) {
  const group = await resolveGroup(groupId, groups)
  const firestore = getDb()
  if (firestore && group) {
    if (!group.invitedMembers?.includes(user.uid)) throw new AppError("This invitation is no longer pending")
    await updateDoc(doc(firestore, "groups", groupId), {
      invitedMembers: (group.invitedMembers || []).filter((id) => id !== user.uid),
      [`invitedMemberDetails.${user.uid}`]: deleteField(),
    })
  }
  return { message: "Invitation declined" }
}
