"use client"

import {
  Delete02Icon,
  InformationCircleIcon,
  Logout01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  UserAdd01Icon,
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

/**
 * Header 3-dot menu: group info, add members / edit info (when the group lets
 * you), leave, and delete (creator only).
 */
export function GroupActionsMenu({
  isCreator,
  canEdit,
  canAdd,
  onViewInfo,
  onInvite,
  onEdit,
  onLeave,
  onDelete,
}: {
  isCreator: boolean
  canEdit: boolean
  canAdd: boolean
  onViewInfo: () => void
  onInvite: () => void
  onEdit: () => void
  onLeave: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Group options" />
        }
      >
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onViewInfo}>
          <HugeiconsIcon icon={InformationCircleIcon} />
          Group info
        </DropdownMenuItem>
        {canAdd && (
          <DropdownMenuItem onClick={onInvite}>
            <HugeiconsIcon icon={UserAdd01Icon} />
            Add members
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <HugeiconsIcon icon={PencilEdit02Icon} />
            Edit group info
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {/* Everyone can leave; a leaving creator hands the group to another admin or the next member */}
        <DropdownMenuItem variant="destructive" onClick={onLeave}>
          <HugeiconsIcon icon={Logout01Icon} />
          Leave group
        </DropdownMenuItem>
        {isCreator && (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <HugeiconsIcon icon={Delete02Icon} />
            Delete group
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
