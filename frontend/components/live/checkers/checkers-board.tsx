"use client"

import * as React from "react"
import { CrownIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  cellAt,
  colOf,
  isKing,
  isPlayable,
  otherSide,
  rowOf,
  sideOfCell,
  squareNumber,
  type Board,
  type Cell,
  type CheckersLastMove,
} from "@/lib/live/checkers"
import { cn } from "@/lib/utils"

/** A hop takes this long; a long sequence is capped so it never drags. */
const HOP_MS = 220
const MAX_HOP_MS = 800

export interface BoardTarget {
  capture: boolean
}

/**
 * A piece drawn as a disc, sized by its font-size (1em across), with a crown
 * for kings. Light is ivory, dark a deep maroon, so both read on the board
 * and in the player chips.
 */
export function Disc({ cell, className }: { cell: Cell; className?: string }) {
  const side = sideOfCell(cell)
  if (!side) return null
  return (
    <span
      className={cn(
        "jsck-piece",
        side === "l" ? "jsck-l" : "jsck-d",
        className
      )}
      aria-hidden
    >
      {isKing(cell) && (
        <HugeiconsIcon
          icon={CrownIcon}
          className={cn(
            "size-[52%]",
            side === "l" ? "text-[#8a6a23]" : "text-[#f0c75e]"
          )}
          strokeWidth={2.2}
        />
      )}
    </span>
  )
}

/** Piece styling and the animations, once per page. */
export function CheckersStyles() {
  return (
    <style>{`.jsck-piece{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:1em;height:1em;border-radius:9999px;user-select:none;-webkit-user-select:none}
.jsck-l{background:radial-gradient(circle at 38% 32%,#fffdf6 0,#efe5cf 55%,#cbbb97 100%);box-shadow:inset 0 0 0 .06em rgba(110,90,55,.5),inset 0 0 0 .22em rgba(110,90,55,.13),0 .08em .16em rgba(0,0,0,.35)}
.jsck-d{background:radial-gradient(circle at 38% 32%,#7d4343 0,#4a2424 55%,#2b1313 100%);box-shadow:inset 0 0 0 .06em rgba(0,0,0,.55),inset 0 0 0 .22em rgba(255,255,255,.09),0 .08em .16em rgba(0,0,0,.45)}
.jsck-hop{animation:jsck-hop ${HOP_MS}ms cubic-bezier(.2,.7,.3,1) both}
@keyframes jsck-fade{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(.5)}}
.jsck-fade{opacity:0;animation:jsck-fade 420ms ease-in both}
@keyframes jsck-must{0%,100%{opacity:.35}50%{opacity:1}}
.jsck-must{animation:jsck-must 1.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.jsck-hop,.jsck-fade,.jsck-must{animation:none}.jsck-must{opacity:1}}`}</style>
  )
}

export function CheckersBoard({
  board,
  flipped,
  canInteract,
  selected,
  trail,
  ghosts,
  movable,
  mustCapture,
  targets,
  lastMove,
  moveCount,
  onTap,
  className,
}: {
  /** What to show: the live board, or the preview of a jump in progress. */
  board: Board
  /** Dark at the bottom. */
  flipped: boolean
  /** It's your move and the game is on. */
  canInteract: boolean
  /** The piece in hand: where it is right now, mid-jump included. */
  selected: number | null
  /** Squares the piece in hand has passed through this move (start first). */
  trail: number[]
  /** Pieces the jump in progress has taken: still drawn, but faded. */
  ghosts: number[]
  /** Pieces that may be picked up. */
  movable: ReadonlySet<number>
  /** A capture is on: only the pieces that can take are tappable. */
  mustCapture: boolean
  targets: ReadonlyMap<number, BoardTarget>
  lastMove: CheckersLastMove | null
  /** Restarts the hop animation on every move. */
  moveCount: number
  onTap: (square: number) => void
  className?: string
}) {
  const hop = lastMove && lastMove.path.length > 1 ? lastMove : null
  const hopMs = hop ? Math.min(MAX_HOP_MS, HOP_MS * (hop.path.length - 1)) : 0
  // The pieces that were just taken fade out in the colour of the loser
  const moverSide = hop ? sideOfCell(board[hop.to]) : null
  const taken: Cell | null = moverSide ? otherSide(moverSide) : null

  return (
    <div className={cn("relative", className)}>
      {hop && <style>{hopKeyframes(hop.path, flipped)}</style>}
      <div
        role="grid"
        aria-label="Checkers board"
        className="@container grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border border-black/15 shadow-sm select-none dark:border-white/10"
        data-no-swipe
      >
        {Array.from({ length: 64 }, (_, i) => {
          const drow = Math.floor(i / 8)
          const dcol = i % 8
          const row = flipped ? 7 - drow : drow
          const col = flipped ? 7 - dcol : dcol
          const sq = cellAt(row, col)
          const playable = isPlayable(sq)
          const cell = board[sq]
          const target = targets.get(sq)
          const isEnd = lastMove?.from === sq || lastMove?.to === sq
          const onPath = !isEnd && !!lastMove?.path.includes(sq)
          const inTrail = trail.includes(sq) && selected !== sq
          const pick = canInteract && selected === null && movable.has(sq)
          const ghost = ghosts.includes(sq)
          const fading = !!taken && cell === "" && !!hop?.captured?.includes(sq)
          const landing = hop?.to === sq
          const tappable =
            canInteract &&
            (pick || !!target || selected === sq || movable.has(sq))
          const label = `${squareNumber(sq)}${cell ? `, ${describe(cell)}` : ""}`
          return (
            <div
              key={sq}
              role="gridcell"
              aria-label={playable ? label : undefined}
              className={cn(
                "relative flex items-center justify-center",
                playable ? "bg-[#9c6b47]" : "bg-[#efe3cc]"
              )}
            >
              {playable && (
                <span
                  className="absolute top-px left-0.5 text-[length:2.4cqw] leading-none font-semibold text-[#efe3cc]/55"
                  aria-hidden
                >
                  {squareNumber(sq)}
                </span>
              )}
              {(isEnd || onPath) && (
                <span
                  className={cn(
                    "absolute inset-0",
                    isEnd ? "bg-[#f5c400]/40" : "bg-[#f5c400]/20"
                  )}
                  aria-hidden
                />
              )}
              {inTrail && (
                <span className="absolute inset-0 bg-primary/25" aria-hidden />
              )}
              {selected === sq && (
                <span className="absolute inset-0 bg-primary/45" aria-hidden />
              )}
              {target && (
                <span
                  className={cn(
                    "absolute rounded-full",
                    target.capture
                      ? "size-[38%] bg-primary/75 ring-[0.25em] ring-primary/30"
                      : "size-[30%] bg-black/25"
                  )}
                  aria-hidden
                />
              )}
              {pick && mustCapture && (
                <span
                  className="jsck-must absolute inset-[5%] rounded-full ring-[0.2em] ring-primary"
                  aria-hidden
                />
              )}
              {fading && taken && (
                <span
                  key={`${sq}-taken-${moveCount}`}
                  className="jsck-fade absolute inset-0 flex items-center justify-center text-[length:10cqw]"
                  style={{ animationDelay: `${hopMs}ms` }}
                  aria-hidden
                >
                  <Disc cell={taken} />
                </span>
              )}
              {cell !== "" && (
                <span
                  key={landing ? `${sq}-${moveCount}` : sq}
                  className={cn(
                    "relative z-10 flex size-full items-center justify-center text-[length:10cqw] transition-opacity",
                    landing && "jsck-hop",
                    ghost && "opacity-35"
                  )}
                  style={
                    landing ? { animationDuration: `${hopMs}ms` } : undefined
                  }
                >
                  <Disc cell={cell} />
                </span>
              )}
              {playable && (
                <button
                  type="button"
                  tabIndex={tappable ? 0 : -1}
                  aria-label={
                    target
                      ? `${target.capture ? "Jump to" : "Move to"} ${squareNumber(sq)}`
                      : selected === sq
                        ? "Put the piece down"
                        : pick || movable.has(sq)
                          ? `Pick up the ${describe(cell)} on ${squareNumber(sq)}`
                          : label
                  }
                  onClick={() => onTap(sq)}
                  className="absolute inset-0 z-20 rounded-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const describe = (cell: Cell) =>
  `${sideOfCell(cell) === "l" ? "light" : "dark"} ${isKing(cell) ? "king" : "man"}`

/**
 * The last move replayed hop by hop: the piece starts where the move began
 * and visits every square of the path, in multiples of its own size.
 */
function hopKeyframes(path: number[], flipped: boolean) {
  const to = path[path.length - 1]
  const last = path.length - 1
  const sign = flipped ? -1 : 1
  const stops = path.map((sq, i) => {
    const dx = sign * (colOf(sq) - colOf(to)) * 100
    const dy = sign * (rowOf(sq) - rowOf(to)) * 100
    return `${Math.round((i / last) * 100)}%{transform:translate(${dx}%,${dy}%)}`
  })
  return `@keyframes jsck-hop{${stops.join("")}}`
}
