"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import {
  Analytics01Icon,
  ArrowRight01Icon,
  ChartIncreaseIcon,
  Copy01Icon,
  Invoice01Icon,
  PlusSignIcon,
  QrCodeIcon,
  Share08Icon,
  Tick02Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserMultipleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { ExpenseListItem } from "../_components/expense-list-item"
import { GroupListItem } from "../_components/group-list-item"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { SettleExpensesDialog } from "@/components/settlement/settle-expenses-dialog"
import { Amount } from "@/components/shared/amount"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  useExpenses,
  useFriends,
  useGroups,
} from "@/hooks/queries"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import { PayPersonButton } from "@/components/shared/pay-person-button"
import { ChallengeButton } from "@/components/games/challenge-button"
import { HomeGamesCard } from "@/components/games/home-games-card"
import { GameDiscountAmount, GameDiscountNote } from "@/components/games/game-discount-amount"
import { useDiscountedBalances, useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { expensesInPeriod, mySpendPaise } from "@/lib/analytics"
import { calculatePersonBalances, formatPaise } from "@/lib/money"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const router = useRouter()
  const { user } = useSession()
  const friendsQuery = useFriends()
  const groupsQuery = useGroups()
  const expensesQuery = useExpenses()
  const { isExpenseUnread, hasGroupUnreadExpenses, markSeen } = useUnreadTracking()
  // Overall balances — with any live game discount applied for its 10 minutes
  const { netBalancePaise, totalOwedToYouPaise, totalYouOwePaise, gameDiscountPaise, gameDiscountEndsAt, now } =
    useDiscountedBalances()

  const friends = friendsQuery.data
  const groups = groupsQuery.data
  const expenses = expensesQuery.data

  const [showIdModal, setShowIdModal] = React.useState(false)
  const [selectedPersonId, setSelectedPersonId] = React.useState<string | null>(null)

  // Everyone you share an unsettled expense with (friends and group members),
  // from the same debt model as the net balance, so the rows add up to it.
  const personBalances = React.useMemo<BalanceRow[]>(
    () =>
      user
        ? calculatePersonBalances(user.uid, expenses).map((b) => {
            const friend = friends.find((f) => f.uid === b.userId)
            return {
              userId: b.userId,
              name: friend?.displayName || b.name,
              photoURL: friend?.photoURL || b.photoURL,
              subtitle: friend?.splitzyId || b.subtitle || "Group member",
              upiId: friend?.upiId || b.upiId,
              netBalancePaise: b.netBalancePaise,
            }
          })
        : [],
    [friends, expenses, user]
  )

  const whoOwesYou = personBalances.filter((b) => b.netBalancePaise > 0)
  const youOweTo = personBalances.filter((b) => b.netBalancePaise < 0)
  const recentExpenses = expenses.slice(0, 4)

  // Your own share this month — same definition as the Insights page
  const { monthSpentPaise, monthCount } = React.useMemo(() => {
    if (!user) return { monthSpentPaise: 0, monthCount: 0 }
    const mine = expensesInPeriod(expenses, user.uid, "month")
      .map((e) => mySpendPaise(e, user.uid))
      .filter((p) => p > 0)
    return { monthSpentPaise: mine.reduce((a, b) => a + b, 0), monthCount: mine.length }
  }, [expenses, user])

  return (
    <>
      <AppHeader showUserGreeting />

      <PageContainer>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left column: net balance, quick actions, balance details */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Card className="relative gap-0 rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg ring-0 sm:p-7">
              <div className="pointer-events-none absolute -right-6 -bottom-6 size-36 rounded-full bg-primary-foreground/10 blur-2xl" />
              <HugeiconsIcon
                icon={ChartIncreaseIcon}
                className="absolute top-4 right-4 size-20 opacity-20"
              />

              <div className="relative z-10">
                <div className="text-xs font-medium opacity-80">
                  Your Net Balance
                </div>
                <div
                  className={cn(
                    "my-1 text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl",
                    balanceTone(netBalancePaise)
                  )}
                >
                  {netBalancePaise > 0
                    ? `+${formatPaise(netBalancePaise)}`
                    : netBalancePaise < 0
                      ? `-${formatPaise(Math.abs(netBalancePaise))}`
                      : "₹0"}
                </div>
                <div className="text-xs font-semibold opacity-80">
                  {netBalancePaise > 0
                    ? "You will receive overall"
                    : netBalancePaise < 0
                      ? "You need to pay overall"
                      : "All settled up!"}
                </div>
                <GameDiscountNote
                  className="mt-2 bg-primary-foreground/20 text-primary-foreground"
                  discountPaise={gameDiscountPaise}
                  endsAt={gameDiscountEndsAt}
                  now={now}
                />
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary-foreground/20 pt-3 text-xs">
                  <div>
                    <div className="opacity-80">You are owed</div>
                    <div className="text-base font-bold tabular-nums text-emerald-300">
                      {formatPaise(totalOwedToYouPaise)}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-80">You owe</div>
                    <div className="text-base font-bold tabular-nums text-red-300">
                      {formatPaise(totalYouOwePaise)}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 border-t border-primary-foreground/20 pt-3">
                  <button
                    type="button"
                    onClick={() => router.push("/split-summary")}
                    className="flex w-full items-center justify-between rounded-xl bg-primary-foreground/15 px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-foreground/25 active:scale-[0.99]"
                  >
                    <span>View Split Expense Summary</span>
                    <span className="font-bold">→</span>
                  </button>
                </div>
              </div>
            </Card>

            {/* PhonePe-style entry points: one tap per kind of split */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <QuickAction
                icon={UserGroupIcon}
                label="Group split"
                tone="bg-secondary text-primary"
                onClick={() => router.push("/expenses/new?tab=group")}
              />
              <QuickAction
                icon={UserMultipleIcon}
                label="Friend split"
                tone="bg-success/10 text-success"
                onClick={() => router.push("/expenses/new?tab=friend")}
              />
              <QuickAction
                icon={Wallet01Icon}
                label="Personal"
                tone="bg-warning/10 text-warning"
                onClick={() => router.push("/expenses/new?tab=personal")}
              />
              <QuickAction
                icon={QrCodeIcon}
                label="My ID"
                tone="bg-info/10 text-info"
                onClick={() => setShowIdModal(true)}
              />
            </div>

            <HomeGamesCard />
            <MonthSnapshot spentPaise={monthSpentPaise} count={monthCount} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => router.push("/groups/new")}>
                <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                New group
              </Button>
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => router.push("/friends/add")}>
                <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
                Add friend
              </Button>
            </div>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>
                  <h2 className="text-base font-bold tracking-tight">
                    Balance Details
                  </h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {friendsQuery.isPending || expensesQuery.isPending ? (
                  <ListSkeleton rows={2} />
                ) : friendsQuery.isError || expensesQuery.isError ? (
                  <QueryError
                    error={friendsQuery.error ?? expensesQuery.error}
                    onRetry={() => {
                      if (friendsQuery.isError) friendsQuery.refetch()
                      if (expensesQuery.isError) expensesQuery.refetch()
                    }}
                  />
                ) : (
                  <>
                    <FriendBalanceSection
                      title="People you need to pay"
                      emptyText="You do not owe anyone right now."
                      rows={youOweTo}
                      onSelectPerson={setSelectedPersonId}
                    />
                    <Separator />
                    <FriendBalanceSection
                      title="People who need to pay you"
                      emptyText="No one owes you right now."
                      rows={whoOwesYou}
                      onSelectPerson={setSelectedPersonId}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: recent groups, recent activity */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Card className="rounded-3xl">
              <SectionHeader title="Recent Groups" href="/groups" />
              <CardContent>
                {groupsQuery.isPending ? (
                  <ListSkeleton />
                ) : groupsQuery.isError ? (
                  <QueryError
                    error={groupsQuery.error}
                    onRetry={groupsQuery.refetch}
                  />
                ) : groups.length > 0 ? (
                  <ItemGroup className="gap-3">
                    {groups.slice(0, 3).map((group) => (
                      <GroupListItem
                        key={group.id}
                        group={group}
                        hasUnread={hasGroupUnreadExpenses(group.id)}
                        action={
                          <span className="text-xs font-bold text-primary">
                            View
                          </span>
                        }
                      />
                    ))}
                  </ItemGroup>
                ) : (
                  <EmptyState
                    className="py-6"
                    icon={UserGroupIcon}
                    title="No groups yet"
                    description="Create a group to start splitting bills!"
                    action={{
                      label: "Create Group",
                      onClick: () => router.push("/groups/new"),
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <SectionHeader title="Recent Expenses" href="/history" />
              <CardContent>
                {expensesQuery.isPending ? (
                  <ListSkeleton />
                ) : expensesQuery.isError ? (
                  <QueryError
                    error={expensesQuery.error}
                    onRetry={expensesQuery.refetch}
                  />
                ) : recentExpenses.length > 0 ? (
                  <ItemGroup className="gap-1">
                    {recentExpenses.map((exp) => (
                      <ExpenseListItem
                        key={exp.id}
                        expense={exp}
                        variant="default"
                        hasUnread={isExpenseUnread(exp.id)}
                        onClick={() => markSeen(exp.id)}
                        description={
                          exp.isPersonal || exp.expenseType === "personal"
                            ? `Personal • ${exp.category || "Expense"}`
                            : `${exp.groupName ? `${exp.groupName} • ` : ""}Paid by ${exp.payerName}`
                        }
                        action={
                          <div className="flex flex-col items-end">
                            <Amount
                              paise={exp.amountPaise}
                              className="text-xs font-bold"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {exp.date}
                            </span>
                          </div>
                        }
                      />
                    ))}
                  </ItemGroup>
                ) : (
                  <EmptyState
                    className="py-6"
                    icon={Invoice01Icon}
                    title="No recent expenses"
                    description="Add your first expense to see it here!"
                    action={{
                      label: "Add Expense",
                      onClick: () => router.push("/expenses/new"),
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>

      {user && (
        <JoySplitIdDialog
          user={user}
          open={showIdModal}
          onOpenChange={setShowIdModal}
        />
      )}

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
    </>
  )
}

function MonthSnapshot({ spentPaise, count }: { spentPaise: number; count: number }) {
  const month = new Date().toLocaleString("en-IN", { month: "long" })
  return (
    <Link
      href="/insights"
      className="flex items-center gap-3 rounded-3xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
        <HugeiconsIcon icon={Analytics01Icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">Your spend in {month}</span>
        <span className="block text-lg font-extrabold tabular-nums">{formatPaise(spentPaise)}</span>
      </span>
      <span className="flex items-center gap-1 text-xs font-bold text-primary">
        {count} {count === 1 ? "expense" : "expenses"}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
      </span>
    </Link>
  )
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <CardHeader>
      <CardTitle>
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      </CardTitle>
      <CardAction>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          See all <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        </Link>
      </CardAction>
    </CardHeader>
  )
}

/**
 * Green / red for amounts shown on the blue balance card. Uses the light
 * 300 shades: the regular success/destructive tokens are unreadable on blue.
 */
function balanceTone(signedPaise: number) {
  if (signedPaise > 0) return "text-emerald-300"
  if (signedPaise < 0) return "text-red-300"
  return undefined
}

function QuickAction({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: IconSvgElement
  label: string
  tone: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-auto flex-col gap-1.5 rounded-2xl bg-card px-1 py-3 whitespace-normal shadow-xs hover:border-primary/40 hover:shadow-md sm:gap-2 sm:p-3.5"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-2xl sm:size-11",
          tone
        )}
      >
        <HugeiconsIcon icon={icon} className="size-5" strokeWidth={2.2} />
      </span>
      <span className="text-center text-[11px] leading-tight font-bold sm:text-xs">{label}</span>
    </Button>
  )
}

interface BalanceRow {
  userId: string
  name: string
  photoURL?: string
  subtitle: string
  upiId?: string
  netBalancePaise: number
}

function FriendBalanceSection({
  title,
  emptyText,
  rows,
  onSelectPerson,
}: {
  title: string
  emptyText: string
  rows: BalanceRow[]
  onSelectPerson?: (userId: string) => void
}) {
  const gameDiscounts = useLiveGameDiscounts()
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
        {title}
      </div>
      {rows.length > 0 ? (
        <ItemGroup className="gap-1">
          {rows.map(({ userId, name, photoURL, subtitle, upiId, netBalancePaise }) => (
            <Item
              key={userId}
              size="sm"
              onClick={() => onSelectPerson?.(userId)}
              className="flex-nowrap cursor-pointer transition-colors hover:bg-muted/60"
            >
              <ItemMedia>
                <UserAvatar src={photoURL} name={name} size="sm" />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="text-xs font-bold">{name}</ItemTitle>
                <ItemDescription className="font-mono text-[11px]">
                  {subtitle}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="gap-2">
                <GameDiscountAmount
                  amountPaise={Math.abs(netBalancePaise)}
                  discount={gameDiscounts.byPerson.get(userId)}
                  now={gameDiscounts.now}
                  prefix={netBalancePaise > 0 ? "+" : "-"}
                  className={cn(
                    "text-sm font-black leading-tight sm:text-base",
                    netBalancePaise > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  )}
                />
                {/* Someone owes you: challenge them to a game */}
                {netBalancePaise > 0 && (
                  <ChallengeButton person={{ uid: userId, name, photoURL }} owedPaise={netBalancePaise} />
                )}
                {/* Where you owe someone, settle right here instead of hunting for the expense */}
                {netBalancePaise < 0 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <PayPersonButton
                      personId={userId}
                      personName={name}
                      personPhoto={photoURL}
                      personUpiId={upiId}
                    />
                  </div>
                )}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <div className="rounded-2xl bg-muted/50 p-4 text-center text-xs text-muted-foreground">
          {emptyText}
        </div>
      )}
    </div>
  )
}

function JoySplitIdDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { copied, copy } = useCopyToClipboard()

  const handleShareId = () => {
    if (typeof navigator.share === "function") {
      navigator
        .share({
          title: "Add me on JoySplit",
          text: `Hey! Add me on JoySplit using my JoySplit ID: ${user.splitzyId} to split expenses easily!`,
        })
        .catch(() => {})
    } else {
      copy(user.splitzyId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>My JoySplit ID</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <UserAvatar
            src={user.photoURL}
            name={user.displayName}
            size="lg"
            className="ring-2 ring-border"
          />
          <div>
            <h4 className="text-base font-bold">{user.displayName}</h4>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex w-full items-center justify-between rounded-2xl border bg-muted/50 p-4">
            <div className="text-left">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Your JoySplit ID
              </span>
              <div className="font-mono text-lg font-bold tracking-wider text-primary">
                {user.splitzyId}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              title="Copy ID"
              aria-label="Copy ID"
              onClick={() => copy(user.splitzyId)}
            >
              <HugeiconsIcon
                icon={copied ? Tick02Icon : Copy01Icon}
                className={cn("size-5", copied && "text-success")}
              />
            </Button>
          </div>

          <p className="max-w-xs text-xs text-muted-foreground">
            Share this code with friends so they can add you to their friend
            list and groups instantly.
          </p>

          <div className="flex w-full flex-col gap-2">
            <Button size="lg" className="h-11 w-full" onClick={handleShareId}>
              <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
              Share My JoySplit ID
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 w-full"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
