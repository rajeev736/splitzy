"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { UserAvatar } from "@/components/shared/user-avatar"
import { useGamesYourTurn } from "@/hooks/queries"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import { cn } from "@/lib/utils"
import { isNavActive, NAV_ITEMS } from "./nav-items"

const MOBILE_ITEMS = NAV_ITEMS.filter((i) => i.mobile)

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useSession()
  const { hasPendingFriendRequests } = useUnreadTracking()
  const gamesYourTurn = useGamesYourTurn()

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pt-2 backdrop-blur-md md:hidden">
      {/* Equal-width columns regardless of label length */}
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${MOBILE_ITEMS.length}, minmax(0, 1fr))` }}
      >
        {MOBILE_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href)
          const isProfile = item.href === "/profile"
          const showDot =
            (item.href === "/friends" && hasPendingFriendRequests) || (item.href === "/challenges" && gamesYourTurn > 0)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors",
                active ? "font-bold text-primary" : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                {isProfile && user ? (
                  <UserAvatar
                    src={user.photoURL}
                    name={user.displayName}
                    size="xs"
                    className={cn("size-6 ring-2 transition-all", active ? "ring-primary" : "ring-transparent")}
                  />
                ) : (
                  <HugeiconsIcon
                    icon={item.icon}
                    className={cn("size-6 transition-transform", active && "scale-110")}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                )}
                {showDot && (
                  <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                )}
              </div>
              <span className="truncate text-[11px] tracking-tight">{item.mobileLabel || item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
