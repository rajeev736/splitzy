import Link from "next/link"
import { Invoice01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GroupIcon } from "@/components/shared/group-icon"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { Expense } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * An expense row linking to the expense page. Shows the group cover when the
 * expense belongs to a group, otherwise a receipt tile.
 * `description` / `children` render under the title, `action` on the right.
 */
export function ExpenseListItem({
  expense,
  description,
  action,
  children,
  variant = "outline",
  className,
  hasUnread,
  onClick,
}: {
  expense: Expense
  description?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
  variant?: "outline" | "default"
  className?: string
  hasUnread?: boolean
  onClick?: () => void
}) {
  return (
    <Item
      variant={variant}
      className={cn(
        "flex-nowrap",
        variant === "outline" ? "bg-card hover:bg-muted/50" : "hover:bg-muted/60",
        className
      )}
      render={<Link href={`/expenses/${expense.id}`} onClick={onClick} />}
    >
      <ItemMedia>
        {expense.groupIcon ? (
          <GroupIcon src={expense.groupIcon} alt={expense.title} size="md" />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <HugeiconsIcon icon={Invoice01Icon} className="size-4.5" />
          </div>
        )}
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{expense.title}</span>
          {hasUnread && (
            <span
              aria-label="New expense"
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
          )}
        </ItemTitle>
        {description && (
          <ItemDescription className="truncate text-xs">
            {description}
          </ItemDescription>
        )}
        {children}
      </ItemContent>
      {action && <ItemActions className="shrink-0">{action}</ItemActions>}
    </Item>
  )
}
