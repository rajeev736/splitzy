"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import {
  Invoice01Icon,
  Notification01Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { EmptyState } from "@/components/shared/empty-state"
import { PayPersonButton } from "@/components/shared/pay-person-button"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { useSendFriendBalanceReminder } from "@/hooks/mutations"
import { useExpenses, useFriends } from "@/hooks/queries"
import { calculateDirectBalance, filterExpensesByScope, formatPaise } from "@/lib/money"
import type { UserProfile } from "@/lib/types"

/**
 * Direct Splits page — shows only personal / friend-to-friend expenses.
 * Group expenses are intentionally excluded from all balances shown here.
 */
export default function DirectSplitsPage() {
  const router = useRouter()
  const { user } = useSession()
  const friendsQuery = useFriends()
  const { data: expenses } = useExpenses()
  const sendReminder = useSendFriendBalanceReminder()

  const [search, setSearch] = React.useState("")

  // Direct expenses only (no groupId)
  const directExpenses = React.useMemo(
    () => filterExpensesByScope(expenses, { type: "direct" }),
    [expenses]
  )

  // Compute per-friend direct balance (scope = direct only)
  const friendRows = React.useMemo(() => {
    if (!user) return []
    return friendsQuery.data
      .map((friend) => ({
        friend,
        balance: calculateDirectBalance(user.uid, friend.uid, directExpenses),
      }))
      .filter(({ balance }) => balance.netBalancePaise !== 0)
      .sort((a, b) => Math.abs(b.balance.netBalancePaise) - Math.abs(a.balance.netBalancePaise))
  }, [user, friendsQuery.data, directExpenses])

  // Settled friends who still have shared direct history
  const settledRows = React.useMemo(() => {
    if (!user) return []
    // Only include settled friends who actually share direct expenses
    return friendsQuery.data
      .map((friend) => ({
        friend,
        balance: calculateDirectBalance(user.uid, friend.uid, directExpenses),
      }))
      .filter(({ balance, friend }) => {
        if (balance.netBalancePaise !== 0) return false
        const hasSharedDirect = directExpenses.some((exp) => {
          const userIn = exp.payerId === user.uid || exp.shares?.some((s) => s.userId === user.uid)
          const friendIn = exp.payerId === friend.uid || exp.shares?.some((s) => s.userId === friend.uid)
          return userIn && friendIn
        })
        return hasSharedDirect
      })
  }, [user, friendsQuery.data, directExpenses])

  const q = search.toLowerCase()
  const filtered = friendRows.filter((r) =>
    r.friend.displayName.toLowerCase().includes(q) || r.friend.splitzyId.toLowerCase().includes(q)
  )
  const filteredSettled = settledRows.filter((r) =>
    r.friend.displayName.toLowerCase().includes(q) || r.friend.splitzyId.toLowerCase().includes(q)
  )

  const totalOwedToMePaise = friendRows
    .filter((r) => r.balance.netBalancePaise > 0)
    .reduce((s, r) => s + r.balance.netBalancePaise, 0)

  const totalIOwe = friendRows
    .filter((r) => r.balance.netBalancePaise < 0)
    .reduce((s, r) => s + Math.abs(r.balance.netBalancePaise), 0)

  return (
    <>
      <AppHeader
        title="Direct Splits"
        showBack
        rightAction={
          <ButtonLink
            href="/expenses/new"
            variant="secondary"
            size="icon"
            className="rounded-full"
            aria-label="New Direct Split"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-5" strokeWidth={2.2} />
          </ButtonLink>
        }
      />

      <PageContainer className="max-w-4xl gap-5">
        {/* Summary bar */}
        {(totalOwedToMePaise > 0 || totalIOwe > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {totalOwedToMePaise > 0 && (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-success/70">
                  You Get Back
                </div>
                <div className="mt-1 text-lg font-extrabold text-success">
                  +{formatPaise(totalOwedToMePaise)}
                </div>
              </div>
            )}
            {totalIOwe > 0 && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-destructive/70">
                  You Owe
                </div>
                <div className="mt-1 text-lg font-extrabold text-destructive">
                  -{formatPaise(totalIOwe)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {(friendRows.length > 0 || settledRows.length > 0) && (
          <InputGroup className="h-11 bg-card">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends..."
            />
          </InputGroup>
        )}

        {/* Pending balances */}
        {friendsQuery.isPending ? (
          <ListSkeleton rows={4} />
        ) : friendsQuery.isError ? (
          <QueryError error={friendsQuery.error} onRetry={friendsQuery.refetch} />
        ) : filtered.length === 0 && filteredSettled.length === 0 ? (
          <EmptyState
            icon={Invoice01Icon}
            title="No direct splits yet"
            description="Split expenses directly with friends outside of a group. Tap + to create one."
            action={{
              label: "New Split",
              onClick: () => router.push("/expenses/new"),
            }}
          />
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  {filtered.length} Pending {filtered.length === 1 ? "Balance" : "Balances"}
                </div>
                <Card className="py-1">
                  <ItemGroup className="gap-0 px-1">
                    {filtered.map((row, i) => (
                      <FriendBalanceRow
                        key={row.friend.uid}
                        friend={row.friend}
                        netBalancePaise={row.balance.netBalancePaise}
                        showSeparator={i > 0}
                        onRemind={() =>
                          sendReminder.mutate({
                            targetUserId: row.friend.uid,
                            amountPaise: row.balance.netBalancePaise,
                          })
                        }
                        remindPending={sendReminder.isPending}
                      />
                    ))}
                  </ItemGroup>
                </Card>
              </div>
            )}

            {filteredSettled.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold text-muted-foreground">Settled Up</div>
                <Card className="py-1 opacity-70">
                  <ItemGroup className="gap-0 px-1">
                    {filteredSettled.map((row, i) => (
                      <FriendBalanceRow
                        key={row.friend.uid}
                        friend={row.friend}
                        netBalancePaise={0}
                        showSeparator={i > 0}
                        onRemind={() => undefined}
                        remindPending={false}
                      />
                    ))}
                  </ItemGroup>
                </Card>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </>
  )
}

function FriendBalanceRow({
  friend,
  netBalancePaise,
  showSeparator,
  onRemind,
  remindPending,
}: {
  friend: UserProfile
  netBalancePaise: number
  showSeparator: boolean
  onRemind: () => void
  remindPending: boolean
}) {
  return (
    <>
      {showSeparator && <ItemSeparator className="my-0" />}
      <Item className="px-3 py-3">
        <Link
          href={`/expenses/new?friend=${friend.uid}`}
          className="flex min-w-0 flex-1 items-center gap-3.5"
          tabIndex={-1}
          aria-hidden
        >
          <UserAvatar src={friend.photoURL} name={friend.displayName} size="md" />
        </Link>
        <ItemContent
          className="cursor-default"
          onClick={() => undefined}
        >
          <ItemTitle className="font-bold">{friend.displayName}</ItemTitle>
          <ItemDescription className="font-mono text-xs">{friend.splitzyId}</ItemDescription>
        </ItemContent>

        <ItemActions className="gap-2">
          {netBalancePaise > 0 ? (
            <>
              <Badge
                variant="outline"
                className="border-success/30 bg-success/10 text-[10px] font-bold text-success"
              >
                +{formatPaise(netBalancePaise)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-success/40 px-2.5 text-xs font-bold text-success hover:bg-success/10"
                disabled={remindPending}
                onClick={onRemind}
              >
                <HugeiconsIcon icon={Notification01Icon} className="size-3.5" />
                Remind
              </Button>
            </>
          ) : netBalancePaise < 0 ? (
            <>
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/10 text-[10px] font-bold text-destructive"
              >
                -{formatPaise(Math.abs(netBalancePaise))}
              </Badge>
              <PayPersonButton
                personId={friend.uid}
                personName={friend.displayName}
                size="sm"
              />
            </>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">Settled</span>
          )}
        </ItemActions>
      </Item>
    </>
  )
}
