"use client"

import * as React from "react"
import {
  ArrowRight01Icon,
  PlusSignIcon,
  Search01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FilterPills } from "../_components/filter-pills"
import { GroupListItem } from "../_components/group-list-item"
import { GroupInvitations } from "./_components/group-invitations"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ItemGroup } from "@/components/ui/item"
import { useExpenses, useGroups } from "@/hooks/queries"
import { calculateMemberGroupBalance, formatPaise } from "@/lib/money"

type GroupFilter = "all" | "active" | "settled"

const FILTERS = [
  { value: "all", label: "All Groups" },
  { value: "active", label: "active" },
  { value: "settled", label: "settled" },
] as const

const SETTLED = {
  netPaise: 0,
  owedToUserPaise: 0,
  userOwesPaise: 0,
  allSettled: true,
}

export default function GroupsPage() {
  const { user } = useSession()
  const groupsQuery = useGroups()
  const expensesQuery = useExpenses()
  const groups = groupsQuery.data
  const expenses = expensesQuery.data

  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState<GroupFilter>("all")

  const rows = React.useMemo(
    () =>
      groups
        .map((group) => ({
          group,
          balance: user
            ? calculateMemberGroupBalance(user.uid, group.id, expenses)
            : SETTLED,
        }))
        .filter(({ group, balance }) => {
          if (!group.name.toLowerCase().includes(search.toLowerCase()))
            return false
          if (filter === "settled") return balance.allSettled
          if (filter === "active") return !balance.allSettled
          return true
        }),
    [groups, expenses, user, search, filter]
  )

  const isPending = groupsQuery.isPending || expensesQuery.isPending
  const isError = groupsQuery.isError || expensesQuery.isError

  return (
    <>
      <AppHeader
        title="Groups"
        rightAction={
          <ButtonLink
            href="/groups/new"
            size="icon-lg"
            className="rounded-full shadow-sm"
            aria-label="Create Group"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-5"
              strokeWidth={2.5}
            />
          </ButtonLink>
        }
      />

      <PageContainer className="max-w-4xl gap-5">
        <InputGroup className="h-11 rounded-2xl bg-card">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
          />
        </InputGroup>

        <FilterPills
          aria-label="Filter groups"
          options={FILTERS}
          value={filter}
          onValueChange={setFilter}
        />

        <GroupInvitations />

        {isPending ? (
          <ListSkeleton />
        ) : isError ? (
          <QueryError
            error={groupsQuery.error ?? expensesQuery.error}
            onRetry={() => {
              if (groupsQuery.isError) groupsQuery.refetch()
              if (expensesQuery.isError) expensesQuery.refetch()
            }}
          />
        ) : rows.length > 0 ? (
          <ItemGroup className="gap-3">
            {rows.map(({ group, balance }) => (
              <GroupListItem
                key={group.id}
                group={group}
                className="rounded-3xl p-4"
                action={
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-5 text-muted-foreground"
                  />
                }
              >
                {balance.allSettled ? (
                  <StatusBadge status="all_settled" className="mt-1" />
                ) : balance.netPaise === 0 ? (
                  <div className="mt-1 text-xs font-bold text-muted-foreground">
                    Net ₹0 · payments still pending
                  </div>
                ) : balance.netPaise > 0 ? (
                  <div className="mt-1 text-xs font-bold text-success">
                    +{formatPaise(balance.netPaise)} to receive
                  </div>
                ) : (
                  <div className="mt-1 text-xs font-bold text-destructive">
                    {formatPaise(Math.abs(balance.netPaise))} you owe
                  </div>
                )}
              </GroupListItem>
            ))}
          </ItemGroup>
        ) : (
          <EmptyState
            icon={UserGroupIcon}
            title="No groups found"
            description="Try a different search query or create a new group."
          />
        )}
      </PageContainer>
    </>
  )
}
