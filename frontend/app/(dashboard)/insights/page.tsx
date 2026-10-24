"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { Analytics01Icon } from "@hugeicons/core-free-icons"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { DonutChart } from "@/components/charts/donut-chart"
import { RankedBars } from "@/components/charts/ranked-bars"
import { CHART_SERIES_VARS, seriesColor, type ChartSeries } from "@/components/charts/series"
import { EmptyState } from "@/components/shared/empty-state"
import { GroupIcon } from "@/components/shared/group-icon"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import {
  EXPENSE_KINDS,
  KIND_LABELS,
  PERIOD_LABELS,
  expensesInPeriod,
  spendByCategory,
  spendByFriend,
  spendByGroup,
  spendTrend,
  summarize,
  type Period,
} from "@/lib/analytics"
import { formatPaise } from "@/lib/money"
import { cn } from "@/lib/utils"
import { GamesSection } from "./_components/games-section"
import { KpiTiles } from "./_components/kpi-tiles"
import { SectionCard, SectionEmpty } from "./_components/section-card"
import { TrendCard } from "./_components/trend-card"

const PERIODS = Object.keys(PERIOD_LABELS) as Period[]

/** Fixed slot per type — a type keeps its color whatever the filter shows. */
const KIND_SERIES: ChartSeries[] = EXPENSE_KINDS.map((kind, i) => ({
  key: kind,
  label: KIND_LABELS[kind],
  color: seriesColor((i + 1) as 1 | 2 | 3),
}))

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

export default function InsightsPage() {
  const router = useRouter()
  const { user } = useSession()
  const expensesQuery = useExpenses()
  const { data: groups } = useGroups()
  const { data: friends } = useFriends()
  const [period, setPeriod] = React.useState<Period>("3m")

  const expenses = expensesQuery.data
  const uid = user?.uid ?? ""

  const view = React.useMemo(() => {
    const now = new Date()
    const inPeriod = expensesInPeriod(expenses, uid, period, now)
    return {
      inPeriod,
      summary: summarize(inPeriod, uid),
      trend: spendTrend(inPeriod, uid, period, now),
      groups: spendByGroup(inPeriod, uid, groups),
      friends: spendByFriend(inPeriod, expenses, uid, friends),
      categories: spendByCategory(inPeriod, uid),
    }
  }, [expenses, uid, period, groups, friends])

  const hasAnyExpense = expenses.length > 0

  return (
    <>
      <AppHeader title="Insights" subtitle="Where your money goes" />

      <PageContainer className={cn("pb-24", CHART_SERIES_VARS)}>
        {/* Period filter — one row above every chart */}
        <ToggleGroup
          variant="outline"
          spacing={1.5}
          className="grid w-full grid-cols-4 sm:flex sm:w-auto sm:self-start"
          value={[period]}
          onValueChange={(value: string[]) => value[0] && setPeriod(value[0] as Period)}
          aria-label="Time period"
        >
          {PERIODS.map((p) => (
            <ToggleGroupItem
              key={p}
              value={p}
              className="rounded-md bg-card px-3 text-xs font-medium aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground"
            >
              {PERIOD_LABELS[p]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {expensesQuery.isPending ? (
          <ListSkeleton rows={4} />
        ) : expensesQuery.isError ? (
          <QueryError error={expensesQuery.error} onRetry={() => expensesQuery.refetch()} />
        ) : !hasAnyExpense ? (
          <EmptyState
            icon={Analytics01Icon}
            title="No expenses yet"
            description="Add a group, friend or personal expense and your spending charts will appear here."
            action={{ label: "Add expense", onClick: () => router.push("/expenses/new") }}
          />
        ) : (
          <>
            <KpiTiles summary={view.summary} />

            <div className="grid gap-4 lg:grid-cols-5">
              <TrendCard
                buckets={view.trend}
                series={KIND_SERIES}
                daily={period === "month"}
                className="lg:col-span-3"
              />
              <SectionCard title="By type" description="Group vs friends vs personal" className="lg:col-span-2">
                {view.summary.spendPaise > 0 ? (
                  <DonutChart
                    series={KIND_SERIES}
                    values={view.summary.byKind}
                    formatValue={formatPaise}
                    centerLabel="My spend"
                  />
                ) : (
                  <SectionEmpty>No spending in this period yet.</SectionEmpty>
                )}
              </SectionCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Groups" description="Your share in each group">
                {view.groups.length > 0 ? (
                  <RankedBars
                    color={seriesColor(1)}
                    formatValue={formatPaise}
                    items={view.groups.map((g) => ({
                      id: g.id,
                      label: g.label,
                      value: g.valuePaise,
                      detail: plural(g.count, "expense"),
                      leading: <GroupIcon src={g.image} alt={g.label} size="sm" />,
                    }))}
                  />
                ) : (
                  <SectionEmpty>No group expenses in this period.</SectionEmpty>
                )}
              </SectionCard>

              <SectionCard title="Friends" description="Direct splits, and where you stand now">
                {view.friends.length > 0 ? (
                  <RankedBars
                    color={seriesColor(2)}
                    formatValue={formatPaise}
                    items={view.friends.map((f) => ({
                      id: f.id,
                      label: f.label,
                      value: f.valuePaise,
                      detail: `${plural(f.count, "split")} · your share ${formatPaise(f.mySpendPaise)}`,
                      leading: <UserAvatar src={f.image} name={f.label} size="sm" />,
                      trailing: (
                        <div
                          className={cn(
                            "text-[11px] font-medium tabular-nums",
                            f.netBalancePaise > 0 && "text-success",
                            f.netBalancePaise < 0 && "text-destructive",
                            f.netBalancePaise === 0 && "text-muted-foreground"
                          )}
                        >
                          {f.netBalancePaise > 0
                            ? `owes you ${formatPaise(f.netBalancePaise)}`
                            : f.netBalancePaise < 0
                              ? `you owe ${formatPaise(-f.netBalancePaise)}`
                              : "settled up"}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <SectionEmpty>No direct splits with friends in this period.</SectionEmpty>
                )}
              </SectionCard>
            </div>

            {view.categories.length > 0 && (
              <SectionCard title="Top categories" description="Your share by category">
                <RankedBars
                  color={seriesColor(3)}
                  formatValue={formatPaise}
                  items={view.categories.map((c) => ({
                    id: c.id,
                    label: c.label,
                    value: c.valuePaise,
                    detail: plural(c.count, "expense"),
                  }))}
                />
              </SectionCard>
            )}
          </>
        )}

        {/* Games are independent of the expense period filter: always all-time */}
        {!expensesQuery.isPending && <GamesSection />}
      </PageContainer>
    </>
  )
}
