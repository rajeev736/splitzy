"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  HelpCircleIcon,
  Invoice01Icon,
  PlusSignIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { GroupSettlementDialog } from "@/components/settlement/group-settlement-dialog"
import { SettleExpensesDialog } from "@/components/settlement/settle-expenses-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import {
  calculateMemberGroupBalance,
  calculateNetBalances,
  calculatePersonBalances,
} from "@/lib/money"
import { cn } from "@/lib/utils"

export default function SplitSummaryPage() {
  const router = useRouter()
  const { user } = useSession()
  const expensesQuery = useExpenses()
  const groupsQuery = useGroups()
  const friendsQuery = useFriends()

  const expenses = expensesQuery.data || []
  const groups = groupsQuery.data || []
  const friends = friendsQuery.data || []

  const [activeTab, setActiveTab] = React.useState<"groups" | "people">("groups")
  const [selectedPersonId, setSelectedPersonId] = React.useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [showHelpDialog, setShowHelpDialog] = React.useState(false)

  // Overall combined net balances across all groups and direct splits
  const netOverview = React.useMemo(() => {
    if (!user) return { totalYouOwePaise: 0, totalOwedToYouPaise: 0, netBalancePaise: 0 }
    return calculateNetBalances(user.uid, expenses)
  }, [user, expenses])

  const netBalancePaise = netOverview.netBalancePaise
  const isNetPayable = netBalancePaise < 0
  const isNetReceivable = netBalancePaise > 0
  const netDisplayAmountPaise = Math.abs(netBalancePaise)

  // Groups list with active non-zero balances
  const groupRows = React.useMemo(() => {
    if (!user) return []
    return groups
      .map((grp) => {
        const bal = calculateMemberGroupBalance(user.uid, grp.id, expenses)
        return {
          group: grp,
          balance: bal,
          netPaise: bal.netPaise,
          userOwesPaise: bal.userOwesPaise,
          owedToUserPaise: bal.owedToUserPaise,
          hasBalance: bal.userOwesPaise > 0 || bal.owedToUserPaise > 0,
        }
      })
      .filter((row) => row.hasBalance)
      .sort((a, b) => b.userOwesPaise - a.userOwesPaise)
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
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col bg-background text-foreground pb-24 md:pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
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
            <button
              type="button"
              onClick={() => setShowHelpDialog(true)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Help"
            >
              <HugeiconsIcon icon={HelpCircleIcon} className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <QueryError
            error={expensesQuery.error || groupsQuery.error}
            onRetry={() => {
              expensesQuery.refetch()
              groupsQuery.refetch()
            }}
          />
        ) : (
          <>
            {/* Total Split Balance Card with colored indicator on the left */}
            <Card
              className={cn(
                "relative overflow-hidden rounded-2xl border border-border bg-card p-4.5 text-card-foreground shadow-xs transition-all sm:p-5",
                isNetPayable
                  ? "border-l-4 border-l-destructive"
                  : isNetReceivable
                    ? "border-l-4 border-l-emerald-600 dark:border-l-emerald-500"
                    : "border-l-4 border-l-muted-foreground/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">Total Split Balance</div>
                  <div className="text-xs text-muted-foreground">
                    {isNetPayable
                      ? "Your net payable amount"
                      : isNetReceivable
                        ? "Your net receivable amount"
                        : "All balances are settled"}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-black tracking-tight text-foreground sm:text-3xl tabular-nums">
                    ₹{(netDisplayAmountPaise / 100).toFixed(0)}
                  </span>

                  {isNetPayable && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xs font-bold">
                      <span className="text-sm leading-none">↗</span>
                    </div>
                  )}

                  {isNetReceivable && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs font-bold">
                      <span className="text-sm leading-none">↙</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Navigation Tabs (Groups | People) */}
            <div className="mt-6 flex border-b border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("groups")}
                className={cn(
                  "flex-1 pb-3 text-center text-sm font-bold transition-all select-none",
                  activeTab === "groups"
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Groups
                {groupRows.length > 0 && (
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {groupRows.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("people")}
                className={cn(
                  "flex-1 pb-3 text-center text-sm font-bold transition-all select-none",
                  activeTab === "people"
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                People
                {peopleRows.length > 0 && (
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {peopleRows.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Groups Content (Screenshot 1) */}
            {activeTab === "groups" && (
              <div className="mt-4">
                {groupRows.length === 0 ? (
                  <EmptyState
                    icon={UserGroupIcon}
                    title="No group balances"
                    description="You are completely settled up in all your groups!"
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {groupRows.map((row) => {
                      const youOwe = row.userOwesPaise > row.owedToUserPaise
                      const amount = Math.abs(row.netPaise)

                      return (
                        <Card
                          key={row.group.id}
                          onClick={() => setSelectedGroupId(row.group.id)}
                          className="flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl border border-border bg-card p-3.5 text-card-foreground shadow-xs transition hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Group Avatar */}
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                              <HugeiconsIcon icon={UserGroupIcon} className="size-5.5 text-muted-foreground" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-foreground">
                                {row.group.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {row.group.members.length} members
                              </div>
                            </div>
                          </div>

                          {/* Right side: You need to pay / You will receive */}
                          <div className="flex items-center gap-2.5 text-right">
                            <div>
                              <div
                                className={cn(
                                  "text-xs font-semibold",
                                  youOwe
                                    ? "text-destructive"
                                    : "text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                {youOwe ? "You need to pay" : "You will receive"}
                              </div>
                              <div
                                className={cn(
                                  "text-base font-black tabular-nums",
                                  youOwe
                                    ? "text-destructive"
                                    : "text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                ₹{(amount / 100).toFixed(0)}
                              </div>
                            </div>

                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              className="size-4.5 text-muted-foreground"
                            />
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: People Content (Screenshot 2) */}
            {activeTab === "people" && (
              <div className="mt-4">
                {peopleRows.length === 0 ? (
                  <EmptyState
                    icon={Invoice01Icon}
                    title="No pending balances"
                    description="You are settled up with all your friends and group members!"
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {peopleRows.map((person) => {
                      return (
                        <Card
                          key={person.userId}
                          onClick={() => setSelectedPersonId(person.userId)}
                          className="flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl border border-border bg-card p-3.5 text-card-foreground shadow-xs transition hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Person Avatar with PhonePe Badge */}
                            <div className="relative">
                              <UserAvatar
                                src={person.photoURL}
                                name={person.name}
                                size="md"
                                className="size-11 ring-1 ring-border/50"
                              />
                              <div
                                className="absolute -bottom-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-[#5f259f] text-[8px] font-black text-white shadow-xs ring-2 ring-card"
                                title="PhonePe / UPI Verified"
                              >
                                Pe
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-foreground">
                                {person.name}
                              </div>
                              {person.upiId ? (
                                <div className="truncate font-mono text-[11px] text-muted-foreground">
                                  {person.upiId}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">Direct & Groups</div>
                              )}
                            </div>
                          </div>

                          {/* Right side: Pay Now / You get */}
                          <div className="flex items-center gap-2.5 text-right">
                            <div>
                              <div
                                className={cn(
                                  "text-xs font-semibold",
                                  person.youOwe
                                    ? "text-destructive"
                                    : "text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                {person.youOwe ? "Pay Now" : "You get"}
                              </div>
                              <div
                                className={cn(
                                  "text-base font-black tabular-nums",
                                  person.youOwe
                                    ? "text-destructive"
                                    : "text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                ₹{(person.amountPaise / 100).toFixed(0)}
                              </div>
                            </div>

                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              className="size-4.5 text-muted-foreground"
                            />
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Sticky Bottom Button for Mobile */}
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4 sm:hidden">
        <Button
          type="button"
          onClick={() => router.push("/expenses/new")}
          className="h-12 w-full rounded-2xl bg-primary text-sm font-extrabold tracking-wider text-primary-foreground shadow-xl transition hover:bg-primary/90 active:scale-[0.99]"
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

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Split Expense Summary</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              How person-to-person and group settlements work
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-xs text-foreground/90">
            <div>
              <span className="font-semibold text-foreground">1. Unified Net Balance: </span>
              All mutual splits between you and a person—whether from group expenses or direct
              splits—are combined. Reciprocal debts automatically cancel each other out.
            </div>
            <div>
              <span className="font-semibold text-foreground">2. Settle by Group or Person: </span>
              Under the <b>Groups</b> tab, you can view and settle specific group obligations. Under
              the <b>People</b> tab, you can view the final net person-to-person balance and select
              which groups/direct splits to settle together.
            </div>
            <div>
              <span className="font-semibold text-foreground">3. Real-Time Sync: </span>
              Paying from a group automatically reduces that person’s total balance under the People
              tab, keeping everything balanced and consistent.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
