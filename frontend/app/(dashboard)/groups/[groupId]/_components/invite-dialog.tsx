"use client"

import * as React from "react"
import { Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useInviteGroupMember } from "@/hooks/mutations"
import { useFriends, useUserSearch } from "@/hooks/queries"
import type { Group } from "@/lib/types"
import type { InviteOption } from "@/services/groups"
import { InviteFriendsList } from "./invite-friends-list"

/** A done-already line in place of a checkbox. */
function DoneLine({ children, tone = "text-primary" }: { children: React.ReactNode; tone?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}>
      <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
      {children}
    </p>
  )
}

/**
 * Invite by JoySplit ID (group invitation, friend request, or both) or from
 * the friends list. Each option is offered only while it still applies, so a
 * pending group invite never blocks sending just the friend request.
 */
export function InviteDialog({
  group,
  open,
  onOpenChange,
}: {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: friends } = useFriends()
  const invite = useInviteGroupMember()

  const [splitzyIdInput, setSplitzyIdInput] = React.useState("")
  const [submittedId, setSubmittedId] = React.useState("")
  const [wantGroupInvite, setWantGroupInvite] = React.useState(true)
  const [wantFriendRequest, setWantFriendRequest] = React.useState(false)

  const search = useUserSearch(submittedId)
  const searchedUser = submittedId ? search.data : undefined

  const reset = () => {
    setSubmittedId("")
    setSplitzyIdInput("")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSearch = () => {
    const clean = splitzyIdInput.trim().toUpperCase()
    if (!clean) return
    setWantGroupInvite(true)
    setWantFriendRequest(false)
    setSubmittedId(clean)
  }

  const target = searchedUser?.found ? searchedUser.user : undefined
  const targetUid = target?.uid ?? ""
  const isSelf = searchedUser?.status === "SELF"

  // What's still possible for this person
  const isMember = group.members.includes(targetUid)
  const isGroupInvited = !!group.invitedMembers?.includes(targetUid)
  const canGroupInvite = !isSelf && !isMember && !isGroupInvited
  const isFriend = searchedUser?.status === "FRIENDS" || friends.some((f) => f.uid === targetUid)
  const canFriendRequest = !isSelf && !isFriend && searchedUser?.status === "CAN_ADD"

  const sendGroup = canGroupInvite && wantGroupInvite
  const sendFriend = canFriendRequest && wantFriendRequest
  const option: InviteOption | null =
    sendGroup && sendFriend ? "COMBINED" : sendGroup ? "GROUP_ONLY" : sendFriend ? "FRIEND_ONLY" : null

  const isSending = invite.isPending && invite.variables?.target === targetUid

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Group</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
          >
            <FieldLabel htmlFor="invite-joysplit-id" className="text-xs font-semibold">
              Add by JoySplit ID (Non-friends &amp; Friends)
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id="invite-joysplit-id"
                value={splitzyIdInput}
                onChange={(e) => setSplitzyIdInput(e.target.value)}
                placeholder="e.g. JOY-6LWH3W"
                className="font-mono text-xs"
              />
              <Button type="submit" variant="outline" disabled={search.isFetching}>
                {search.isFetching ? <Spinner /> : <HugeiconsIcon icon={Search01Icon} data-icon="inline-start" />}
                Search
              </Button>
            </div>
          </form>

          {searchedUser && (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-3.5">
              {target ? (
                <>
                  <div className="flex items-center gap-3">
                    <UserAvatar src={target.photoURL} name={target.displayName || "User"} size="md" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold">{target.displayName}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">{target.splitzyId}</div>
                    </div>
                  </div>

                  {isSelf ? (
                    <p className="text-xs font-medium text-muted-foreground">This is your own JoySplit ID.</p>
                  ) : (
                    <div className="flex flex-col gap-3 pt-1">
                      <FieldGroup className="gap-2 rounded-lg border bg-card p-3">
                        {isMember ? (
                          <DoneLine>Already a member of this group</DoneLine>
                        ) : (
                          <Field orientation="horizontal" className="gap-2.5">
                            <Checkbox
                              id="invite-send-group"
                              checked={wantGroupInvite}
                              onCheckedChange={(checked) => setWantGroupInvite(checked)}
                            />
                            <FieldLabel htmlFor="invite-send-group" className="text-xs font-semibold">
                              Add directly to group (no approval needed)
                            </FieldLabel>
                          </Field>
                        )}

                        {isFriend ? (
                          <DoneLine tone="text-success">Already in your Friends list</DoneLine>
                        ) : searchedUser.status === "REQUEST_SENT" ? (
                          <DoneLine>Friend request already sent</DoneLine>
                        ) : searchedUser.status === "REQUEST_RECEIVED" ? (
                          <DoneLine>They sent you a friend request — accept it in Friend Requests</DoneLine>
                        ) : (
                          <Field orientation="horizontal" className="gap-2.5">
                            <Checkbox
                              id="invite-send-friend"
                              checked={wantFriendRequest}
                              onCheckedChange={(checked) => setWantFriendRequest(checked)}
                            />
                            <FieldLabel htmlFor="invite-send-friend" className="text-xs font-semibold">
                              Send friend request (requires their approval)
                            </FieldLabel>
                          </Field>
                        )}
                      </FieldGroup>

                      {canGroupInvite || canFriendRequest ? (
                        <>
                          <Alert className="border-primary/20 bg-primary/5">
                            <AlertDescription className="text-[11px] leading-relaxed text-foreground">
                              {option === "COMBINED" ? (
                                <span>
                                  Will add directly to <strong>{group.name}</strong> and send a{" "}
                                  <strong>friend request</strong>.
                                </span>
                              ) : option === "GROUP_ONLY" ? (
                                <span>
                                  Will add directly to <strong>{group.name}</strong> immediately without requiring approval.
                                </span>
                              ) : option === "FRIEND_ONLY" ? (
                                <span>
                                  Will send a <strong>friend request</strong> only (requires approval).
                                </span>
                              ) : (
                                <span className="font-semibold text-warning">
                                  Please select at least one action above to continue.
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>

                          <Button
                            size="sm"
                            className="w-full"
                            disabled={!option || isSending}
                            onClick={() =>
                              option &&
                              invite.mutate({ groupId: group.id, target: targetUid, option }, { onSuccess: reset })
                            }
                          >
                            {isSending && <Spinner />}
                            {option === "FRIEND_ONLY" ? "Send Request" : "Add to Group"}
                          </Button>
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Nothing more to send to this person.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-destructive">{searchedUser.message || "User not found"}</p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold">Or invite from your friends list:</span>
            <InviteFriendsList
              group={group}
              friends={friends}
              pendingUid={invite.isPending ? invite.variables?.target : undefined}
              onInvite={(uid) => invite.mutate({ groupId: group.id, target: uid, option: "GROUP_ONLY" })}
            />
          </div>

          <Button variant="secondary" className="w-full" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
