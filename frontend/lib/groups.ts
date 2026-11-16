import type { Group, GroupSettings } from "@/lib/types"

/**
 * Who may do what in a group. Mirrors `match /groups/{groupId}` in
 * firestore.rules — the rules are the real gate; these only shape the UI.
 */

/** New groups: only admins edit the group info, everyone may add people. */
export const NEW_GROUP_SETTINGS: GroupSettings = {
  editInfo: "admins",
  addMembers: "all",
}

/** Groups made before settings existed keep their old behaviour: everyone may do both. */
export function groupSettings(group: Pick<Group, "settings">): GroupSettings {
  return {
    editInfo: group.settings?.editInfo ?? "all",
    addMembers: group.settings?.addMembers ?? "all",
  }
}

/** The creator (owner) is always an admin; everyone else by their role. */
export function isGroupAdmin(
  group: Pick<Group, "members" | "createdBy" | "memberDetails">,
  uid?: string | null
) {
  if (!uid || !group.members.includes(uid)) return false
  return group.createdBy === uid || group.memberDetails?.[uid]?.role === "admin"
}

export function canEditGroupInfo(group: Group, uid?: string | null) {
  if (!uid || !group.members.includes(uid)) return false
  return groupSettings(group).editInfo === "all" || isGroupAdmin(group, uid)
}

export function canAddGroupMembers(group: Group, uid?: string | null) {
  if (!uid || !group.members.includes(uid)) return false
  return groupSettings(group).addMembers === "all" || isGroupAdmin(group, uid)
}

/** Admins manage other members; nobody manages the creator. */
export function canManageMember(
  group: Group,
  uid: string | null | undefined,
  targetUid: string
) {
  return (
    !!uid &&
    uid !== targetUid &&
    targetUid !== group.createdBy &&
    isGroupAdmin(group, uid)
  )
}

/** Members in display order: you, then the creator, other admins, then everyone else by name. */
export function sortGroupMembers(group: Group, me?: string | null): string[] {
  const rank = (uid: string) =>
    uid === me
      ? 0
      : uid === group.createdBy
        ? 1
        : group.memberDetails?.[uid]?.role === "admin"
          ? 2
          : 3
  const name = (uid: string) => group.memberDetails?.[uid]?.name ?? ""
  return [...group.members].sort(
    (a, b) => rank(a) - rank(b) || name(a).localeCompare(name(b))
  )
}

/** Limits shared with the security rules. */
export const GROUP_NAME_MAX = 50
export const GROUP_DESCRIPTION_MAX = 200
