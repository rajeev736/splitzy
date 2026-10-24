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
import { GameDiscountTag } from "@/components/games/game-discount-amount"
import { useExpenses, useGroups } from "@/hooks/queries"
import { scopedGameDiscount, useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { useQueryTab } from "@/hooks/use-query-tab"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import { calculateMemberGroupBalance, formatPaise } from "@/lib/money"

type GroupFilter = "all" | "active" | "settled"

const FILTERS = [
  { value: "all", label: "All Groups" },
  { value: "active", label: "active" },
  { value: "settled", label: "settled" },
] as const

const GROUP_FILTERS: GroupFilter[] = ["all", "active", "settled"]

const SETTLED = {
  netPaise: 0,
  owedToUserPaise: 0,
  userOwesPaise: 0,
  allSettled: true,
}

const NO_GAME = { discountPaise: 0, endsAt: 0 }

function GroupsContent() {
  const { user } = useSession()
  const groupsQuery = useGroups()
  const expensesQuery = useExpenses()
  const { hasGroupUnreadExpenses } = useUnreadTracking()
  const groups = groupsQuery.data
  const expenses = expensesQuery.data

  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = useQueryTab<GroupFilter>({
    defaultValue: "all",
    validValues: GROUP_FILTERS,
    param: "tab",
  })

  const { byPerson, now } = useLiveGameDiscounts()

  const rows = React.useMemo(
    () =>
      groups
        .map((group) => {
          if (!user) return { group, balance: SETTLED, game: NO_GAME }
          const balance = calculateMemberGroupBalance(user.uid, group.id, expenses)
          // Live game discounts on this group's expenses lower what you pay / get back
          const game = scopedGameDiscount(user.uid, byPerson, expenses, { groupId: group.id })
          return { group, balance: { ...balance, netPaise: balance.netPaise + game.netAdjustPaise }, game }
        })
        .filter(({ group, balance }) => {
          if (!group.name.toLowerCase().includes(search.toLowerCase()))
            return false
          if (filter === "settled") return balance.allSettled
          if (filter === "active") return !balance.allSettled
          return true
        }),
    [groups, expenses, user, search, filter, byPerson]
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
            {rows.map(({ group, balance, game }) => (
              <GroupListItem
                key={group.id}
                group={group}
                hasUnread={hasGroupUnreadExpenses(group.id)}
                className="rounded-3xl p-4"
                action={
                  <div className="flex items-center gap-2.5">
                    {balance.allSettled ? (
                      <StatusBadge status="all_settled" />
                    ) : balance.netPaise === 0 ? (
                      <StatusBadge status="settled" />
                    ) : (
                      <span className="flex flex-col items-end gap-0.5">
                        {balance.netPaise > 0 ? (
                          <span className="text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-base">
                            +{formatPaise(balance.netPaise)}
                          </span>
                        ) : (
                          <span className="text-sm font-black tabular-nums text-destructive sm:text-base">
                            -{formatPaise(Math.abs(balance.netPaise))}
                          </span>
                        )}
                        <GameDiscountTag discountPaise={game.discountPaise} endsAt={game.endsAt} now={now} />
                      </span>
                    )}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="size-5 text-muted-foreground/70"
                    />
                  </div>
                }
              />
            ))}
          </ItemGroup>
        ) : (
          <EmptyState
            icon={UserGroupIcon}
            title={search ? "No groups found" : "No groups yet"}
            description={
              search
                ? "Try searching for a different name."
                : "Create a group to start splitting bills with friends!"
            }
            action={
              search
                ? undefined
                : {
                    label: "Create Group",
                    onClick: () => (window.location.href = "/groups/new"),
                  }
            }
          />
        )}
      </PageContainer>
    </>
  )
}

export default function GroupsPage() {
  return (
    <React.Suspense fallback={<ListSkeleton />}>
      <GroupsContent />
    </React.Suspense>
  )
}
