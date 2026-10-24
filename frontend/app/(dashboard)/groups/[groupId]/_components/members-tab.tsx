"use client"

import { Fragment } from "react"
import { Tick02Icon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { EmptyState } from "@/components/shared/empty-state"
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

  // Only show users in formerMembers who are NOT currently active members
  const formerMembers = (group.formerMembers ?? []).filter((id) => !group.members.includes(id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Members</CardTitle>
        <CardDescription className="text-xs">Group membership and balances</CardDescription>
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
                  footer={
                    <>
                      {isCurrent ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : isFriend ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                          Friends
                        </span>
                      ) : outgoingReq ? (
                        <span className="text-xs text-muted-foreground">Friend request sent</span>
                      ) : incomingReq ? (
                        <Button
                          size="xs"
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
                          size="xs"
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
                    </>
                  }
                  actions={
                    <div className="text-right">
                      {balance.netPaise !== 0 ? (
                        <Amount paise={balance.netPaise} signed className="text-sm font-semibold tabular-nums" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Settled</span>
                      )}
                    </div>
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
            className="border-t py-6"
          />
        )}

        {formerMembers.length > 0 && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Former members <span className="font-normal text-muted-foreground">({formerMembers.length})</span>
              </span>
              <span className="text-[11px] text-muted-foreground">Past activity preserved</span>
            </div>

            <ItemGroup className="gap-0">
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
                        <span className="text-xs text-muted-foreground">Left group</span>
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
