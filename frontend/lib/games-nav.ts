"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"

/**
 * Games keep the back stack short, like the tabs do.
 *
 * A game screen (a challenge or a live room) is one entry on top of the page
 * it was opened from — usually the Games tab. Moving from one game screen to
 * another (rematch, "Play now" on an invite) replaces that entry, and leaving
 * a game steps back to where you came from instead of pushing the Games tab
 * again. So: game → Back → Games → Back → Home → Back → the app closes,
 * however many games you played.
 *
 * AppShell reports every route change to `trackGameRoute`, which remembers
 * which game screen was entered on top of which page (session only).
 */

const KEY = "joysplit_game_entry"

/** Where to land when a game has nothing to step back to (opened from a link). */
export const GAMES_HOME = "/challenges"

export const isGamePath = (path: string) => /^\/(?:challenges|play)\/[^/?#]+\/?$/.test(path)

type Entry = { game: string; from: string }

function read(): Entry | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Entry) : null
  } catch {
    return null
  }
}

function write(entry: Entry | null) {
  try {
    if (entry) sessionStorage.setItem(KEY, JSON.stringify(entry))
    else sessionStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}

/** Called by AppShell on each route change (`prev` is null on the first page of the session). */
export function trackGameRoute(prev: string | null, next: string) {
  if (!isGamePath(next)) {
    write(null)
    return
  }
  if (prev === null || prev === next) return
  if (isGamePath(prev)) {
    // Game → game happens in place (see gameNavigate): same entry, new screen
    const entry = read()
    if (entry) write({ ...entry, game: next })
  } else {
    write({ game: next, from: prev })
  }
}

/**
 * Opens a game screen: on top of the current page, or in place of the
 * current game screen so games never pile up.
 */
export function gameNavigate(
  router: { push: (href: string) => void; replace: (href: string) => void },
  currentPath: string,
  href: string
) {
  if (isGamePath(currentPath)) router.replace(href)
  else router.push(href)
}

/** Leave the current game: back to the page it was opened from, or to Games. */
export function useGameExit(fallback: string = GAMES_HOME) {
  const router = useRouter()
  const pathname = usePathname()
  return React.useCallback(() => {
    const entry = read()
    if (entry && entry.game === pathname) {
      write(null)
      // A modal (e.g. "Leave the game?") or one closed by a button keeps its
      // own entry for this page on top (hooks/use-back-to-close): skip it too
      const onModalEntry = !!(window.history.state as Record<string, unknown> | null)?.__joysplitModal
      window.history.go(onModalEntry ? -2 : -1)
    } else {
      router.replace(fallback)
    }
  }, [router, pathname, fallback])
}

/** `gameNavigate` bound to this page. */
export function useGameNavigate() {
  const router = useRouter()
  const pathname = usePathname()
  return React.useCallback((href: string) => gameNavigate(router, pathname, href), [router, pathname])
}
