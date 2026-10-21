"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AddCircleIcon, Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { ButtonLink } from "@/components/shared/button-link"
import { JoySplitLogo } from "@/components/shared/joysplit-logo"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useBalances, useUnreadCount } from "@/hooks/queries"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import { cn } from "@/lib/utils"
import { LogoutDialog } from "./logout-dialog"
import { isNavActive, NAV_ITEMS } from "./nav-items"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useSession()
  const { netBalancePaise } = useBalances()
  const unread = useUnreadCount()
  const { hasPendingFriendRequests, hasGroupsBadge } = useUnreadTracking()
  const [logoutOpen, setLogoutOpen] = React.useState(false)

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none md:flex lg:w-72">
      <div className="border-b border-sidebar-border p-6">
        <JoySplitLogo size="md" showTagline href="/home" />
      </div>

      <div className="p-4">
        <ButtonLink href="/expenses/new" size="lg" className="h-11 w-full text-sm font-semibold">
          <HugeiconsIcon icon={AddCircleIcon} data-icon="inline-start" />
          Add Expense
        </ButtonLink>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href)
          const showDot =
            (item.href === "/friends" && hasPendingFriendRequests) ||
            (item.href === "/groups" && hasGroupsBadge)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <HugeiconsIcon icon={item.icon} className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                {item.showUnread && unread > 0 && <Badge variant="destructive">{unread}</Badge>}
                {showDot && (
                  <span
                    aria-label="New updates"
                    className="size-2 rounded-full bg-destructive shadow-sm animate-pulse"
                  />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="mx-4 mb-3 rounded-2xl border bg-background p-4">
        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Net Balance</div>
        <Amount signed paise={netBalancePaise} className="mt-0.5 block text-xl font-bold tracking-tight" />
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {netBalancePaise >= 0 ? "You will receive" : "You need to pay"}
        </div>
      </div>

      {user && (
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border p-4">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-85">
            <UserAvatar src={user.photoURL} name={user.displayName} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">{user.displayName}</div>
              <div className="truncate font-mono text-[11px] font-medium text-primary">{user.splitzyId}</div>
            </div>
          </Link>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Log out"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setLogoutOpen(true)}
                />
              }
            >
              <HugeiconsIcon icon={Logout01Icon} />
            </TooltipTrigger>
            <TooltipContent>Log out</TooltipContent>
          </Tooltip>
        </div>
      )}

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </aside>
  )
}
