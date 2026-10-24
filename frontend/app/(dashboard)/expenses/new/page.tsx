"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import type { Options as ConfettiOptions } from "canvas-confetti"
import { ReceiptIndianRupeeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { ExpenseGameOption } from "@/components/games/expense-game-option"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useCreateChallenge, useCreateExpense } from "@/hooks/mutations"
import { useFriends, useGroups } from "@/hooks/queries"
import { getErrorMessage } from "@/lib/errors"
import type { Expense, Group, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SplitSection } from "./_components/split-section"
import { SplitWithPicker } from "./_components/split-with-picker"
import { useExpenseDraft } from "./_components/use-expense-draft"

const CONTAINER = "max-w-xl gap-4"

/** Confetti is only needed after a save — load it on demand, off the critical bundle. */
const celebrate = (options: ConfettiOptions) =>
  import("canvas-confetti").then(({ default: confetti }) => confetti(options)).catch(() => undefined)

function LoadingBody() {
  return (
    <PageContainer className={CONTAINER}>
      <ListSkeleton rows={4} />
    </PageContainer>
  )
}

/**
 * The big amount: ₹ sits right before the number as one centred unit, and the
 * text shrinks smoothly as digits are added so it never gets cut off.
 */
function AmountInput({ value, onChange }: { value: string; onChange: (value: string) => boolean }) {
  const length = Math.max(1, value.length)
  const size = length <= 5 ? "text-6xl" : length <= 7 ? "text-5xl" : length <= 9 ? "text-4xl" : "text-3xl"
  return (
    <div className="flex w-full max-w-full items-baseline justify-center overflow-hidden">
      <span className={cn("mr-1 font-bold text-muted-foreground transition-all duration-200", size)}>₹</span>
      <input
        id="expense-amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        // Width follows the digits so ₹ stays snug against the number
        style={{ width: `${length + 0.3}ch` }}
        className={cn(
          "min-w-0 bg-transparent font-black tracking-tight tabular-nums outline-none transition-all duration-200 placeholder:text-muted-foreground/40",
          size
        )}
      />
    </div>
  )
}

function NewExpenseFlow({
  user,
  groups,
  friends,
  preselectedGroupId,
  preselectedFriendId,
}: {
  user: UserProfile | null
  groups: Group[]
  friends: UserProfile[]
  preselectedGroupId: string | null
  preselectedFriendId: string | null
}) {
  const router = useRouter()
  const draft = useExpenseDraft({ user, groups, friends, preselectedGroupId, preselectedFriendId })
  const createExpense = useCreateExpense({ errorMessage: false })
  const createChallenge = useCreateChallenge({ errorMessage: "Expense saved, but the game couldn't be started" })
  const isShared = draft.expenseMode !== "personal"

  // Optional game: only on group expenses you paid, so you're the one owed
  const [gameEnabled, setGameEnabled] = React.useState(false)
  const [gameDiscount, setGameDiscount] = React.useState(20)
  const canAddGame = draft.expenseMode === "group" && !!user && draft.payerId === user.uid
  const gamePlayers = draft.splitShares.filter((s) => s.amountPaise > 0 && s.userId !== user?.uid)

  // `isPending` only flips after a re-render, so a fast double tap (or header +
  // bottom Save) could submit twice. A ref blocks the second tap synchronously.
  const savingRef = React.useRef(false)
  const release = () => {
    savingRef.current = false
  }

  const save = () => {
    if (savingRef.current) return

    const input = isShared
      ? (() => {
          const shares = draft.validateShared()
          return shares ? draft.buildSharedInput(shares) : null
        })()
      : draft.validateBasics()
        ? draft.buildPersonalInput()
        : null
    if (!input) return

    savingRef.current = true
    createExpense.mutate(input, {
      onSuccess: (expense) => {
        if (canAddGame && gameEnabled) {
          createChallenge.mutate({
            kind: "group",
            game: "lucky_number",
            discountPercent: gameDiscount,
            players: expense.shares
              .filter((s) => s.userId !== user?.uid && s.amountPaise > 0)
              .map((s) => ({ uid: s.userId, name: s.userName, basePaise: s.amountPaise })),
            expense: { id: expense.id, title: expense.title, groupId: expense.groupId, groupName: expense.groupName },
          })
        }
        if (isShared) {
          void celebrate({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: ["#2563EB", "#FBBF24", "#10B981"] })
        } else {
          void celebrate({ particleCount: 70, spread: 60, origin: { y: 0.6 }, colors: ["#2563EB", "#10B981"] })
        }
        // Land where the expense lives, with a one-tap way to add the next one
        const { href, addAnotherHref } = destinationFor(expense, draft.selectedFriendIds)
        draft.reset()
        toast.success(isShared ? "Expense added!" : "Personal expense saved!", {
          action: { label: "Add another", onClick: () => router.push(addAnotherHref) },
        })
        router.replace(href)
      },
      onError: (err) =>
        toast.error(
          isShared
            ? "Failed to create expense: " + getErrorMessage(err, "Please check inputs")
            : getErrorMessage(err, "Failed to save personal expense")
        ),
      onSettled: release,
    })
  }

  return (
    <>
      <AppHeader
        title="Add expense"
        showBack
        rightAction={
          <Button size="sm" disabled={createExpense.isPending} onClick={save}>
            {createExpense.isPending && <Spinner />}
            Save
          </Button>
        }
      />

      <PageContainer className={CONTAINER}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          {/* 1 — the amount is the star: big, centred, focused on open */}
          <Card className="rounded-3xl">
            <CardContent className="flex flex-col items-center gap-4 py-4">
              <label htmlFor="expense-amount" className="text-xs font-semibold text-muted-foreground">
                Amount
              </label>
              <AmountInput value={draft.amountRupees} onChange={draft.changeAmount} />

              {/* Description: optional, under the amount */}
              <InputGroup className="h-11 w-full rounded-full bg-muted/40">
                <InputGroupAddon>
                  <HugeiconsIcon icon={ReceiptIndianRupeeIcon} className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Description (optional)"
                  value={draft.title}
                  onChange={(e) => draft.setTitle(e.target.value)}
                  placeholder="What was it for? (optional)"
                  className="text-sm"
                />
              </InputGroup>
            </CardContent>
          </Card>

          {/* 2 — who it's split with: Group / Friends / Just me, choices right below */}
          <SplitWithPicker draft={draft} groups={groups} friends={friends} />

          {/* 3 — who owes what (you paid) */}
          {isShared && (
            <>
              <SplitSection draft={draft} />
              {canAddGame && (
                <ExpenseGameOption
                  enabled={gameEnabled}
                  onEnabledChange={setGameEnabled}
                  discount={gameDiscount}
                  onDiscountChange={setGameDiscount}
                  playerCount={gamePlayers.length}
                />
              )}
            </>
          )}

          <Button type="submit" size="lg" className="mt-2 h-12 w-full text-base" disabled={createExpense.isPending}>
            {createExpense.isPending && <Spinner />}
            {isShared ? "Save expense" : "Save personal expense"}
          </Button>
        </form>
      </PageContainer>

    </>
  )
}

/** Where a new expense shows up: its group, the friend you split with, or personal history. */
function destinationFor(expense: Expense, friendIds: string[]) {
  if (expense.groupId) {
    return {
      href: `/groups/${expense.groupId}?tab=expenses`,
      addAnotherHref: `/expenses/new?groupId=${expense.groupId}`,
    }
  }
  if (expense.isPersonal || expense.expenseType === "personal") {
    return { href: "/history?filter=personal", addAnotherHref: "/expenses/new?tab=personal" }
  }
  // One friend: open their profile on the friends page; several: the friends list
  const friend = friendIds.length === 1 ? friendIds[0] : null
  return {
    href: friend ? `/friends?friend=${friend}` : "/friends",
    addAnotherHref: friend ? `/expenses/new?friend=${friend}` : "/expenses/new?tab=friend",
  }
}

function NewExpenseContent() {
  const searchParams = useSearchParams()
  const { user } = useSession()
  const groupsQuery = useGroups()
  const friendsQuery = useFriends()

  // Wait for groups + friends so the initial selections (first group / friend) are known at mount.
  if (groupsQuery.isPending || friendsQuery.isPending) {
    return (
      <>
        <AppHeader title="Add expense" showBack />
        <LoadingBody />
      </>
    )
  }

  const failed = groupsQuery.isError ? groupsQuery : friendsQuery.isError ? friendsQuery : null
  if (failed) {
    return (
      <>
        <AppHeader title="Add expense" showBack />
        <PageContainer className={CONTAINER}>
          <QueryError error={failed.error} onRetry={() => failed.refetch()} />
        </PageContainer>
      </>
    )
  }

  return (
    <NewExpenseFlow
      user={user}
      groups={groupsQuery.data}
      friends={friendsQuery.data}
      preselectedGroupId={searchParams.get("groupId")}
      preselectedFriendId={searchParams.get("friend")}
    />
  )
}

export default function NewExpensePage() {
  return (
    <React.Suspense fallback={<LoadingBody />}>
      <NewExpenseContent />
    </React.Suspense>
  )
}
