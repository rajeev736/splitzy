"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { GroupIcon } from "@/components/shared/group-icon"
import { AwaitingConfirmationBadge } from "@/components/shared/awaiting-confirmation-badge"
import { appliedDiscount, GameDiscountAmount, GameDiscountChip } from "@/components/games/game-discount-amount"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { PersonSettlementDialog } from "@/components/shared/person-settlement-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import {
  calculateGroupCounterpartyBalances,
  calculateMemberGroupBalance,
  calculatePersonNetBreakdown,
  formatPaise,
  isAwaitingConfirmation,
  isCancelOutPending,
} from "@/lib/money"
import { cn } from "@/lib/utils"

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
  const router = useRouter()
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

  // Overall group balance for user (netted across all splits with each person)
  const groupBalance = React.useMemo(() => {
    if (!user) return { userOwesPaise: 0, owedToUserPaise: 0, netPaise: 0, offsetPaise: 0 }
    return calculateMemberGroupBalance(user.uid, groupId, expenses)
  }, [user, groupId, expenses])

  // Everyone with an open balance in this group. Amounts are what really has to
  // be paid after netting with your other splits with them; the rest is
  // "cancelled out" and can be closed with one tap.
  const membersWithBalances = React.useMemo(() => {
    if (!user) return []
    return calculateGroupCounterpartyBalances(user.uid, groupId, expenses)
      .map((row) => {
        const friend = friends.find((f) => f.uid === row.userId)
        const breakdown = calculatePersonNetBreakdown(user.uid, row.userId, expenses)
        const pendingCancel = isCancelOutPending(user.uid, row.userId, expenses)
        return {
          ...row,
          name: friend?.displayName || breakdown.userBName || "Member",
          photoURL: friend?.photoURL || breakdown.userBPhoto,
          upiId: friend?.upiId || breakdown.userBUpiId,
          netPayablePaise: Math.max(0, -row.effectivePaise),
          netReceivablePaise: Math.max(0, row.effectivePaise),
          pendingCancel,
          awaitingConfirmation: isAwaitingConfirmation(user.uid, row.userId, expenses),
        }
      })
      .sort((a, b) => b.netPayablePaise - a.netPayablePaise || b.offsetPaise - a.offsetPaise)
  }, [user, groupId, expenses, friends])

  const settleTarget = membersWithBalances.find((m) => m.userId === settlePersonId)

  // Live game discounts with each member (you pay less / they pay you less)
  const liveDiscounts = useLiveGameDiscounts()
  const winnerDiscount = (id: string) => {
    const d = liveDiscounts.byPerson.get(id)
    return d?.role === "winner" ? d : undefined
  }
  const hostDiscount = (id: string) => {
    const d = liveDiscounts.byPerson.get(id)
    return d?.role === "host" ? d : undefined
  }

  const userOwesNet = groupBalance.userOwesPaise > groupBalance.owedToUserPaise

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto flex h-[85vh] max-h-[85vh] w-full max-w-xl flex-col gap-0 rounded-t-lg border-border bg-background p-0 text-foreground sm:rounded-lg sm:border"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b bg-background px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </button>
            <SheetTitle className="text-base font-semibold text-foreground">
              Group Settlement
            </SheetTitle>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  router.push(`/groups/${groupId}`)
                }}
                className="h-8 gap-1 rounded-md px-2.5 text-xs font-medium"
              >
                View Group
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </Button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Group Banner */}
            <div className="flex flex-row items-center justify-between gap-4 rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    router.push(`/groups/${groupId}`)
                  }}
                  className="shrink-0 transition-opacity hover:opacity-80"
                  title="Go to group dashboard"
                >
                  <GroupIcon src={group?.icon} alt={groupName} size="md" className="size-11 rounded-full border" />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      router.push(`/groups/${groupId}`)
                    }}
                    className="block truncate text-left text-sm font-semibold text-foreground transition-colors hover:underline"
                  >
                    {groupName}
                  </button>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {groupBalance.netPaise === 0
                      ? "Nothing to pay here"
                      : userOwesNet
                        ? "Group Net Payable"
                        : "Group Net Receivable"}
                  </div>
                  {groupBalance.offsetPaise > 0 && (
                    <div className="mt-0.5 text-[11px] font-medium text-info">
                      {formatPaise(groupBalance.offsetPaise)} cancelled out with other splits
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end text-right">
                <span className="text-xs text-muted-foreground">
                  {groupBalance.netPaise === 0 ? "Settled" : userOwesNet ? "You owe" : "You get"}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-xl leading-tight font-semibold tabular-nums",
                    userOwesNet ? "text-destructive" : "text-success"
                  )}
                >
                  ₹{(Math.abs(groupBalance.netPaise) / 100).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Members Section */}
            <div className="mt-5 mb-2.5 px-0.5">
              <h2 className="text-sm font-semibold text-foreground">
                Members with open balance in this group
              </h2>
            </div>

            <div className="flex flex-col divide-y rounded-lg border bg-card">
              {membersWithBalances.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  All debts in this group are settled up!
                </div>
              ) : (
                membersWithBalances.map((m) => {
                  const youOwe = m.netPayablePaise > 0
                  const cancelledOnly = m.effectivePaise === 0
                  return (
                    <div
                      key={m.userId}
                      className="flex flex-row items-center justify-between gap-3 p-3.5 text-card-foreground"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserAvatar
                          src={m.photoURL}
                          name={m.name}
                          size="md"
                          className="size-9 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{m.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {cancelledOnly ? "No money to move" : youOwe ? "Pending payment" : "Pending collection"}
                          </div>
                          {m.offsetPaise > 0 && (
                            <div className="mt-0.5 text-[11px] font-medium text-info">
                              {formatPaise(m.offsetPaise)} cancelled out with your other splits
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5 text-right">
                        {cancelledOnly ? (
                          m.pendingCancel ? (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Awaiting confirmation
                            </span>
                          ) : m.grossPaise < 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setSettlePersonId(m.userId)}
                              className="h-8 rounded-md px-3 text-xs font-medium"
                            >
                              Cancel out
                            </Button>
                          ) : (
                            <span className="max-w-28 text-[11px] font-medium text-muted-foreground">
                              {m.name} can cancel it out
                            </span>
                          )
                        ) : youOwe && m.awaitingConfirmation ? (
                          <AwaitingConfirmationBadge />
                        ) : youOwe ? (
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setSettlePersonId(m.userId)}
                              className="h-8 rounded-md px-3 text-xs font-medium tabular-nums"
                            >
                              Pay {formatPaise(m.netPayablePaise - appliedDiscount(winnerDiscount(m.userId), m.netPayablePaise))}
                            </Button>
                            {winnerDiscount(m.userId) && (
                              <GameDiscountChip
                                discount={winnerDiscount(m.userId)!}
                                amountPaise={m.netPayablePaise}
                                now={liveDiscounts.now}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] text-muted-foreground">
                              Owes you
                            </span>
                            <GameDiscountAmount
                              prefix="+"
                              amountPaise={m.netReceivablePaise}
                              discount={hostDiscount(m.userId)}
                              now={liveDiscounts.now}
                              className="text-sm leading-tight font-semibold text-success"
                            />
                          </div>
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

      {/* Pay / Cancel out settle the person's overall net (all splits), the
          only amount that is ever real money — same figure shown above */}
      {settlePersonId && (
        <PersonSettlementDialog
          open={Boolean(settlePersonId)}
          onOpenChange={(isOpen) => !isOpen && setSettlePersonId(null)}
          personId={settlePersonId}
          personName={settleTarget?.name}
          personPhoto={settleTarget?.photoURL}
          personUpiId={settleTarget?.upiId}
          onSettled={() => {
            setSettlePersonId(null)
            onSettled?.()
          }}
        />
      )}
    </>
  )
}
