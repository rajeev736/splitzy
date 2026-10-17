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
}: {
  group: Group
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
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
        <ItemTitle className="block w-full truncate font-bold">
          {group.name}
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
