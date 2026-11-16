import { ArrowRight01Icon, CrownIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from "@/components/ui/item"
import { cn } from "@/lib/utils"

export interface MemberRowProps {
  /** Whose row it is (shows their profile frame when known). */
  uid?: string
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
  /** Makes the whole row a button (opens the member's actions). Don't combine with interactive `footer`/`actions`. */
  onClick?: () => void
}

/** The creator (crown) / admin pill shown after a member's name. */
export function RoleBadge({
  isCreator,
  isAdmin,
  creatorLabel = "Creator",
}: {
  isCreator?: boolean
  isAdmin?: boolean
  creatorLabel?: string
}) {
  if (isCreator)
    return (
      <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-warning/12 px-2 text-[11px] font-semibold text-warning">
        <HugeiconsIcon icon={CrownIcon} className="size-3" />
        {creatorLabel}
      </span>
    )
  if (isAdmin)
    return (
      <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-primary/10 px-2 text-[11px] font-semibold text-primary">
        Admin
      </span>
    )
  return null
}

/** One group member: avatar, name, role badges, JoySplit ID and optional trailing actions. */
export function MemberRow({
  uid,
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
  onClick,
}: MemberRowProps) {
  return (
    <Item
      size="sm"
      role="listitem"
      className={cn(
        "flex-nowrap px-0",
        muted && "opacity-80",
        onClick &&
          "-mx-2 cursor-pointer rounded-md px-2 text-left hover:bg-muted/60"
      )}
      render={onClick ? <button type="button" onClick={onClick} /> : undefined}
    >
      <ItemMedia>
        <UserAvatar uid={uid} src={photoURL} name={name} size={size} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        {/* Not ItemTitle: its line-clamp would drop the flex layout (badges lose their spacing) */}
        <div
          data-slot="item-title"
          className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-snug font-medium"
        >
          <span className="max-w-full min-w-0 truncate">{name}</span>
          {isMe && (
            <span className="text-xs font-normal text-muted-foreground">
              (You)
            </span>
          )}
          <RoleBadge
            isCreator={isCreator}
            isAdmin={isAdmin}
            creatorLabel={creatorLabel}
          />
        </div>
        <ItemDescription className="truncate font-mono text-xs">
          {splitzyId}
        </ItemDescription>
        {footer && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {footer}
          </div>
        )}
      </ItemContent>
      {actions && <ItemActions className="shrink-0">{actions}</ItemActions>}
      {onClick && !actions && (
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
    </Item>
  )
}
