"use client"

import * as React from "react"
import { serverTimestamp } from "firebase/database"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import { playSound } from "@/lib/live/sound"
import { allDone, blanksOf, conflicts, filledCount, isSolved, PEERS, rankingOf, resultOf, type SudokuState } from "@/lib/live/sudoku"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { updateState } from "@/services/live-rooms"
import { PlayerAvatar } from "../player-avatar"
import { useStageFit } from "../use-stage-fit"

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)
const storeKey = (code: string, uid: string) => `joysplit_sudoku_${code}_${uid}`
/** Height a phone keeps for everything but the (square) grid: players, timer, keypad, gaps. */
const GRID_RESERVE_PX = 236

function readSaved(code: string, uid: string, puzzle: string): string | null {
  try {
    const v = localStorage.getItem(storeKey(code, uid))
    if (!v || v.length !== 81) return null
    // Only a grid for this very puzzle (givens in place)
    for (let i = 0; i < 81; i++) if (puzzle[i] !== "." && v[i] !== puzzle[i]) return null
    return v
  } catch {
    return null
  }
}

/**
 * Sudoku race: everyone solves the same puzzle on their own board. Your
 * grid lives on this device (saved as you go); the room only learns how far
 * you got and when you finished. First to finish is 1st, then 2nd…
 */
export function SudokuGame(props: LiveGameProps) {
  const { data: state } = useRoomNode<SudokuState>(props.code, "state")
  if (!state) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }
  return <SudokuView {...props} state={state} />
}

/** The race screen for a given state (split out so it can be previewed). */
export function SudokuView({ code, meta, players, uid, me, isReferee, now, endGame, state }: LiveGameProps & { state: SudokuState }) {
  const byId = React.useMemo(() => Object.fromEntries(players.map((p) => [p.uid, p])) as Record<string, RoomPlayer>, [players])
  const gone = React.useMemo(() => players.filter((p) => p.left).map((p) => p.uid), [players])
  const stageRef = useStageFit()

  // Your grid: from this device if you were here before, else the bare puzzle
  const puzzle = state?.puzzle ?? null
  const [grid, setGrid] = React.useState<string | null>(null)
  const [gridFor, setGridFor] = React.useState<string | null>(null)
  if (puzzle && gridFor !== puzzle) {
    setGridFor(puzzle)
    setGrid(readSaved(code, uid, puzzle) ?? puzzle)
  }
  const [selected, setSelected] = React.useState<number | null>(null)

  const finishedAt = state?.finished?.[uid]
  const done = finishedAt !== undefined
  const endsAt = (meta.startedAt ?? 0) + (state?.minutes ?? 20) * 60_000
  const secondsLeft = meta.startedAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null

  // Referee: everyone here has finished, or time's up → the end. The short pause
  // lets the last "Solved!" show; it must not be cancelled by the clock ticking on
  // (this effect re-runs every second), or the game would never end.
  const ended = React.useRef(false)
  React.useEffect(() => {
    if (!isReferee || !state || ended.current || !meta.startedAt) return
    const over = allDone(state, gone)
    const timeUp = now >= endsAt
    if (!over && !timeUp) return
    ended.current = true
    window.setTimeout(() => {
      endGame(resultOf(state, gone, over ? "all_solved" : "time_up")).catch(() => {
        ended.current = false
      })
    }, 1500)
  }, [isReferee, state, gone, now, endsAt, meta.startedAt, endGame])

  const canEdit = !!state && !!puzzle && !!grid && !done && !me.left && (secondsLeft ?? 1) > 0

  /** Puts `d` ("1"–"9", or "." to erase) in the selected cell. */
  const setCell = (d: string) => {
    const sel = selected
    if (!puzzle || !grid || sel === null || !canEdit || puzzle[sel] !== ".") return
    if (grid[sel] === d) return
    const next = grid.slice(0, sel) + d + grid.slice(sel + 1)
    setGrid(next)
    try {
      localStorage.setItem(storeKey(code, uid), next)
    } catch {
      /* storage unavailable */
    }
    if (d !== ".") playSound("place")
    const patch: Record<string, unknown> = { [`progress/${uid}`]: filledCount(next, puzzle) }
    if (isSolved(next, puzzle)) {
      patch[`finished/${uid}`] = serverTimestamp()
      playSound("correct")
    }
    void updateState(code, patch).catch(() => undefined)
  }
  const moveBy = (dx: number, dy: number) => {
    const cur = selected ?? 40
    const r = Math.min(8, Math.max(0, Math.floor(cur / 9) + dy))
    const c = Math.min(8, Math.max(0, (cur % 9) + dx))
    setSelected(r * 9 + c)
  }

  // Keyboard on bigger screens: digits, Backspace, arrows
  const onKey = React.useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.matches("input, textarea")) return
    if (/^[1-9]$/.test(e.key)) setCell(e.key)
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") setCell(".")
    else if (e.key === "ArrowLeft") moveBy(-1, 0)
    else if (e.key === "ArrowRight") moveBy(1, 0)
    else if (e.key === "ArrowUp") moveBy(0, -1)
    else if (e.key === "ArrowDown") moveBy(0, 1)
    else return
    e.preventDefault()
  })
  React.useEffect(() => {
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!state || !puzzle || !grid) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }

  const bad = conflicts(grid)
  const blanks = blanksOf(puzzle)
  const mineFilled = filledCount(grid, puzzle)
  const sel = selected
  const selDigit = sel !== null && grid[sel] !== "." ? grid[sel] : null

  const counts: Record<string, number> = {}
  for (const ch of grid) if (ch !== ".") counts[ch] = (counts[ch] ?? 0) + 1
  const ranking = rankingOf(state, gone)
  const myPlace = done ? Object.values(state.finished ?? {}).filter((t) => t <= finishedAt!).length : 0
  const mm = secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "–:––"

  return (
    <div
      ref={stageRef}
      style={{ "--grid-reserve": `${GRID_RESERVE_PX}px` } as React.CSSProperties}
      className={cn(
        "mx-auto flex w-full max-w-md flex-col gap-3",
        "max-md:fixed max-md:inset-x-0 max-md:top-(--stage-top) max-md:z-20 max-md:h-(--stage-h) max-md:max-w-none max-md:justify-center max-md:overflow-hidden max-md:bg-background max-md:px-3 max-md:py-2",
        "max-md:[--grid-w:min(100%,calc(var(--stage-h)_-_var(--grid-reserve)))]"
      )}
    >
      {/* Everyone's progress, and the clock */}
      <div className="flex items-center gap-2">
        {/* A frame's ornaments reach ~1/3 of the photo past it on every side: the row
            leaves that room (a scrolling row clips whatever pokes out of it) */}
        <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto px-2.5 py-3">
          {ranking.map((id) => {
            const p = byId[id]
            const fin = state.finished?.[id]
            const pct = fin !== undefined ? 100 : Math.round(((state.progress?.[id] ?? 0) / blanks) * 100)
            const place = fin !== undefined ? Object.values(state.finished ?? {}).filter((t) => t <= fin).length : 0
            return (
              <div key={id} className={cn("flex max-w-16 min-w-[3.4rem] flex-1 basis-0 flex-col items-center gap-1.5", p?.left && "opacity-50")}>
                <span className="relative">
                  <PlayerAvatar player={p} size={32} />
                  {place > 0 && (
                    <span className="absolute -right-1.5 -bottom-1 rounded-full bg-success px-1 text-[9px] font-bold text-success-foreground ring-2 ring-background">
                      {ordinal(place)}
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center text-[10px] font-medium">{id === uid ? "You" : (p?.name ?? "?").split(" ")[0]}</span>
                <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <span className={cn("block h-full rounded-full transition-[width] duration-500", fin !== undefined ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
                </span>
              </div>
            )
          })}
        </div>
        <div className={cn("shrink-0 rounded-lg border px-2.5 py-1.5 text-center tabular-nums", secondsLeft !== null && secondsLeft <= 60 && "border-destructive/40 text-destructive")}>
          <p className="text-[10px] text-muted-foreground">Time</p>
          <p className="text-sm font-bold">{mm}</p>
        </div>
      </div>

      {done && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-center text-sm font-semibold text-success">
          Solved — you finished {ordinal(myPlace)}! Waiting for the others…
        </p>
      )}

      {/* The grid */}
      <div className="mx-auto w-(--grid-w) max-w-full">
        <div
          role="grid"
          aria-label="Sudoku"
          className="grid aspect-square w-full grid-cols-9 overflow-hidden rounded-xl border-2 border-foreground/80 bg-card shadow-xs"
        >
          {Array.from(grid).map((ch, i) => {
            const r = Math.floor(i / 9)
            const c = i % 9
            const given = puzzle[i] !== "."
            const isSel = sel === i
            const peer = sel !== null && PEERS[sel].includes(i)
            const same = selDigit !== null && ch === selDigit
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={`Row ${r + 1}, column ${c + 1}${ch === "." ? ", empty" : `, ${ch}`}`}
                onClick={() => setSelected(i)}
                className={cn(
                  "flex min-h-0 min-w-0 items-center justify-center border-foreground/15 text-[min(5.2vw,1.35rem)] leading-none tabular-nums transition-colors",
                  c % 3 === 2 && c < 8 ? "border-r-2 border-r-foreground/70" : c < 8 && "border-r",
                  r % 3 === 2 && r < 8 ? "border-b-2 border-b-foreground/70" : r < 8 && "border-b",
                  given ? "font-bold text-foreground" : "font-semibold text-primary",
                  peer && "bg-primary/6",
                  same && "bg-primary/18",
                  isSel && "bg-primary/30",
                  bad.has(i) && !given && "bg-destructive/12 text-destructive",
                  bad.has(i) && given && "text-destructive"
                )}
              >
                {ch === "." ? "" : ch}
              </button>
            )
          })}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-5 gap-1.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => {
          const left = 9 - (counts[d] ?? 0)
          return (
            <button
              key={d}
              type="button"
              disabled={!canEdit || sel === null || left <= 0}
              onClick={() => setCell(d)}
              className="flex h-12 flex-col items-center justify-center rounded-lg border border-card-stroke bg-card shadow-xs transition-[transform,background-color] active:scale-95 active:bg-subtle-pressed disabled:opacity-40"
            >
              <span className="text-lg leading-none font-bold">{d}</span>
              <span className="text-[9px] text-muted-foreground tabular-nums">{left}</span>
            </button>
          )
        })}
        <button
          type="button"
          disabled={!canEdit || sel === null || puzzle[sel] !== "." || grid[sel] === "."}
          onClick={() => setCell(".")}
          aria-label="Erase"
          className="flex h-12 items-center justify-center rounded-lg border border-card-stroke bg-card shadow-xs transition-[transform,background-color] active:scale-95 active:bg-subtle-pressed disabled:opacity-40"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-5" />
        </button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground max-md:hidden">
        {mineFilled}/{blanks} filled · type 1–9 on the keyboard, arrows to move
      </p>
    </div>
  )
}
