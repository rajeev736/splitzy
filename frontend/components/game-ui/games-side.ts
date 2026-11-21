"use client"

import * as React from "react"

/**
 * Whether the Games side is on screen right now: every games page is a
 * `GameScreen` (./kit), which registers itself here while it's mounted. So
 * anything app-wide that should look different over a game — the toasts
 * (components/ui/sonner), the reward notices — asks this instead of matching
 * routes, and a new games page is covered just by being built from the kit.
 */

let screens = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Right now, outside React (e.g. while deciding how to announce something). */
export function isGamesSideShowing(): boolean {
  return screens > 0
}

/** Live, for components: true while a games screen is mounted. */
export function useGamesSide(): boolean {
  return React.useSyncExternalStore(subscribe, isGamesSideShowing, () => false)
}

/** Called by GameScreen: marks the Games side as showing while it's mounted. */
export function useMarkGamesSide() {
  React.useEffect(() => {
    screens += 1
    emit()
    return () => {
      screens -= 1
      emit()
    }
  }, [])
}
