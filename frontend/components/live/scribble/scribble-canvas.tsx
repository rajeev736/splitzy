"use client"

import * as React from "react"
import { push, remove, set } from "firebase/database"
import {
  Delete02Icon,
  Eraser01Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { useRoomChildren, type Keyed } from "@/hooks/use-live-room"
import {
  MAX_STROKE_POINTS,
  STROKE_FLUSH_MS,
  type ScribbleStroke,
} from "@/lib/live/scribble"
import { cn } from "@/lib/utils"
import { roomRef } from "@/services/live-rooms"

/** Canvas units: strokes are stored as integers on a 1000 × 750 (4:3) grid. */
const UNITS_W = 1000
const UNITS_H = 750
const BACKGROUND = "#ffffff"

export const COLOURS = [
  "#000000",
  "#4b5563",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#2563eb",
  "#7c3aed",
  "#ec4899",
  "#92400e",
  "#f5c6a5",
]
export const BRUSHES = [6, 14, 28]
/** The eraser is a fat background-coloured brush. */
const ERASER_W = 40
/** Tap "Clear" twice within this to wipe the canvas. */
const CLEAR_CONFIRM_MS = 2500

interface Tool {
  colour: string
  brush: number
  eraser: boolean
}

/** A stroke being drawn on this device, flushed to the database in batches. */
interface Pen {
  key: string
  stroke: ScribbleStroke
  lastFlush: number
}

/**
 * The drawing surface everyone watches, with the drawer's tools under it.
 * Strokes stream in child by child (hooks/use-live-room) and are painted
 * incrementally: only new points are drawn, a full repaint happens on resize,
 * undo or clear. The drawer paints locally as the pen moves and sends points
 * every STROKE_FLUSH_MS; the echo paints nothing new.
 */
export function ScribbleCanvas({
  code,
  uid,
  canDraw,
  overlay,
  className,
}: {
  code: string
  uid: string
  canDraw: boolean
  /** Shown over the drawing (word picker, "X is choosing…", turn summary). */
  overlay?: React.ReactNode
  className?: string
}) {
  const strokes = useRoomChildren<ScribbleStroke>(code, "state/strokes")
  const boxRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  // What has been painted so far: stroke key → number of coordinates consumed
  const painted = React.useRef<Map<string, number>>(new Map())
  const strokesRef = React.useRef<Keyed<ScribbleStroke>[]>([])
  const pen = React.useRef<Pen | null>(null)
  const [tool, setTool] = React.useState<Tool>({
    colour: COLOURS[0],
    brush: BRUSHES[1],
    eraser: false,
  })
  const [confirmClear, setConfirmClear] = React.useState(false)

  const repaintAll = React.useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    painted.current.clear()
    for (const s of strokesRef.current) {
      paintFrom(ctx, s.value, 0)
      painted.current.set(s.key, s.value.p?.length ?? 0)
    }
  }, [])

  // Size the bitmap to the box (device pixels), map 1000 units to its width, repaint
  React.useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    if (!box || !canvas) return
    const fit = () => {
      const w = Math.max(1, Math.round(box.clientWidth))
      const h = Math.max(1, Math.round((w * UNITS_H) / UNITS_W))
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const scale = canvas.width / UNITS_W
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      repaintAll()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [repaintAll])

  // New or longer strokes: paint just the new points. Anything gone: start over.
  React.useEffect(() => {
    strokesRef.current = strokes
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const keys = new Set(strokes.map((s) => s.key))
    let stale = false
    for (const k of painted.current.keys()) {
      if (!keys.has(k)) {
        stale = true
        break
      }
    }
    if (stale) {
      repaintAll()
      return
    }
    for (const s of strokes) {
      const have = painted.current.get(s.key) ?? 0
      const len = s.value.p?.length ?? 0
      if (len > have) {
        paintFrom(ctx, s.value, have)
        painted.current.set(s.key, len)
      }
    }
  }, [strokes, repaintAll])

  /* ── Drawing ─────────────────────────────────────────────────────────── */

  const unitPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = UNITS_W / rect.width
    return [
      clampInt((e.clientX - rect.left) * scale, 0, UNITS_W),
      clampInt((e.clientY - rect.top) * scale, 0, UNITS_H),
    ]
  }

  const flush = (p: Pen) => {
    p.lastFlush = performance.now()
    void set(roomRef(code, `state/strokes/${p.key}`), {
      ...p.stroke,
      p: p.stroke.p.slice(),
    }).catch(() => undefined)
  }

  const begin = (x: number, y: number) => {
    const ref = push(roomRef(code, "state/strokes"))
    if (!ref.key) return
    const stroke: ScribbleStroke = {
      u: uid,
      c: tool.eraser ? BACKGROUND : tool.colour,
      w: tool.eraser ? ERASER_W : tool.brush,
      p: [x, y],
    }
    const p: Pen = { key: ref.key, stroke, lastFlush: 0 }
    pen.current = p
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      paintFrom(ctx, stroke, 0)
      painted.current.set(p.key, 2)
    }
    flush(p)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (
      !canDraw ||
      pen.current ||
      (e.pointerType === "mouse" && e.button !== 0)
    )
      return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = unitPoint(e)
    begin(x, y)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pen.current
    if (!p || !canDraw) return
    const [x, y] = unitPoint(e)
    const pts = p.stroke.p
    if (pts[pts.length - 2] === x && pts[pts.length - 1] === y) return
    pts.push(x, y)
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      paintFrom(ctx, p.stroke, pts.length - 2)
      painted.current.set(p.key, pts.length)
    }
    if (pts.length >= MAX_STROKE_POINTS * 2) {
      // Long stroke: close it and carry on in a fresh one from the same spot
      flush(p)
      pen.current = null
      begin(x, y)
      return
    }
    if (performance.now() - p.lastFlush >= STROKE_FLUSH_MS) flush(p)
  }

  const onPointerEnd = () => {
    const p = pen.current
    if (!p) return
    pen.current = null
    flush(p)
  }

  const undo = () => {
    const mine = strokes.filter((s) => s.value.u === uid)
    const last = mine[mine.length - 1]
    if (!last) return
    void remove(roomRef(code, `state/strokes/${last.key}`)).catch(
      () => undefined
    )
  }

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      window.setTimeout(() => setConfirmClear(false), CLEAR_CONFIRM_MS)
      return
    }
    setConfirmClear(false)
    void set(roomRef(code, "state/strokes"), null).catch(() => undefined)
  }

  const hasOwn = strokes.some((s) => s.value.u === uid)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* --canvas-w (set by the game on phones) shrinks the drawing to fit a short screen */}
      <div className="relative mx-auto w-(--canvas-w) max-w-full overflow-hidden rounded-xl border bg-white shadow-xs">
        <div
          ref={boxRef}
          className="w-full"
          style={{ aspectRatio: `${UNITS_W} / ${UNITS_H}` }}
        >
          <canvas
            ref={canvasRef}
            data-no-swipe
            className={cn(
              "block h-full w-full touch-none select-none",
              canDraw ? "cursor-crosshair" : "cursor-default"
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Drawing"
            role="img"
          />
        </div>
        {overlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 p-3 backdrop-blur-[2px]">
            {overlay}
          </div>
        )}
      </div>

      {canDraw && (
        <div
          className="flex flex-col gap-2 rounded-xl border bg-card p-2"
          role="toolbar"
          aria-label="Drawing tools"
        >
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {COLOURS.map((c) => {
              const active = !tool.eraser && tool.colour === c
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  aria-pressed={active}
                  onClick={() =>
                    setTool((t) => ({ ...t, colour: c, eraser: false }))
                  }
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg border transition-transform active:scale-90",
                    active
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border"
                  )}
                >
                  <span
                    className="size-6 rounded-full border border-black/10"
                    style={{ background: c }}
                  />
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1.5">
            {BRUSHES.map((b) => {
              const active = !tool.eraser && tool.brush === b
              return (
                <button
                  key={b}
                  type="button"
                  aria-label={`Brush ${b}`}
                  aria-pressed={active}
                  onClick={() =>
                    setTool((t) => ({ ...t, brush: b, eraser: false }))
                  }
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card transition-colors hover:bg-muted",
                    active && "border-primary bg-primary/10"
                  )}
                >
                  <span
                    className="rounded-full bg-foreground"
                    style={{ width: 4 + b * 0.6, height: 4 + b * 0.6 }}
                  />
                </button>
              )
            })}
            <Button
              type="button"
              variant={tool.eraser ? "secondary" : "outline"}
              size="icon"
              aria-label="Eraser"
              aria-pressed={tool.eraser}
              onClick={() => setTool((t) => ({ ...t, eraser: !t.eraser }))}
            >
              <HugeiconsIcon icon={Eraser01Icon} />
            </Button>
            <span className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Undo"
              onClick={undo}
              disabled={!hasOwn}
            >
              <HugeiconsIcon icon={Undo02Icon} />
            </Button>
            <Button
              type="button"
              variant={confirmClear ? "destructive" : "outline"}
              size="sm"
              onClick={clear}
              disabled={strokes.length === 0}
              className="min-w-20"
            >
              <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
              {confirmClear ? "Sure?" : "Clear"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Painting ────────────────────────────────────────────────────────── */

/**
 * Paints a stroke from coordinate index `from` (even) to its end, joining up
 * with the previous point so segments drawn in pieces look like one line.
 */
function paintFrom(
  ctx: CanvasRenderingContext2D,
  s: ScribbleStroke,
  from: number
) {
  const p = s.p
  if (!Array.isArray(p) || p.length < 2) return
  ctx.strokeStyle = ctx.fillStyle = typeof s.c === "string" ? s.c : "#000000"
  ctx.lineWidth = typeof s.w === "number" ? s.w : BRUSHES[1]
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  if (p.length === 2) {
    // A tap: a dot the size of the brush
    ctx.beginPath()
    ctx.arc(p[0], p[1], ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const start = Math.max(0, Math.min(from, p.length) - 2)
  ctx.beginPath()
  ctx.moveTo(p[start], p[start + 1])
  for (let i = start + 2; i + 1 < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
  ctx.stroke()
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(n)))
