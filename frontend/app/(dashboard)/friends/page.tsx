"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import {
  Alert02Icon,
  ArrowRight01Icon,
  AtIcon,
  Calendar03Icon,
  Delete02Icon,
  Invoice01Icon,
  MoreVerticalIcon,
  Notification01Icon,
  QrCodeIcon,
  Search01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserGroupIcon,
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
  PaymentDisputeLine,
  PaymentReceivedOr,
  PaymentStatusStrip,
  usePendingPaymentFrom,
} from "@/components/shared/payment-received-prompt"
import {
  GameDiscountAmount,
  GameDiscountTag,
} from "@/components/games/game-discount-amount"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  formatPaise,
} from "@/lib/money"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  const [profileFriend, setProfileFriend] = React.useState<UserProfile | null>(
    null
  )

  // ?friend=<uid> (e.g. right after adding a split with them) opens their profile once
  const friendParam = searchParams.get("friend")
  const [openedParam, setOpenedParam] = React.useState<string | null>(null)
  if (friendParam && friendParam !== openedParam) {
    const target = friendsQuery.data.find((f) => f.uid === friendParam)
    if (target) {
      setOpenedParam(friendParam)
      setProfileFriend(target)
    }
  }
  const [removeTarget, setRemoveTarget] = React.useState<UserProfile | null>(
    null
  )

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

  const profileGame = profileFriend
    ? gameDiscounts.byPerson.get(profileFriend.uid)
    : undefined
  // They reported a payment to you: the modal asks "received?" instead of offering Remind / Challenge
  const profilePending = usePendingPaymentFrom(profileFriend?.uid ?? "")

  // Raw balances with the profile friend: direct splits, and each shared group with an open balance
  const profileRaw = React.useMemo(() => {
    if (!user || !profileFriend) return null
    const direct = calculateDirectBalance(
      user.uid,
      profileFriend.uid,
      directExpenses
    )
    const groupRows = groups
      .filter(
        (g) =>
          g.members.includes(user.uid) && g.members.includes(profileFriend.uid)
      )
      .map((g) => {
        const groupExpenses = expenses.filter(
          (e) => !e.deletedAt && e.groupId === g.id
        )
        return {
          group: g,
          originalPaise: calculateDirectBalance(
            user.uid,
            profileFriend.uid,
            groupExpenses
          ).netBalancePaise,
        }
      })
      .filter((r) => r.originalPaise !== 0)
    return { direct, groupRows }
  }, [user, profileFriend, groups, expenses, directExpenses])

  // The live game discount lands on one balance, the same way the pay dialog applies it:
  // the game's own split if there's something to discount there, else direct, else the first group
  const profileGameOff = React.useMemo(() => {
    const d = profileGame
    if (!d || !profileRaw) return { key: null as string | null, offPaise: 0 }
    const offOn = (netPaise: number) =>
      Math.max(
        0,
        Math.min(d.discountPaise, d.role === "winner" ? -netPaise : netPaise)
      )
    const candidates = [
      ...(d.groupId
        ? profileRaw.groupRows
            .filter((r) => r.group.id === d.groupId)
            .map((r) => ({ key: r.group.id, net: r.originalPaise }))
        : []),
      { key: "direct", net: profileRaw.direct.netBalancePaise },
      ...profileRaw.groupRows.map((r) => ({
        key: r.group.id,
        net: r.originalPaise,
      })),
    ]
    const hit = candidates.find((c) => offOn(c.net) > 0)
    return hit
      ? { key: hit.key, offPaise: offOn(hit.net) }
      : { key: null, offPaise: 0 }
  }, [profileGame, profileRaw])

  const applyOff = (key: string, netPaise: number) => {
    const offPaise = profileGameOff.key === key ? profileGameOff.offPaise : 0
    return {
      netPaise:
        netPaise + (profileGame?.role === "winner" ? offPaise : -offPaise),
      offPaise,
    }
  }

  const profileDirect = profileRaw
    ? (() => {
        const { netPaise, offPaise } = applyOff(
          "direct",
          profileRaw.direct.netBalancePaise
        )
        return {
          ...profileRaw.direct,
          originalPaise: profileRaw.direct.netBalancePaise,
          netBalancePaise: netPaise,
          offPaise,
        }
      })()
    : null

  // Per-group balances for the profile friend (groups that BOTH are members of)
  const profileGroupBalances = (profileRaw?.groupRows ?? []).map((r) => ({
    ...r,
    ...applyOff(r.group.id, r.originalPaise),
  }))

  // Mutual expenses for the profile panel
  const mutualExpenses = React.useMemo(() => {
    if (!user || !profileFriend) return []
    return expenses.filter((exp) => {
      if (exp.deletedAt) return false
      const userInvolved =
        exp.payerId === user.uid ||
        exp.shares.some((s) => s.userId === user.uid)
      const friendInvolved =
        exp.payerId === profileFriend.uid ||
        exp.shares.some((s) => s.userId === profileFriend.uid)
      return userInvolved && friendInvolved
    })
  }, [user, profileFriend, expenses])

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

            <Card className="gap-0 py-0">
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
                              onClick={() => setProfileFriend(friend)}
                            >
                              <UserAvatar
                                src={friend.photoURL}
                                name={friend.displayName}
                                size="md"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {friend.displayName}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  <span className="font-mono">
                                    {friend.splitzyId}
                                  </span>
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
                                  onClick={() => setProfileFriend(friend)}
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

      {/* View Profile & Shared Expenses Dialog */}
      <Dialog
        open={!!profileFriend}
        onOpenChange={(open) => !open && setProfileFriend(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Friend profile</DialogTitle>
          </DialogHeader>
          {profileFriend && (
            <div className="-mx-4 flex flex-1 flex-col gap-4 overflow-y-auto px-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <UserAvatar
                  src={profileFriend.photoURL}
                  name={profileFriend.displayName}
                  size="lg"
                />
                <div>
                  <h3 className="text-base font-semibold">
                    {profileFriend.displayName}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    JoySplit ID: {profileFriend.splitzyId}
                  </p>
                </div>
              </div>

              {/* Contact & Meta Details */}
              <div className="flex flex-col divide-y border-y text-xs">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    <HugeiconsIcon icon={AtIcon} className="size-3.5" /> UPI ID
                  </span>
                  <span className="min-w-0 truncate font-mono font-medium">
                    {profileFriend.upiId || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" />{" "}
                    Member since
                  </span>
                  <span className="font-medium">
                    {new Date(profileFriend.createdAt).toLocaleDateString(
                      "en-IN",
                      { month: "short", year: "numeric" }
                    )}
                  </span>
                </div>
              </div>

              {/* They reported paying you: only ask whether it arrived (Remind / Challenge come back on "No") */}
              <PaymentReceivedOr
                className="border-b pb-4"
                personId={profileFriend.uid}
                personName={profileFriend.displayName}
              >
                {null}
              </PaymentReceivedOr>
              <PaymentDisputeLine
                personId={profileFriend.uid}
                personName={profileFriend.displayName}
              />
              <ChallengeInviteStrip personId={profileFriend.uid} />

              {/* Direct Splits Balance */}
              {profileDirect && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Invoice01Icon}
                      className="size-4 text-muted-foreground"
                    />
                    <span className="text-sm font-semibold">Direct splits</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        Direct balance
                      </div>
                      {profileDirect.offPaise > 0 && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatPaise(Math.abs(profileDirect.originalPaise))}
                        </div>
                      )}
                      {profileDirect.netBalancePaise > 0 ? (
                        <div className="text-base font-semibold text-success tabular-nums">
                          +{formatPaise(profileDirect.netBalancePaise)}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            owes you
                          </span>
                        </div>
                      ) : profileDirect.netBalancePaise < 0 ? (
                        <div className="text-base font-semibold text-destructive tabular-nums">
                          -
                          {formatPaise(Math.abs(profileDirect.netBalancePaise))}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            you owe
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-muted-foreground">
                          Settled
                        </div>
                      )}
                      {profileGame && (
                        <GameDiscountTag
                          className="mt-1"
                          discountPaise={profileDirect.offPaise}
                          endsAt={profileGame.expiresAt}
                          now={gameDiscounts.now}
                        />
                      )}
                    </div>
                    <div className="shrink-0">
                      {profilePending ? null : profileDirect.netBalancePaise >
                        0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={sendReminder.isPending}
                          onClick={() =>
                            sendReminder.mutate({
                              targetUserId: profileFriend.uid,
                              amountPaise: profileDirect.netBalancePaise,
                            })
                          }
                        >
                          <HugeiconsIcon
                            icon={Notification01Icon}
                            className="size-3.5"
                          />
                          Remind
                        </Button>
                      ) : profileDirect.netBalancePaise < 0 ? (
                        <PayPersonButton
                          personId={profileFriend.uid}
                          personName={profileFriend.displayName}
                          size="sm"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Group Balances */}
              {profileGroupBalances.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={UserGroupIcon}
                      className="size-4 text-muted-foreground"
                    />
                    <span className="text-sm font-semibold">
                      Group balances
                    </span>
                  </div>
                  <div className="flex flex-col divide-y border-y">
                    {profileGroupBalances.map(
                      ({ group, netPaise, offPaise, originalPaise }) => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {group.name}
                            </div>
                            {offPaise > 0 && (
                              <div className="text-[11px] text-muted-foreground line-through">
                                {formatPaise(Math.abs(originalPaise))}
                              </div>
                            )}
                            {netPaise > 0 ? (
                              <div className="text-xs font-medium text-success tabular-nums">
                                +{formatPaise(netPaise)} — they owe you
                              </div>
                            ) : (
                              <div className="text-xs font-medium text-destructive tabular-nums">
                                -{formatPaise(Math.abs(netPaise))} — you owe
                              </div>
                            )}
                            {profileGame && (
                              <GameDiscountTag
                                className="mt-1"
                                discountPaise={offPaise}
                                endsAt={profileGame.expiresAt}
                                now={gameDiscounts.now}
                              />
                            )}
                          </div>
                          <div className="ml-3 flex shrink-0 gap-2">
                            {netPaise > 0 ? (
                              profilePending ? null : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-[11px]"
                                  disabled={sendReminder.isPending}
                                  onClick={() =>
                                    sendReminder.mutate({
                                      targetUserId: profileFriend.uid,
                                      amountPaise: netPaise,
                                    })
                                  }
                                >
                                  <HugeiconsIcon
                                    icon={Notification01Icon}
                                    className="size-3"
                                  />
                                  Remind
                                </Button>
                              )
                            ) : (
                              <PayPersonButton
                                personId={profileFriend.uid}
                                personName={`${profileFriend.displayName} (${group.name})`}
                                size="sm"
                              />
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Combined Pay All — if owing across multiple contexts */}
              {(() => {
                const directOwe =
                  profileDirect && profileDirect.netBalancePaise < 0
                    ? Math.abs(profileDirect.netBalancePaise)
                    : 0
                const groupOwe = profileGroupBalances
                  .filter((r) => r.netPaise < 0)
                  .reduce((s, r) => s + Math.abs(r.netPaise), 0)
                const totalOwe = directOwe + groupOwe
                const hasMultipleContexts =
                  (directOwe > 0 ? 1 : 0) +
                    profileGroupBalances.filter((r) => r.netPaise < 0).length >
                  1
                if (!hasMultipleContexts || totalOwe === 0) return null
                return (
                  <div className="flex items-center justify-between gap-3 border-t pt-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        Pay all at once
                      </div>
                      <div className="text-sm font-semibold text-destructive tabular-nums">
                        -{formatPaise(totalOwe)} total
                      </div>
                    </div>
                    <PayPersonButton
                      personId={profileFriend.uid}
                      personName={profileFriend.displayName}
                      size="sm"
                    />
                  </div>
                )
              })()}

              {/* They owe you overall: challenge them to a game */}
              {getFriendNetBalance(profileFriend) > 0 && !profilePending && (
                <div className="flex items-center justify-between gap-3 border-t pt-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Settle-up game</div>
                    <div className="text-xs text-muted-foreground">
                      Play {profileFriend.displayName} for a discount on the{" "}
                      {formatPaise(getFriendNetBalance(profileFriend))} they owe
                    </div>
                  </div>
                  <ChallengeButton
                    person={{
                      uid: profileFriend.uid,
                      name: profileFriend.displayName,
                      photoURL: profileFriend.photoURL,
                    }}
                    owedPaise={getFriendNetBalance(profileFriend)}
                  />
                </div>
              )}

              {/* Shared Expenses (Group & Personal) */}
              <div className="flex flex-col gap-2 border-t pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">
                    Shared expenses ({mutualExpenses.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Group & personal
                  </span>
                </div>

                {mutualExpenses.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No shared expenses between you and{" "}
                    {profileFriend.displayName} yet.
                  </div>
                ) : (
                  <div className="-mx-2 flex flex-col">
                    {mutualExpenses.map((exp) => (
                      <Link
                        key={exp.id}
                        href={`/expenses/${exp.id}`}
                        onClick={() => setProfileFriend(null)}
                        className="flex items-center justify-between rounded-md px-2 py-2.5 transition-colors hover:bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {exp.title}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {exp.groupId ? exp.groupName || "Group" : "Direct"}{" "}
                            •{" "}
                            {exp.payerId === user?.uid
                              ? "You paid"
                              : `${exp.payerName} paid`}{" "}
                            • {exp.date}
                          </div>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-1.5">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatPaise(exp.amountPaise)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            View
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="grid grid-cols-2">
            <Button variant="outline" onClick={() => setProfileFriend(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!profileFriend) return
                const targetId = profileFriend.uid
                setProfileFriend(null)
                router.push(splitHref(targetId))
              }}
            >
              Split Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
