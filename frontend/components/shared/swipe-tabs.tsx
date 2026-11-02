"use client"

import * as React from "react"

import type { SwipeTabs } from "@/hooks/use-swipe-tabs"
import { cn } from "@/lib/utils"

/** What the panels and underline need from `useSwipeTabs` (everything but the surface). */
type SwipeTabParts = Omit<SwipeTabs, "surface">

const COLLAPSED: React.CSSProperties = { height: 0, overflow: "hidden" }

/**
 * The tab underline that slides with the finger. Put it inside the (relative)
 * tab bar; it is one tab wide.
 */
export function SwipeTabIndicator({ swipe, className }: { swipe: SwipeTabParts; className?: string }) {
  const { indicator, index, count } = swipe
  // Only the first position comes from React; the pager moves it from then on
  const [initial] = React.useState(index)
  return (
    <span
      ref={indicator}
      aria-hidden
      className={cn("pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary", className)}
      style={{ width: `${100 / count}%`, transform: `translate3d(${initial * 100}%,0,0)` }}
    />
  )
}

/**
 * The tab panels side by side, one per child, in tab order. Only the active
 * panel takes up height; the pager shows the others while you swipe.
 */
export function SwipeTabPanels({
  swipe,
  className,
  panelClassName,
  children,
}: {
  swipe: SwipeTabParts
  className?: string
  panelClassName?: string
  children: React.ReactNode
}) {
  const { viewport, track, index } = swipe
  // Initial state only (rendered on the server too); the pager owns these styles afterwards
  const [initial] = React.useState(index)
  return (
    <div
      ref={viewport}
      // No fixed width: a block grows into negative side margins (edge-to-edge panels)
      className={cn("overflow-hidden supports-[overflow:clip]:overflow-clip", className)}
    >
      <div
        ref={track}
        className="flex w-full items-start"
        style={{ transform: `translate3d(${-initial * 100}%,0,0)` }}
      >
        {React.Children.toArray(children).map((child, i) => (
          <div
            key={i}
            role="tabpanel"
            className={cn("w-full min-w-0 shrink-0", panelClassName)}
            inert={i !== initial}
            style={i === initial ? undefined : COLLAPSED}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
