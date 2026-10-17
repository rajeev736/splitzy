import * as React from "react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"

/**
 * Avatar + name (+ optional sub-line) with a trailing slot. Text truncates
 * instead of widening the row, so lists never scroll horizontally.
 * Pass `as="label"` to make the whole row toggle a nested checkbox/radio.
 */
export function MemberRow({
  as: Comp = "div",
  name,
  photoURL,
  subtitle,
  children,
  className,
  ...props
}: {
  as?: "div" | "label"
  name: string
  photoURL?: string
  subtitle?: React.ReactNode
  children?: React.ReactNode
  className?: string
} & Omit<React.HTMLAttributes<HTMLElement>, "children">) {
  return (
    <Comp
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2.5",
        Comp === "label" && "cursor-pointer select-none hover:bg-muted/60",
        className
      )}
      {...props}
    >
      <UserAvatar src={photoURL} name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center">{children}</div>}
    </Comp>
  )
}
