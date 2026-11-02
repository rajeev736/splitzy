"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import {
  Alert02Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Invoice01Icon,
  MoreVerticalIcon,
  Notification01Icon,
  QrCodeIcon,
  Search01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserIcon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PayPersonButton } from "@/components/shared/pay-person-button"
import { QrScannerDialog } from "@/components/shared/qr-scanner-dialog"
import { ChallengeButton } from "@/components/games/challenge-button"
import { ChallengeInviteStrip } from "@/components/games/challenge-invite"
import {
  HideWhilePaymentPending,
  PaymentStatusStrip,
} from "@/components/shared/payment-received-prompt"
import {
  GameDiscountAmount,
} from "@/components/games/game-discount-amount"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import {
  useRemoveFriend,
  useSendFriendBalanceReminder,
} from "@/hooks/mutations"
import {
  useExpenses,
  useFriendRequests,
  useFriends,
  useGroups,
  useNotifications,
} from "@/hooks/queries"
import {
  calculateDirectBalance,
  canRemoveFriend,
  filterExpensesByScope,
} from "@/lib/money"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MoodFace } from "@/components/fun/mood-face"
import { useFriendships } from "@/hooks/use-fun"
import { BONDS, isBondId, isMoodId } from "@/lib/fun/catalog"

import {
  IdLookupResult,
  JOYSPLIT_ID_PATTERN,
} from "./_components/id-lookup-result"

const splitHref = (uid: string) => `/expenses/new?friend=${uid}`

export default function FriendsPage() {
  const router = useRouter()
  const { user } = useSession()
  const friendsQuery = useFriends()
  const { data: friendRequests } = useFriendRequests()
  const { data: expenses } = useExpenses()
  const { data: groups } = useGroups()
  const { data: notifications } = useNotifications()
  const searchParams = useSearchParams()
  const removeFriend = useRemoveFriend()
  const sendReminder = useSendFriendBalanceReminder()
  const gameDiscounts = useLiveGameDiscounts()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [scanning, setScanning] = React.useState(false)
  const [removeTarget, setRemoveTarget] = React.useState<UserProfile | null>(
    null
  )
  const { data: friendships } = useFriendships()

  // ?friend=<uid> (e.g. right after adding a split with them) opens their profile;
  // ?remove=<uid> (from their profile page) asks to remove them
  const friendParam = searchParams.get("friend")
  React.useEffect(() => {
    if (friendParam) router.replace(`/friends/${friendParam}`)
  }, [friendParam, router])
  const removeParam = searchParams.get("remove")
  const [handledRemove, setHandledRemove] = React.useState<string | null>(null)
  if (removeParam && removeParam !== handledRemove) {
    const target = friendsQuery.data.find((f) => f.uid === removeParam)
    if (target) {
      setHandledRemove(removeParam)
      setRemoveTarget(target)
    }
  }
  const openProfile = (uid: string) => router.push(`/friends/${uid}`)

  const userId = user?.uid
  const pendingReceivedCount = React.useMemo(() => {
    if (!userId) return 0
    const seen = new Set<string>()
    return friendRequests
      .filter((r) => r.status === "PENDING" && r.receiverId === userId)
      .filter((r) => {
        const key = r.senderId || r.senderSplitzyId?.toUpperCase() || r.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).length
  }, [friendRequests, userId])

  // Full JoySplit IDs are looked up as you type; anything else on Enter
  const [submittedId, setSubmittedId] = React.useState("")
  const typedId = searchQuery.trim().toUpperCase()
  const lookupId = JOYSPLIT_ID_PATTERN.test(typedId) ? typedId : submittedId

  // Latest activity with each friend: splits, payments, confirmations and reminders either way
  const lastActivity = React.useMemo(() => {
    const latest = new Map<string, string>()
    const bump = (uid: string, at?: string) => {
      if (at && at > (latest.get(uid) ?? "")) latest.set(uid, at)
    }
    for (const f of friendsQuery.data) bump(f.uid, f.friendActivityAt)
    if (userId) {
      for (const exp of expenses) {
        const people = new Set([
          exp.payerId,
          ...(exp.shares ?? []).map((s) => s.userId),
        ])
        if (!people.has(userId)) continue
        const times = [
          exp.createdAt,
          exp.updatedAt,
          ...(exp.shares ?? []).flatMap((s) => [s.reportedAt, s.confirmedAt]),
        ]
        const at = times.reduce<string>(
          (max, t) => (t && t > max ? t : max),
          ""
        )
        for (const p of people) if (p !== userId) bump(p, at)
      }
    }
    for (const n of notifications) {
      const actor = n.data?.actorId
      if (typeof actor === "string") bump(actor, n.createdAt)
    }
    return latest
  }, [friendsQuery.data, expenses, notifications, userId])

  const q = searchQuery.toLowerCase()
  const filteredFriends = friendsQuery.data
    .filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.splitzyId.toLowerCase().includes(q)
    )
    .sort(
      (a, b) =>
        (lastActivity.get(b.uid) ?? "").localeCompare(
          lastActivity.get(a.uid) ?? ""
        ) || a.displayName.localeCompare(b.displayName)
    )

  // Removal invariant for the friend in the confirmation dialog
  const removalCheck =
    removeTarget && user
      ? canRemoveFriend(user.uid, removeTarget.uid, expenses)
      : { allowed: true, reason: "" }

  // Direct-only expenses (no groupId)
  const directExpenses = React.useMemo(
    () => filterExpensesByScope(expenses, { type: "direct" }),
    [expenses]
  )

  // Combined net (direct + group) for friend list display
  const getFriendNetBalance = React.useCallback(
    (friend: UserProfile) => {
      if (!user) return 0
      const direct = calculateDirectBalance(
        user.uid,
        friend.uid,
        directExpenses
      ).netBalancePaise
      const groupNet = groups
        .filter(
          (g) => g.members.includes(user.uid) && g.members.includes(friend.uid)
        )
        .reduce((sum, g) => {
          const gExp = expenses.filter(
            (e) => !e.deletedAt && e.groupId === g.id
          )
          return (
            sum +
            calculateDirectBalance(user.uid, friend.uid, gExp).netBalancePaise
          )
        }, 0)
      return direct + groupNet
    },
    [user, directExpenses, groups, expenses]
  )

  const handleConfirmRemove = () => {
    if (!removeTarget) return
    const target = removeTarget
    removeFriend.mutate(target.uid, {
      onSuccess: () => {
        toast.success(`${target.displayName} removed from friends`)
        setRemoveTarget(null)
      },
    })
  }

  return (
    <>
      <AppHeader
        title="My Friends"
        showBack
        rightAction={
          <ButtonLink
            href="/friends/add"
            data-tour="add-friend"
            variant="outline"
            size="icon"
            aria-label="Add Friend"
          >
            <HugeiconsIcon
              icon={UserAdd01Icon}
              className="size-5"
              strokeWidth={2.2}
            />
          </ButtonLink>
        }
      />

      <PageContainer className="max-w-4xl gap-5">
        {/* Friend Requests Banner */}
        <Item
          variant="outline"
          className="bg-card px-4 py-3"
          render={<Link href="/friends/requests" />}
        >
          <ItemMedia className="size-9 rounded-md bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserCheck01Icon} className="size-4.5" />
          </ItemMedia>
          <ItemContent className="gap-0.5">
            <ItemTitle className="font-semibold">Friend requests</ItemTitle>
            <ItemDescription className="text-xs">
              {pendingReceivedCount > 0 ? (
                <span className="font-medium text-primary">
                  {pendingReceivedCount} waiting for you
                </span>
              ) : (
                "Manage incoming and outgoing requests"
              )}
            </ItemDescription>
          </ItemContent>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-4 text-muted-foreground"
          />
        </Item>

        {/* Search Field */}
        <InputGroup className="h-11 bg-card">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSubmittedId("")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim())
                setSubmittedId(searchQuery.trim().toUpperCase())
            }}
            placeholder="Search name or JoySplit ID"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              aria-label="Scan a QR code"
              title="Scan a QR code"
              onClick={() => setScanning(true)}
            >
              <HugeiconsIcon icon={QrCodeIcon} className="size-4.5" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <QrScannerDialog open={scanning} onOpenChange={setScanning} />

        {/* A JoySplit ID that isn't one of your friends: show the person with Add Friend */}
        {lookupId &&
          !friendsQuery.data.some(
            (f) => f.splitzyId.toUpperCase() === lookupId
          ) && <IdLookupResult splitzyId={lookupId} />}

        {friendsQuery.isPending ? (
          <ListSkeleton rows={4} />
        ) : friendsQuery.isError ? (
          <QueryError
            error={friendsQuery.error}
            onRetry={friendsQuery.refetch}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Friends count and sort header */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {filteredFriends.length}{" "}
                {filteredFriends.length === 1 ? "friend" : "friends"}
              </span>
              <span>Recent activity first</span>
            </div>

            <Card data-tour="friend-list" className="gap-0 py-0">
              {filteredFriends.length === 0 ? (
                <p className="p-8 text-center text-xs text-muted-foreground">
                  No friends found matching &quot;{searchQuery}&quot;.
                  {!lookupId && " Press Enter to look it up as a JoySplit ID."}
                </p>
              ) : (
                <ItemGroup className="gap-0">
                  {filteredFriends.map((friend, i) => {
                    const netBalance = getFriendNetBalance(friend)

                    return (
                      <React.Fragment key={friend.uid}>
                        {i > 0 && <ItemSeparator className="my-0" />}
                        <Item className="flex-col flex-nowrap items-stretch gap-0 rounded-none px-4 py-3">
                          {/* Line 1: who, and where you stand with them */}
                          <div className="flex w-full min-w-0 items-center gap-3">
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                              onClick={() => openProfile(friend.uid)}
                            >
                              <UserAvatar
                                uid={friend.uid}
                                src={friend.photoURL}
                                name={friend.displayName}
                                size="md"
                                badge={
                                  isMoodId(friend.mood?.id) ? (
                                    <MoodFace
                                      mood={friend.mood.id}
                                      className="size-4.5 rounded-full ring-2 ring-card"
                                    />
                                  ) : undefined
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {friend.displayName}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {(() => {
                                    const bond = friendships.find((fs) =>
                                      fs.users?.includes(friend.uid)
                                    )?.bond
                                    return bond && isBondId(bond.type) ? (
                                      <span
                                        className={cn(
                                          "font-medium",
                                          bond.type === "love"
                                            ? "text-rose-500"
                                            : "text-primary"
                                        )}
                                      >
                                        {BONDS[bond.type].pair}
                                      </span>
                                    ) : (
                                      <span className="font-mono">
                                        {friend.splitzyId}
                                      </span>
                                    )
                                  })()}
                                  {netBalance === 0 && " · Settled up"}
                                </div>
                              </div>
                            </button>

                            <div className="flex shrink-0 flex-col items-end text-right">
                              {netBalance !== 0 ? (
                                <>
                                  <span
                                    className={cn(
                                      "text-[11px] font-medium",
                                      netBalance > 0
                                        ? "text-success/80"
                                        : "text-destructive/80"
                                    )}
                                  >
                                    {netBalance > 0 ? "Owes you" : "You owe"}
                                  </span>
                                  <GameDiscountAmount
                                    amountPaise={Math.abs(netBalance)}
                                    discount={gameDiscounts.byPerson.get(
                                      friend.uid
                                    )}
                                    now={gameDiscounts.now}
                                    className={cn(
                                      "text-xl leading-tight font-bold tracking-tight",
                                      netBalance > 0
                                        ? "text-success"
                                        : "text-destructive"
                                    )}
                                  />
                                </>
                              ) : (
                                // Settled: no second line, just a quick way to split again
                                <ButtonLink
                                  href={splitHref(friend.uid)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                >
                                  Split
                                </ButtonLink>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="-mr-2 text-muted-foreground"
                                    aria-label="Friend options"
                                  />
                                }
                              >
                                <HugeiconsIcon icon={MoreVerticalIcon} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => openProfile(friend.uid)}
                                >
                                  <HugeiconsIcon icon={UserIcon} />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(splitHref(friend.uid))
                                  }
                                >
                                  <HugeiconsIcon icon={Invoice01Icon} />
                                  Split Expense
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setRemoveTarget(friend)}
                                >
                                  <HugeiconsIcon icon={Delete02Icon} />
                                  Remove Friend
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Line 2: what you can do about it, filling the row. While a payment waits for your answer, the strip below asks instead */}
                          {netBalance !== 0 && (
                            <HideWhilePaymentPending personId={friend.uid}>
                              <div
                                className={cn(
                                  "mt-2.5 grid gap-2 pl-[3.25rem]",
                                  netBalance > 0 ? "grid-cols-2" : "grid-cols-1"
                                )}
                              >
                                {netBalance > 0 ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-full gap-1.5 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                                      disabled={sendReminder.isPending}
                                      onClick={() =>
                                        sendReminder.mutate({
                                          targetUserId: friend.uid,
                                          amountPaise: netBalance,
                                        })
                                      }
                                    >
                                      <HugeiconsIcon
                                        icon={Notification01Icon}
                                        className="size-3.5"
                                      />
                                      Remind
                                    </Button>
                                    <ChallengeButton
                                      className="w-full justify-center"
                                      person={{
                                        uid: friend.uid,
                                        name: friend.displayName,
                                        photoURL: friend.photoURL,
                                      }}
                                      owedPaise={netBalance}
                                    />
                                  </>
                                ) : (
                                  <PayPersonButton
                                    personId={friend.uid}
                                    personName={friend.displayName}
                                    size="sm"
                                    className="h-8 w-full text-xs"
                                    label={`Pay ${friend.displayName.split(" ")[0]}`}
                                  />
                                )}
                              </div>
                            </HideWhilePaymentPending>
                          )}

                          {/* Payment waiting for your answer, or disputed: one thin line under the row */}
                          <PaymentStatusStrip
                            className="mt-2.5 ml-[3.25rem]"
                            personId={friend.uid}
                            personName={friend.displayName}
                          />
                          {/* A game they sent you: see the deal and play */}
                          <ChallengeInviteStrip
                            className="mt-2.5 ml-[3.25rem]"
                            personId={friend.uid}
                          />
                        </Item>
                      </React.Fragment>
                    )
                  })}
                </ItemGroup>
              )}
            </Card>
          </div>
        )}
      </PageContainer>

      {/* Remove Friend Confirmation (with invariant enforcement) */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove friend"
        icon={UserRemove01Icon}
        destructive
        confirmLabel="Remove friend"
        isPending={removeFriend.isPending}
        confirmDisabled={!removalCheck.allowed}
        onConfirm={handleConfirmRemove}
        description={
          removeTarget && removalCheck.allowed && !removalCheck.reason ? (
            <>
              Are you sure you want to remove{" "}
              <strong>{removeTarget.displayName}</strong> from your friends?
              Historical expenses and group memberships will be preserved.
            </>
          ) : undefined
        }
      >
        {removeTarget && (
          <div className="flex flex-col gap-4">
            <Item variant="outline" size="sm">
              <ItemMedia>
                <UserAvatar
                  uid={removeTarget.uid}
                  src={removeTarget.photoURL}
                  name={removeTarget.displayName}
                  size="sm"
                />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="w-full truncate font-medium">
                  {removeTarget.displayName}
                </ItemTitle>
                <ItemDescription className="font-mono text-xs">
                  {removeTarget.splitzyId}
                </ItemDescription>
              </ItemContent>
            </Item>

            {!removalCheck.allowed ? (
              <Alert variant="destructive" className="text-xs">
                <HugeiconsIcon icon={Alert02Icon} />
                <AlertTitle className="font-medium">
                  Removal blocked: outstanding balance
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-2 text-xs">
                  <p>{removalCheck.reason}</p>
                  <p className="text-[11px]">
                    You must settle all pending debts with{" "}
                    {removeTarget.displayName} before removing this friendship.
                  </p>
                </AlertDescription>
              </Alert>
            ) : removalCheck.reason ? (
              <Alert className="text-xs">
                <HugeiconsIcon icon={Alert02Icon} className="text-warning" />
                <AlertTitle className="font-medium">
                  Outstanding receivable
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-2 text-xs">
                  <p>{removalCheck.reason}</p>
                  <p className="text-[11px]">
                    You may proceed to remove this friendship, but the balance
                    will remain tracked in your financial history.
                  </p>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
