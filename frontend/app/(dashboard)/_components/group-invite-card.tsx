"use client"

import { useSession } from "@/components/providers/session-provider"
import { GroupIcon } from "@/components/shared/group-icon"
import { Button } from "@/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useAcceptGroupInvite, useDeclineGroupInvite } from "@/hooks/mutations"
import { useFriendRequests } from "@/hooks/queries"
import type { Group } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * A pending group invitation with accept / decline. When the inviter also sent
 * a friend request with it, offers to accept both in one tap.
 */
export function GroupInviteCard({
  group,
  onAccepted,
  className,
}: {
  group: Group
  onAccepted?: () => void
  className?: string
}) {
  const { user } = useSession()
  const { data: friendRequests } = useFriendRequests()
  const accept = useAcceptGroupInvite()
  const decline = useDeclineGroupInvite({ successMessage: "Group invitation declined" })

  const linkedRequest = friendRequests.find(
    (r) => r.status === "PENDING" && r.groupId === group.id && r.receiverId === user?.uid
  )
  const inviterName =
    (user && group.invitedMemberDetails?.[user.uid]?.invitedByName) ||
    linkedRequest?.senderName ||
    group.creatorName ||
    group.memberDetails?.[group.createdBy]?.name
  const busy = accept.isPending || decline.isPending

  return (
    <Item variant="outline" className={cn("flex-wrap border-primary/30 bg-primary/5", className)}>
      <ItemMedia>
        <GroupIcon src={group.icon} alt={group.name} size="md" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="block w-full truncate font-bold">{group.name}</ItemTitle>
        <ItemDescription className="text-xs">
          {inviterName ? `${inviterName} invited you` : "You're invited"} · {group.members.length} members
        </ItemDescription>
        {linkedRequest && (
          <span className="text-[11px] font-medium text-primary">Also sent you a friend request</span>
        )}
      </ItemContent>
      <ItemActions>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => decline.mutate({ groupId: group.id })}
        >
          {decline.isPending && <Spinner />}
          Decline
        </Button>
        <Button
          size="sm"
          variant={linkedRequest ? "outline" : "default"}
          disabled={busy}
          onClick={() => accept.mutate({ groupId: group.id }, { onSuccess: onAccepted })}
        >
          {accept.isPending && !accept.variables?.friendRequestId && <Spinner />}
          {linkedRequest ? "Join only" : "Join Group"}
        </Button>
      </ItemActions>
      {linkedRequest && (
        <ItemFooter className="justify-end">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              accept.mutate({ groupId: group.id, friendRequestId: linkedRequest.id }, { onSuccess: onAccepted })
            }
          >
            {accept.isPending && accept.variables?.friendRequestId && <Spinner />}
            Join &amp; Accept Friend Request
          </Button>
        </ItemFooter>
      )}
    </Item>
  )
}
