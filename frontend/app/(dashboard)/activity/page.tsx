"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FilterPills } from "../_components/filter-pills"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Card } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
} from "@/components/ui/item"
import { useNotifications } from "@/hooks/queries"
import { useQueryTab } from "@/hooks/use-query-tab"
import type { AppNotification } from "@/lib/types"

type ActivityType = "friends" | "groups" | "payments"
type ActivityFilter = "all" | ActivityType

const FILTERS = [
  { value: "all", label: "All Activity" },
  { value: "friends", label: "friends" },
  { value: "groups", label: "groups" },
  { value: "payments", label: "payments" },
] as const

const ACTIVITY_FILTERS: ActivityFilter[] = ["all", "friends", "groups", "payments"]

function toActivity(n: AppNotification) {
  let type: ActivityType = "payments"
  let link = "/notifications"
  if (n.type.includes("FRIEND")) {
    type = "friends"
    link = "/friends/requests"
  } else if (n.type.includes("GROUP")) {
    type = "groups"
    link = n.data?.groupId ? `/groups/${n.data.groupId}` : "/groups"
  } else if (n.type.includes("EXPENSE") || n.type.includes("PAYMENT")) {
    type = "payments"
    link = n.data?.expenseId ? `/expenses/${n.data.expenseId}` : "/history"
  }

  return {
    id: n.id,
    userName: n.data?.actorName || "JoySplit",
    action: n.message,
    time: new Date(n.createdAt).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    }),
    type,
    link,
  }
}

function ActivityContent() {
  const {
    data: notifications,
    isPending,
    isError,
    error,
    refetch,
  } = useNotifications()
  const [filter, setFilter] = useQueryTab<ActivityFilter>({
    defaultValue: "all",
    validValues: ACTIVITY_FILTERS,
    param: "tab",
  })

  const activities = React.useMemo(
    () => notifications.map(toActivity),
    [notifications]
  )
  const filtered =
    filter === "all" ? activities : activities.filter((a) => a.type === filter)

  return (
    <>
      <AppHeader title="Activity" />

      <PageContainer className="max-w-2xl gap-5">
        <FilterPills
          aria-label="Filter activity"
          options={FILTERS}
          value={filter}
          onValueChange={setFilter}
        />

        {isPending ? (
          <ListSkeleton />
        ) : isError ? (
          <QueryError error={error} onRetry={refetch} />
        ) : (
          <Card className="rounded-3xl py-0">
            {filtered.length > 0 ? (
              <ItemGroup className="gap-0">
                {filtered.map((act, i) => (
                  <React.Fragment key={act.id}>
                    {i > 0 && <ItemSeparator className="my-0" />}
                    <Item
                      className="flex-nowrap rounded-none p-4"
                      render={<Link href={act.link} />}
                    >
                      <ItemMedia>
                        <UserAvatar name={act.userName} size="md" />
                      </ItemMedia>
                      <ItemContent className="min-w-0">
                        <p className="text-xs leading-snug sm:text-sm">
                          <span className="font-bold">{act.userName} </span>
                          <span className="text-muted-foreground">
                            {act.action}
                          </span>
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {act.time}
                        </span>
                      </ItemContent>
                      <ItemActions>
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          className="size-4 text-muted-foreground"
                        />
                      </ItemActions>
                    </Item>
                  </React.Fragment>
                ))}
              </ItemGroup>
            ) : (
              <EmptyState
                icon={Clock01Icon}
                title="No activity recorded yet in this category."
              />
            )}
          </Card>
        )}
      </PageContainer>
    </>
  )
}

export default function ActivityPage() {
  return (
    <React.Suspense fallback={<ListSkeleton />}>
      <ActivityContent />
    </React.Suspense>
  )
}
