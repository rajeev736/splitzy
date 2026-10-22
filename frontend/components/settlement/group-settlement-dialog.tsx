"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import {
  calculateMemberGroupBalance,
  calculatePersonNetBreakdown,
} from "@/lib/money"
import { cn } from "@/lib/utils"
import { SettleExpensesDialog } from "./settle-expenses-dialog"

export interface GroupSettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupName?: string
  onSettled?: () => void
}

/**
 * Group Settlement Sheet:
 * Fully theme-adaptive (Light and Dark mode) and responsive across all screen sizes.
 */
export function GroupSettlementDialog({
  open,
  onOpenChange,
  groupId,
  groupName: propGroupName,
  onSettled,
}: GroupSettlementDialogProps) {
  const { user } = useSession()
  const { data: expenses = [] } = useExpenses()
  const { data: groups = [] } = useGroups()
  const { data: friends = [] } = useFriends()

  const [settlePersonId, setSettlePersonId] = React.useState<string | null>(null)

  const group = React.useMemo(
    () => groups.find((g) => g.id === groupId),
    [groups, groupId]
  )

  const groupName = propGroupName || group?.name || "Group"

  // Only expenses belonging to this group
  const groupExpenses = React.useMemo(
    () => expenses.filter((e) => !e.deletedAt && e.groupId === groupId),
    [expenses, groupId]
  )

  // Overall group balance for user
  const groupBalance = React.useMemo(() => {
    if (!user) return { userOwesPaise: 0, owedToUserPaise: 0, netPaise: 0 }
    return calculateMemberGroupBalance(user.uid, groupId, expenses)
  }, [user, groupId, expenses])

  // Find all counterparties who have open debts with user in this group
  const membersWithBalances = React.useMemo(() => {
    if (!user) return []

    const counterparties = new Set<string>()
    for (const exp of groupExpenses) {
      const creditor = exp.recipientId || exp.payerId
      for (const share of exp.shares || []) {
        if (share.status === "PAID" || share.amountPaise <= 0) continue
        const toUserId = share.userId === creditor ? exp.payerId : creditor
        if (toUserId === user.uid && share.userId !== user.uid) counterparties.add(share.userId)
        if (share.userId === user.uid && toUserId !== user.uid) counterparties.add(toUserId)
      }
    }

    const rows: {
      userId: string
      name: string
      photoURL?: string
      upiId?: string
      netPayablePaise: number
      netReceivablePaise: number
      netPaise: number
    }[] = []

    for (const otherId of counterparties) {
      const breakdown = calculatePersonNetBreakdown(user.uid, otherId, groupExpenses)
      if (breakdown.netPayablePaise > 0 || breakdown.netReceivablePaise > 0) {
        const friend = friends.find((f) => f.uid === otherId)
        rows.push({
          userId: otherId,
          name: friend?.displayName || breakdown.userBName || "Member",
          photoURL: friend?.photoURL || breakdown.userBPhoto,
          upiId: friend?.upiId || breakdown.userBUpiId,
          netPayablePaise: breakdown.netPayablePaise,
          netReceivablePaise: breakdown.netReceivablePaise,
          netPaise: breakdown.netBalancePaise,
        })
      }
    }

    return rows.sort((a, b) => b.netPayablePaise - a.netPayablePaise)
  }, [user, groupExpenses, friends])

  const userOwesNet = groupBalance.userOwesPaise > groupBalance.owedToUserPaise

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[85vh] max-h-[85vh] w-full max-w-xl flex-col gap-0 rounded-t-[28px] border-border bg-background p-0 text-foreground shadow-2xl sm:rounded-3xl sm:border"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3.5 backdrop-blur-md sm:px-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Back"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </button>
            <SheetTitle className="text-base font-bold tracking-tight text-foreground">
              Group Settlement
            </SheetTitle>
            <div className="size-9" />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Group Banner */}
            <Card className="flex items-center gap-3.5 rounded-2xl border-border bg-card p-4 text-card-foreground shadow-xs">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon icon={UserGroupIcon} className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold text-foreground">{groupName}</div>
                <div className="text-xs text-muted-foreground">
                  {userOwesNet ? "Group Net Payable" : "Group Net Receivable"}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    "text-lg font-black tabular-nums",
                    userOwesNet ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  ₹{(Math.abs(groupBalance.netPaise) / 100).toFixed(0)}
                </div>
                <div
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    userOwesNet ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {userOwesNet ? "You need to pay" : "You will receive"}
                </div>
              </div>
            </Card>

            {/* Members Section */}
            <div className="mt-5 mb-2.5 px-0.5">
              <h2 className="text-sm font-semibold text-foreground">
                Members with open balance in this group
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {membersWithBalances.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  All debts in this group are settled up!
                </div>
              ) : (
                membersWithBalances.map((m) => {
                  const youOwe = m.netPayablePaise > 0
                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3.5 text-card-foreground shadow-xs transition hover:border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <UserAvatar
                            src={m.photoURL}
                            name={m.name}
                            size="md"
                            className="size-10 ring-1 ring-border/50"
                          />
                          <div
                            className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#5f259f] text-[7px] font-black text-white ring-1 ring-card"
                            title="UPI"
                          >
                            Pe
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-foreground">{m.name}</div>
                          <div
                            className={cn(
                              "text-[11px] font-semibold",
                              youOwe ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {youOwe ? "You owe" : "Owes you"}: ₹
                            {((youOwe ? m.netPayablePaise : m.netReceivablePaise) / 100).toFixed(0)}
                          </div>
                        </div>
                      </div>

                      <div>
                        {youOwe ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setSettlePersonId(m.userId)}
                            className="h-8 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                          >
                            Pay ₹{(m.netPayablePaise / 100).toFixed(0)}
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-600/30 bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400"
                          >
                            +₹{(m.netReceivablePaise / 100).toFixed(0)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* When tapping Pay, open SettleExpensesDialog scoped to this group */}
      {settlePersonId && (
        <SettleExpensesDialog
          open={Boolean(settlePersonId)}
          onOpenChange={(isOpen) => !isOpen && setSettlePersonId(null)}
          personId={settlePersonId}
          initialScope={{ type: "group", groupId, groupName }}
          onSettled={() => {
            setSettlePersonId(null)
            onSettled?.()
          }}
        />
      )}
    </>
  )
}
