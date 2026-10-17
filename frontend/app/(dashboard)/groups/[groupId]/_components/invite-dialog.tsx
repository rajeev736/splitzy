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

/** Invite by JoySplit ID (group invite / friend request / both) or from the friends list. */
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
  const [sendGroupInvite, setSendGroupInvite] = React.useState(true)
  const [sendFriendRequest, setSendFriendRequest] = React.useState(false)

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
    setSendGroupInvite(true)
    setSendFriendRequest(false)
    setSubmittedId(clean)
  }

  const inviteWithOption = (target: string, option: InviteOption) =>
    invite.mutate({ groupId: group.id, target, option }, { onSuccess: reset })

  const option: InviteOption =
    sendGroupInvite && sendFriendRequest ? "COMBINED" : sendGroupInvite ? "GROUP_ONLY" : "FRIEND_ONLY"

  const target = searchedUser?.found ? searchedUser.user : undefined
  const targetUid = target?.uid ?? ""
  const isSearchingInvite = invite.isPending && invite.variables?.target === targetUid

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Group</DialogTitle>
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
              Invite by JoySplit ID (Non-friends &amp; Friends)
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

                  {group.members.includes(targetUid) ? (
                    <p className="text-xs font-medium text-warning">Already a member of this group.</p>
                  ) : (
                    <div className="flex flex-col gap-3 pt-1">
                      <FieldGroup className="gap-2 rounded-lg border bg-card p-3">
                        {group.invitedMembers?.includes(targetUid) ? (
                          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                            Group invitation already sent and pending
                          </p>
                        ) : (
                          <Field orientation="horizontal" className="gap-2.5">
                            <Checkbox
                              id="invite-send-group"
                              checked={sendGroupInvite}
                              onCheckedChange={(checked) => setSendGroupInvite(checked)}
                            />
                            <FieldLabel htmlFor="invite-send-group" className="text-xs font-semibold">
                              Send group invitation
                            </FieldLabel>
                          </Field>
                        )}

                        {friends.some((f) => f.uid === targetUid) ? (
                          <p className="flex items-center gap-1.5 text-[11px] font-medium text-success">
                            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                            Already in your Friends list
                          </p>
                        ) : (
                          <Field orientation="horizontal" className="gap-2.5">
                            <Checkbox
                              id="invite-send-friend"
                              checked={sendFriendRequest}
                              onCheckedChange={(checked) => setSendFriendRequest(checked)}
                            />
                            <FieldLabel htmlFor="invite-send-friend" className="text-xs font-semibold">
                              Send friend request
                            </FieldLabel>
                          </Field>
                        )}
                      </FieldGroup>

                      <Alert className="border-primary/20 bg-primary/5">
                        <AlertDescription className="text-[11px] leading-relaxed text-foreground">
                          {sendGroupInvite && sendFriendRequest ? (
                            <span>
                              Will send a <strong>group invitation</strong> to &quot;{group.name}&quot; and a{" "}
                              <strong>friend request</strong>. Each can be accepted independently.
                            </span>
                          ) : sendGroupInvite ? (
                            <span>
                              Will send a <strong>group invitation</strong> to &quot;{group.name}&quot; only. No friend
                              request will be sent.
                            </span>
                          ) : sendFriendRequest ? (
                            <span>
                              Will send a <strong>friend request</strong> only. User will not be invited to &quot;
                              {group.name}&quot;.
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
                        disabled={(!sendGroupInvite && !sendFriendRequest) || isSearchingInvite}
                        onClick={() => inviteWithOption(targetUid, option)}
                      >
                        {isSearchingInvite && <Spinner />}
                        Send Request
                      </Button>
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
              onInvite={(uid) => inviteWithOption(uid, "GROUP_ONLY")}
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
