"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { UserAvatar } from "@/components/shared/user-avatar"
import { useGamesYourTurn } from "@/hooks/queries"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import { cn } from "@/lib/utils"
import { isNavActive, MOBILE_NAV_ITEMS as MOBILE_ITEMS } from "./nav-items"

/** Set while the current tab was opened from Home, so going "Home" can just step back. */
const FROM_HOME_KEY = "joysplit_tab_from_home"

const readFlag = () => {
  try {
    return sessionStorage.getItem(FROM_HOME_KEY) === "1"
  } catch {
    return false
  }
}
const writeFlag = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(FROM_HOME_KEY, "1")
    else sessionStorage.removeItem(FROM_HOME_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useSession()
  const { hasPendingFriendRequests } = useUnreadTracking()
  const gamesYourTurn = useGamesYourTurn()
  const router = useRouter()

  /**
   * Tabs don't pile up history like an app's bottom bar: Home → a tab adds one
   * entry; tab → tab replaces it; tab → Home steps back. So Back from any tab
   * lands on Home, and Back from Home leaves the app.
   */
  const goTo = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return // let new-tab clicks through
    e.preventDefault()
    if (pathname === href) return
    if (pathname === "/home") {
      writeFlag(true)
      router.push(href)
    } else if (href === "/home" && readFlag()) {
      writeFlag(false)
      router.back()
    } else {
      if (href === "/home") writeFlag(false)
      router.replace(href)
    }
  }

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
              onClick={(e) => goTo(e, item.href)}
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
