"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { GameController03Icon, ReceiptIndianRupeeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useGamesYourTurn } from "@/hooks/queries"
import { cn } from "@/lib/utils"

/**
 * The two sides of the app, switched from the very top: Split (money, the
 * bottom-nav tabs) and Games (its own themed world, components/game-ui).
 *
 * History stays short: Split → Games adds one entry, so Back (or tapping
 * Split) returns to the tab you came from; landing on Games from a link and
 * tapping Split replaces it with Home.
 */

export const GAMES_HUB = "/challenges"
const FROM_KEY = "joysplit_games_from"

export const isGamesHub = (pathname: string) => pathname === GAMES_HUB

function readFrom(): string | null {
  try {
    return sessionStorage.getItem(FROM_KEY)
  } catch {
    return null
  }
}
function writeFrom(path: string | null) {
  try {
    if (path) sessionStorage.setItem(FROM_KEY, path)
    else sessionStorage.removeItem(FROM_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function useModeSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const mode: "split" | "games" = isGamesHub(pathname) ? "games" : "split"
  const go = React.useCallback(
    (next: "split" | "games") => {
      if (next === mode) return
      if (next === "games") {
        writeFrom(pathname)
        router.push(GAMES_HUB)
        return
      }
      if (readFrom()) {
        writeFrom(null)
        router.back()
      } else {
        router.replace("/home")
      }
    },
    [mode, pathname, router]
  )
  return { mode, go }
}

/**
 * The Split | Games switch. `look="app"` for the money side's header,
 * `look="game"` for the Games hub's sky.
 */
export function ModeSwitch({ look = "app", className }: { look?: "app" | "game"; className?: string }) {
  const { mode, go } = useModeSwitch()
  const yourTurn = useGamesYourTurn()
  const items = [
    { value: "split" as const, label: "Split", icon: ReceiptIndianRupeeIcon },
    { value: "games" as const, label: "Games", icon: GameController03Icon, dot: yourTurn > 0 },
  ]

  if (look === "game") {
    return (
      <div role="tablist" aria-label="App section" className={cn("gu-tabs w-full max-w-[15rem]", className)}>
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={mode === it.value}
            onClick={() => go(it.value)}
            className="gu-tab !h-9"
          >
            <HugeiconsIcon icon={it.icon} className="size-[18px]" strokeWidth={2.2} />
            {it.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label="App section"
      className={cn("grid h-9 w-full max-w-[15rem] grid-cols-2 rounded-full bg-muted p-1", className)}
    >
      {items.map((it) => {
        const active = mode === it.value
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => go(it.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full text-[13px] transition-colors",
              active
                ? "bg-card font-semibold text-foreground shadow-sm"
                : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={it.icon} className="size-4" strokeWidth={active ? 2 : 1.6} />
            {it.label}
            {it.dot && !active ? (
              <span aria-label="A game is waiting for you" className="absolute top-1 right-3 size-2 rounded-full bg-destructive" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
