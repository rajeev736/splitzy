"use client"

import * as React from "react"
import { DashboardSquare01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Coins } from "@/components/fun/coin"
import { announceUnlock } from "@/components/rewards/reward-notice"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"
import { useBuyTheme } from "@/hooks/use-fun-mutations"
import {
  chooseTheme,
  ownsTheme,
  THEMES,
  useBoardTheme,
  type BoardTheme,
  type ChessLook,
  type LudoLook,
  type Snakes3DLook,
  type ThemeGame,
  type TicTacToeLook,
} from "@/lib/live/themes"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { pieceImage } from "./chess/chess-board"
import { LiveGameLogo } from "./live-game-logo"

const fmt = new Intl.NumberFormat("en-IN")

/**
 * A theme's preview picture, square. Until a picture exists (or if it fails
 * to load) the game's logo stands in, so a card never shows a broken image.
 */
export function ThemePicture({ theme, className }: { theme: BoardTheme<unknown>; className?: string }) {
  const look = theme.look as Partial<Snakes3DLook & TicTacToeLook>
  const [failed, setFailed] = React.useState<string | null>(null)
  const src = look.preview
  return (
    <div className={cn("relative aspect-square w-full overflow-hidden bg-muted", className)} style={{ background: look.table }}>
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small static picture; no optimising needed
        <img
          src={src}
          alt=""
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
          className="block size-full object-cover object-top"
        />
      ) : (
        <span className="flex size-full items-center justify-center">
          <LiveGameLogo game={theme.game} className="size-1/2" />
        </span>
      )}
    </div>
  )
}

/** The board in the "Unlocked!" popup after buying it. */
function UnlockedBoard({ theme }: { theme: BoardTheme<unknown> }) {
  return (
    <span className="block size-24 overflow-hidden rounded-2xl shadow-[0_0_0_3px_#fff,0_6px_14px_rgba(30,40,110,.3)]">
      <BoardThemeThumb theme={theme} />
    </span>
  )
}

/** A tiny picture of a board in a theme (the game's picker and the inventory's cards). */
export function BoardThemeThumb({ theme }: { theme: BoardTheme<unknown> }) {
  // Snakes 3D and Tic Tac Toe themes come with a picture
  if (theme.game === "snakes3d" || theme.game === "tictactoe") return <ThemePicture theme={theme} className="rounded-md" />
  if (theme.game === "chess") {
    const look = theme.look as ChessLook
    // The top-left quarter of the board, with a few pieces on it
    const f = look.frameInset ?? 0
    const k = 2 / (1 - 2 * f) // the picture's width, in previews
    const squares = look.framed
      ? `url(${look.framedThumb ?? look.framed}) ${((f * k) / (k - 1)) * 100}% ${((f * k) / (k - 1)) * 100}% / ${k * 100}% no-repeat`
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
      <img
        src={look.image.thumb ?? look.image.src}
        alt=""
        width={384}
        height={384}
        loading="lazy"
        decoding="async"
        className="block aspect-square h-auto w-full rounded-md object-cover"
      />
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
 * The one button for a board theme, wherever it shows (the game room's
 * picker, the inventory): in use, use it, or buy it after a confirm and play
 * on it. Ownership comes from the live wallet, so a board bought anywhere is
 * never sold twice.
 */
export function ThemeAction({
  theme,
  wallet,
  using,
  compact = false,
  onUsed,
  className,
}: {
  theme: BoardTheme<unknown>
  wallet: Wallet | null | undefined
  /** This device plays on it now. */
  using: boolean
  /** Short labels, for the cards in the game's picker. */
  compact?: boolean
  /** After it's put on (picked or bought). */
  onUsed?: () => void
  className?: string
}) {
  const buy = useBuyTheme()
  const [confirming, setConfirming] = React.useState(false)
  const have = ownsTheme(theme, wallet?.themes)
  const balance = wallet?.balance ?? 0
  const short = !have && !!wallet && balance < theme.price

  const use = () => {
    chooseTheme(theme.game, theme.id)
    onUsed?.()
  }

  return (
    <>
      <Button
        size={compact ? "sm" : "default"}
        variant={using ? "secondary" : have ? "outline" : "default"}
        disabled={using || buy.isPending || short || (!have && !wallet)}
        onClick={() => (have ? use() : setConfirming(true))}
        className={cn("w-full", className)}
      >
        {buy.isPending ? (
          <Spinner />
        ) : using ? (
          <>
            <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
            {compact ? "Using" : "In use on this device"}
          </>
        ) : have ? (
          compact ? "Use" : "Use on this device"
        ) : short && !compact ? (
          `${fmt.format(theme.price - balance)} more coins needed`
        ) : (
          <>
            Buy · <Coins amount={theme.price} iconClassName="size-3.5" />
          </>
        )}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Buy the ${theme.name} board?`}
        confirmLabel="Buy"
        isPending={buy.isPending}
        onConfirm={() =>
          buy.mutate(theme, {
            onSuccess: () => {
              setConfirming(false)
              announceUnlock({
                title: `${theme.name} board`,
                art: { node: <UnlockedBoard theme={theme} /> },
                line: "It's yours on every device — you'll play on it from now",
              })
              onUsed?.()
            },
          })
        }
        description={
          <>
            {fmt.format(theme.price)} coins from your {fmt.format(balance)}. It&apos;s yours on every device, and you&apos;ll
            play on it from now.
          </>
        }
      />
    </>
  )
}

/**
 * The board theme button in the game room's dock (Ludo, Chess, Snakes 3D):
 * pick a theme you own, or buy one with coins. One theme is free.
 */
export function BoardThemePicker({ game }: { game: ThemeGame }) {
  const wallet = useWallet()
  const current = useBoardTheme(game, wallet?.themes)
  const [open, setOpen] = React.useState(false)
  const list = THEMES[game] as BoardTheme<unknown>[]

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
            const using = current.id === t.id
            return (
              <div
                key={t.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-xs transition-colors",
                  using && "border-primary ring-1 ring-primary"
                )}
              >
                {/* Not yours yet: soft and muted until bought */}
                <div className={cn("transition-[filter,opacity]", !ownsTheme(t, wallet?.themes) && "opacity-60 saturate-[.35]")}>
                  <BoardThemeThumb theme={t} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{t.blurb}</p>
                </div>
                {/* Picking (or buying) a board puts it on and closes the sheet: you're straight back at the game */}
                <ThemeAction theme={t} wallet={wallet} using={using} compact onUsed={() => setOpen(false)} />
              </div>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}
