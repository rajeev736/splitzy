"use client"

import { Delete02Icon, MoreVerticalIcon, Notification01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** 3-dot menu in the expense detail header. */
export function ExpenseActionsMenu({
  canRemind = false,
  canDelete,
  onRemind,
  onDelete,
}: {
  canRemind?: boolean
  canDelete: boolean
  onRemind?: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Expense options" />}>
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canRemind && (
          <DropdownMenuItem onClick={onRemind}>
            <HugeiconsIcon icon={Notification01Icon} />
            Remind Unpaid
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            {canRemind && <DropdownMenuSeparator />}
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <HugeiconsIcon icon={Delete02Icon} />
              Delete Expense
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
