"use client"

import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"

import { useGroup, useGroupExpenses } from "@/hooks/queries"
import { GroupInfoView } from "../_components/group-info-view"
import {
  GroupError,
  GroupLoading,
  GroupNotFound,
} from "../_components/group-state"

/** WhatsApp-style group info: icon, name, description, members, permissions, leave / delete. */
export default function GroupInfoPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const router = useRouter()
  const groupQuery = useGroup(groupId)
  const { data: expenses } = useGroupExpenses(groupId)
  const group = groupQuery.data

  if (groupQuery.isPending) return <GroupLoading title="Group info" />
  if (groupQuery.isError && !group)
    return (
      <GroupError
        title="Group info"
        error={groupQuery.error}
        onRetry={groupQuery.refetch}
      />
    )
  if (!group) return <GroupNotFound title="Group info" />

  return (
    <GroupInfoView
      group={group}
      expenses={expenses}
      onGone={() => router.push("/groups")}
    />
  )
}
