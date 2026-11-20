"use client"

import "./game-nav.css"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { HugeiconsIcon } from "@hugeicons/react"

import { claimableLevelRewards } from "@/components/game-avatar/level-road"
import { useGamesYourTurn } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { GAME_NAV_ITEMS, GAME_ROUTES, type GameNavId } from "./items"

/** Set while the current Games tab was opened from the hub, so going back to Play can just step back. */
const FROM_HUB_KEY = "joysplit_game_tab_from_hub"

const readFlag = () => {
  try {
    return sessionStorage.getItem(FROM_HUB_KEY) === "1"
  } catch {
    return false
  }
}
const writeFlag = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(FROM_HUB_KEY, "1")
    else sessionStorage.removeItem(FROM_HUB_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** A Games tab's back button: to the hub, stepping back when the tab was opened from it. */
export function useGameTabBack() {
  const router = useRouter()
  return React.useCallback(() => {
    if (readFlag()) {
      writeFlag(false)
      router.back()
    } else {
      router.replace(GAME_ROUTES.hub)
    }
  }, [router])
}

/** A Games tab page's room for the bar at its bottom (the bar itself is the app shell's). */
export function GameNavSpacer() {
  return <div aria-hidden className="gn-spacer" />
}

/** The four pages with the Games bar. */
export const isGameTabPage = (pathname: string) => (Object.values(GAME_ROUTES) as string[]).includes(pathname)

/**
 * The Games side's bottom bar: Play (the hub), Levels, Inventory, Profile.
 * Only on those four pages — never inside a room or a game. Mounted once by
 * the app shell (components/layout/app-shell) and fixed at the bottom, so it
 * stays put while the tabs change under it; each tab page ends with a
 * GameNavSpacer so nothing ends up under it.
 *
 * Like the Split tabs, it doesn't pile up history: hub → a tab adds one entry,
 * tab → tab replaces it, tab → Play steps back. So Back from any tab lands on
 * the hub, and Back from the hub goes where Games was opened from.
 */
export function GameBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const wallet = useWallet()
  const yourTurn = useGamesYourTurn()
  const toClaim = wallet ? claimableLevelRewards(wallet) : 0

  const badges: Partial<Record<GameNavId, number>> = { hub: yourTurn, levels: toClaim }

  // The tab you tapped lights up at once; the page catches up a moment later
  const [pending, setPending] = React.useState<string | null>(null)
  const [seenPath, setSeenPath] = React.useState(pathname)
  if (pathname !== seenPath) {
    setSeenPath(pathname)
    setPending(null)
  }
  const current = pending ?? pathname

  const goTo = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return // let new-tab clicks through
    e.preventDefault()
    if (pathname !== href) setPending(href)
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (pathname === GAME_ROUTES.hub) {
      writeFlag(true)
      router.push(href)
    } else if (href === GAME_ROUTES.hub && readFlag()) {
      writeFlag(false)
      router.back()
    } else {
      if (href === GAME_ROUTES.hub) writeFlag(false)
      router.replace(href)
    }
  }

  return (
    <nav aria-label="Games" className="gn-wrap">
      <div className="gn-tray" data-tour="game-nav">
        {GAME_NAV_ITEMS.map((item) => {
          const active = current === item.href
          const badge = badges[item.id] ?? 0
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => goTo(e, item.href)}
              aria-current={active ? "page" : undefined}
              aria-label={badge > 0 ? `${item.label}, ${badge} new` : item.label}
              className="gn-item"
              style={{ "--gn-face": item.face, "--gn-base": item.base } as React.CSSProperties}
            >
              <span className="gn-tile">
                <HugeiconsIcon icon={item.icon} className="size-7" strokeWidth={active ? 2.3 : 2} />
                {badge > 0 ? <span className="gn-badge">{badge > 9 ? "9+" : badge}</span> : null}
              </span>
              <span className="gn-label">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
