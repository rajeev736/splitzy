import { CrownIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { cn } from "@/lib/utils"

export interface MemberRowProps {
  name: string
  photoURL?: string | null
  splitzyId: string
  isCreator?: boolean
  isAdmin?: boolean
  /** Shows an inline "(You)" marker after the name. */
  isMe?: boolean
  creatorLabel?: string
  size?: "sm" | "md"
  muted?: boolean
  actions?: React.ReactNode
}

/** One group member: avatar, name, role badges, JoySplit ID and optional trailing actions. */
export function MemberRow({
  name,
  photoURL,
  splitzyId,
  isCreator = false,
  isAdmin = false,
  isMe = false,
  creatorLabel = "Creator",
  size = "md",
  muted = false,
  actions,
}: MemberRowProps) {
  return (
    <Item size="sm" role="listitem" className={cn("flex-nowrap px-0", muted && "opacity-80")}>
      <ItemMedia>
        <UserAvatar src={photoURL} name={name} size={size} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="line-clamp-none flex-wrap gap-1.5 font-bold">
          <span className="truncate">{name}</span>
          {isMe && <span className="text-xs font-semibold text-primary">(You)</span>}
          {isCreator && (
            <Badge className="bg-warning/10 font-bold text-warning">
              <HugeiconsIcon icon={CrownIcon} data-icon="inline-start" />
              {creatorLabel}
            </Badge>
          )}
          {!isCreator && isAdmin && <Badge className="bg-info/10 font-bold text-info">Admin</Badge>}
        </ItemTitle>
        <ItemDescription className="truncate font-mono text-xs">{splitzyId}</ItemDescription>
      </ItemContent>
      {actions && <ItemActions className="shrink-0">{actions}</ItemActions>}
    </Item>
  )
}
