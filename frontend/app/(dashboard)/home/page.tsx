"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import {
  Analytics01Icon,
  ArrowDownLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Invoice01Icon,
  PlusSignIcon,
  QrCodeIcon,
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
import { MyIdDialog } from "@/components/shared/my-id-dialog"
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
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import {
  useExpenses,
  useFriends,
  useGroups,
} from "@/hooks/queries"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import { PayPersonButton } from "@/components/shared/pay-person-button"
import { ChallengeButton } from "@/components/games/challenge-button"
import { PaymentDisputeLine, PaymentReceivedOr } from "@/components/shared/payment-received-prompt"
import { HomeGamesCard } from "@/components/games/home-games-card"
import { EnableNotificationsBanner } from "@/components/shared/enable-notifications"
import { GameDiscountAmount, GameDiscountNote } from "@/components/games/game-discount-amount"
import { useDiscountedBalances, useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { expensesInPeriod, mySpendPaise } from "@/lib/analytics"
import { calculatePersonBalances, formatPaise } from "@/lib/money"
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
            {/* Net balance: one number that matters, the two that make it up, and the way to the detail */}
            <Card className="gap-0 py-0">
              <div className="flex flex-col gap-1 bg-linear-to-br from-primary/10 via-primary/[0.03] to-transparent p-5 sm:p-6">
                <div className="text-xs font-medium tracking-wide text-primary uppercase">Net balance</div>
                <div
                  className={cn(
                    "text-4xl font-bold tracking-tight tabular-nums sm:text-5xl",
                    balanceTone(netBalancePaise)
                  )}
                >
                  {netBalancePaise > 0
                    ? `+${formatPaise(netBalancePaise)}`
                    : netBalancePaise < 0
                      ? `-${formatPaise(Math.abs(netBalancePaise))}`
                      : "₹0"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {netBalancePaise > 0
                    ? "You will receive overall"
                    : netBalancePaise < 0
                      ? "You need to pay overall"
                      : "You're all settled up"}
                </div>
                <GameDiscountNote
                  className="mt-1"
                  discountPaise={gameDiscountPaise}
                  endsAt={gameDiscountEndsAt}
                  now={now}
                />
              </div>

              <div className="grid grid-cols-2 divide-x border-t">
                <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-success/12 text-success">
                    <HugeiconsIcon icon={ArrowDownLeft01Icon} className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">You are owed</div>
                    <div className="text-lg leading-tight font-bold tabular-nums text-success">
                      {formatPaise(totalOwedToYouPaise)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/12 text-destructive">
                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">You owe</div>
                    <div className="text-lg leading-tight font-bold tabular-nums text-destructive">
                      {formatPaise(totalYouOwePaise)}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/split-summary")}
                className="flex w-full items-center justify-between border-t px-5 py-3 text-sm font-medium transition-colors hover:bg-muted/60 sm:px-6"
              >
                <span className="text-primary">View split summary</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-primary" />
              </button>
            </Card>

            {/* PhonePe-style entry points: one tap per kind of split */}
            <div className="grid grid-cols-4 divide-x overflow-hidden rounded-lg border bg-card">
              <QuickAction
                icon={UserGroupIcon}
                label="Group"
                tone="bg-primary/12 text-primary"
                onClick={() => router.push("/expenses/new?tab=group")}
              />
              <QuickAction
                icon={UserMultipleIcon}
                label="Friend"
                tone="bg-success/12 text-success"
                onClick={() => router.push("/expenses/new?tab=friend")}
              />
              <QuickAction
                icon={Wallet01Icon}
                label="Personal"
                tone="bg-warning/12 text-warning"
                onClick={() => router.push("/expenses/new?tab=personal")}
              />
              <QuickAction
                icon={QrCodeIcon}
                label="My ID"
                tone="bg-violet-500/12 text-violet-600 dark:text-violet-400"
                onClick={() => setShowIdModal(true)}
              />
            </div>

            <EnableNotificationsBanner />
            <HomeGamesCard />
            <MonthSnapshot spentPaise={monthSpentPaise} count={monthCount} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => router.push("/groups/new")}>
                <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                New group
              </Button>
              <Button variant="outline" onClick={() => router.push("/friends/add")}>
                <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
                Add friend
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 className="text-sm font-semibold">Balance details</h2>
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
            <Card>
              <SectionHeader title="Recent groups" href="/groups" />
              <CardContent>
                {groupsQuery.isPending ? (
                  <ListSkeleton />
                ) : groupsQuery.isError ? (
                  <QueryError
                    error={groupsQuery.error}
                    onRetry={groupsQuery.refetch}
                  />
                ) : groups.length > 0 ? (
                  <ItemGroup className="-mx-2 gap-0.5">
                    {groups.slice(0, 3).map((group) => (
                      <GroupListItem
                        key={group.id}
                        group={group}
                        variant="default"
                        className="px-2"
                        hasUnread={hasGroupUnreadExpenses(group.id)}
                        action={<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />}
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

            <Card>
              <SectionHeader title="Recent expenses" href="/history" />
              <CardContent>
                {expensesQuery.isPending ? (
                  <ListSkeleton />
                ) : expensesQuery.isError ? (
                  <QueryError
                    error={expensesQuery.error}
                    onRetry={expensesQuery.refetch}
                  />
                ) : recentExpenses.length > 0 ? (
                  <ItemGroup className="-mx-2 gap-0.5">
                    {recentExpenses.map((exp) => (
                      <ExpenseListItem
                        key={exp.id}
                        expense={exp}
                        variant="default"
                        className="px-2"
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
                              className="text-sm font-semibold"
                            />
                            <span className="text-[11px] text-muted-foreground">
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
        <MyIdDialog
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
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3.5 transition-colors hover:bg-muted/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <HugeiconsIcon icon={Analytics01Icon} className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">Your spend in {month}</span>
        <span className="block text-base font-semibold tabular-nums">{formatPaise(spentPaise)}</span>
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {count} {count === 1 ? "expense" : "expenses"}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
      </span>
    </Link>
  )
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <CardHeader>
      <CardTitle>
        <h2 className="text-sm font-semibold">{title}</h2>
      </CardTitle>
      <CardAction>
        <Link href={href} className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          See all
        </Link>
      </CardAction>
    </CardHeader>
  )
}

/** Green when you're owed, red when you owe, neutral when settled. */
function balanceTone(signedPaise: number) {
  if (signedPaise > 0) return "text-success"
  if (signedPaise < 0) return "text-destructive"
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
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 px-1 py-4 text-foreground transition-colors hover:bg-muted/60 active:bg-muted"
    >
      <span className={cn("flex size-10 items-center justify-center rounded-lg", tone)}>
        <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.9} />
      </span>
      <span className="text-center text-xs leading-tight font-medium">{label}</span>
    </button>
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
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      {rows.length > 0 ? (
        <ItemGroup className="-mx-2 gap-0.5">
          {rows.map(({ userId, name, photoURL, subtitle, upiId, netBalancePaise }) => (
            <Item
              key={userId}
              size="sm"
              onClick={() => onSelectPerson?.(userId)}
              className="cursor-pointer flex-nowrap px-2 transition-colors hover:bg-muted/60"
            >
              <ItemMedia>
                <UserAvatar src={photoURL} name={name} size="sm" />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="text-sm font-medium">{name}</ItemTitle>
                <ItemDescription className="font-mono text-[11px]">
                  {subtitle}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="gap-2">
                <span className="flex flex-col items-end gap-0.5">
                  <GameDiscountAmount
                    amountPaise={Math.abs(netBalancePaise)}
                    discount={gameDiscounts.byPerson.get(userId)}
                    now={gameDiscounts.now}
                    prefix={netBalancePaise > 0 ? "+" : "-"}
                    className={cn(
                      "text-lg leading-tight font-bold tracking-tight",
                      netBalancePaise > 0 ? "text-success" : "text-destructive"
                    )}
                  />
                  <PaymentDisputeLine personId={userId} personName={name} />
                </span>
                {/* Someone owes you: challenge them to a game */}
                <PaymentReceivedOr personId={userId} personName={name}>
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
                </PaymentReceivedOr>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <p className="py-1 text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
  )
}
