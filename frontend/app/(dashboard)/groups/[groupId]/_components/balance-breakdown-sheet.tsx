"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { toast } from "sonner"

import { Amount } from "@/components/shared/amount"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useSendPaymentReminder } from "@/hooks/mutations"
import { getExpenseDebts } from "@/lib/money"
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
  totalPaise: number
  rawOwedToMePaise: number
  rawIOwePaise: number
  hasOffset: boolean
  lines: CounterpartyLine[]
}

/**
 * Groups this user's open debts in a group by the other person with PhonePe-style
 * split-to-split cancel netting so reciprocal mutual debts cancel out and totals
 * match "Your Balance".
 */
function buildBreakdown(userId: string, group: Group, expenses: Expense[]) {
  const people = {
    ...(group.formerMemberDetails || {}),
    ...group.memberDetails,
  }
  const nameFromExpense = (exp: Expense, uid: string) =>
    exp.shares?.find((s) => s.userId === uid)?.userName ||
    (exp.payerId === uid
      ? exp.payerName
      : exp.recipientId === uid
        ? exp.recipientName
        : "Member")

  const counterparties = new Map<
    string,
    {
      uid: string
      name: string
      photoURL?: string
      debtsToMe: { expense: Expense; amountPaise: number }[]
      debtsFromMe: { expense: Expense; amountPaise: number }[]
    }
  >()

  for (const exp of expenses) {
    if (exp.groupId && exp.groupId !== group.id) continue
    for (const debt of getExpenseDebts(exp)) {
      if (debt.toUserId !== userId && debt.fromUserId !== userId) continue
      const other = debt.fromUserId === userId ? debt.toUserId : debt.fromUserId
      if (!other || other === userId) continue

      const entry = counterparties.get(other) ?? {
        uid: other,
        name: people[other]?.name || nameFromExpense(exp, other),
        photoURL: people[other]?.photoURL,
        debtsToMe: [],
        debtsFromMe: [],
      }

      if (debt.toUserId === userId) {
        entry.debtsToMe.push({ expense: exp, amountPaise: debt.amountPaise })
      } else {
        entry.debtsFromMe.push({ expense: exp, amountPaise: debt.amountPaise })
      }
      counterparties.set(other, entry)
    }
  }

  const iOwe: Counterparty[] = []
  const owedToMe: Counterparty[] = []

  counterparties.forEach((entry) => {
    const totalToMe = entry.debtsToMe.reduce((s, d) => s + d.amountPaise, 0)
    const totalFromMe = entry.debtsFromMe.reduce((s, d) => s + d.amountPaise, 0)
    const net = totalToMe - totalFromMe
    const hasOffset = totalToMe > 0 && totalFromMe > 0

    if (net > 0) {
      // Net: other owes me
      const lines: CounterpartyLine[] = [
        ...entry.debtsToMe.map((d) => ({ expense: d.expense, amountPaise: d.amountPaise })),
        ...entry.debtsFromMe.map((d) => ({
          expense: d.expense,
          amountPaise: d.amountPaise,
          isOffset: true,
          label: `Split offset (${d.expense.title})`,
        })),
      ]
      owedToMe.push({
        uid: entry.uid,
        name: entry.name,
        photoURL: entry.photoURL,
        totalPaise: net,
        rawOwedToMePaise: totalToMe,
        rawIOwePaise: totalFromMe,
        hasOffset,
        lines,
      })
    } else if (net < 0) {
      // Net: I owe other
      const lines: CounterpartyLine[] = [
        ...entry.debtsFromMe.map((d) => ({ expense: d.expense, amountPaise: d.amountPaise })),
        ...entry.debtsToMe.map((d) => ({
          expense: d.expense,
          amountPaise: d.amountPaise,
          isOffset: true,
          label: `Split offset (${d.expense.title})`,
        })),
      ]
      iOwe.push({
        uid: entry.uid,
        name: entry.name,
        photoURL: entry.photoURL,
        totalPaise: Math.abs(net),
        rawOwedToMePaise: totalToMe,
        rawIOwePaise: totalFromMe,
        hasOffset,
        lines,
      })
    }
    // If net === 0, mutual splits have completely cancelled each other out
  })

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
  const router = useRouter()
  const { iOwe, owedToMe } = React.useMemo(
    () => buildBreakdown(userId, group, expenses),
    [userId, group, expenses]
  )

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
            <PersonBlock key={p.uid} person={p} tone="owe">
              {p.lines.map(({ expense, amountPaise, isOffset, label }) => (
                <LineRow
                  key={`${expense.id}_${isOffset ? "offset" : "direct"}`}
                  title={label || expense.title}
                  amountPaise={amountPaise}
                  isOffset={isOffset}
                >
                  {!isOffset ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        onOpenChange(false)
                        router.push(`/expenses/${expense.id}/pay`)
                      }}
                    >
                      Pay
                    </Button>
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground">Adjusted</span>
                  )}
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
            <PersonBlock key={p.uid} person={p} tone="owed">
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
  children,
}: {
  person: Counterparty
  tone: "owe" | "owed"
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
        <Amount
          paise={tone === "owe" ? -person.totalPaise : person.totalPaise}
          signed
          className="shrink-0 text-base font-extrabold"
        />
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
