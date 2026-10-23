"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import type { Options as ConfettiOptions } from "canvas-confetti"
import {
  ArrowDown01Icon,
  ReceiptIndianRupeeIcon,
  UserGroupIcon,
  UserIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { toast } from "sonner"

import { ExpenseGameOption } from "@/components/games/expense-game-option"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { GroupIcon } from "@/components/shared/group-icon"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { AvatarGroup } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCreateChallenge, useCreateExpense } from "@/hooks/mutations"
import { useFriends, useGroups } from "@/hooks/queries"
import { getErrorMessage } from "@/lib/errors"
import type { Group, UserProfile } from "@/lib/types"
import { PaidBySection } from "./_components/paid-by-section"
import { SplitSection } from "./_components/split-section"
import { SplitWithSheet } from "./_components/split-with-sheet"
import { SuccessScreen } from "./_components/success-screen"
import {
  PERSONAL_CATEGORIES,
  useExpenseDraft,
  type ExpenseDraft,
  type ExpenseMode,
} from "./_components/use-expense-draft"

const CONTAINER = "max-w-xl gap-4"

const EXPENSE_MODES: { value: ExpenseMode; label: string; icon: IconSvgElement }[] = [
  { value: "group", label: "Group", icon: UserGroupIcon },
  { value: "friend", label: "Friend", icon: UserMultipleIcon },
  { value: "personal", label: "Personal", icon: UserIcon },
]

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


/** "With you and: …" summary of who the expense is shared with. */
function SplitWithSummary({ draft, friends }: { draft: ExpenseDraft; friends: UserProfile[] }) {
  if (draft.expenseMode === "personal") return <span className="truncate text-sm font-semibold">Just me (personal)</span>

  if (draft.expenseMode === "group") {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <GroupIcon src={draft.currentGroup.icon} alt={draft.currentGroup.name} size="sm" className="size-7" />
        <span className="truncate text-sm font-semibold">{draft.currentGroup.name}</span>
      </span>
    )
  }

  const picked = friends.filter((f) => draft.selectedFriendIds.includes(f.uid))
  if (picked.length === 0) return <span className="text-sm text-muted-foreground">Choose friends</span>
  return (
    <span className="flex min-w-0 items-center gap-2">
      <AvatarGroup>
        {picked.slice(0, 3).map((f) => (
          <UserAvatar key={f.uid} src={f.photoURL} name={f.displayName} size="xs" />
        ))}
      </AvatarGroup>
      <span className="truncate text-sm font-semibold">
        {picked.length === 1 ? picked[0].displayName : `${picked.length} friends`}
      </span>
    </span>
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
  const draft = useExpenseDraft({ user, groups, friends, preselectedGroupId, preselectedFriendId })
  const createExpense = useCreateExpense({ errorMessage: false })
  const createChallenge = useCreateChallenge({ errorMessage: "Expense saved, but the game couldn't be started" })
  const [splitWithOpen, setSplitWithOpen] = React.useState(false)
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
        draft.markCreated(expense.id)
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
          toast.success("Expense created successfully!")
        } else {
          void celebrate({ particleCount: 70, spread: 60, origin: { y: 0.6 }, colors: ["#2563EB", "#10B981"] })
          toast.success("Personal expense saved!")
        }
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

  if (draft.isDone) {
    return (
      <>
        <AppHeader title="Expense added" />
        <PageContainer className={CONTAINER}>
          <SuccessScreen draft={draft} />
        </PageContainer>
      </>
    )
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
          {/* 1 — what kind of expense */}
          <ToggleGroup
            variant="outline"
            className="grid w-full grid-cols-3"
            value={[draft.expenseMode]}
            onValueChange={(v) => v[0] && draft.setExpenseMode(v[0] as ExpenseMode)}
          >
            {EXPENSE_MODES.map((m) => (
              <ToggleGroupItem
                key={m.value}
                value={m.value}
                className="h-auto flex-col gap-1 rounded-xl py-2.5 text-xs font-bold data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
              >
                <HugeiconsIcon icon={m.icon} className="size-5" />
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* 2 — who it's shared with */}
          {isShared && (
            <button
              type="button"
              onClick={() => setSplitWithOpen(true)}
              className="flex w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
            >
              <span className="shrink-0 text-sm text-muted-foreground">
                {draft.expenseMode === "group" ? "Group:" : "With you and:"}
              </span>
              <span className="min-w-0 flex-1">
                <SplitWithSummary draft={draft} friends={friends} />
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 shrink-0 text-muted-foreground" />
            </button>
          )}

          {/* 2 — what & how much */}
          <Card>
            <CardContent className="flex flex-col gap-3">
              <InputGroup className="h-12">
                <InputGroupAddon>
                  <HugeiconsIcon icon={ReceiptIndianRupeeIcon} className="size-5" />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Description"
                  value={draft.title}
                  onChange={(e) => draft.setTitle(e.target.value)}
                  placeholder="Enter a description"
                  className="text-base font-semibold md:text-base"
                />
              </InputGroup>
              <InputGroup className="h-16">
                <InputGroupAddon className="text-2xl font-bold text-foreground">₹</InputGroupAddon>
                <InputGroupInput
                  aria-label="Amount"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={draft.amountRupees}
                  onChange={(e) => draft.setAmountRupees(e.target.value)}
                  placeholder="0.00"
                  className="text-3xl font-extrabold md:text-3xl"
                />
              </InputGroup>
            </CardContent>
          </Card>

          {/* 3 — paid by + split, inline (shared) or category (personal) */}
          {isShared ? (
            <>
              <PaidBySection draft={draft} />
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
          ) : (
            <ToggleGroup
              variant="outline"
              size="sm"
              className="w-full flex-wrap justify-center"
              value={[draft.personalCategory]}
              onValueChange={(v) => v[0] && draft.setPersonalCategory(v[0] as string)}
            >
              {PERSONAL_CATEGORIES.map((cat) => (
                <ToggleGroupItem
                  key={cat.id}
                  value={cat.id}
                  className="rounded-full text-xs data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}

          <Button type="submit" size="lg" className="mt-2 h-12 w-full text-base" disabled={createExpense.isPending}>
            {createExpense.isPending && <Spinner />}
            {isShared ? "Save expense" : "Save personal expense"}
          </Button>
        </form>
      </PageContainer>

      <SplitWithSheet
        open={splitWithOpen}
        onOpenChange={setSplitWithOpen}
        draft={draft}
        groups={groups}
        friends={friends}
      />
    </>
  )
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
