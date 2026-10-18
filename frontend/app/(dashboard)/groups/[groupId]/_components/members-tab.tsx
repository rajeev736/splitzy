"use client"

import { Fragment } from "react"
import { Tick02Icon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ItemGroup, ItemSeparator } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useAcceptFriendRequest, useSendFriendRequest } from "@/hooks/mutations"
import { useFriendRequests, useFriends } from "@/hooks/queries"
import { calculateMemberGroupBalance } from "@/lib/money"
import type { Expense, Group } from "@/lib/types"
import { MemberRow } from "./member-row"
import { PendingInvites } from "./pending-invites"

export function MembersTab({
  group,
  expenses,
  onInvite,
}: {
  group: Group
  expenses: Expense[]
  onInvite: () => void
}) {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const { data: friendRequests } = useFriendRequests()
  const sendFriendRequest = useSendFriendRequest()
  const acceptFriendRequest = useAcceptFriendRequest({ successMessage: "Friend request accepted!" })

  const formerMembers = group.formerMembers ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">Group Members</CardTitle>
        <CardDescription className="text-xs">Authoritative group membership and balances</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline" onClick={onInvite}>
            <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
            Invite
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ItemGroup className="gap-0">
          {group.members.map((mId, i) => {
            const info = group.memberDetails?.[mId]
            const fr = friends.find((f) => f.uid === mId)
            const balance = calculateMemberGroupBalance(mId, group.id, expenses)
            const isCurrent = mId === user?.uid
            const isFriend = !!fr
            const outgoingReq = friendRequests.find(
              (r) => r.status === "PENDING" && r.senderId === user?.uid && r.receiverId === mId
            )
            const incomingReq = friendRequests.find(
              (r) => r.status === "PENDING" && r.receiverId === user?.uid && r.senderId === mId
            )
            const memberSplitzyId = info?.splitzyId || fr?.splitzyId || ""
            const displayName = info?.name || fr?.displayName || `User ${mId.slice(-4)}`
            const target = memberSplitzyId || mId

            return (
              <Fragment key={mId}>
                {i > 0 && <ItemSeparator className="my-0" />}
                <MemberRow
                  name={displayName}
                  photoURL={info?.photoURL || fr?.photoURL}
                  splitzyId={memberSplitzyId || mId}
                  isCreator={mId === group.createdBy}
                  isAdmin={info?.role === "admin"}
                  actions={
                    <>
                      {isCurrent ? (
                        <Badge variant="secondary" className="font-bold">
                          You
                        </Badge>
                      ) : isFriend ? (
                        <Badge className="bg-success/10 font-bold text-success">
                          <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
                          Friends
                        </Badge>
                      ) : outgoingReq ? (
                        <Badge className="bg-primary/10 font-bold text-primary">Request Sent</Badge>
                      ) : incomingReq ? (
                        <Button
                          size="sm"
                          disabled={acceptFriendRequest.isPending && acceptFriendRequest.variables === incomingReq.id}
                          onClick={() => acceptFriendRequest.mutate(incomingReq.id)}
                        >
                          {acceptFriendRequest.isPending && acceptFriendRequest.variables === incomingReq.id && (
                            <Spinner />
                          )}
                          Accept Request
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendFriendRequest.isPending && sendFriendRequest.variables === target}
                          onClick={() => sendFriendRequest.mutate(target)}
                        >
                          {sendFriendRequest.isPending && sendFriendRequest.variables === target ? (
                            <Spinner />
                          ) : (
                            <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
                          )}
                          Add Friend
                        </Button>
                      )}

                      <div className="min-w-16 text-right">
                        {balance.netPaise !== 0 ? (
                          <Amount paise={balance.netPaise} signed className="text-xs font-bold" />
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">Settled</span>
                        )}
                      </div>
                    </>
                  }
                />
              </Fragment>
            )
          })}
        </ItemGroup>

        <PendingInvites group={group} />

        {group.members.length === 1 && !group.invitedMembers?.length && (
          <EmptyState
            icon={UserGroupIcon}
            title="No other members yet"
            description="Invite friends or search by JoySplit ID to split expenses together."
            action={{ label: "Invite Members", onClick: onInvite }}
            className="rounded-xl border border-dashed bg-muted/30 py-6"
          />
        )}

        {formerMembers.length > 0 && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Former Members ({formerMembers.length})
              </span>
              <span className="text-[11px] text-muted-foreground">Past activity preserved</span>
            </div>

            <ItemGroup className="gap-0 rounded-xl border bg-muted/40 px-3">
              {formerMembers.map((mId, i) => {
                const info = group.formerMemberDetails?.[mId] || group.memberDetails?.[mId]
                return (
                  <Fragment key={mId}>
                    {i > 0 && <ItemSeparator className="my-0" />}
                    <MemberRow
                      name={info?.name || "Former Member"}
                      photoURL={info?.photoURL}
                      splitzyId={info?.splitzyId || mId}
                      size="sm"
                      muted
                      actions={
                        <Badge variant="secondary" className="font-semibold text-muted-foreground">
                          Left Group
                        </Badge>
                      }
                    />
                  </Fragment>
                )
              })}
            </ItemGroup>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
