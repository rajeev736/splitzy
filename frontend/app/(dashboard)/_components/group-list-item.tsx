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
}: {
  group: Group
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
  hasUnread?: boolean
}) {
  return (
    <Item
      variant="outline"
      className={cn("flex-nowrap bg-card hover:border-primary/40", className)}
      render={<Link href={`/groups/${group.id}`} />}
    >
      <ItemMedia>
        <GroupIcon src={group.icon} alt={group.name} size="md" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="flex items-center gap-2 font-bold">
          <span className="truncate">{group.name}</span>
          {hasUnread && (
            <span
              aria-label="New expenses in group"
              className="size-2 shrink-0 rounded-full bg-destructive shadow-sm animate-pulse"
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
