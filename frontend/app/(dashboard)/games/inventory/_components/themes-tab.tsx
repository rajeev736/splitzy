"use client"

import * as React from "react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FilterPills } from "@/app/(dashboard)/_components/filter-pills"
import { Coins } from "@/components/fun/coin"
import { BoardThemeThumb, ThemeAction } from "@/components/live/board-theme-picker"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { ownsTheme, THEMES, useBoardTheme, type BoardTheme, type ThemeGame } from "@/lib/live/themes"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BoardPreview } from "./board-preview"

export type BoardFilter = "all" | ThemeGame

const GAMES: ThemeGame[] = ["ludo", "chess", "snakes3d", "tictactoe"]
const GAME_LABEL: Record<ThemeGame, string> = { ludo: "Ludo", chess: "Chess", snakes3d: "Snakes 3D", tictactoe: "Tic Tac Toe" }

/**
 * Board themes for every game, shown like a store. Tap one to see the real
 * board in it; buying or using goes through the same button as the game's
 * own picker.
 */
export function ThemesTab({
  wallet,
  filter,
  onFilter,
}: {
  wallet: Wallet | null | undefined
  filter: BoardFilter
  onFilter: (filter: BoardFilter) => void
}) {
  const owned = wallet?.themes
  // What this device plays each game on
  const current: Record<ThemeGame, string> = {
    ludo: useBoardTheme("ludo", owned).id,
    chess: useBoardTheme("chess", owned).id,
    snakes3d: useBoardTheme("snakes3d", owned).id,
    tictactoe: useBoardTheme("tictactoe", owned).id,
  }
  const [picked, setPicked] = React.useState<BoardTheme<unknown> | null>(null)
  const [open, setOpen] = React.useState(false)
  const games = filter === "all" ? GAMES : [filter]

  const openTheme = (t: BoardTheme<unknown>) => {
    setPicked(t)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterPills
        aria-label="Show boards for"
        value={filter}
        onValueChange={onFilter}
        options={[{ value: "all", label: "All" }, ...GAMES.map((g) => ({ value: g, label: GAME_LABEL[g] }))]}
      />

      {games.map((game) => {
        const list = THEMES[game] as BoardTheme<unknown>[]
        const have = list.filter((t) => ownsTheme(t, owned)).length
        return (
          <section key={game} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2 px-1">
              <h3 className="text-sm font-semibold">{GAME_LABEL[game]}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {have} of {list.length} owned
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {list.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  owned={ownsTheme(t, owned)}
                  using={current[game] === t.id}
                  onClick={() => openTheme(t)}
                />
              ))}
            </div>
          </section>
        )
      })}

      <p className="px-1 text-center text-xs text-muted-foreground">
        Boards you buy are yours on every device. Which one you play on is picked per device, here or in the game.
      </p>

      {picked && (
        <ThemeSheet
          theme={picked}
          onPick={setPicked}
          open={open}
          onOpenChange={setOpen}
          wallet={wallet}
          using={current[picked.game] === picked.id}
        />
      )}
    </div>
  )
}

function ThemeCard({
  theme,
  owned,
  using,
  onClick,
}: {
  theme: BoardTheme<unknown>
  owned: boolean
  using: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${theme.name} board`}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-card-stroke bg-card text-left shadow-xs transition-[background-color,transform] hover:bg-subtle-hover active:scale-[0.98]",
        using && "border-primary ring-2 ring-primary/20"
      )}
    >
      <div className="relative p-1.5 pb-0">
        {/* Not yours yet: soft and muted (tap for the full-colour preview) */}
        <div className={cn("transition-[filter,opacity]", !owned && "opacity-60 saturate-[.35]")}>
          <BoardThemeThumb theme={theme} />
        </div>
        {using && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
            <HugeiconsIcon icon={Tick02Icon} className="size-3" />
            In use
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2.5 pt-2 pb-2.5">
        <p className="truncate text-sm font-semibold">{theme.name}</p>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{theme.blurb}</p>
        <div className="mt-auto pt-1.5 text-xs">
          {owned ? (
            <span className="font-medium text-muted-foreground">{theme.price === 0 ? "Free" : "Owned"}</span>
          ) : (
            <Coins amount={theme.price} iconClassName="size-3.5" />
          )}
        </div>
      </div>
    </button>
  )
}

/** The real board in a theme, the game's other themes to flip through, and use / buy. */
function ThemeSheet({
  theme,
  onPick,
  open,
  onOpenChange,
  wallet,
  using,
}: {
  theme: BoardTheme<unknown>
  onPick: (theme: BoardTheme<unknown>) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null | undefined
  using: boolean
}) {
  const list = THEMES[theme.game] as BoardTheme<unknown>[]
  const owned = ownsTheme(theme, wallet?.themes)

  return (
    <BottomSheet
      className="gu"
      open={open}
      onOpenChange={onOpenChange}
      title={`${GAME_LABEL[theme.game]} boards`}
      description={
        <span className="inline-flex items-center gap-1.5">
          Your coins: <Coins amount={wallet?.balance ?? 0} iconClassName="size-3.5" />
        </span>
      }
      footer={<ThemeAction theme={theme} wallet={wallet} using={using} />}
    >
      <div className="flex flex-col gap-3 pb-3">
        <ThemeStrip list={list} picked={theme} onPick={onPick} />

        {/* Sized to the screen's height too, so the strip and the whole board fit on small phones */}
        <BoardPreview key={theme.id} theme={theme} className="mx-auto w-full max-w-[min(100%,40svh,26rem)] animate-in duration-200 fade-in" />

        <div className="flex items-start justify-between gap-3 px-1 pt-1">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{theme.name}</p>
            <p className="text-xs text-muted-foreground">{theme.blurb}</p>
          </div>
          <span className="shrink-0 pt-0.5 text-sm">
            {owned ? (
              <span className="text-xs font-medium text-muted-foreground">{theme.price === 0 ? "Free" : "Owned"}</span>
            ) : (
              <Coins amount={theme.price} iconClassName="size-4" />
            )}
          </span>
        </div>
      </div>
    </BottomSheet>
  )
}

/** The game's boards in a row, to flip between (the sheet opens with focus here, so it sits at the top). */
function ThemeStrip({
  list,
  picked,
  onPick,
}: {
  list: BoardTheme<unknown>[]
  picked: BoardTheme<unknown>
  onPick: (theme: BoardTheme<unknown>) => void
}) {
  const strip = React.useRef<HTMLDivElement>(null)

  // Keep the picked board's thumbnail in view, scrolling sideways only
  React.useEffect(() => {
    // After the sheet has laid out (it measures nothing while it opens)
    const t = window.setTimeout(() => {
      const row = strip.current
      const on = row?.querySelector<HTMLElement>("[aria-checked=true]")
      if (!row || !on) return
      const left = on.offsetLeft - row.offsetLeft
      if (left < row.scrollLeft || left + on.offsetWidth > row.scrollLeft + row.clientWidth)
        row.scrollTo({ left: left - (row.clientWidth - on.offsetWidth) / 2, behavior: "smooth" })
    }, 120)
    return () => window.clearTimeout(t)
  }, [picked.id])

  return (
    <div
      ref={strip}
      role="radiogroup"
      aria-label={`${GAME_LABEL[picked.game]} boards`}
      className="-mx-1 flex gap-2 overflow-x-auto p-1 scrollbar-none"
      onKeyDown={(e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
        const next = list[list.findIndex((t) => t.id === picked.id) + step]
        if (!step || !next) return
        e.preventDefault()
        onPick(next)
        // Focus follows the pick, once it has re-rendered as the tabbable one
        requestAnimationFrame(() => strip.current?.querySelector<HTMLElement>("[aria-checked=true]")?.focus())
      }}
    >
      {list.map((t) => {
        const on = t.id === picked.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t.name}
            // One tab stop for the group: the sheet opens with focus on the picked board
            tabIndex={on ? 0 : -1}
            onClick={() => onPick(t)}
            className={cn(
              "flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg p-1 transition-colors",
              on ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/60"
            )}
          >
            <BoardThemeThumb theme={t} />
            <span className={cn("w-full truncate text-center text-[10px] font-medium", on ? "text-primary" : "text-muted-foreground")}>
              {t.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
