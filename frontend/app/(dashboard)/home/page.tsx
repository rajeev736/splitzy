"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import {
  ArrowRight01Icon,
  ChartIncreaseIcon,
  Copy01Icon,
  Invoice01Icon,
  PlusSignIcon,
  QrCodeIcon,
  Share08Icon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { ExpenseListItem } from "../_components/expense-list-item"
import { GroupListItem } from "../_components/group-list-item"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
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
  useBalances,
  useExpenses,
  useFriends,
  useGroups,
} from "@/hooks/queries"
import { calculateDirectBalance, formatPaise } from "@/lib/money"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const router = useRouter()
  const { user } = useSession()
  const friendsQuery = useFriends()
  const groupsQuery = useGroups()
  const expensesQuery = useExpenses()
  const { netBalancePaise } = useBalances()

  const friends = friendsQuery.data
  const groups = groupsQuery.data
  const expenses = expensesQuery.data

  const [showIdModal, setShowIdModal] = React.useState(false)

  // Derive genuine friend balances dynamically
  const friendBalances = React.useMemo(
    () =>
      friends.map((f) => ({
        friend: f,
        netBalancePaise: user
          ? calculateDirectBalance(user.uid, f.uid, expenses).netBalancePaise
          : 0,
      })),
    [friends, expenses, user]
  )

  const whoOwesYou = friendBalances.filter((b) => b.netBalancePaise > 0)
  const youOweTo = friendBalances.filter((b) => b.netBalancePaise < 0)

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
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <QuickAction
                icon={PlusSignIcon}
                label="Add Expense"
                tone="bg-secondary text-primary"
                onClick={() => router.push("/expenses/new")}
              />
              <QuickAction
                icon={UserGroupIcon}
                label="Create Group"
                tone="bg-warning/10 text-warning"
                onClick={() => router.push("/groups/new")}
              />
              <QuickAction
                icon={QrCodeIcon}
                label="My JoySplit ID"
                tone="bg-info/10 text-info"
                onClick={() => setShowIdModal(true)}
              />
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
                      title="Who owes you"
                      emptyText="No one owes you right now."
                      rows={whoOwesYou}
                    />
                    <Separator />
                    <FriendBalanceSection
                      title="You owe to"
                      emptyText="You do not owe anyone right now."
                      rows={youOweTo}
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
              <SectionHeader title="Recent Activity" href="/activity" />
              <CardContent>
                {expensesQuery.isPending ? (
                  <ListSkeleton />
                ) : expensesQuery.isError ? (
                  <QueryError
                    error={expensesQuery.error}
                    onRetry={expensesQuery.refetch}
                  />
                ) : expenses.length > 0 ? (
                  <ItemGroup className="gap-1">
                    {expenses.slice(0, 4).map((exp) => (
                      <ExpenseListItem
                        key={exp.id}
                        expense={exp}
                        variant="default"
                        description={`${exp.groupName ? `${exp.groupName} • ` : ""}Paid by ${exp.payerName}`}
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
    </>
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
      className="h-auto flex-col gap-2 rounded-2xl bg-card p-3.5 whitespace-normal shadow-xs hover:border-primary/40 hover:shadow-md"
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-2xl",
          tone
        )}
      >
        <HugeiconsIcon icon={icon} className="size-5" strokeWidth={2.2} />
      </span>
      <span className="text-center text-xs font-bold">{label}</span>
    </Button>
  )
}

function FriendBalanceSection({
  title,
  emptyText,
  rows,
}: {
  title: string
  emptyText: string
  rows: { friend: UserProfile; netBalancePaise: number }[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
        {title}
      </div>
      {rows.length > 0 ? (
        <ItemGroup className="gap-1">
          {rows.map(({ friend, netBalancePaise }) => (
            <Item
              key={friend.uid}
              size="sm"
              className="flex-nowrap hover:bg-muted/50"
            >
              <ItemMedia>
                <UserAvatar
                  src={friend.photoURL}
                  name={friend.displayName}
                  size="sm"
                />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="text-xs font-bold">
                  {friend.displayName}
                </ItemTitle>
                <ItemDescription className="font-mono text-[11px]">
                  {friend.splitzyId}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    netBalancePaise > 0
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {netBalancePaise > 0
                    ? `+ ${formatPaise(netBalancePaise)}`
                    : formatPaise(Math.abs(netBalancePaise))}
                </span>
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
