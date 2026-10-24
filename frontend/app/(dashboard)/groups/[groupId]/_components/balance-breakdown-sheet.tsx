"use client"

import * as React from "react"
import { toast } from "sonner"

import { Amount } from "@/components/shared/amount"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { PayPersonButton } from "@/components/shared/pay-person-button"
import { GameDiscountAmount } from "@/components/games/game-discount-amount"
import { useSendPaymentReminder } from "@/hooks/mutations"
import { useScopedGameDiscount, type LiveGameDiscount } from "@/hooks/use-game-discounts"
import { allocatePersonNetAcrossContexts, calculatePersonNetBreakdown, getExpenseDebts } from "@/lib/money"
import type { Expense, Group } from "@/lib/types"

interface CounterpartyLine {
  expense: Expense
  amountPaise: number
  isOffset?: boolean
  label?: string
}

interface Counterparty {
  uid: string
  name: string
  photoURL?: string
  upiId?: string
  totalPaise: number
  rawOwedToMePaise: number
  rawIOwePaise: number
  hasOffset: boolean
  lines: CounterpartyLine[]
}

/**
 * Groups this user's open debts with members in a group. Lines are this
 * group's expenses; totals are what really has to be paid after netting with
 * the same person's other splits (pass all of the user's expenses). People
 * whose group balance is fully cancelled out elsewhere are left out.
 */
function buildBreakdown(userId: string, group: Group, expenses: Expense[]) {
  const people = {
    ...(group.formerMemberDetails || {}),
    ...group.memberDetails,
  }

  // Only use expenses belonging to this group
  const groupExpenses = expenses.filter((e) => !e.deletedAt && e.groupId === group.id)

  // Find all counterparties who have open debts with userId in this group
  const counterparties = new Set<string>()
  for (const exp of groupExpenses) {
    for (const debt of getExpenseDebts(exp)) {
      if (debt.toUserId === userId && debt.fromUserId !== userId) counterparties.add(debt.fromUserId)
      if (debt.fromUserId === userId && debt.toUserId !== userId) counterparties.add(debt.toUserId)
    }
  }

  const iOwe: Counterparty[] = []
  const owedToMe: Counterparty[] = []

  for (const other of counterparties) {
    // calculatePersonNetBreakdown scoped to this group only
    const breakdown = calculatePersonNetBreakdown(userId, other, groupExpenses)
    const personInfo = people[other]
    const name = personInfo?.name || breakdown.userBName || "Member"
    const photoURL = personInfo?.photoURL || breakdown.userBPhoto
    const upiId = breakdown.userBUpiId
    const alloc = allocatePersonNetAcrossContexts(userId, other, expenses).find((c) => c.contextKey === group.id)
    const effectivePaise = Math.abs(alloc?.effectivePaise ?? breakdown.netBalancePaise)
    const crossOffset = (alloc?.offsetPaise ?? 0) > 0
    // Fully cancelled out by the same person's other splits: nothing to pay here
    if (effectivePaise === 0) continue

    if (breakdown.netBalancePaise < 0) {
      // Current user owes this person
      const lines: CounterpartyLine[] = [
        ...breakdown.aOwesBLines.map((d) => ({
          expense: d.expense,
          amountPaise: d.amountPaise,
          label: d.expense.title,
        })),
        ...breakdown.bOwesALines.map((d) => ({
          expense: d.expense,
          amountPaise: d.amountPaise,
          isOffset: true,
          label: `Offset (${d.expense.title})`,
        })),
      ]

      iOwe.push({
        uid: other,
        name,
        photoURL,
        upiId,
        totalPaise: effectivePaise,
        rawOwedToMePaise: breakdown.bOwesATotalPaise,
        rawIOwePaise: breakdown.aOwesBTotalPaise,
        hasOffset: breakdown.offsetPaise > 0 || crossOffset,
        lines,
      })
    } else if (breakdown.netBalancePaise > 0) {
      // Other owes current user
      const lines: CounterpartyLine[] = [
        ...breakdown.bOwesALines.map((d) => ({
          expense: d.expense,
          amountPaise: d.amountPaise,
          label: d.expense.title,
        })),
        ...breakdown.aOwesBLines.map((d) => ({
          expense: d.expense,
          amountPaise: d.amountPaise,
          isOffset: true,
          label: `Offset (${d.expense.title})`,
        })),
      ]

      owedToMe.push({
        uid: other,
        name,
        photoURL,
        upiId,
        totalPaise: effectivePaise,
        rawOwedToMePaise: breakdown.bOwesATotalPaise,
        rawIOwePaise: breakdown.aOwesBTotalPaise,
        hasOffset: breakdown.offsetPaise > 0 || crossOffset,
        lines,
      })
    }
    // If net === 0, reciprocal splits have completely cancelled each other out
  }

  return {
    iOwe: iOwe.sort((a, b) => b.totalPaise - a.totalPaise),
    owedToMe: owedToMe.sort((a, b) => b.totalPaise - a.totalPaise),
  }
}

export function BalanceBreakdownSheet({
  open,
  onOpenChange,
  userId,
  group,
  expenses,
  netPaise,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  group: Group
  expenses: Expense[]
  netPaise: number
}) {
  const { iOwe, owedToMe } = React.useMemo(
    () => buildBreakdown(userId, group, expenses),
    [userId, group, expenses]
  )
  const game = useScopedGameDiscount({ groupId: group.id })

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Your balance in ${group.name}`}
      description={
        <>
          Overall <Amount paise={netPaise} signed className="font-bold" />
          {netPaise < 0
            ? " — you need to pay"
            : netPaise > 0
              ? " — you get back"
              : " — all settled"}
        </>
      }
      bodyClassName="flex flex-col gap-4 pb-6"
    >
      {iOwe.length === 0 && owedToMe.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing pending in this group. All splits settled or mutually balanced! 🎉
        </p>
      )}

      {iOwe.length > 0 && (
        <Section title="You need to pay">
          {iOwe.map((p) => (
            <PersonBlock
              key={p.uid}
              person={p}
              tone="owe"
              discount={game.perPerson.get(p.uid)}
              now={game.now}
              action={
                <PayPersonButton
                  personId={p.uid}
                  personName={p.name}
                  personPhoto={p.photoURL}
                  personUpiId={p.upiId}
                />
              }
            >
              {p.lines.map(({ expense, amountPaise, isOffset, label }) => (
                <LineRow
                  key={`${expense.id}_${isOffset ? "offset" : "direct"}`}
                  title={label || expense.title}
                  amountPaise={amountPaise}
                  isOffset={isOffset}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isOffset ? "Mutual offset" : "Share"}
                  </span>
                </LineRow>
              ))}
            </PersonBlock>
          ))}
        </Section>
      )}

      {iOwe.length > 0 && owedToMe.length > 0 && <Separator />}

      {owedToMe.length > 0 && (
        <Section title="You get back">
          {owedToMe.map((p) => (
            <PersonBlock key={p.uid} person={p} tone="owed" discount={game.perPerson.get(p.uid)} now={game.now}>
              {p.lines.map(({ expense, amountPaise, isOffset, label }) => (
                <LineRow
                  key={`${expense.id}_${isOffset ? "offset" : "direct"}`}
                  title={label || expense.title}
                  amountPaise={amountPaise}
                  isOffset={isOffset}
                >
                  {!isOffset ? (
                    <RemindButton
                      expenseId={expense.id}
                      targetUserId={p.uid}
                      name={p.name}
                    />
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground">Adjusted</span>
                  )}
                </LineRow>
              ))}
            </PersonBlock>
          ))}
        </Section>
      )}
    </BottomSheet>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function PersonBlock({
  person,
  tone,
  action,
  discount,
  now,
  children,
}: {
  person: Counterparty
  tone: "owe" | "owed"
  action?: React.ReactNode
  /** Live game discount with this person: shown struck through with its timer. */
  discount?: LiveGameDiscount
  now: number
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar src={person.photoURL} name={person.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{person.name}</div>
          <div className="text-xs text-muted-foreground">
            {person.hasOffset ? "Split-to-split net balance" : `${person.lines.length} expense${person.lines.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {discount ? (
            <GameDiscountAmount
              amountPaise={person.totalPaise}
              discount={discount}
              now={now}
              prefix={tone === "owe" ? "-" : "+"}
              className={tone === "owe" ? "text-base font-extrabold text-destructive" : "text-base font-extrabold text-success"}
            />
          ) : (
            <Amount
              paise={tone === "owe" ? -person.totalPaise : person.totalPaise}
              signed
              className="text-base font-extrabold"
            />
          )}
          {action}
        </div>
      </div>
      <div className="mt-1 flex flex-col">{children}</div>
    </div>
  )
}

function LineRow({
  title,
  amountPaise,
  isOffset,
  children,
}: {
  title: string
  amountPaise: number
  isOffset?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-t py-2 first:border-t-0">
      <span className="min-w-0 flex-1 truncate text-sm">
        {title}
      </span>
      <span className={isOffset ? "text-xs font-semibold text-muted-foreground" : ""}>
        {isOffset ? "- " : ""}
        <Amount paise={amountPaise} className="shrink-0 text-sm font-semibold" />
      </span>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function RemindButton({
  expenseId,
  targetUserId,
  name,
}: {
  expenseId: string
  targetUserId: string
  name: string
}) {
  const reminder = useSendPaymentReminder()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={reminder.isPending}
      onClick={() =>
        reminder.mutate(
          { expenseId, targetUserId },
          { onSuccess: () => toast.success(`Payment reminder sent to ${name}`) }
        )
      }
    >
      {reminder.isPending && <Spinner />}
      Remind
    </Button>
  )
}
