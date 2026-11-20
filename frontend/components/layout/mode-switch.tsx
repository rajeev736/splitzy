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
 * The switch sits in the same spot at the same size on both sides (ModeBar),
 * only its colours change, and the active pill slides across — so flipping
 * sides never makes anything jump.
 *
 * History stays short: Split → Games adds one entry, so Back (or tapping
 * Split) returns to the tab you came from; landing on Games from a link and
 * tapping Split replaces it with Home.
 */

export const GAMES_HUB = "/challenges"
const FROM_KEY = "joysplit_games_from"

export const isGamesHub = (pathname: string) => pathname === GAMES_HUB

type Mode = "split" | "games"

/** The side the switch last showed: the next page's switch slides on from there. */
let lastShown: Mode | null = null
const remember = (m: Mode) => {
  lastShown = m
}

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
  const mode: Mode = isGamesHub(pathname) ? "games" : "split"
  const go = React.useCallback(
    (next: Mode) => {
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

const ITEMS = [
  { value: "split" as const, label: "Split", icon: ReceiptIndianRupeeIcon },
  { value: "games" as const, label: "Games", icon: GameController03Icon },
]

/**
 * The Split | Games switch: a full-width track with a sliding pill, in the
 * look of the side you're on — Split's blue on its cards, Games' gold on its
 * sky — so it's plain which side is open.
 */
export function ModeSwitch({ look = "app", className }: { look?: "app" | "game"; className?: string }) {
  const { mode, go } = useModeSwitch()
  const yourTurn = useGamesYourTurn()
  // The pill starts where the last page's switch left it, then slides to this side
  const [shown, setShown] = React.useState<Mode>(() => lastShown ?? mode)
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(mode))
    remember(mode)
    return () => window.cancelAnimationFrame(id)
  }, [mode])

  const pick = (next: Mode) => {
    if (next === mode) return
    // Slide now; the page follows
    setShown(next)
    remember(next)
    go(next)
  }

  const game = look === "game"
  return (
    <div
      role="tablist"
      aria-label="App section"
      // The Split tour ends here ("Games are here")
      data-tour={game ? undefined : "mode-switch"}
      className={cn(
        "relative grid h-12 w-full grid-cols-2 rounded-full p-1",
        game
          ? "bg-[#2c63c4]/55 shadow-[inset_0_2px_0_rgba(10,30,90,.25),0_1px_0_rgba(255,255,255,.35)]"
          : "border border-border/70 bg-muted",
        className
      )}
    >
      {/* The pill */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full transition-transform duration-300 ease-[cubic-bezier(.2,.85,.25,1)] will-change-transform motion-reduce:transition-none",
          game
            ? "bg-gradient-to-b from-[#ffe066] to-[#ffc928] shadow-[inset_0_-3px_0_#e0a400,inset_0_2px_0_rgba(255,255,255,.6),0_3px_0_rgba(20,40,110,.25)]"
            : "bg-primary shadow-sm"
        )}
        style={{ transform: shown === "games" ? "translateX(100%)" : "translateX(0)" }}
      />
      {ITEMS.map((it) => {
        const active = shown === it.value
        const dot = it.value === "games" && yourTurn > 0 && mode !== "games"
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={mode === it.value}
            onClick={() => pick(it.value)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-2 rounded-full text-[15px] transition-colors duration-200",
              game
                ? cn("font-[family-name:var(--gu-font)] text-base font-bold", active ? "text-[#6b3a00]" : "text-white [text-shadow:0_1px_0_rgba(20,40,110,.35)]")
                : active
                  ? "font-semibold text-primary-foreground"
                  : "font-medium text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={it.icon} className="size-5" strokeWidth={active ? 2.3 : 1.8} />
            {it.label}
            {dot ? <span aria-label="A game is waiting for you" className="absolute top-2 right-4 size-2.5 rounded-full bg-destructive ring-2 ring-muted" /> : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The bar the switch lives in, identical on both sides: same height, same
 * top inset, the switch across the full width — so flipping sides never moves
 * it. (Optional side slots sit beside it; neither side uses them now.)
 */
export function ModeBar({
  look = "app",
  left,
  right,
  className,
}: {
  look?: "app" | "game"
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("pt-[env(safe-area-inset-top,0px)]", className)}>
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-2 px-3">
        {left ? <div className="flex shrink-0 items-center">{left}</div> : null}
        <ModeSwitch look={look} />
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>
    </div>
  )
}
