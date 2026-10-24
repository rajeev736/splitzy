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
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useGamesYourTurn, useUnreadCount } from "@/hooks/queries"
import { useDiscountedBalances } from "@/hooks/use-game-discounts"
import { GameDiscountNote } from "@/components/games/game-discount-amount"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import { cn } from "@/lib/utils"
import { LogoutDialog } from "./logout-dialog"
import { isNavActive, NAV_ITEMS } from "./nav-items"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useSession()
  const { netBalancePaise, gameDiscountPaise, gameDiscountEndsAt, now } = useDiscountedBalances()
  const unread = useUnreadCount()
  const { hasPendingFriendRequests } = useUnreadTracking()
  const gamesYourTurn = useGamesYourTurn()
  const [logoutOpen, setLogoutOpen] = React.useState(false)

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none md:flex lg:w-72">
      <div className="border-b border-sidebar-border px-5 py-5">
        <JoySplitLogo size="md" showTagline href="/home" />
      </div>

      <div className="p-4">
        <ButtonLink href="/expenses/new" size="lg" className="h-10 w-full text-sm font-medium">
          <HugeiconsIcon icon={AddCircleIcon} data-icon="inline-start" />
          Add Expense
        </ButtonLink>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href)
          const showDot =
            (item.href === "/friends" && hasPendingFriendRequests) || (item.href === "/challenges" && gamesYourTurn > 0)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <HugeiconsIcon icon={item.icon} className="size-4.5" strokeWidth={active ? 2 : 1.8} />
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                {item.showUnread && unread > 0 && (
                  <span className="text-xs font-medium tabular-nums text-destructive">{unread}</span>
                )}
                {showDot && (
                  <span
                    aria-label="New updates"
                    className="size-1.5 rounded-full bg-destructive"
                  />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="text-xs text-muted-foreground">Net balance</div>
        <Amount signed paise={netBalancePaise} className="mt-0.5 block text-lg font-semibold tracking-tight tabular-nums" />
        <div className="mt-0.5 text-xs text-muted-foreground">
          {netBalancePaise >= 0 ? "You will receive" : "You need to pay"}
        </div>
        <GameDiscountNote className="mt-1.5" discountPaise={gameDiscountPaise} endsAt={gameDiscountEndsAt} now={now} />
      </div>

      {user && (
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-3">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-85">
            <UserAvatar src={user.photoURL} name={user.displayName} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.displayName}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{user.splitzyId}</div>
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
