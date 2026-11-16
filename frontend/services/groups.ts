import { arrayRemove, arrayUnion, deleteField, doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { sanitizeForFirestore } from "@/lib/expenses/builder"
import {
  canAddGroupMembers,
  canEditGroupInfo,
  canManageMember,
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  isGroupAdmin,
  NEW_GROUP_SETTINGS,
} from "@/lib/groups"
import { canDeleteGroup, canUserLeaveGroup } from "@/lib/money"
import type {
  Expense,
  FriendRequest,
  Group,
  GroupInviteInfo,
  GroupMemberInfo,
  GroupSettings,
  UserProfile,
} from "@/lib/types"
import { postGroupEvent } from "./chat"
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

async function sendGroupAddedNotification(user: UserProfile, targetUid: string, group: Pick<Group, "id" | "name">) {
  await sendNotification({
    id: `notif_grpadd_${group.id}_${targetUid}_${Date.now()}`,
    userId: targetUid,
    title: "Added to Group",
    message: `${user.displayName} added you to group "${group.name}"`,
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

/** A line in the group chat ("Aman added Priya"). Best effort: never blocks or fails the change itself. */
function groupEvent(groupId: string, actor: Pick<UserProfile, "uid" | "displayName">, text: string) {
  postGroupEvent(groupId, actor, text).catch((err) => console.warn("Could not post group event:", err))
}

const memberName = (group: Group, uid: string) =>
  group.memberDetails?.[uid]?.name || group.formerMemberDetails?.[uid]?.name || "a member"

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

  const allMembers = [user.uid, ...invites.map((p) => p.user.uid)]
  const memberDetails: Record<string, GroupMemberInfo> = {
    [user.uid]: toMemberInfo(user, "admin"),
    ...Object.fromEntries(invites.map((p) => [p.user.uid, toMemberInfo(p.user, "member")])),
  }

  const group: Group = {
    id: groupId,
    name,
    description,
    icon,
    createdBy: user.uid,
    creatorName: user.displayName,
    members: allMembers,
    invitedMembers: [],
    invitedMemberDetails: {},
    memberDetails,
    settings: NEW_GROUP_SETTINGS,
    status: "ACTIVE",
    createdAt: nowIso(),
  }

  const firestore = getDb()
  if (!firestore) return group

  await setDoc(doc(firestore, "groups", groupId), sanitizeForFirestore(group))
  groupEvent(groupId, user, `${user.displayName} created the group "${name}"`)

  for (const invite of invites) {
    await sendGroupAddedNotification(user, invite.user.uid, group)
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

export type GroupInfoChanges = Partial<Pick<Group, "name" | "description" | "icon">>

/**
 * Name, description and icon: admins, or everyone when the group allows it.
 * Returns the fields that actually changed (empty when nothing did).
 */
export async function updateGroupInfo(user: UserProfile, group: Group | undefined, input: GroupInfoChanges) {
  if (!group) throw new AppError("Group not found")
  if (!canEditGroupInfo(group, user.uid)) throw new AppError("Only admins can edit this group's info")

  const changes: GroupInfoChanges = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new AppError("Group name is required")
    if (name.length > GROUP_NAME_MAX) throw new AppError(`Group name can be up to ${GROUP_NAME_MAX} characters`)
    if (name !== group.name) changes.name = name
  }
  if (input.description !== undefined) {
    const description = input.description.trim()
    if (description.length > GROUP_DESCRIPTION_MAX)
      throw new AppError(`Description can be up to ${GROUP_DESCRIPTION_MAX} characters`)
    if (description !== (group.description || "")) changes.description = description
  }
  if (input.icon !== undefined && input.icon && input.icon !== group.icon) changes.icon = input.icon
  if (Object.keys(changes).length === 0) return changes

  const firestore = getDb()
  if (!firestore) return changes
  await updateDoc(doc(firestore, "groups", group.id), { ...changes, updatedAt: nowIso() })

  const who = user.displayName
  if (changes.name) groupEvent(group.id, user, `${who} changed the group name to "${changes.name}"`)
  if (changes.icon) groupEvent(group.id, user, `${who} changed the group icon`)
  if (changes.description !== undefined)
    groupEvent(
      group.id,
      user,
      changes.description ? `${who} changed the group description` : `${who} removed the group description`
    )
  return changes
}

/** Group permissions (admins only). */
export async function updateGroupSettings(user: UserProfile, group: Group | undefined, patch: Partial<GroupSettings>) {
  if (!group) throw new AppError("Group not found")
  if (!isGroupAdmin(group, user.uid)) throw new AppError("Only admins can change group settings")

  const firestore = getDb()
  const updates: Record<string, string> = { updatedAt: nowIso() }
  if (patch.editInfo) updates["settings.editInfo"] = patch.editInfo
  if (patch.addMembers) updates["settings.addMembers"] = patch.addMembers
  if (firestore) await updateDoc(doc(firestore, "groups", group.id), updates)

  const who = user.displayName
  if (patch.editInfo)
    groupEvent(
      group.id,
      user,
      patch.editInfo === "admins"
        ? `${who} changed this group's settings so only admins can edit the group info`
        : `${who} changed this group's settings so all members can edit the group info`
    )
  if (patch.addMembers)
    groupEvent(
      group.id,
      user,
      patch.addMembers === "admins"
        ? `${who} changed this group's settings so only admins can add members`
        : `${who} changed this group's settings so all members can add members`
    )
}

/** Make someone an admin, or dismiss them as one (admins only; never the creator). */
export async function setGroupMemberRole(
  user: UserProfile,
  group: Group | undefined,
  targetUid: string,
  role: GroupMemberInfo["role"]
) {
  if (!group) throw new AppError("Group not found")
  if (!group.members.includes(targetUid)) throw new AppError("They're no longer in this group")
  if (targetUid === group.createdBy) throw new AppError("The group creator is always an admin")
  if (!canManageMember(group, user.uid, targetUid)) throw new AppError("Only admins can change admins")

  const name = memberName(group, targetUid)
  const firestore = getDb()
  if (firestore) {
    await updateDoc(doc(firestore, "groups", group.id), {
      [`memberDetails.${targetUid}.role`]: role,
      updatedAt: nowIso(),
    })
  }
  groupEvent(
    group.id,
    user,
    role === "admin" ? `${user.displayName} made ${name} an admin` : `${user.displayName} dismissed ${name} as admin`
  )
  if (role === "admin") {
    await sendNotification({
      userId: targetUid,
      title: "You're now an admin",
      message: `${user.displayName} made you an admin of "${group.name}"`,
      type: "GROUP_ROLE",
      data: { groupId: group.id, groupName: group.name, actorId: user.uid, actorName: user.displayName },
    }).catch((err) => console.warn("Could not send admin notification:", err))
  }
  return { message: role === "admin" ? `${name} is now an admin` : `${name} is no longer an admin` }
}

/**
 * Removes someone (admins only; never the creator). Like leaving, they become a
 * former member: past expenses stay readable to them and the group chat closes
 * for them on their next visit.
 */
export async function removeGroupMember(user: UserProfile, group: Group | undefined, targetUid: string) {
  if (!group) throw new AppError("Group not found")
  if (!group.members.includes(targetUid)) throw new AppError("They're no longer in this group")
  if (targetUid === group.createdBy) throw new AppError("The group creator can't be removed")
  if (!canManageMember(group, user.uid, targetUid)) throw new AppError("Only admins can remove members")

  const info = group.memberDetails?.[targetUid]
  const name = memberName(group, targetUid)
  const firestore = getDb()
  if (!firestore) return { message: `${name} was removed from the group` }

  await updateDoc(doc(firestore, "groups", group.id), {
    members: arrayRemove(targetUid),
    formerMembers: arrayUnion(targetUid),
    [`memberDetails.${targetUid}`]: deleteField(),
    [`formerMemberDetails.${targetUid}`]: sanitizeForFirestore({
      uid: targetUid,
      name,
      splitzyId: info?.splitzyId || "",
      photoURL: info?.photoURL,
      role: "member",
    }),
    updatedAt: nowIso(),
  })
  groupEvent(group.id, user, `${user.displayName} removed ${name}`)
  await sendNotification({
    userId: targetUid,
    title: "Removed from group",
    message: `${user.displayName} removed you from "${group.name}". Your past expenses there are still in your history.`,
    type: "GROUP_REMOVED",
    data: { groupId: group.id, groupName: group.name, actorId: user.uid, actorName: user.displayName },
  }).catch((err) => console.warn("Could not send removal notification:", err))
  return { message: `${name} was removed from the group` }
}

export async function leaveGroup(user: UserProfile, group: Group | undefined, expenses: Expense[]) {
  if (!group) throw new AppError("Group not found")
  const check = canUserLeaveGroup(user.uid, group, expenses)
  if (!check.allowed) throw new AppError(check.reason || "You can't leave this group yet")

  const remaining = group.members.filter((m) => m !== user.uid)
  // The creator hands the group over — to another admin when there is one, else
  // the next member, who becomes an admin. The owner always counts as an admin,
  // so a group is never left without one. The last one out archives it.
  const newOwner =
    group.createdBy === user.uid
      ? (remaining.find((m) => group.memberDetails?.[m]?.role === "admin") ?? remaining[0])
      : undefined

  const firestore = getDb()
  if (!firestore) return

  // Say goodbye in the chat first, while you're still in it (after leaving, the chat
  // may already have shut you out). Never waits more than a moment.
  if (remaining.length > 0)
    await Promise.race([
      postGroupEvent(group.id, user, `${user.displayName} left`).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ])

  // Field paths, not whole maps: a stale copy must never undo someone else's change
  await updateDoc(doc(firestore, "groups", group.id), {
    members: arrayRemove(user.uid),
    ...(newOwner
      ? {
          createdBy: newOwner,
          ...(group.memberDetails?.[newOwner] ? { [`memberDetails.${newOwner}.role`]: "admin" } : {}),
        }
      : {}),
    ...(remaining.length === 0 ? { status: "ARCHIVED", archivedAt: nowIso() } : {}),
    invitedMembers: arrayRemove(user.uid),
    formerMembers: arrayUnion(user.uid),
    [`memberDetails.${user.uid}`]: deleteField(),
    [`formerMemberDetails.${user.uid}`]: sanitizeForFirestore({
      ...(group.memberDetails?.[user.uid] || toMemberInfo(user, "member")),
      role: "member",
    }),
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
  if (target.uid === user.uid) throw new AppError("You cannot add yourself")

  const isMember = group.members.includes(target.uid)
  if (option !== "FRIEND_ONLY" && !isMember && !canAddGroupMembers(group, user.uid)) {
    throw new AppError("Only admins can add members to this group")
  }
  const isFriend = friends.some((f) => f.uid === target.uid)
  const requestPending = hasPendingRequest(friendRequests, user.uid, target.uid)

  const wantsGroup = option !== "FRIEND_ONLY"
  const wantsFriend = option !== "GROUP_ONLY"
  const sendGroup = wantsGroup && !isMember
  const sendFriend = wantsFriend && !isFriend && !requestPending

  if (!sendGroup && !sendFriend) {
    if (wantsGroup && isMember) throw new AppError(`${target.displayName} is already a member of this group`)
    if (isFriend) throw new AppError(`${target.displayName} is already your friend`)
    throw new AppError(`A friend request is already pending with ${target.displayName}`)
  }

  const firestore = getDb()
  let friendRequest: FriendRequest | undefined

  if (sendGroup) {
    const newMemberInfo = toMemberInfo(target, "member")

    if (firestore) {
      // arrayUnion / arrayRemove: a stale copy of the member list must never re-add someone who left
      await updateDoc(doc(firestore, "groups", groupId), {
        members: arrayUnion(target.uid),
        [`memberDetails.${target.uid}`]: sanitizeForFirestore(newMemberInfo),
        invitedMembers: arrayRemove(target.uid),
        [`invitedMemberDetails.${target.uid}`]: deleteField(),
      })
      groupEvent(groupId, user, `${user.displayName} added ${target.displayName}`)
      await sendGroupAddedNotification(user, target.uid, group)
    }
  }

  if (sendFriend) {
    friendRequest = (await sendFriendRequest(ctx, target.splitzyId)).request
  }

  const message = sendGroup && sendFriend
    ? `${target.displayName} added to group and friend request sent!`
    : sendGroup
      ? `${target.displayName} added to group!`
      : `Friend request sent to ${target.displayName}!`

  return {
    invitedMembers: null,
    friendRequest,
    message,
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
  const formerMembers = (group.formerMembers || []).filter((id) => id !== user.uid)
  const patch = {
    members: Array.from(new Set([...(group.members || []), user.uid])),
    invitedMembers: (group.invitedMembers || []).filter((id) => id !== user.uid),
    formerMembers,
    memberDetails: { ...group.memberDetails, [user.uid]: toMemberInfo(user, "member") },
    invitedMemberDetails,
  }

  const firestore = getDb()
  if (firestore && !alreadyMember) {
    await updateDoc(doc(firestore, "groups", groupId), {
      members: patch.members,
      invitedMembers: patch.invitedMembers,
      formerMembers: patch.formerMembers,
      [`memberDetails.${user.uid}`]: sanitizeForFirestore(patch.memberDetails[user.uid]),
      [`invitedMemberDetails.${user.uid}`]: deleteField(),
      [`formerMemberDetails.${user.uid}`]: deleteField(),
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
  await activateFriendship(user.uid, req.senderId, { requestId, merge: true })
  await sendNotification(
    {
      userId: req.senderId,
      title: "Friend Request Accepted",
      message: `${user.displayName} accepted your friend request!`,
      type: "FRIEND_ACCEPTED",
      data: { actorId: user.uid, actorName: user.displayName },
    }
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
