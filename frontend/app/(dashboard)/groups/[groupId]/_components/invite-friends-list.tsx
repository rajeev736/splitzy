"use client"

import { Fragment } from "react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import type { Group, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Accepted friends who aren't in the group yet, each with an Invite button. */
export function InviteFriendsList({
  group,
  friends,
  onInvite,
  pendingUid,
  className,
}: {
  group: Group
  friends: UserProfile[]
  onInvite: (friendUid: string) => void
  /** Friend currently being invited (shows a spinner on their button). */
  pendingUid?: string
  className?: string
}) {
  const nonMemberFriends = friends.filter((f) => !group.members.includes(f.uid))

  if (nonMemberFriends.length === 0) {
    return <p className="p-4 text-center text-xs text-muted-foreground">All your friends are already in this group.</p>
  }

  return (
    <div className={cn("max-h-52 overflow-y-auto", className)}>
      <ItemGroup className="gap-0">
        {nonMemberFriends.map((f, i) => {
          const isInvited = group.invitedMembers?.includes(f.uid) ?? false
          return (
            <Fragment key={f.uid}>
              {i > 0 && <ItemSeparator className="my-0" />}
              <Item size="xs" role="listitem" className="flex-nowrap px-0">
                <ItemMedia>
                  <UserAvatar src={f.photoURL} name={f.displayName} size="sm" />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="text-xs font-bold">{f.displayName}</ItemTitle>
                  <ItemDescription className="truncate font-mono text-[11px]">{f.splitzyId}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="sm"
                    variant={isInvited ? "secondary" : "outline"}
                    disabled={isInvited || pendingUid === f.uid}
                    onClick={() => onInvite(f.uid)}
                  >
                    {pendingUid === f.uid && <Spinner />}
                    {isInvited ? "Invited" : "Invite"}
                  </Button>
                </ItemActions>
              </Item>
            </Fragment>
          )
        })}
      </ItemGroup>
    </div>
  )
}
