"use client"

import * as React from "react"
import { preload } from "react-dom"
import type { Color, PieceSymbol, Square } from "chess.js"

import { coords, FILES, squareAt } from "@/lib/live/chess"
import { cn } from "@/lib/utils"
import { CHESS_THEMES, type ChessLook } from "@/lib/live/themes"

export const PIECE_NAME: Record<PieceSymbol, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
}

const PROMOTIONS: PieceSymbol[] = ["q", "r", "b", "n"]
const ALL_PIECES = (["w", "b"] as Color[]).flatMap((c) => (["k", "q", "r", "b", "n", "p"] as PieceSymbol[]).map((t) => [c, t] as const))
/** Finger travel before a touch counts as a drag rather than a tap. */
const DRAG_START_PX = 6

/** A piece's picture (public/chess/neo). */
export const pieceImage = (color: Color, type: PieceSymbol) => `/chess/neo/${color}${type}.webp`

export interface BoardPiece {
  square: Square
  type: PieceSymbol
  color: Color
}

export interface BoardTarget {
  capture: boolean
  promotion: boolean
}

/** A piece's picture, 1em square (size it with the font size). */
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
      className={cn("jcb-art inline-block size-[1em] shrink-0", className)}
      style={{ backgroundImage: `url(${pieceImage(color, type)})` }}
      aria-hidden
    />
  )
}

/**
 * The board's look and motion, all in CSS: every piece and marker is one
 * absolutely placed box, put on its square by `transform` from --c / --r,
 * and a move is just a changed square — the browser slides it (a transition
 * on the compositor, no script running per frame).
 */
function BoardStyles() {
  return (
    <style>{`.jcb-board{position:relative;aspect-ratio:1;width:100%;overflow:hidden;user-select:none;-webkit-user-select:none;container-type:inline-size;contain:layout paint}
.jcb-art{background-size:contain;background-repeat:no-repeat;background-position:center}
.jcb-cell{position:absolute;top:0;left:0;width:12.5%;height:12.5%;transform:translate(calc(var(--c)*100%),calc(var(--r)*100%));pointer-events:none}
.jcb-piece{z-index:3;transition:transform .3s ease}
.jcb-piece.jcb-now{transition:none}
.jcb-piece.jcb-held{opacity:.3}
.jcb-hl{z-index:1;opacity:.5}
.jcb-check{z-index:2;background:radial-gradient(circle,rgba(220,38,38,.9) 0 22%,rgba(220,38,38,.45) 50%,transparent 72%)}
.jcb-hint{z-index:4;border-radius:50%;padding:4.2%;background:rgba(0,0,0,.14);background-clip:content-box}
.jcb-take{z-index:4;border-radius:50%;background:radial-gradient(transparent 0 66%,rgba(0,0,0,.16) 67%)}
.jcb-coord{position:absolute;z-index:2;font-size:2.6cqw;line-height:1;font-weight:700;pointer-events:none}
.jcb-key{pointer-events:none;z-index:5;outline:none}
.jcb-key:focus-visible{box-shadow:inset 0 0 0 3px var(--ring)}
@media (prefers-reduced-motion:reduce){.jcb-piece{transition:none}}`}</style>
  )
}

/** Which piece is which across moves, so a piece that moves keeps its box (and slides). */
interface Tracked {
  pieces: BoardPiece[]
  ids: Partial<Record<Square, number>>
  next: number
}

function carryIds(prev: Tracked, pieces: BoardPiece[], lastMove: { from: Square; to: Square } | null): Tracked {
  const ids: Partial<Record<Square, number>> = {}
  let next = prev.next
  const before = new Map(prev.pieces.map((p) => [p.square, p]))
  const stayed = new Set<Square>()
  const arrivals: BoardPiece[] = []
  for (const p of pieces) {
    const q = before.get(p.square)
    const id = prev.ids[p.square]
    if (q && q.type === p.type && q.color === p.color && id !== undefined) {
      ids[p.square] = id
      stayed.add(p.square)
    } else arrivals.push(p)
  }
  const gone = prev.pieces.filter((q) => !stayed.has(q.square))
  for (const p of arrivals) {
    // The piece that left: the last move's own first, else the nearest of its kind (a pawn may come back promoted)
    const kin = gone.filter((q) => q.color === p.color && (q.type === p.type || (q.type === "p" && lastMove?.to === p.square)))
    const far = (q: BoardPiece) => {
      const a = coords(q.square)
      const b = coords(p.square)
      return Math.abs(a.file - b.file) + Math.abs(a.rank - b.rank)
    }
    const pick = kin.find((q) => q.square === lastMove?.from) ?? kin.sort((x, y) => far(x) - far(y))[0]
    if (pick && prev.ids[pick.square] !== undefined) {
      ids[p.square] = prev.ids[pick.square]
      gone.splice(gone.indexOf(pick), 1)
    } else ids[p.square] = next++
  }
  return { pieces, ids, next }
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
  promotion,
  onSelect,
  onMove,
  onPromote,
  onCancelPromotion,
  className,
  look = CHESS_THEMES[0].look,
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
  /** Moves so far (kept for callers; pieces slide on their own). */
  moveCount?: number
  /** A pawn is waiting to be promoted. */
  promotion: { from: Square; to: Square } | null
  onSelect: (square: Square | null) => void
  onMove: (from: Square, to: Square) => void
  onPromote: (piece: PieceSymbol) => void
  onCancelPromotion: () => void
  className?: string
  /** Board theme (lib/live/themes). */
  look?: ChessLook
}) {
  for (const [c, t] of ALL_PIECES) preload(pieceImage(c, t), { as: "image" })

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
  /** A move made by dragging: that piece is already under the finger, so it lands without sliding. */
  const [dropped, setDropped] = React.useState<{ from: Square; to: Square } | null>(null)

  const [tracked, setTracked] = React.useState<Tracked>(() => carryIds({ pieces: [], ids: {}, next: 0 }, pieces, null))
  let view = tracked
  if (tracked.pieces !== pieces) {
    view = carryIds(tracked, pieces, lastMove)
    setTracked(view)
  }

  const bysquare = React.useMemo(() => {
    const map: Partial<Record<Square, BoardPiece>> = {}
    for (const p of pieces) map[p.square] = p
    return map
  }, [pieces])

  const isMine = (sq: Square) => !!myColour && bysquare[sq]?.color === myColour

  /** Where a square sits on screen (column, row from the top-left). */
  const cell = (sq: Square) => {
    const { file, rank } = coords(sq)
    return flipped ? { c: 7 - file, r: rank } : { c: file, r: 7 - rank }
  }
  const at = (sq: Square) => {
    const { c, r } = cell(sq)
    return { "--c": c, "--r": r } as React.CSSProperties
  }

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
    if (dragging && ghostRef.current) ghostRef.current.style.transform = ghostPos.current
  }, [dragging])

  /** A tap on a square (finger lifted without dragging, or keyboard). */
  const tap = (sq: Square) => {
    if (promotion) return
    if (selected && targets[sq]) {
      setDropped(null)
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
      if (sq && sq !== from && targets[sq]) {
        setDropped({ from, to: sq })
        onMove(from, sq)
      } else if (sq !== from) onSelect(null)
      return
    }
    if (sq) tap(sq)
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) endDrag()
  }

  const draggedPiece = dragging ? bysquare[dragging] : undefined
  const landedByHand = !!dropped && lastMove?.from === dropped.from && lastMove?.to === dropped.to
  // Stable order (by id): moving a node in the DOM would cut its slide short
  const placed = pieces
    .map((p) => ({ p, id: view.ids[p.square] ?? -1 }))
    .sort((a, b) => a.id - b.id)
  const boardBackground = look.board
    ? `url(${look.board}) center / 100% 100% no-repeat`
    : look.framed
      ? "transparent"
      : `repeating-conic-gradient(${look.dark} 0 25%, ${look.light} 0 50%) 0 0 / 25% 25%`

  return (
    <div
      className={cn("relative", look.framed ? "overflow-hidden rounded-lg shadow-lg" : "", className)}
      style={
        look.framed
          ? { background: `#1b120b url(${look.framed}) center / 100% 100% no-repeat`, padding: `${(look.frameInset ?? 0) * 100}%` }
          : undefined
      }
    >
      <BoardStyles />
      <div
        ref={boardRef}
        role="group"
        aria-label="Chess board"
        className={cn("jcb-board", !look.framed && "rounded-lg shadow-sm")}
        style={{ background: boardBackground, touchAction: "manipulation" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        data-no-swipe
      >
        {/* Coordinates: ranks down the left edge, files along the bottom */}
        {Array.from({ length: 8 }, (_, i) => {
          const rank = flipped ? i : 7 - i
          const file = flipped ? 7 : 0
          const light = (file + rank) % 2 === 1
          return (
            <span key={`r${i}`} className="jcb-coord" style={{ left: "0.6%", top: `${i * 12.5 + 0.6}%`, color: light ? look.dark : look.light }}>
              {rank + 1}
            </span>
          )
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const file = flipped ? 7 - i : i
          const rank = flipped ? 7 : 0
          const light = (file + rank) % 2 === 1
          return (
            <span
              key={`f${i}`}
              className="jcb-coord"
              style={{ left: `${i * 12.5 + 12.5 - 2.4}%`, bottom: "0.5%", color: light ? look.dark : look.light }}
            >
              {FILES[file]}
            </span>
          )
        })}

        {/* Markers under the pieces */}
        {lastMove &&
          [lastMove.from, lastMove.to].map((sq) => (
            <div key={`hl${sq}`} className="jcb-cell jcb-hl" style={{ ...at(sq), background: look.highlight }} aria-hidden />
          ))}
        {selected && (
          <div className="jcb-cell jcb-hl" style={{ ...at(selected), background: look.highlight, opacity: 0.7 }} aria-hidden />
        )}
        {checkSquare && <div className="jcb-cell jcb-check" style={at(checkSquare)} aria-hidden />}

        {/* Pieces */}
        {placed.map(({ p, id }) => (
          <div
            key={id}
            className={cn(
              "jcb-cell jcb-art jcb-piece",
              landedByHand && p.square === dropped?.to && "jcb-now",
              dragging === p.square && "jcb-held"
            )}
            style={{ ...at(p.square), backgroundImage: `url(${pieceImage(p.color, p.type)})` }}
            aria-hidden
          />
        ))}

        {/* Where the selected piece can go */}
        {(Object.keys(targets) as Square[]).map((sq) => (
          <div key={`t${sq}`} className={cn("jcb-cell", bysquare[sq] ? "jcb-take" : "jcb-hint")} style={at(sq)} aria-hidden />
        ))}

        {/* Keyboard: your pieces and the squares they can go to (pointer taps are handled on the board) */}
        {[...new Set((canInteract ? (Object.keys(bysquare) as Square[]).filter(isMine) : []).concat(Object.keys(targets) as Square[]))]
          .map((sq) => {
            const piece = bysquare[sq]
            const target = targets[sq]
            return (
              <button
                key={`k${sq}`}
                type="button"
                aria-label={
                  target
                    ? `Move to ${sq}${piece ? `, taking the ${PIECE_NAME[piece.type]}` : ""}`
                    : `Select ${PIECE_NAME[piece!.type]} on ${sq}`
                }
                onClick={() => tap(sq)}
                className="jcb-cell jcb-key"
                style={at(sq)}
              />
            )
          })}

        {/* The piece under the finger while dragging */}
        <div
          ref={ghostRef}
          className={cn("jcb-art pointer-events-none absolute top-0 left-0 z-30 size-[12.5%] scale-110 drop-shadow-lg", dragging ? "block" : "hidden")}
          style={draggedPiece ? { backgroundImage: `url(${pieceImage(draggedPiece.color, draggedPiece.type)})` } : undefined}
          aria-hidden
        />

        {promotion && myColour && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-2">
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-2.5 shadow-lg">
              <p className="text-xs font-semibold">Promote to</p>
              <div className="flex gap-1.5">
                {PROMOTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={PIECE_NAME[p]}
                    onClick={() => onPromote(p)}
                    className="flex size-11 items-center justify-center rounded-lg border bg-muted transition-colors hover:bg-primary/10 active:scale-95"
                  >
                    <PieceGlyph type={p} color={myColour} className="text-[34px]" />
                  </button>
                ))}
              </div>
              <button type="button" onClick={onCancelPromotion} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
