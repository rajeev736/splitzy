"use client"

import * as React from "react"
import Link from "next/link"
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
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item"
import { useRemoveFriend, useSendFriendBalanceReminder } from "@/hooks/mutations"
import { useExpenses, useFriendRequests, useFriends } from "@/hooks/queries"
import { calculateDirectBalance, canRemoveFriend, formatPaise } from "@/lib/money"
import type { UserProfile } from "@/lib/types"

import { IdLookupResult, JOYSPLIT_ID_PATTERN } from "./_components/id-lookup-result"

const splitHref =(uid: string) => `/expenses/new?friend=${uid}`

export default function FriendsPage() {
  const router = useRouter()
  const { user } = useSession()
  const friendsQuery = useFriends()
  const { data: friendRequests } = useFriendRequests()
  const { data: expenses } = useExpenses()
  const removeFriend = useRemoveFriend()
  const sendReminder = useSendFriendBalanceReminder()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [profileFriend, setProfileFriend] = React.useState<UserProfile | null>(null)
  const [removeTarget, setRemoveTarget] = React.useState<UserProfile | null>(null)

  const pendingReceivedCount = React.useMemo(() => {
    if (!user?.uid) return 0
    const seen = new Set<string>()
    return friendRequests
      .filter((r) => r.status === "PENDING" && r.receiverId === user.uid)
      .filter((r) => {
        const key = r.senderId || r.senderSplitzyId?.toUpperCase() || r.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).length
  }, [friendRequests, user?.uid])

  // Full JoySplit IDs are looked up as you type; anything else on Enter
  const [submittedId, setSubmittedId] = React.useState("")
  const typedId = searchQuery.trim().toUpperCase()
  const lookupId = JOYSPLIT_ID_PATTERN.test(typedId) ? typedId : submittedId

  const q = searchQuery.toLowerCase()
  const filteredFriends = friendsQuery.data.filter(
    (f) => f.displayName.toLowerCase().includes(q) || f.splitzyId.toLowerCase().includes(q)
  )

  // Removal invariant for the friend in the confirmation dialog
  const removalCheck =
    removeTarget && user ? canRemoveFriend(user.uid, removeTarget.uid, expenses) : { allowed: true, reason: "" }

  const profileDirect = React.useMemo(() => {
    if (!user || !profileFriend) return null
    return calculateDirectBalance(user.uid, profileFriend.uid, expenses)
  }, [user, profileFriend, expenses])

  const mutualExpenses = React.useMemo(() => {
    if (!user || !profileFriend) return []
    return expenses.filter((exp) => {
      if (exp.deletedAt) return false
      const userInvolved = exp.payerId === user.uid || exp.shares.some((s) => s.userId === user.uid)
      const friendInvolved =
        exp.payerId === profileFriend.uid || exp.shares.some((s) => s.userId === profileFriend.uid)
      return userInvolved && friendInvolved
    })
  }, [user, profileFriend, expenses])

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
          <ButtonLink href="/friends/add" variant="secondary" size="icon" className="rounded-full" aria-label="Add Friend">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-5" strokeWidth={2.2} />
          </ButtonLink>
        }
      />

      <PageContainer className="max-w-4xl gap-5">
        {/* Friend Requests Banner */}
        <Item variant="outline" className="bg-secondary/60 p-4" render={<Link href="/friends/requests" />}>
          <ItemMedia className="size-10 rounded-xl bg-primary text-primary-foreground">
            <HugeiconsIcon icon={UserCheck01Icon} className="size-5" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="font-bold">
              Friend Requests
              {pendingReceivedCount > 0 && <Badge variant="destructive">{pendingReceivedCount}</Badge>}
            </ItemTitle>
            <ItemDescription className="text-xs">Manage incoming and outgoing requests</ItemDescription>
          </ItemContent>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-5 text-primary" />
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
              if (e.key === "Enter" && searchQuery.trim()) setSubmittedId(searchQuery.trim().toUpperCase())
            }}
            placeholder="Search friends, or enter a JoySplit ID to find someone new..."
          />
        </InputGroup>

        {/* A JoySplit ID that isn't one of your friends: show the person with Add Friend */}
        {lookupId && !friendsQuery.data.some((f) => f.splitzyId.toUpperCase() === lookupId) && (
          <IdLookupResult splitzyId={lookupId} />
        )}

        {friendsQuery.isPending ? (
          <ListSkeleton rows={4} />
        ) : friendsQuery.isError ? (
          <QueryError error={friendsQuery.error} onRetry={friendsQuery.refetch} />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Friends count and sort header */}
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{filteredFriends.length} Friends</span>
              <span className="text-primary">A-Z ▾</span>
            </div>

            <Card className="py-1">
              {filteredFriends.length === 0 ? (
                <p className="p-8 text-center text-xs text-muted-foreground">
                  No friends found matching &quot;{searchQuery}&quot;.
                  {!lookupId && " Press Enter to look it up as a JoySplit ID."}
                </p>
              ) : (
                <ItemGroup className="gap-0 px-1">
                  {filteredFriends.map((friend, i) => {
                    const direct = user
                      ? calculateDirectBalance(user.uid, friend.uid, expenses)
                      : { netBalancePaise: 0 }

                    return (
                      <React.Fragment key={friend.uid}>
                        {i > 0 && <ItemSeparator className="my-0" />}
                        <Item className="px-3 py-3">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 text-left"
                            onClick={() => setProfileFriend(friend)}
                          >
                            <UserAvatar src={friend.photoURL} name={friend.displayName} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-bold">{friend.displayName}</span>
                                {direct.netBalancePaise > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="border-success/30 bg-success/10 text-success text-[10px] font-bold"
                                  >
                                    +{formatPaise(direct.netBalancePaise)}
                                  </Badge>
                                ) : direct.netBalancePaise < 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] font-bold"
                                  >
                                    -{formatPaise(Math.abs(direct.netBalancePaise))}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-medium">Settled</span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                                <span>{friend.splitzyId}</span>
                                {friend.upiId && (
                                  <>
                                    <span>•</span>
                                    <Badge className="h-4 bg-success/10 px-1.5 font-sans text-[10px] text-success">
                                      {friend.upiId}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>

                          <ItemActions className="gap-2">
                            {direct.netBalancePaise > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 border-success/40 px-2.5 text-xs font-bold text-success hover:bg-success/10"
                                disabled={sendReminder.isPending}
                                onClick={() =>
                                  sendReminder.mutate({
                                    targetUserId: friend.uid,
                                    amountPaise: direct.netBalancePaise,
                                  })
                                }
                              >
                                <HugeiconsIcon icon={Notification01Icon} className="size-3.5" />
                                Remind
                              </Button>
                            ) : direct.netBalancePaise < 0 ? (
                              <PayPersonButton
                                personId={friend.uid}
                                personName={friend.displayName}
                                size="sm"
                              />
                            ) : (
                              <ButtonLink href={splitHref(friend.uid)} variant="secondary" size="sm" className="font-bold">
                                Split
                              </ButtonLink>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon-sm" aria-label="Friend options" />}
                              >
                                <HugeiconsIcon icon={MoreVerticalIcon} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => setProfileFriend(friend)}>
                                  <HugeiconsIcon icon={UserIcon} />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(splitHref(friend.uid))}>
                                  <HugeiconsIcon icon={Invoice01Icon} />
                                  Split Expense
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setRemoveTarget(friend)}>
                                  <HugeiconsIcon icon={Delete02Icon} />
                                  Remove Friend
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </ItemActions>
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
      <Dialog open={!!profileFriend} onOpenChange={(open) => !open && setProfileFriend(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Friend Profile & Expenses</DialogTitle>
          </DialogHeader>
          {profileFriend && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
              <div className="flex flex-col items-center gap-2 text-center">
                <UserAvatar src={profileFriend.photoURL} name={profileFriend.displayName} size="xl" />
                <div>
                  <h3 className="text-base font-bold">{profileFriend.displayName}</h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    JoySplit ID: {profileFriend.splitzyId}
                  </p>
                </div>
              </div>

              {/* Balance Card */}
              {profileDirect && (
                <div className="flex items-center justify-between rounded-2xl border p-4 bg-muted/40">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Net Mutual Balance
                    </div>
                    {profileDirect.netBalancePaise > 0 ? (
                      <div className="text-lg font-extrabold text-success">
                        +{formatPaise(profileDirect.netBalancePaise)}
                        <span className="ml-1.5 text-xs font-semibold text-muted-foreground">(owes you)</span>
                      </div>
                    ) : profileDirect.netBalancePaise < 0 ? (
                      <div className="text-lg font-extrabold text-destructive">
                        -{formatPaise(Math.abs(profileDirect.netBalancePaise))}
                        <span className="ml-1.5 text-xs font-semibold text-muted-foreground">(you owe)</span>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-muted-foreground">All Settled Up</div>
                    )}
                  </div>
                  <div>
                    {profileDirect.netBalancePaise > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-success/40 text-xs font-bold text-success hover:bg-success/10"
                        disabled={sendReminder.isPending}
                        onClick={() =>
                          sendReminder.mutate({
                            targetUserId: profileFriend.uid,
                            amountPaise: profileDirect.netBalancePaise,
                          })
                        }
                      >
                        <HugeiconsIcon icon={Notification01Icon} className="size-3.5" />
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
              )}

              {/* Contact & Meta Details */}
              <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <HugeiconsIcon icon={AtIcon} className="size-3.5" /> UPI ID:
                  </span>
                  <span className="font-mono font-bold">{profileFriend.upiId || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" /> Member Since:
                  </span>
                  <span className="font-semibold">
                    {new Date(profileFriend.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Shared Expenses (Group & Personal) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-tight">
                    Shared Expenses ({mutualExpenses.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Group & Personal</span>
                </div>

                {mutualExpenses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No shared expenses between you and {profileFriend.displayName} yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {mutualExpenses.map((exp) => (
                      <Link
                        key={exp.id}
                        href={`/expenses/${exp.id}`}
                        onClick={() => setProfileFriend(null)}
                        className="flex items-center justify-between rounded-xl border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-bold">{exp.title}</span>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                              {exp.groupId ? (exp.groupName || "Group") : "Personal"}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {exp.payerId === user?.uid ? "You paid" : `${exp.payerName} paid`} • {exp.date}
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <div className="text-xs font-bold">{formatPaise(exp.amountPaise)}</div>
                          <span className="text-[10px] text-primary font-semibold">View &rarr;</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="grid grid-cols-2 mt-4">
            <Button variant="secondary" onClick={() => setProfileFriend(null)}>
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
        title="Remove Friend"
        icon={UserRemove01Icon}
        destructive
        confirmLabel="Remove Friend"
        isPending={removeFriend.isPending}
        confirmDisabled={!removalCheck.allowed}
        onConfirm={handleConfirmRemove}
        description={
          removeTarget && removalCheck.allowed && !removalCheck.reason ? (
            <>
              Are you sure you want to remove <strong>{removeTarget.displayName}</strong> from your friends? Historical
              expenses and group memberships will be preserved.
            </>
          ) : undefined
        }
      >
        {removeTarget && (
          <div className="flex flex-col gap-4">
            <Item variant="muted" className="rounded-2xl">
              <ItemMedia>
                <UserAvatar src={removeTarget.photoURL} name={removeTarget.displayName} size="md" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="font-bold">{removeTarget.displayName}</ItemTitle>
                <ItemDescription className="font-mono text-xs">{removeTarget.splitzyId}</ItemDescription>
              </ItemContent>
            </Item>

            {!removalCheck.allowed ? (
              <Alert variant="destructive" className="bg-destructive/10 text-xs">
                <HugeiconsIcon icon={Alert02Icon} />
                <AlertTitle className="font-bold">Removal Blocked — Outstanding Debt</AlertTitle>
                <AlertDescription className="flex flex-col gap-2 text-xs">
                  <p>{removalCheck.reason}</p>
                  <p className="text-[11px] font-semibold">
                    You must settle all pending debts with {removeTarget.displayName} before removing this friendship.
                  </p>
                </AlertDescription>
              </Alert>
            ) : removalCheck.reason ? (
              <Alert className="border-warning/30 bg-warning/10 text-xs text-warning">
                <HugeiconsIcon icon={Alert02Icon} />
                <AlertTitle className="font-bold">Notice: Outstanding Receivable</AlertTitle>
                <AlertDescription className="flex flex-col gap-2 text-xs text-warning">
                  <p>{removalCheck.reason}</p>
                  <p className="text-[11px]">
                    You may proceed to remove this friendship, but the balance will remain tracked in your financial
                    history.
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
