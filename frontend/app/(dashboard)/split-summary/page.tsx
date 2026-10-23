"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Invoice01Icon,
  PlusSignIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { GroupSettlementDialog } from "@/components/settlement/group-settlement-dialog"
import { SettleExpensesDialog } from "@/components/settlement/settle-expenses-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { GroupIcon } from "@/components/shared/group-icon"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import { useQueryTab } from "@/hooks/use-query-tab"
import {
  calculateMemberGroupBalance,
  calculatePersonBalances,
  formatPaise,
  isAwaitingConfirmation,
} from "@/lib/money"
import { AwaitingConfirmationBadge } from "@/components/shared/awaiting-confirmation-badge"
import { ChallengeButton } from "@/components/games/challenge-button"
import { GameDiscountAmount, GameDiscountNote } from "@/components/games/game-discount-amount"
import { useDiscountedBalances, useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { cn } from "@/lib/utils"

function SplitSummaryContent() {
  const gameDiscounts = useLiveGameDiscounts()
  const router = useRouter()
  const { user } = useSession()
  const expensesQuery = useExpenses()
  const groupsQuery = useGroups()
  const friendsQuery = useFriends()

  const expenses = expensesQuery.data || []
  const groups = groupsQuery.data || []
  const friends = friendsQuery.data || []

  const [activeTab, setActiveTab] = useQueryTab<"groups" | "people">({
    defaultValue: "groups",
    validValues: ["groups", "people"] as const,
  })
  const [selectedPersonId, setSelectedPersonId] = React.useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)

  // Overall combined net balances across all groups and direct splits
  // (with any live game discount applied for its 10 minutes)
  const netOverview = useDiscountedBalances()

  const netBalancePaise = netOverview.netBalancePaise
  const isNetPayable = netBalancePaise < 0
  const isNetReceivable = netBalancePaise > 0
  const netDisplayAmountPaise = Math.abs(netBalancePaise)

  // All active groups with their calculated balances & metrics
  const groupRows = React.useMemo(() => {
    if (!user) return []
    return groups
      .map((grp) => {
        const bal = calculateMemberGroupBalance(user.uid, grp.id, expenses)
        const groupExpenseCount = expenses.filter((e) => e.groupId === grp.id && !e.deletedAt).length
        return {
          group: grp,
          balance: bal,
          netPaise: bal.netPaise,
          userOwesPaise: bal.userOwesPaise,
          owedToUserPaise: bal.owedToUserPaise,
          offsetPaise: bal.offsetPaise,
          hasBalance: bal.userOwesPaise > 0 || bal.owedToUserPaise > 0,
          expenseCount: groupExpenseCount,
        }
      })
      .sort((a, b) => {
        if (a.hasBalance && !b.hasBalance) return -1
        if (!a.hasBalance && b.hasBalance) return 1
        return b.userOwesPaise - a.userOwesPaise
      })
  }, [user, groups, expenses])

  // People list with active non-zero net balances across everything
  const peopleRows = React.useMemo(() => {
    if (!user) return []
    const personBalances = calculatePersonBalances(user.uid, expenses)

    return personBalances
      .map((p) => {
        const friend = friends.find((f) => f.uid === p.userId)
        return {
          ...p,
          name: friend?.displayName || p.name || "Member",
          photoURL: friend?.photoURL || p.photoURL,
          upiId: friend?.upiId || p.upiId,
          youOwe: p.netBalancePaise < 0,
          awaitingConfirmation: p.netBalancePaise < 0 && isAwaitingConfirmation(user.uid, p.userId, expenses),
          amountPaise: Math.abs(p.netBalancePaise),
        }
      })
      .filter((p) => p.netBalancePaise !== 0)
      .sort((a, b) => {
        if (a.youOwe && !b.youOwe) return -1
        if (!a.youOwe && b.youOwe) return 1
        return b.amountPaise - a.amountPaise
      })
  }, [user, expenses, friends])

  const isLoading = expensesQuery.isPending || groupsQuery.isPending
  const isError = expensesQuery.isError || groupsQuery.isError

  return (
    <div className="mx-auto flex h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] w-full max-w-4xl flex-col overflow-hidden bg-background text-foreground md:h-auto md:max-h-none md:min-h-[calc(100vh-4rem)] md:overflow-visible md:pb-12">
      {/* Top Header */}
      <header className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Back"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </button>
            <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              Split Expense Summary
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/expenses/new")}
              className="hidden h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground sm:flex"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
              Split New Expense
            </Button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <ListSkeleton rows={5} />
        </main>
      ) : isError ? (
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <QueryError
            error={expensesQuery.error || groupsQuery.error}
            onRetry={() => {
              expensesQuery.refetch()
              groupsQuery.refetch()
            }}
          />
        </main>
      ) : (
        <>
          {/* Sticky Top Balance & Tabs Area for Mobile */}
          <div className="shrink-0 border-b border-border/60 bg-background/95 px-4 pt-3 pb-0 backdrop-blur-md sm:border-0 sm:bg-transparent sm:px-6 sm:pt-6">
            {/* Total Split Balance Hero Card */}
            <Card className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 p-3.5 shadow-xs sm:rounded-3xl sm:p-6">
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                    Total Split Balance
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:text-[11px]",
                      isNetPayable
                        ? "bg-destructive/10 text-destructive"
                        : isNetReceivable
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isNetPayable
                      ? "You need to pay"
                      : isNetReceivable
                        ? "You will receive"
                        : "All settled up"}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-2xl font-black tracking-tight tabular-nums sm:text-4xl",
                      isNetPayable
                        ? "text-destructive"
                        : isNetReceivable
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                    )}
                  >
                    {isNetPayable
                      ? `-₹${(netDisplayAmountPaise / 100).toFixed(0)}`
                      : isNetReceivable
                        ? `+₹${(netDisplayAmountPaise / 100).toFixed(0)}`
                        : "₹0"}
                  </span>
                </div>

                <p className="line-clamp-2 text-xs text-muted-foreground sm:line-clamp-none">
                  {isNetPayable
                    ? "Total pending amount across all groups and direct splits you need to pay."
                    : isNetReceivable
                      ? "Total pending amount across all groups and direct splits owed to you."
                      : "All balances are settled up across your groups and friends."}
                </p>
                <GameDiscountNote
                  className="mt-1"
                  discountPaise={netOverview.gameDiscountPaise}
                  endsAt={netOverview.gameDiscountEndsAt}
                  now={netOverview.now}
                />
              </div>
            </Card>

            {/* Navigation Tabs (Groups | People) */}
            <div className="mt-2.5 flex sm:mt-6 sm:border-b sm:border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("groups")}
                className={cn(
                  "relative flex-1 pb-2.5 text-center text-sm font-bold transition-all select-none sm:pb-3",
                  activeTab === "groups"
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Groups
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("people")}
                className={cn(
                  "relative flex-1 pb-2.5 text-center text-sm font-bold transition-all select-none sm:pb-3",
                  activeTab === "people"
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                People
              </button>
            </div>
          </div>

          {/* Scrollable Container for Tab Items */}
          <main className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 overscroll-contain sm:px-6 sm:py-6 md:overflow-visible md:flex-initial">
            <div className="pb-28 sm:pb-8">
              {/* Tab 1: Groups Content */}
              {activeTab === "groups" && (
                <div>
                  {groupRows.length === 0 ? (
                    <EmptyState
                      icon={UserGroupIcon}
                      title="No groups found"
                      description="You are not part of any groups yet."
                      action={{
                        label: "Create a Group",
                        onClick: () => router.push("/groups/new"),
                      }}
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {groupRows.map((row) => {
                        const youOwe = row.userOwesPaise > row.owedToUserPaise
                        const amount = Math.abs(row.netPaise)

                        return (
                          <div
                            key={row.group.id}
                            onClick={() => setSelectedGroupId(row.group.id)}
                            className="flex flex-row cursor-pointer items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-xs transition hover:border-primary/40 hover:bg-muted/30 active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Group Avatar / Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/groups/${row.group.id}`)
                                }}
                                title="View group expenses and members"
                                className="shrink-0 transition-transform hover:scale-105 active:scale-95"
                              >
                                <GroupIcon
                                  src={row.group.icon}
                                  alt={row.group.name}
                                  size="md"
                                  className="size-12 rounded-full border shadow-2xs"
                                />
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-base font-bold text-foreground">
                                  {row.group.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                  <span>{row.group.members.length} members</span>
                                  <span>•</span>
                                  <span>
                                    {row.expenseCount} {row.expenseCount === 1 ? "expense" : "expenses"}
                                  </span>
                                </div>
                                {row.offsetPaise > 0 && (
                                  <div className="mt-1 text-[11px] font-semibold text-info">
                                    {formatPaise(row.offsetPaise)} cancelled out with other splits
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right side: You get / You owe + Large Amount + Arrow */}
                            <div className="flex shrink-0 items-center gap-3.5 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {!row.hasBalance ? "Settled" : youOwe ? "You owe" : "You get"}
                                </span>
                                <span
                                  className={cn(
                                    "text-xl font-black tabular-nums leading-tight mt-0.5 sm:text-2xl",
                                    !row.hasBalance
                                      ? "text-muted-foreground"
                                      : youOwe
                                        ? "text-destructive"
                                        : "text-emerald-600 dark:text-emerald-400"
                                  )}
                                >
                                  ₹{(amount / 100).toFixed(0)}
                                </span>
                              </div>

                              <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                className="size-5 shrink-0 text-muted-foreground/70"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: People Content */}
              {activeTab === "people" && (
                <div>
                  {peopleRows.length === 0 ? (
                    <EmptyState
                      icon={Invoice01Icon}
                      title="No pending balances"
                      description="You are settled up with all your friends and group members!"
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {peopleRows.map((person) => {
                        return (
                          <div
                            key={person.userId}
                            onClick={() => setSelectedPersonId(person.userId)}
                            className="flex flex-row cursor-pointer items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-xs transition hover:border-primary/40 hover:bg-muted/30 active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Person Avatar */}
                              <UserAvatar
                                src={person.photoURL}
                                name={person.name}
                                size="md"
                                className="size-12 ring-1 ring-border/50 shrink-0"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-base font-bold text-foreground">
                                  {person.name}
                                </div>
                                {person.upiId ? (
                                  <div className="truncate font-mono text-xs text-muted-foreground mt-0.5">
                                    {person.upiId}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground mt-0.5">Direct & Groups</div>
                                )}
                                {!person.youOwe && (
                                  <ChallengeButton
                                    className="mt-1.5"
                                    person={{ uid: person.userId, name: person.name, photoURL: person.photoURL }}
                                    owedPaise={person.amountPaise}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Right side: Pay Now / You get */}
                            <div className="flex shrink-0 items-center gap-3.5 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {person.youOwe ? "You owe" : "You get"}
                                  {gameDiscounts.byPerson.has(person.userId) && " (if paid now)"}
                                </span>
                                <GameDiscountAmount
                                  amountPaise={person.amountPaise}
                                  discount={gameDiscounts.byPerson.get(person.userId)}
                                  now={gameDiscounts.now}
                                  className={cn(
                                    "text-xl font-black leading-tight mt-0.5 sm:text-2xl",
                                    person.youOwe
                                      ? "text-destructive"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  )}
                                />
                                {person.awaitingConfirmation && <AwaitingConfirmationBadge className="mt-1" />}
                              </div>

                              <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                className="size-5 shrink-0 text-muted-foreground/70"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </>
      )}

      {/* Floating Bottom Button for Mobile (positioned comfortably above the bottom nav bar) */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto max-w-md px-4 pointer-events-none sm:hidden">
        <Button
          type="button"
          onClick={() => router.push("/expenses/new")}
          className="pointer-events-auto h-12 w-full rounded-2xl bg-primary text-sm font-extrabold tracking-wider text-primary-foreground shadow-2xl transition hover:bg-primary/90 active:scale-[0.99]"
        >
          SPLIT NEW EXPENSE
        </Button>
      </div>

      {/* Settle Expenses Dialog (Screenshot 3) */}
      {selectedPersonId && (
        <SettleExpensesDialog
          open={Boolean(selectedPersonId)}
          onOpenChange={(open) => !open && setSelectedPersonId(null)}
          personId={selectedPersonId}
          onSettled={() => {
            setSelectedPersonId(null)
            expensesQuery.refetch()
          }}
        />
      )}

      {/* Group Settlement Dialog */}
      {selectedGroupId && (
        <GroupSettlementDialog
          open={Boolean(selectedGroupId)}
          onOpenChange={(open) => !open && setSelectedGroupId(null)}
          groupId={selectedGroupId}
          onSettled={() => {
            setSelectedGroupId(null)
            expensesQuery.refetch()
          }}
        />
      )}
    </div>
  )
}

export default function SplitSummaryPage() {
  return (
    <React.Suspense fallback={<ListSkeleton rows={5} />}>
      <SplitSummaryContent />
    </React.Suspense>
  )
}
