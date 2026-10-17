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
}

interface Counterparty {
  uid: string
  name: string
  photoURL?: string
  totalPaise: number
  lines: CounterpartyLine[]
}

/**
 * Groups this user's open debts in a group by the other person, using the same
 * debt model as every balance — so the totals here add up to "Your Balance".
 */
function buildBreakdown(userId: string, group: Group, expenses: Expense[]) {
  const people = {
    ...(group.formerMemberDetails || {}),
    ...group.memberDetails,
  }
  const nameFromExpense = (exp: Expense, uid: string) =>
    exp.shares.find((s) => s.userId === uid)?.userName ||
    (exp.payerId === uid
      ? exp.payerName
      : exp.recipientId === uid
        ? exp.recipientName
        : "Member")

  const iOwe = new Map<string, Counterparty>()
  const owedToMe = new Map<string, Counterparty>()

  for (const exp of expenses) {
    for (const debt of getExpenseDebts(exp)) {
      const mine =
        debt.fromUserId === userId
          ? iOwe
          : debt.toUserId === userId
            ? owedToMe
            : null
      if (!mine) continue
      const other = debt.fromUserId === userId ? debt.toUserId : debt.fromUserId
      const entry = mine.get(other) ?? {
        uid: other,
        name: people[other]?.name || nameFromExpense(exp, other),
        photoURL: people[other]?.photoURL,
        totalPaise: 0,
        lines: [],
      }
      entry.totalPaise += debt.amountPaise
      entry.lines.push({ expense: exp, amountPaise: debt.amountPaise })
      mine.set(other, entry)
    }
  }

  const sorted = (m: Map<string, Counterparty>) =>
    [...m.values()].sort((a, b) => b.totalPaise - a.totalPaise)
  return { iOwe: sorted(iOwe), owedToMe: sorted(owedToMe) }
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
          Nothing pending in this group. 🎉
        </p>
      )}

      {iOwe.length > 0 && (
        <Section title="You need to pay">
          {iOwe.map((p) => (
            <PersonBlock key={p.uid} person={p} tone="owe">
              {p.lines.map(({ expense, amountPaise }) => (
                <LineRow
                  key={expense.id}
                  title={expense.title}
                  amountPaise={amountPaise}
                >
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      router.push(`/expenses/${expense.id}/pay`)
                    }}
                  >
                    Pay
                  </Button>
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
              {p.lines.map(({ expense, amountPaise }) => (
                <LineRow
                  key={expense.id}
                  title={expense.title}
                  amountPaise={amountPaise}
                >
                  <RemindButton
                    expenseId={expense.id}
                    targetUserId={p.uid}
                    name={p.name}
                  />
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
            {person.lines.length} expense{person.lines.length === 1 ? "" : "s"}
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
  children,
}: {
  title: string
  amountPaise: number
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-t py-2 first:border-t-0">
      <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
      <Amount paise={amountPaise} className="shrink-0 text-sm font-semibold" />
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
      disabled={reminder.isPending || reminder.isSuccess}
      onClick={() =>
        reminder.mutate(
          { expenseId, targetUserId },
          { onSuccess: () => toast.success(`Reminder sent to ${name}`) }
        )
      }
    >
      {reminder.isPending && <Spinner />}
      {reminder.isSuccess ? "Sent" : "Remind"}
    </Button>
  )
}
