"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
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
    <>
      {/* Mobile counterpart of the sidebar's "Add Expense" button. Split summary has its own full-width one. */}
      {pathname !== "/split-summary" && (
        <Link
          href="/expenses/new"
          aria-label="Add expense"
          title="Add expense"
          className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 flex size-13 items-center justify-center rounded-full bg-foreground text-background shadow-lg shadow-black/15 transition-transform active:scale-95 md:hidden dark:shadow-black/40"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-6" strokeWidth={2} />
        </Link>
      )}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 px-1.5 pt-1.5 backdrop-blur-xl backdrop-saturate-150 md:hidden">
        {/* Equal-width columns regardless of label length */}
        <div
          className="mx-auto grid max-w-md"
          style={{
            gridTemplateColumns: `repeat(${MOBILE_ITEMS.length}, minmax(0, 1fr))`,
          }}
        >
          {MOBILE_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href)
            const isProfile = item.href === "/profile"
            const showDot =
              (item.href === "/friends" && hasPendingFriendRequests) ||
              (item.href === "/challenges" && gamesYourTurn > 0)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => goTo(e, item.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/nav relative flex min-w-0 flex-col items-center justify-center gap-1 pt-0.5 pb-1 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {/* Active tab: a soft tinted pill behind the icon */}
                <div
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-lg transition-all duration-200 ease-out",
                    active
                      ? "bg-primary/12 text-primary"
                      : "group-hover/nav:bg-muted group-active/nav:scale-95"
                  )}
                >
                  {isProfile && user ? (
                    <UserAvatar
                      src={user.photoURL}
                      name={user.displayName}
                      size="xs"
                      className={cn(
                        "size-6 ring-2 ring-offset-1 ring-offset-background transition-all",
                        active ? "ring-primary" : "ring-transparent"
                      )}
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={item.icon}
                      className="size-[22px]"
                      strokeWidth={active ? 2 : 1.6}
                    />
                  )}
                  {showDot && (
                    <span className="absolute top-1 right-3 size-2 rounded-full bg-destructive ring-2 ring-background" />
                  )}
                </div>
                <span
                  className={cn(
                    "truncate text-[11px] leading-none tracking-tight",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.mobileLabel || item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
