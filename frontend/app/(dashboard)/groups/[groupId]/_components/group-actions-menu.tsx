"use client"

import {
  Delete02Icon,
  Logout01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Header 3-dot menu: members, invite, edit, and leave (member) / delete (creator). */
export function GroupActionsMenu({
  isCreator,
  onViewMembers,
  onInvite,
  onEdit,
  onLeave,
  onDelete,
}: {
  isCreator: boolean
  onViewMembers: () => void
  onInvite: () => void
  onEdit: () => void
  onLeave: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Group options" />}>
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onViewMembers}>
          <HugeiconsIcon icon={UserGroupIcon} />
          View Members
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInvite}>
          <HugeiconsIcon icon={UserAdd01Icon} />
          Invite Members
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <HugeiconsIcon icon={PencilEdit02Icon} />
          Edit Group
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isCreator ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <HugeiconsIcon icon={Delete02Icon} />
            Delete Group
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={onLeave}>
            <HugeiconsIcon icon={Logout01Icon} />
            Leave Group
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
