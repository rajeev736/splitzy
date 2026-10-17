import { doc, setDoc, updateDoc } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { canDeleteGroup, canUserLeaveGroup } from "@/lib/money"
import type { Expense, FriendRequest, Group, GroupMemberInfo, UserProfile } from "@/lib/types"
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

export interface CreateGroupInput {
  name: string
  description: string
  icon: string
  memberIds: string[]
  pendingInviteUids?: string[]
}

const toMemberInfo = (
  p: Pick<UserProfile, "uid" | "displayName" | "splitzyId" | "photoURL">,
  role: GroupMemberInfo["role"]
): GroupMemberInfo => ({ uid: p.uid, name: p.displayName, splitzyId: p.splitzyId, photoURL: p.photoURL, role })

export async function createGroup(user: UserProfile, friends: UserProfile[], input: CreateGroupInput): Promise<Group> {
  const { name, description, icon, memberIds, pendingInviteUids = [] } = input
  const groupId = `grp_${Date.now()}`
  const allMembers = Array.from(new Set([user.uid, ...memberIds]))

  const memberDetails: Record<string, GroupMemberInfo> = { [user.uid]: toMemberInfo(user, "admin") }
  allMembers.forEach((mId) => {
    if (mId === user.uid) return
    const f = friends.find((fr) => fr.uid === mId)
    if (f) memberDetails[mId] = toMemberInfo(f, "member")
  })

  const group: Group = {
    id: groupId,
    name,
    description,
    icon,
    createdBy: user.uid,
    members: allMembers,
    invitedMembers: pendingInviteUids,
    memberDetails,
    createdAt: nowIso(),
  }

  const firestore = getDb()
  if (!firestore) return group

  await setDoc(doc(firestore, "groups", groupId), group)

  // Notify directly added friends
  for (const mId of memberIds) {
    await sendNotification({
      userId: mId,
      title: "Group Invitation",
      message: `${user.displayName} added you to group "${name}"`,
      type: "GROUP_INVITE",
      data: { groupId, actorId: user.uid, actorName: user.displayName },
    })
  }

  // Combined friend request + group invitation for non-friend invitees
  for (const pUid of pendingInviteUids) {
    const reqId = `freq_grp_${Date.now()}_${pUid}`
    const req: FriendRequest = {
      id: reqId,
      senderId: user.uid,
      senderName: user.displayName,
      senderSplitzyId: user.splitzyId,
      senderPhoto: user.photoURL,
      receiverId: pUid,
      receiverName: "User",
      receiverSplitzyId: "",
      status: "PENDING",
      createdAt: nowIso(),
    }
    await setDoc(doc(firestore, "friendRequests", reqId), req)
    await sendNotification({
      userId: pUid,
      title: "Group Invitation & Friend Request",
      message: `${user.displayName} invited you to join "${name}" and sent you a friend request. Accepting will connect you and add you to the group!`,
      type: "GROUP_INVITE",
      data: { groupId, actorId: user.uid, actorName: user.displayName, friendRequestId: reqId },
    })
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
    formerMembers: Array.from(new Set([...(group.formerMembers || []), ...(group.members || [])])),
  })
}

/**
 * Invite a member by uid or JoySplit ID.
 * GROUP_ONLY = group invite, FRIEND_ONLY = friend request, COMBINED = both.
 * Returns the new `invitedMembers` list (null for FRIEND_ONLY) and a message.
 */
export async function inviteGroupMember(
  ctx: { user: UserProfile; groups: Group[]; friends: UserProfile[]; friendRequests: FriendRequest[] },
  groupId: string,
  targetUidOrSplitzyId: string,
  option: InviteOption = "GROUP_ONLY"
): Promise<{ invitedMembers: string[] | null; friendRequest?: FriendRequest; message: string }> {
  const { user, groups, friends } = ctx
  const group = await resolveGroup(groupId, groups)
  if (!group) throw new AppError("Group not found")

  const cleanId = targetUidOrSplitzyId.trim()
  const target =
    friends.find((f) => f.uid === cleanId || f.splitzyId.toUpperCase() === cleanId.toUpperCase()) ||
    (await fetchUserProfile(cleanId)) ||
    (await fetchUserBySplitzyId(cleanId))

  if (!target) throw new AppError(`User "${cleanId}" not found`)
  if (target.uid === user.uid) throw new AppError("You cannot invite yourself")

  if (option === "FRIEND_ONLY") {
    const res = await sendFriendRequest(ctx, target.splitzyId)
    return { invitedMembers: null, friendRequest: res.request, message: res.message }
  }

  if (group.members.includes(target.uid)) {
    throw new AppError(`${target.displayName} is already a member of this group`)
  }
  if (group.invitedMembers?.includes(target.uid)) {
    throw new AppError(`${target.displayName} has already been invited to this group`)
  }

  const invited = Array.from(new Set([...(group.invitedMembers || []), target.uid]))
  const firestore = getDb()
  let friendRequest: FriendRequest | undefined

  if (firestore) {
    await updateDoc(doc(firestore, "groups", groupId), { invitedMembers: invited })

    if (option === "COMBINED") {
      friendRequest = {
        id: `freq_grp_${Date.now()}_${target.uid}`,
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
      await setDoc(doc(firestore, "friendRequests", friendRequest.id), friendRequest)
    }

    await sendNotification({
      userId: target.uid,
      title: option === "COMBINED" ? "Group & Friend Invitation" : "Group Invitation",
      message:
        option === "COMBINED"
          ? `${user.displayName} invited you to join "${group.name}" and sent you a friend request. Accepting will connect you and add you to the group!`
          : `${user.displayName} invited you to join group "${group.name}"`,
      type: "GROUP_INVITE",
      data: {
        groupId,
        groupName: group.name,
        actorId: user.uid,
        actorName: user.displayName,
        inviteType: option,
        ...(friendRequest ? { friendRequestId: friendRequest.id } : {}),
      },
    })
  }

  return {
    invitedMembers: invited,
    friendRequest,
    message:
      option === "COMBINED"
        ? `Invitation and friend request sent to ${target.displayName}!`
        : `Group invitation sent to ${target.displayName}!`,
  }
}

export async function acceptGroupInvite(
  user: UserProfile,
  groups: Group[],
  groupId: string,
  options?: { acceptCombinedFriendship?: boolean; friendRequestId?: string }
): Promise<{ patch: Pick<Group, "members" | "invitedMembers" | "memberDetails">; message: string }> {
  const group = await resolveGroup(groupId, groups)
  if (!group) throw new AppError("Group not found")

  const patch = {
    members: Array.from(new Set([...(group.members || []), user.uid])),
    invitedMembers: (group.invitedMembers || []).filter((id) => id !== user.uid),
    memberDetails: { ...group.memberDetails, [user.uid]: toMemberInfo(user, "member") },
  }

  const firestore = getDb()
  if (firestore) {
    await updateDoc(doc(firestore, "groups", groupId), patch)

    const creator = group.createdBy
    // ONLY establish friendship if explicitly requested as part of a combined invite acceptance
    if (options?.acceptCombinedFriendship && creator && creator !== user.uid) {
      await activateFriendship(user.uid, creator, { merge: true })
      if (options.friendRequestId) {
        await updateDoc(doc(firestore, "friendRequests", options.friendRequestId), { status: "ACCEPTED" })
      }
    }

    if (creator && creator !== user.uid) {
      await sendNotification(
        {
          userId: creator,
          title: "Group Invitation Accepted",
          message: `${user.displayName} joined "${group.name}"!`,
          type: "GROUP_ACCEPTED",
          data: { groupId, actorId: user.uid, actorName: user.displayName },
        },
        { scoped: false }
      )
    }
  }

  return { patch, message: `You have joined ${group.name}!` }
}

export async function declineGroupInvite(user: UserProfile, groups: Group[], groupId: string, friendRequestId?: string) {
  const group = await resolveGroup(groupId, groups)
  const firestore = getDb()
  if (firestore && group) {
    await updateDoc(doc(firestore, "groups", groupId), {
      invitedMembers: (group.invitedMembers || []).filter((id) => id !== user.uid),
    })
    if (friendRequestId) {
      await updateDoc(doc(firestore, "friendRequests", friendRequestId), { status: "REJECTED" })
    }
  }
  return { message: "Invitation declined" }
}
