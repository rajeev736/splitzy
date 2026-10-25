"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"

import { useSession } from "@/components/providers/session-provider"
import { JoySplitLogoIcon } from "@/components/shared/joysplit-logo"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { AppSidebar } from "./app-sidebar"
import { BottomNav } from "./bottom-nav"
import { isBottomNavPage, showsAddExpenseFab } from "./nav-items"

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

  if (isLoading) return <FullScreenLoader />
  if (!user) return null

  const showBottomNav = !hideNav && isBottomNavPage(pathname)

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {!hideNav && <AppSidebar />}
      {/* Room for the bottom nav, plus the floating add button where there is one */}
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          showBottomNav ? (showsAddExpenseFab(pathname) ? "pb-36 md:pb-8" : "pb-20 md:pb-8") : "md:pb-8"
        )}
      >
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  )
}

/** Standard page body width + spacing. */
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6", className)} {...props} />
}
