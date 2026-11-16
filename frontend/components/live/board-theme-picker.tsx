"use client"

import * as React from "react"
import { DashboardSquare01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Coins } from "@/components/fun/coin"
import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"
import { getErrorMessage } from "@/lib/errors"
import {
  chooseTheme,
  THEMES,
  useBoardTheme,
  type BoardTheme,
  type ChessLook,
  type LudoLook,
  type Snakes3DLook,
  type ThemeGame,
} from "@/lib/live/themes"
import { cn } from "@/lib/utils"
import { buyTheme } from "@/services/fun"
import { pieceImage } from "./chess/chess-board"

/** A tiny picture of a board in a theme. */
function Preview({ theme }: { theme: BoardTheme<unknown> }) {
  if (theme.game === "snakes3d") {
    const look = theme.look as Snakes3DLook
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a small static picture; no optimising needed
      <img src={look.preview} alt="" loading="lazy" className="block aspect-square w-full rounded-md object-cover object-top" style={{ background: look.table }} />
    )
  }
  if (theme.game === "chess") {
    const look = theme.look as ChessLook
    // The top-left quarter of the board, with a few pieces on it
    const f = look.frameInset ?? 0
    const k = 2 / (1 - 2 * f) // the picture's width, in previews
    const squares = look.framed
      ? `url(${look.framed}) ${((f * k) / (k - 1)) * 100}% ${((f * k) / (k - 1)) * 100}% / ${k * 100}% no-repeat`
      : look.board
        ? `url(${look.board}) 0 0 / 200% 200% no-repeat`
        : `repeating-conic-gradient(${look.dark} 0 25%, ${look.light} 0 50%) 0 0 / 50% 50%`
    return (
      <div className="relative grid aspect-square w-full grid-cols-4 grid-rows-4 overflow-hidden rounded-md" style={{ background: squares }}>
        {(
          [
            ["b", "r", 0],
            ["b", "n", 1],
            ["b", "p", 5],
            ["w", "q", 10],
            ["w", "n", 15],
          ] as const
        ).map(([c, t, i]) => (
          <span
            key={i}
            className="size-full bg-contain bg-center bg-no-repeat"
            style={{ gridArea: `${Math.floor(i / 4) + 1} / ${(i % 4) + 1}`, backgroundImage: `url(${pieceImage(c, t)})` }}
          />
        ))}
      </div>
    )
  }
  const look = theme.look as LudoLook
  const P = look.palette
  if (look.image)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a small static picture; no optimising needed
      <img src={look.image.src} alt="" loading="lazy" className="block aspect-square w-full rounded-md object-cover" />
    )
  return (
    <div className="rounded-md p-1" style={{ background: look.table }}>
      <svg viewBox="0 0 15 15" className="block aspect-square w-full">
        <rect width={15} height={15} rx={0.6} fill={look.track} stroke={look.frame} strokeWidth={look.frameWidth * 4} />
        {(
          [
            ["red", 0, 0],
            ["green", 9, 0],
            ["yellow", 9, 9],
            ["blue", 0, 9],
          ] as const
        ).map(([c, x, y]) => (
          <g key={c}>
            <rect x={x} y={y} width={6} height={6} fill={P[c].mid} />
            <rect x={x + 1} y={y + 1} width={4} height={4} rx={0.4} fill={look.inner} />
            <circle cx={x + 3} cy={y + 3} r={1.1} fill={P[c].mid} />
          </g>
        ))}
        <rect x={1} y={7} width={5} height={1} fill={P.red.mid} />
        <rect x={7} y={1} width={1} height={5} fill={P.green.mid} />
        <rect x={9} y={7} width={5} height={1} fill={P.yellow.mid} />
        <rect x={7} y={9} width={1} height={5} fill={P.blue.mid} />
        <polygon points="6,6 9,6 7.5,7.5" fill={P.green.mid} />
        <polygon points="9,6 9,9 7.5,7.5" fill={P.yellow.mid} />
        <polygon points="6,9 9,9 7.5,7.5" fill={P.blue.mid} />
        <polygon points="6,6 6,9 7.5,7.5" fill={P.red.mid} />
      </svg>
    </div>
  )
}

/**
 * The board theme button in the game room's dock (Ludo and Chess): pick a
 * theme you own, or buy one with coins. One theme is free.
 */
export function BoardThemePicker({ game }: { game: ThemeGame }) {
  const { user } = useSession()
  const wallet = useWallet()
  const owned = wallet?.themes ?? []
  const current = useBoardTheme(game, owned)
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)
  const list = THEMES[game] as BoardTheme<unknown>[]

  const pick = async (t: BoardTheme<unknown>) => {
    if (!user || busy) return
    const have = t.price === 0 || owned.includes(t.id)
    if (have) {
      chooseTheme(game, t.id)
      return
    }
    setBusy(t.id)
    try {
      await buyTheme(user.uid, t.id)
      chooseTheme(game, t.id)
      toast.success(`${t.name} board is yours`)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't buy that board"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Button variant="outline" size="icon-sm" aria-label="Board theme" onClick={() => setOpen(true)}>
        <HugeiconsIcon icon={DashboardSquare01Icon} />
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Board theme"
        description={
          <span className="inline-flex items-center gap-1.5">
            Your coins: <Coins amount={wallet?.balance ?? 0} iconClassName="size-3.5" />
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3">
          {list.map((t) => {
            const have = t.price === 0 || owned.includes(t.id)
            const using = current.id === t.id
            const short = !have && (wallet?.balance ?? 0) < t.price
            return (
              <div
                key={t.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-xs transition-colors",
                  using && "border-primary ring-1 ring-primary"
                )}
              >
                <Preview theme={t} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{t.blurb}</p>
                </div>
                <Button
                  size="sm"
                  variant={using ? "secondary" : have ? "outline" : "default"}
                  disabled={using || !!busy || short}
                  onClick={() => void pick(t)}
                  className="w-full"
                >
                  {busy === t.id ? (
                    <Spinner />
                  ) : using ? (
                    <>
                      <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
                      Using
                    </>
                  ) : have ? (
                    "Use"
                  ) : (
                    <>
                      Buy · <Coins amount={t.price} iconClassName="size-3.5" />
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}
