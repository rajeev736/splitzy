"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import NextTopLoader from "nextjs-toploader"

import { ProfilePeekHost } from "@/components/profile-peek/profile-peek-host"
import { RewardsHost } from "@/components/rewards/reward-notice"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { GameDiscountProvider } from "@/hooks/use-game-discounts"
import { makeQueryClient } from "@/lib/query/client"
import { FunSync } from "./fun-sync"
import { GameWinAutoSettle } from "./game-win-auto-settle"
import { LiveChallengeReferee } from "./live-challenge-referee"
import { PresenceSync } from "./presence-sync"
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

    // An app, not a web page: long-pressing a link, button or picture never opens the
    // browser's menu (copy link, open in new tab, save image). Typing fields keep theirs;
    // anything else can opt back in with data-allow-menu. Our own long-press menus
    // (chat messages) still run: only the browser's default is stopped.
    const keepsMenu = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("input, textarea, select, [contenteditable=true], [data-allow-menu]")
    const handleContextMenu = (e: MouseEvent) => {
      if (!keepsMenu(e.target)) e.preventDefault()
    }
    // Dragging a link or picture out (a drag preview, dropping it elsewhere) — not in an app
    const handleDragStart = (e: DragEvent) => {
      const t = e.target
      if (t instanceof Element && t.closest("a, img, svg, button, [role=button]") && !keepsMenu(t)) e.preventDefault()
    }

    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("dragstart", handleDragStart)
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
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("dragstart", handleDragStart)
    }
  }, [])

  return (
    <ThemeProvider storageKey="joysplit_theme">
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <TooltipProvider>
            <NextTopLoader color="var(--primary)" height={3} showSpinner={false} shadow={false} />
            <RealtimeSync />
            {/* Online / in a room / in a game, for friends inviting you */}
            <PresenceSync />
            {/* One clock + list of live game discounts for every balance, pay button and countdown */}
            <GameWinAutoSettle />
            {/* Discount games played live: the host records the result as the room ends */}
            <LiveChallengeReferee />
            {/* Coins, badges, birthday reminders, hugs arriving */}
            <FunSync />
            {/* Game-style reward toasts / popups, the coin collect's sounds, the Games side's tap sound */}
            <RewardsHost />
            <GameDiscountProvider>
              {children}
              {/* Tap anyone's avatar: who they are, in a small sheet (components/profile-peek) */}
              <ProfilePeekHost />
            </GameDiscountProvider>
            {/* Theme-coloured toasts (no rich colours), centred on top so phones see them whole */}
            <Toaster position="top-center" closeButton swipeDirections={["left", "right", "top"]} />
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
