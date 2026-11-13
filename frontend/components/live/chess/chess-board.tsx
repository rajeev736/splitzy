"use client"

import * as React from "react"
import type { Color, PieceSymbol, Square } from "chess.js"

import { coords, FILES, squareAt } from "@/lib/live/chess"
import { cn } from "@/lib/utils"

/**
 * Filled chess glyphs for both sides, told apart by colour: the outline
 * glyphs render very differently from one phone font to the next. U+FE0E
 * keeps them text rather than emoji.
 */
export const GLYPH: Record<PieceSymbol, string> = {
  k: "♚︎",
  q: "♛︎",
  r: "♜︎",
  b: "♝︎",
  n: "♞︎",
  p: "♟︎",
}

export const PIECE_NAME: Record<PieceSymbol, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
}

const PROMOTIONS: PieceSymbol[] = ["q", "r", "b", "n"]
/** Finger travel before a touch counts as a drag rather than a tap. */
const DRAG_START_PX = 6

export interface BoardPiece {
  square: Square
  type: PieceSymbol
  color: Color
}

export interface BoardTarget {
  capture: boolean
  promotion: boolean
}

/** A piece drawn with the side's colouring, sized by its container's font. */
export function PieceGlyph({
  type,
  color,
  className,
}: {
  type: PieceSymbol
  color: Color
  className?: string
}) {
  return (
    <span
      className={cn(
        "jsch-piece",
        color === "w" ? "jsch-w" : "jsch-b",
        className
      )}
      aria-hidden
    >
      {GLYPH[type]}
    </span>
  )
}

/** Piece styling + the slide animation, once per board. */
function BoardStyles() {
  return (
    <style>{`.jsch-piece{line-height:1;font-family:"Segoe UI Symbol","Noto Sans Symbols2","Apple Symbols","DejaVu Sans",sans-serif;user-select:none;-webkit-user-select:none}
.jsch-w{color:#fff;-webkit-text-stroke:1px #1f1f1f;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.jsch-b{color:#1f1f1f;text-shadow:0 1px 2px rgba(0,0,0,.25)}
@keyframes jsch-slide{from{transform:translate(var(--dx),var(--dy))}to{transform:translate(0,0)}}
.jsch-slide{animation:jsch-slide 180ms cubic-bezier(.2,.7,.3,1)}
@media (prefers-reduced-motion:reduce){.jsch-slide{animation:none}}`}</style>
  )
}

export function ChessBoard({
  pieces,
  flipped,
  myColour,
  canInteract,
  selected,
  targets,
  lastMove,
  checkSquare,
  moveCount,
  promotion,
  onSelect,
  onMove,
  onPromote,
  onCancelPromotion,
  className,
}: {
  pieces: BoardPiece[]
  /** Black at the bottom. */
  flipped: boolean
  myColour: Color | null
  /** It's your move and the game is on. */
  canInteract: boolean
  selected: Square | null
  targets: Partial<Record<Square, BoardTarget>>
  lastMove: { from: Square; to: Square } | null
  /** The king in check, if any. */
  checkSquare: Square | null
  /** Restarts the slide animation on every move. */
  moveCount: number
  /** A pawn is waiting to be promoted. */
  promotion: { from: Square; to: Square } | null
  onSelect: (square: Square | null) => void
  onMove: (from: Square, to: Square) => void
  onPromote: (piece: PieceSymbol) => void
  onCancelPromotion: () => void
  className?: string
}) {
  const boardRef = React.useRef<HTMLDivElement>(null)
  const ghostRef = React.useRef<HTMLDivElement>(null)
  // The touch in progress: never read while rendering, only in handlers
  const drag = React.useRef<{
    from: Square
    pointerId: number
    x0: number
    y0: number
    moved: boolean
    /** Already selected when picked up: lifting without moving puts it down again. */
    wasSelected: boolean
  } | null>(null)
  const ghostPos = React.useRef("translate(-100%, -100%)")
  const [dragging, setDragging] = React.useState<Square | null>(null)

  const bysquare = React.useMemo(() => {
    const map: Partial<Record<Square, BoardPiece>> = {}
    for (const p of pieces) map[p.square] = p
    return map
  }, [pieces])

  // Castling moves the rook too: slide it along with the king
  const rookMove = React.useMemo(() => {
    if (!lastMove) return null
    const piece = bysquare[lastMove.to]
    const df = coords(lastMove.to).file - coords(lastMove.from).file
    if (!piece || piece.type !== "k" || Math.abs(df) !== 2) return null
    const rank = coords(lastMove.to).rank
    return df > 0
      ? { from: squareAt(7, rank), to: squareAt(5, rank) }
      : { from: squareAt(0, rank), to: squareAt(3, rank) }
  }, [lastMove, bysquare])

  const isMine = (sq: Square) => !!myColour && bysquare[sq]?.color === myColour

  const squareFromPoint = (clientX: number, clientY: number): Square | null => {
    const el = boardRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const col = Math.floor(((clientX - r.left) / r.width) * 8)
    const row = Math.floor(((clientY - r.top) / r.height) * 8)
    if (col < 0 || col > 7 || row < 0 || row > 7) return null
    return squareAt(flipped ? 7 - col : col, flipped ? row : 7 - row)
  }

  const placeGhost = (clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const size = r.width / 8
    ghostPos.current = `translate(${clientX - r.left - size / 2}px, ${clientY - r.top - size / 2}px)`
    if (ghostRef.current) ghostRef.current.style.transform = ghostPos.current
  }

  // The ghost appears a frame after the drag starts: put it under the finger right away
  React.useLayoutEffect(() => {
    if (dragging && ghostRef.current)
      ghostRef.current.style.transform = ghostPos.current
  }, [dragging])

  /** A tap on a square (finger lifted without dragging, or keyboard). */
  const tap = (sq: Square) => {
    if (promotion) return
    if (selected && targets[sq]) {
      onMove(selected, sq)
      return
    }
    if (canInteract && isMine(sq)) {
      onSelect(sq === selected ? null : sq)
      return
    }
    if (selected) onSelect(null)
  }

  const endDrag = () => {
    drag.current = null
    setDragging(null)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (promotion || e.button > 0) return
    const sq = squareFromPoint(e.clientX, e.clientY)
    if (!sq) return
    // Picking up a piece selects it at once, so its moves show as the finger lands
    if (canInteract && isMine(sq)) {
      if (sq !== selected) onSelect(sq)
      drag.current = {
        from: sq,
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        moved: false,
        wasSelected: sq === selected,
      }
      placeGhost(e.clientX, e.clientY)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_START_PX) return
      d.moved = true
      setDragging(d.from)
    }
    placeGhost(e.clientX, e.clientY)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const sq = squareFromPoint(e.clientX, e.clientY)
    if (d && d.pointerId === e.pointerId) {
      const { from, moved, wasSelected } = d
      endDrag()
      if (!moved) {
        // A tap on your own piece: selected on the way down, or put down again
        if (wasSelected && sq === from) onSelect(null)
        return
      }
      if (sq && sq !== from && targets[sq]) onMove(from, sq)
      else if (sq !== from) onSelect(null)
      return
    }
    if (sq) tap(sq)
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) endDrag()
  }

  const draggedPiece = dragging ? bysquare[dragging] : undefined

  return (
    <div className={cn("relative", className)}>
      <BoardStyles />
      <div
        ref={boardRef}
        role="grid"
        aria-label="Chess board"
        className="@container relative grid aspect-square w-full grid-cols-[repeat(8,minmax(0,1fr))] grid-rows-[repeat(8,minmax(0,1fr))] overflow-hidden rounded-lg border border-black/15 shadow-sm select-none dark:border-white/10"
        style={{ touchAction: "manipulation" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        data-no-swipe
      >
        {Array.from({ length: 64 }, (_, i) => {
          const row = Math.floor(i / 8)
          const col = i % 8
          const file = flipped ? 7 - col : col
          const rank = flipped ? row : 7 - row
          const sq = squareAt(file, rank)
          const light = (file + rank) % 2 === 1
          const piece = bysquare[sq]
          const target = targets[sq]
          const isLast = lastMove?.from === sq || lastMove?.to === sq
          const slide =
            lastMove?.to === sq
              ? lastMove
              : rookMove?.to === sq
                ? rookMove
                : null
          const own = canInteract && !!piece && piece.color === myColour
          return (
            <div
              key={sq}
              role="gridcell"
              aria-label={`${sq}${piece ? `, ${piece.color === "w" ? "white" : "black"} ${PIECE_NAME[piece.type]}` : ""}`}
              className={cn(
                // min-w/h-0 + overflow: a piece glyph can never stretch its square
                "relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden",
                light ? "bg-[#e9edf2]" : "bg-[#8ea4b1]",
                own && "cursor-grab"
              )}
              // Dragging a piece shouldn't scroll the page; swipes elsewhere on the board still do
              style={own ? { touchAction: "none" } : undefined}
            >
              {isLast && (
                <span
                  className="absolute inset-0 bg-[#f5c400]/45"
                  aria-hidden
                />
              )}
              {selected === sq && (
                <span className="absolute inset-0 bg-primary/45" aria-hidden />
              )}
              {checkSquare === sq && (
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(220,38,38,.9) 0 22%, rgba(220,38,38,.45) 50%, transparent 72%)",
                  }}
                  aria-hidden
                />
              )}
              {target && !piece && (
                <span
                  className="absolute size-[32%] rounded-full bg-black/25"
                  aria-hidden
                />
              )}
              {target && piece && (
                <span
                  className="absolute inset-[4%] rounded-full border-[0.3em] border-black/25"
                  aria-hidden
                />
              )}
              {/* Coordinates on the edge squares */}
              {col === 0 && (
                <span
                  className={cn(
                    "absolute top-px left-0.5 text-[length:2.8cqw] leading-none font-semibold",
                    light ? "text-[#8ea4b1]" : "text-[#e9edf2]"
                  )}
                >
                  {rank + 1}
                </span>
              )}
              {row === 7 && (
                <span
                  className={cn(
                    "absolute right-0.5 bottom-px text-[length:2.8cqw] leading-none font-semibold",
                    light ? "text-[#8ea4b1]" : "text-[#e9edf2]"
                  )}
                >
                  {FILES[file]}
                </span>
              )}
              {piece && (
                <span
                  key={slide ? `${sq}-${moveCount}` : sq}
                  className={cn(
                    "relative z-10 flex size-full items-center justify-center text-[length:9.5cqw] transition-opacity",
                    slide && "jsch-slide",
                    dragging === sq && "opacity-30"
                  )}
                  style={slide ? slideOffset(slide, flipped) : undefined}
                >
                  <PieceGlyph type={piece.type} color={piece.color} />
                </span>
              )}
              {/* Keyboard: Enter / Space on a square taps it (pointer taps are handled on the board) */}
              <button
                type="button"
                tabIndex={own || target ? 0 : -1}
                aria-label={
                  target
                    ? `Move to ${sq}`
                    : own
                      ? `Select ${PIECE_NAME[piece!.type]} on ${sq}`
                      : sq
                }
                onClick={(e) => {
                  if (e.detail === 0) tap(sq)
                }}
                className="absolute inset-0 z-20 rounded-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              />
            </div>
          )
        })}

        {/* The piece under the finger while dragging */}
        <div
          ref={ghostRef}
          className={cn(
            "pointer-events-none absolute top-0 left-0 z-30 flex size-[12.5%] items-center justify-center text-[length:11cqw] drop-shadow-lg",
            dragging ? "flex" : "hidden"
          )}
          aria-hidden
        >
          {draggedPiece && (
            <PieceGlyph type={draggedPiece.type} color={draggedPiece.color} />
          )}
        </div>

        {promotion && myColour && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 shadow-lg">
              <p className="text-xs font-semibold">Promote to</p>
              <div className="flex gap-1.5">
                {PROMOTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={PIECE_NAME[p]}
                    onClick={() => onPromote(p)}
                    className="flex size-12 items-center justify-center rounded-lg border bg-muted text-3xl transition-colors hover:bg-primary/10 active:scale-95"
                  >
                    <PieceGlyph type={p} color={myColour} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onCancelPromotion}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Where the piece slides in from, in multiples of its own size. */
function slideOffset(
  move: { from: Square; to: Square },
  flipped: boolean
): React.CSSProperties {
  const a = coords(move.from)
  const b = coords(move.to)
  const sign = flipped ? -1 : 1
  return {
    "--dx": `${sign * (a.file - b.file) * 100}%`,
    "--dy": `${sign * (b.rank - a.rank) * 100}%`,
  } as React.CSSProperties
}
