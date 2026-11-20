"use client"

import * as React from "react"
import { usePathname, useRouter as useNextRouter } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"

import { ChatInboxProvider } from "@/components/chat/chat-inbox"
import { useSession } from "@/components/providers/session-provider"
import { JoySplitLogoIcon } from "@/components/shared/joysplit-logo"
import { Spinner } from "@/components/ui/spinner"
import { trackGameRoute } from "@/lib/games-nav"
import { cn } from "@/lib/utils"
import { AppSidebar } from "./app-sidebar"
import { ModeBar } from "./mode-switch"
import { BottomNav } from "./bottom-nav"
import { isBottomNavPage, NAV_ITEMS, showsAddExpenseFab } from "./nav-items"

/** Screens opened often from the tabs, warmed up along with the tabs themselves. */
const WARM_ROUTES = ["/expenses/new", "/friends/add", "/friends/requests", "/groups/new", "/history"]

const REDIRECT_KEY = "joysplit_redirect_to"

export function FullScreenLoader({ label = "Loading JoySplit..." }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-4">
      <JoySplitLogoIcon className="size-9" />
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Spinner className="size-3.5" />
        {label}
      </p>
    </div>
  )
}

/** Authenticated app chrome: redirects signed-out users, renders sidebar + bottom nav. */
export function AppShell({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const { user, isLoading } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (isLoading || user) return
    if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
      try {
        sessionStorage.setItem(REDIRECT_KEY, pathname)
      } catch {
        /* storage unavailable */
      }
    }
    router.replace("/login")
  }, [isLoading, user, router, pathname])

  // Games keep one entry on the back stack (lib/games-nav): tell it where we are
  const lastPath = React.useRef<string | null>(null)
  React.useEffect(() => {
    trackGameRoute(lastPath.current, pathname)
    lastPath.current = pathname
  }, [pathname])

  // Once signed in, prefetch every tab and the screens they open, so moving
  // between them renders straight from the router cache instead of waiting on
  // the server. (Links only prefetch while visible, and phones never hover.)
  const nextRouter = useNextRouter()
  const signedIn = !!user
  React.useEffect(() => {
    if (!signedIn) return
    const warm = () => [...NAV_ITEMS.map((i) => i.href), ...WARM_ROUTES].forEach((href) => nextRouter.prefetch(href))
    warm()
    // Refresh the warm-up before the cached entries go stale (see staleTimes in next.config.ts)
    const timer = window.setInterval(warm, 50 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [signedIn, nextRouter])

  if (isLoading) return <FullScreenLoader />
  if (!user) return null

  const showBottomNav = !hideNav && isBottomNavPage(pathname)

  return (
    // Chats stay live app-wide: unread badges, and delivered ticks for senders
    <ChatInboxProvider>
      <div className="flex min-h-svh flex-col md:flex-row">
        {!hideNav && <AppSidebar />}
        {/* Room for the bottom nav, plus the floating add button where there is one */}
        <main
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            showBottomNav ? (showsAddExpenseFab(pathname) ? "pb-36 md:pb-8" : "pb-20 md:pb-8") : "md:pb-8"
          )}
        >
          {/* The money tabs: Split | Games at the very top (the Games hub draws its own) */}
          {showBottomNav && (
            <ModeBar className="bg-background" />
          )}
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </ChatInboxProvider>
  )
}

/** Standard page body width + spacing. */
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6", className)} {...props} />
}
