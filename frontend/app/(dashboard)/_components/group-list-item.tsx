import Link from "next/link"

import { GroupIcon } from "@/components/shared/group-icon"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { Group } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * A group row linking to the group page: cover image, name and member count.
 * `children` renders extra lines under the member count (e.g. a balance) and
 * `action` sits on the right (e.g. a chevron or "View").
 */
export function GroupListItem({
  group,
  action,
  children,
  className,
  hasUnread,
  variant = "outline",
}: {
  group: Group
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
  hasUnread?: boolean
  variant?: "outline" | "default"
}) {
  return (
    <Item
      variant={variant}
      className={cn("flex-nowrap", variant === "outline" ? "bg-card hover:bg-muted/50" : "hover:bg-muted/60", className)}
      render={<Link href={`/groups/${group.id}`} />}
    >
      <ItemMedia>
        <GroupIcon src={group.icon} alt={group.name} size="md" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="flex items-center gap-2 font-medium">
          <span className="truncate">{group.name}</span>
          {hasUnread && (
            <span
              aria-label="New expenses in group"
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
          )}
        </ItemTitle>
        <ItemDescription className="text-xs">
          {group.members.length} members
        </ItemDescription>
        {children}
      </ItemContent>
      {action && <ItemActions className="shrink-0">{action}</ItemActions>}
    </Item>
  )
}
