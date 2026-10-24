import { CrownIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
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
  /** Extra line under the JoySplit ID (e.g. friend status or buttons), indented under the name. */
  footer?: React.ReactNode
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
  footer,
}: MemberRowProps) {
  return (
    <Item size="sm" role="listitem" className={cn("flex-nowrap px-0", muted && "opacity-80")}>
      <ItemMedia>
        <UserAvatar src={photoURL} name={name} size={size} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="line-clamp-none flex-wrap gap-x-2 gap-y-0.5 font-medium">
          <span className="truncate">{name}</span>
          {isMe && <span className="text-xs font-normal text-muted-foreground">(You)</span>}
          {isCreator && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
              <HugeiconsIcon icon={CrownIcon} className="size-3.5" />
              {creatorLabel}
            </span>
          )}
          {!isCreator && isAdmin && <span className="text-xs font-medium text-muted-foreground">Admin</span>}
        </ItemTitle>
        <ItemDescription className="truncate font-mono text-xs">{splitzyId}</ItemDescription>
        {footer && <div className="mt-1.5 flex flex-wrap items-center gap-2">{footer}</div>}
      </ItemContent>
      {actions && <ItemActions className="shrink-0">{actions}</ItemActions>}
    </Item>
  )
}
