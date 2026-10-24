"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import NextTopLoader from "nextjs-toploader"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { GameDiscountProvider } from "@/hooks/use-game-discounts"
import { makeQueryClient } from "@/lib/query/client"
import { GameWinAutoSettle } from "./game-win-auto-settle"
import { RealtimeSync } from "./realtime-sync"
import { SessionProvider } from "./session-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session (never shared across requests)
  const [queryClient] = React.useState(makeQueryClient)

  React.useEffect(() => {
    // Restrict multi-finger pinch zooming on mobile/PWA
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // Restrict iOS Safari / WebKit pinch gesture zoom
    const handleGesture = (e: Event) => {
      e.preventDefault()
    }

    // Restrict double-tap zoom on non-input elements
    let lastTouchEnd = 0
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement | null
        const isInput =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        if (!isInput) {
          e.preventDefault()
        }
      }
      lastTouchEnd = now
    }

    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("gesturestart", handleGesture)
    document.addEventListener("gesturechange", handleGesture)
    document.addEventListener("gestureend", handleGesture)
    document.addEventListener("touchend", handleTouchEnd, { passive: false })

    return () => {
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("gesturestart", handleGesture)
      document.removeEventListener("gesturechange", handleGesture)
      document.removeEventListener("gestureend", handleGesture)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  return (
    <ThemeProvider storageKey="joysplit_theme">
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <TooltipProvider>
            <NextTopLoader color="var(--primary)" height={3} showSpinner={false} shadow={false} />
            <RealtimeSync />
            {/* One clock + list of live game discounts for every balance, pay button and countdown */}
            <GameWinAutoSettle />
            <GameDiscountProvider>{children}</GameDiscountProvider>
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </SessionProvider>
        {/* Dev-only (tree-shaken in production); hidden on mobile so it never covers the bottom nav */}
        <div className="hidden md:block">
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
