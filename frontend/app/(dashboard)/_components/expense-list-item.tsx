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
}: {
  expense: Expense
  description?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
  variant?: "outline" | "default"
  className?: string
}) {
  return (
    <Item
      variant={variant}
      className={cn(
        "flex-nowrap",
        variant === "outline" && "bg-card hover:border-primary/40",
        className
      )}
      render={<Link href={`/expenses/${expense.id}`} />}
    >
      <ItemMedia>
        {expense.groupIcon ? (
          <GroupIcon src={expense.groupIcon} alt={expense.title} size="md" />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <HugeiconsIcon icon={Invoice01Icon} className="size-5" />
          </div>
        )}
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="block w-full truncate font-bold">
          {expense.title}
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
