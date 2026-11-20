"use client"

import * as React from "react"
import { push, set } from "firebase/database"
import {
  CircleIcon,
  Delete02Icon,
  Eraser01Icon,
  LineIcon,
  PaintBrush01Icon,
  PaintBucketIcon,
  Redo02Icon,
  SquareIcon,
  Undo02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { GameButton } from "@/components/game-ui/kit"
import { useRoomChildren, type Keyed } from "@/hooks/use-live-room"
import {
  isStrokeKind,
  MAX_STROKE_POINTS,
  STROKE_FLUSH_MS,
  type ScribbleStroke,
  type StrokeKind,
} from "@/lib/live/scribble"
import { cn } from "@/lib/utils"
import { roomRef, updateState } from "@/services/live-rooms"
import { floodMask, parseHex } from "./flood-fill"

/** Canvas units: strokes are stored as integers on a 1000 × 750 (4:3) grid. */
export const UNITS_W = 1000
export const UNITS_H = 750
const BACKGROUND = "#ffffff"

/** Two rows of twelve: neutrals and brights, then darks, browns and skin tones. */
export const COLOURS: { hex: string; name: string }[] = [
  { hex: "#000000", name: "Black" },
  { hex: "#4b5563", name: "Dark grey" },
  { hex: "#9ca3af", name: "Grey" },
  { hex: "#ffffff", name: "White" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#facc15", name: "Yellow" },
  { hex: "#84cc16", name: "Light green" },
  { hex: "#16a34a", name: "Green" },
  { hex: "#38bdf8", name: "Sky blue" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#7c3aed", name: "Purple" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#f9a8d4", name: "Light pink" },
  { hex: "#991b1b", name: "Maroon" },
  { hex: "#4a2c17", name: "Dark brown" },
  { hex: "#92400e", name: "Brown" },
  { hex: "#8d5524", name: "Deep skin" },
  { hex: "#c68642", name: "Wheatish skin" },
  { hex: "#f1c27d", name: "Light skin" },
  { hex: "#ffe0bd", name: "Fair skin" },
  { hex: "#166534", name: "Dark green" },
  { hex: "#1e3a8a", name: "Navy" },
  { hex: "#c4b5fd", name: "Lavender" },
]
/** Widths in canvas units (of 1000). */
export const BRUSHES = [4, 7, 12, 20, 32, 48]

type Mode = "pen" | "eraser" | "fill" | "line" | "rect" | "oval"
type Shape = Extract<Mode, "line" | "rect" | "oval">
type Tray = "colours" | "sizes" | "shapes" | "clear"

const SHAPES: {
  mode: Shape
  kind: StrokeKind
  label: string
  icon: IconSvgElement
}[] = [
  { mode: "line", kind: "l", label: "Line", icon: LineIcon },
  { mode: "rect", kind: "r", label: "Box", icon: SquareIcon },
  { mode: "oval", kind: "o", label: "Circle", icon: CircleIcon },
]
const shapeOf = (mode: Mode) => SHAPES.find((s) => s.mode === mode)

interface Tool {
  mode: Mode
  colour: string
  penSize: number
  eraserSize: number
  /** The shape the shapes button picks. */
  shape: Shape
}

/** A freehand stroke being drawn on this device, flushed to the database in batches. */
interface Pen {
  key: string
  stroke: ScribbleStroke
  lastFlush: number
}

/** A shape being dragged out (shown on the preview layer, sent when let go). */
interface Drag {
  kind: StrokeKind
  colour: string
  size: number
  x0: number
  y0: number
  x1: number
  y1: number
}

/** A fill's pixels, cropped to where it went, in canvas units (1 px = 1 unit). */
interface FillPatch {
  canvas: HTMLCanvasElement
  x: number
  y: number
}

/** The 1000 × 750 copy of the drawing that fills are worked out on. */
interface Logic {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

/**
 * The drawing surface everyone watches, with the drawer's tools under it.
 * Strokes stream in child by child (hooks/use-live-room) and are painted
 * incrementally: only new points are drawn, a full repaint happens on undo or
 * clear (and a quick one on resize). The drawer paints locally as the pen
 * moves and sends points every STROKE_FLUSH_MS; the echo paints nothing new.
 *
 * Shapes are sent once, when let go. A fill sends just where it was tapped:
 * every device works out the area itself on its own fixed-size copy of the
 * drawing (`logic`), so it covers the same area on every screen.
 */
export function ScribbleCanvas({
  code,
  uid,
  canDraw,
  turn,
  overlay,
  className,
}: {
  code: string
  uid: string
  canDraw: boolean
  /** The turn number: what can be redone belongs to one turn. */
  turn: number
  /** Shown over the drawing (word picker, "X is choosing…", turn summary). */
  overlay?: React.ReactNode
  className?: string
}) {
  const strokes = useRoomChildren<ScribbleStroke>(code, "state/strokes")
  const boxRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const previewRef = React.useRef<HTMLCanvasElement>(null)
  // What has been painted so far: stroke key → number of coordinates consumed
  const painted = React.useRef<Map<string, number>>(new Map())
  const fills = React.useRef<Map<string, FillPatch>>(new Map())
  const logicRef = React.useRef<Logic | null>(null)
  const strokesRef = React.useRef<Keyed<ScribbleStroke>[]>([])
  const pen = React.useRef<Pen | null>(null)
  const drag = React.useRef<Drag | null>(null)
  const [tool, setTool] = React.useState<Tool>({
    mode: "pen",
    colour: COLOURS[0].hex,
    penSize: BRUSHES[1],
    eraserSize: BRUSHES[4],
    shape: "line",
  })
  const [tray, setTray] = React.useState<Tray>("colours")
  // CSS px per canvas unit, for the size previews
  const [scale, setScale] = React.useState(0.36)
  // Undone strokes (whole lines) this device can put back, newest last
  const [redo, setRedo] = React.useState<{
    turn: number
    items: ScribbleStroke[][]
  }>({ turn, items: [] })
  const redoItems = redo.turn === turn ? redo.items : []
  const clearRedo = () =>
    setRedo((r) => (r.items.length ? { turn, items: [] } : r))

  const getLogic = React.useCallback((): Logic | null => {
    if (logicRef.current) return logicRef.current
    const canvas = document.createElement("canvas")
    canvas.width = UNITS_W
    canvas.height = UNITS_H
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, UNITS_W, UNITS_H)
    logicRef.current = { canvas, ctx }
    return logicRef.current
  }, [])

  /** Works out a fill on the fixed copy, applies it there, and keeps its pixels for the screen. */
  const runFill = React.useCallback(
    (key: string, s: ScribbleStroke): FillPatch | null => {
      const logic = getLogic()
      const p = s.p
      if (!logic || !Array.isArray(p) || p.length < 2) return null
      const rgb = parseHex(s.c)
      const img = logic.ctx.getImageData(0, 0, UNITS_W, UNITS_H)
      const m = floodMask(img.data, UNITS_W, UNITS_H, p[0], p[1], rgb)
      if (!m) return null
      const w = m.maxX - m.minX + 1
      const h = m.maxY - m.minY + 1
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const pctx = canvas.getContext("2d")
      if (!pctx) return null
      const out = pctx.createImageData(w, h)
      for (let y = 0; y < h; y++) {
        const row = (m.minY + y) * UNITS_W + m.minX
        for (let x = 0; x < w; x++) {
          if (!m.mask[row + x]) continue
          const j = (y * w + x) * 4
          out.data[j] = rgb[0]
          out.data[j + 1] = rgb[1]
          out.data[j + 2] = rgb[2]
          out.data[j + 3] = 255
        }
      }
      pctx.putImageData(out, 0, 0)
      const patch = { canvas, x: m.minX, y: m.minY }
      logic.ctx.drawImage(canvas, m.minX, m.minY)
      fills.current.set(key, patch)
      return patch
    },
    [getLogic]
  )

  /** Paints coordinates [from, to) of a stroke on the screen and the fixed copy. */
  const paintBoth = React.useCallback(
    (key: string, s: ScribbleStroke, from: number, to: number) => {
      const ctx = canvasRef.current?.getContext("2d")
      if (s.t === "f") {
        if (from > 0 || to < 2) return
        const patch = runFill(key, s)
        if (patch && ctx) drawPatch(ctx, patch)
        return
      }
      if (ctx) paintStroke(ctx, s, from, to)
      const logic = getLogic()
      if (logic) paintStroke(logic.ctx, s, from, to)
    },
    [getLogic, runFill]
  )

  /** The stroke as this device knows it best: the one being drawn here is ahead of its echo. */
  const latest = (s: Keyed<ScribbleStroke>) =>
    pen.current?.key === s.key ? pen.current.stroke : s.value

  /** Start over: both canvases blank, every stroke (and fill) again, in order. */
  const repaintAll = React.useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const logic = getLogic()
    if (!canvas || !ctx || !logic) return
    blank(ctx, canvas)
    blank(logic.ctx, logic.canvas)
    painted.current.clear()
    fills.current.clear()
    for (const s of strokesRef.current) {
      const value = pen.current?.key === s.key ? pen.current.stroke : s.value
      const len = value.p?.length ?? 0
      paintBoth(s.key, value, 0, len)
      painted.current.set(s.key, len)
    }
  }, [getLogic, paintBoth])

  /** New size: just the screen again, from what's painted (fills from their saved pixels). */
  const repaintScreen = React.useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    blank(ctx, canvas)
    for (const s of strokesRef.current) {
      const have = painted.current.get(s.key) ?? 0
      if (s.value.t === "f") {
        const patch = fills.current.get(s.key)
        if (patch) drawPatch(ctx, patch)
      } else {
        const value = pen.current?.key === s.key ? pen.current.stroke : s.value
        paintStroke(ctx, value, 0, have)
      }
    }
  }, [])

  // Size the bitmaps to the box (device pixels), map 1000 units to its width, repaint
  React.useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    const preview = previewRef.current
    if (!box || !canvas || !preview) return
    let lastW = 0
    const fit = () => {
      const w = Math.max(1, Math.round(box.clientWidth))
      if (w === lastW) return false
      lastW = w
      const h = Math.max(1, Math.round((w * UNITS_H) / UNITS_W))
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      for (const c of [canvas, preview]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
        const ctx = c.getContext("2d")
        if (!ctx) continue
        const k = c.width / UNITS_W
        ctx.setTransform(k, 0, 0, k, 0, 0)
      }
      repaintScreen()
      return true
    }
    fit()
    const ro = new ResizeObserver(() => {
      fit()
      setScale(Math.max(1, box.clientWidth) / UNITS_W)
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [repaintScreen])

  // New or longer strokes: paint just the new points. Anything gone: start over.
  React.useEffect(() => {
    strokesRef.current = strokes
    if (!canvasRef.current) return
    const keys = new Set(strokes.map((s) => s.key))
    for (const k of painted.current.keys()) {
      if (!keys.has(k)) {
        repaintAll()
        return
      }
    }
    for (const s of strokes) {
      const have = painted.current.get(s.key) ?? 0
      const len = s.value.p?.length ?? 0
      if (len > have) {
        paintBoth(s.key, s.value, have, len)
        painted.current.set(s.key, len)
      }
    }
  }, [strokes, repaintAll, paintBoth])

  /* ── Drawing ─────────────────────────────────────────────────────────── */

  const unitPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const k = UNITS_W / rect.width
    return [
      clampInt((e.clientX - rect.left) * k, 0, UNITS_W),
      clampInt((e.clientY - rect.top) * k, 0, UNITS_H),
    ]
  }

  const strokesPath = "state/strokes"

  /** Sends a whole stroke under a fresh key, painting it here first. */
  const sendWhole = (stroke: ScribbleStroke) => {
    const ref = push(roomRef(code, strokesPath))
    if (!ref.key) return
    paintBoth(ref.key, stroke, 0, stroke.p.length)
    painted.current.set(ref.key, stroke.p.length)
    void set(ref, stroke).catch(() => undefined)
  }

  const flush = (p: Pen) => {
    p.lastFlush = performance.now()
    void set(roomRef(code, `${strokesPath}/${p.key}`), {
      ...p.stroke,
      p: p.stroke.p.slice(),
    }).catch(() => undefined)
  }

  const begin = (x: number, y: number, group?: string) => {
    const ref = push(roomRef(code, strokesPath))
    if (!ref.key) return
    const eraser = tool.mode === "eraser"
    const stroke: ScribbleStroke = {
      u: uid,
      c: eraser ? BACKGROUND : tool.colour,
      w: eraser ? tool.eraserSize : tool.penSize,
      p: [x, y],
    }
    if (group) stroke.g = group
    const p: Pen = { key: ref.key, stroke, lastFlush: 0 }
    pen.current = p
    paintBoth(p.key, stroke, 0, 2)
    painted.current.set(p.key, 2)
    flush(p)
  }

  const showPreview = () => {
    const c = previewRef.current
    const ctx = c?.getContext("2d")
    if (!c || !ctx) return
    clearCanvas(ctx, c)
    const d = drag.current
    if (!d) return
    paintStroke(
      ctx,
      {
        u: uid,
        c: d.colour,
        w: d.size,
        p: [d.x0, d.y0, d.x1, d.y1],
        t: d.kind,
      },
      0,
      4
    )
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (
      !canDraw ||
      pen.current ||
      drag.current ||
      (e.pointerType === "mouse" && e.button !== 0)
    )
      return
    const [x, y] = unitPoint(e)
    if (tray !== "colours") setTray("colours")
    if (tool.mode === "fill") {
      clearRedo()
      sendWhole({ u: uid, c: tool.colour, w: 0, p: [x, y], t: "f" })
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    clearRedo()
    const shape = shapeOf(tool.mode)
    if (shape) {
      drag.current = {
        kind: shape.kind,
        colour: tool.colour,
        size: tool.penSize,
        x0: x,
        y0: y,
        x1: x,
        y1: y,
      }
      showPreview()
      return
    }
    begin(x, y)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (d) {
      const [x, y] = unitPoint(e)
      d.x1 = x
      d.y1 = y
      showPreview()
      return
    }
    const p = pen.current
    if (!p || !canDraw) return
    const [x, y] = unitPoint(e)
    const pts = p.stroke.p
    if (pts[pts.length - 2] === x && pts[pts.length - 1] === y) return
    pts.push(x, y)
    paintBoth(p.key, p.stroke, pts.length - 2, pts.length)
    painted.current.set(p.key, pts.length)
    if (pts.length >= MAX_STROKE_POINTS * 2) {
      // Long stroke: close it and carry on in a fresh one from the same spot
      flush(p)
      pen.current = null
      begin(x, y, p.stroke.g ?? p.key)
      return
    }
    if (performance.now() - p.lastFlush >= STROKE_FLUSH_MS) flush(p)
  }

  const onPointerEnd = () => {
    const d = drag.current
    if (d) {
      drag.current = null
      showPreview()
      // A tap with a shape tool draws nothing
      if (
        canDraw &&
        Math.max(Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)) >= 3
      )
        sendWhole({
          u: uid,
          c: d.colour,
          w: d.size,
          p: [d.x0, d.y0, d.x1, d.y1],
          t: d.kind,
        })
      return
    }
    const p = pen.current
    if (!p) return
    pen.current = null
    flush(p)
  }

  /* ── Undo, redo, clear ───────────────────────────────────────────────── */

  const mine = strokes.filter((s) => s.value.u === uid)

  const undo = () => {
    if (pen.current || drag.current) return
    const last = mine[mine.length - 1]
    if (!last) return
    // A long line went up in pieces: take them all back
    const group = last.value.g ?? last.key
    const pieces = mine.filter((s) => s.key === group || s.value.g === group)
    const patch: Record<string, null> = {}
    for (const s of pieces) patch[`strokes/${s.key}`] = null
    const saved = pieces.map((s) => withoutGroup(latest(s)))
    setRedo((r) => ({
      turn,
      items: [...(r.turn === turn ? r.items : []), saved].slice(-30),
    }))
    void updateState(code, patch).catch(() => undefined)
  }

  const redoLast = () => {
    if (pen.current || drag.current) return
    const last = redoItems[redoItems.length - 1]
    if (!last) return
    setRedo({ turn, items: redoItems.slice(0, -1) })
    const patch: Record<string, ScribbleStroke> = {}
    let first: string | null = null
    for (const s of last) {
      const key = push(roomRef(code, strokesPath)).key
      if (!key) return
      patch[`strokes/${key}`] = first ? { ...s, g: first } : s
      first ??= key
    }
    void updateState(code, patch).catch(() => undefined)
  }

  const clearAll = () => {
    setTray("colours")
    clearRedo()
    void set(roomRef(code, strokesPath), null).catch(() => undefined)
  }

  /* ── Tools ───────────────────────────────────────────────────────────── */

  const pick = (mode: Mode) => setTool((t) => ({ ...t, mode }))
  const eraser = tool.mode === "eraser"
  const size = eraser ? tool.eraserSize : tool.penSize
  const currentShape = shapeOf(tool.shape) ?? SHAPES[0]
  const shapeActive = !!shapeOf(tool.mode)
  const dot = (w: number) => Math.min(30, Math.max(3, w * scale))

  return (
    <div className={cn("@container flex flex-col gap-2", className)}>
      {/* --canvas-w (set by the game) sizes the drawing to the screen, 4:3 always.
          Phones: edge to edge, out over the stage's side padding. */}
      <div className="flex justify-center max-md:-mx-2">
        <div className="relative w-(--canvas-w) max-w-full overflow-hidden rounded-xl bg-white shadow-[0_0_0_3px_var(--gu-line),0_4px_0_3px_var(--gu-line)] max-md:rounded-md">
          <div
            ref={boxRef}
            className="relative w-full"
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
            {/* A shape being dragged out, before it's sent */}
            <canvas
              ref={previewRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 block h-full w-full"
            />
          </div>
          {overlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/85 p-3 backdrop-blur-[2px]">
              {overlay}
            </div>
          )}
        </div>
      </div>

      {canDraw && (
        <div
          className="gu-panel-flat flex flex-col gap-2 p-2 @min-[42rem]:flex-row @min-[42rem]:items-center @min-[42rem]:gap-3"
          role="toolbar"
          aria-label="Drawing tools"
        >
          <div className="grid shrink-0 grid-cols-8 justify-items-center gap-0.5 pb-1 @min-[42rem]:w-[21.5rem]">
            <button
              type="button"
              aria-label={`Size, ${eraser ? "eraser" : "brush"}`}
              title="Size"
              aria-pressed={tray === "sizes"}
              onClick={() =>
                setTray((t) => (t === "sizes" ? "colours" : "sizes"))
              }
              className={cn(
                "gu-btn gu-btn-icon gu-btn-sm !w-full max-w-[2.4rem]",
                tray === "sizes" ? "" : "gu-cream"
              )}
            >
              <span
                className="rounded-full shadow-[0_0_0_1.5px_rgba(44,63,115,.35)]"
                style={{
                  width: dot(size),
                  height: dot(size),
                  maxWidth: 24,
                  maxHeight: 24,
                  background: eraser ? BACKGROUND : tool.colour,
                }}
              />
            </button>
            <ToolButton
              icon={PaintBrush01Icon}
              label="Brush"
              active={tool.mode === "pen"}
              onClick={() => {
                pick("pen")
                setTray("colours")
              }}
            />
            <ToolButton
              icon={Eraser01Icon}
              label="Eraser"
              active={eraser}
              onClick={() => {
                pick("eraser")
                setTray("sizes")
              }}
            />
            <ToolButton
              icon={PaintBucketIcon}
              label="Fill"
              active={tool.mode === "fill"}
              onClick={() => {
                pick("fill")
                setTray("colours")
              }}
            />
            <ToolButton
              icon={currentShape.icon}
              label={`Shapes (${currentShape.label.toLowerCase()})`}
              active={shapeActive}
              onClick={() => {
                if (!shapeActive) pick(tool.shape)
                setTray((t) => (t === "shapes" ? "colours" : "shapes"))
              }}
            />
            <ToolButton
              icon={Undo02Icon}
              label="Undo"
              onClick={undo}
              disabled={mine.length === 0}
            />
            <ToolButton
              icon={Redo02Icon}
              label="Redo"
              onClick={redoLast}
              disabled={redoItems.length === 0}
            />
            <ToolButton
              icon={Delete02Icon}
              label="Clear the drawing"
              tone="red"
              active={tray === "clear"}
              onClick={() =>
                setTray((t) => (t === "clear" ? "colours" : "clear"))
              }
              disabled={strokes.length === 0}
            />
          </div>

          {/* One tray at a time, always the same height, so the drawing never jumps */}
          <div className="h-[3.75rem] min-w-0 flex-1">
            {tray === "colours" && (
              <div className="grid h-full grid-cols-12 grid-rows-2 gap-1">
                {COLOURS.map((c) => {
                  const active = !eraser && tool.colour === c.hex
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      aria-label={c.name}
                      title={c.name}
                      aria-pressed={active}
                      onClick={() =>
                        setTool((t) => ({
                          ...t,
                          colour: c.hex,
                          mode: t.mode === "eraser" ? "pen" : t.mode,
                        }))
                      }
                      className={cn(
                        "min-w-0 rounded-md shadow-[inset_0_0_0_1.5px_rgba(44,63,115,.18)] transition-transform active:scale-90",
                        active &&
                          "z-10 scale-110 shadow-[inset_0_0_0_1.5px_rgba(44,63,115,.18),0_0_0_2.5px_#fff,0_0_0_4.5px_var(--gu-frame-deep)]"
                      )}
                      style={{ background: c.hex }}
                    />
                  )
                })}
              </div>
            )}
            {tray === "sizes" && (
              <div className="flex h-full gap-1.5 px-0.5 py-1">
                {BRUSHES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-label={`Size ${b}`}
                    aria-pressed={size === b}
                    onClick={() => {
                      setTool((t) =>
                        t.mode === "eraser"
                          ? { ...t, eraserSize: b }
                          : { ...t, penSize: b }
                      )
                      setTray("colours")
                    }}
                    className="gu-choice flex min-w-0 flex-1 items-center justify-center"
                  >
                    <span
                      className="rounded-full shadow-[0_0_0_1.5px_rgba(44,63,115,.3)]"
                      style={{
                        width: dot(b),
                        height: dot(b),
                        background: eraser ? BACKGROUND : tool.colour,
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            {tray === "shapes" && (
              <div className="flex h-full gap-1.5 px-0.5 py-1">
                {SHAPES.map((s) => (
                  <button
                    key={s.mode}
                    type="button"
                    aria-pressed={tool.mode === s.mode}
                    onClick={() => {
                      setTool((t) => ({ ...t, mode: s.mode, shape: s.mode }))
                      setTray("colours")
                    }}
                    className="gu-choice flex min-w-0 flex-1 items-center justify-center gap-1.5 text-sm font-bold"
                  >
                    <HugeiconsIcon
                      icon={s.icon}
                      className="size-5"
                      strokeWidth={2.4}
                    />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {tray === "clear" && (
              <div className="flex h-full items-center gap-2 px-1">
                <p className="min-w-0 flex-1 text-sm leading-tight font-bold">
                  Wipe the whole drawing?
                </p>
                <GameButton
                  tone="cream"
                  size="sm"
                  onClick={() => setTray("colours")}
                >
                  Keep
                </GameButton>
                <GameButton tone="red" size="sm" onClick={clearAll}>
                  Clear
                </GameButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ToolButton({
  icon,
  label,
  active = false,
  tone = "blue",
  onClick,
  disabled,
}: {
  icon: IconSvgElement
  label: string
  active?: boolean
  tone?: "blue" | "red"
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "gu-btn gu-btn-icon gu-btn-sm !w-full max-w-[2.4rem]",
        active ? (tone === "red" ? "gu-red" : "") : "gu-cream"
      )}
    >
      <HugeiconsIcon icon={icon} className="size-[18px]" strokeWidth={2.4} />
    </button>
  )
}

/* ── Painting ────────────────────────────────────────────────────────── */

const withoutGroup = (s: ScribbleStroke): ScribbleStroke => {
  const out: ScribbleStroke = { u: s.u, c: s.c, w: s.w, p: s.p.slice() }
  if (isStrokeKind(s.t)) out.t = s.t
  return out
}

function blank(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}

function clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}

/** A fill's pixels onto a canvas mapped to canvas units. */
function drawPatch(ctx: CanvasRenderingContext2D, patch: FillPatch) {
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(
    patch.canvas,
    patch.x,
    patch.y,
    patch.canvas.width,
    patch.canvas.height
  )
}

/**
 * Paints coordinates [from, to) of a line or shape (not a fill), joining up
 * with the previous point so a line drawn in pieces looks like one. Shapes
 * are painted whole, once all four coordinates are in.
 */
function paintStroke(
  ctx: CanvasRenderingContext2D,
  s: ScribbleStroke,
  from: number,
  to: number
) {
  const p = s.p
  if (!Array.isArray(p)) return
  to = Math.min(to, p.length - (p.length % 2))
  if (to < 2 || from >= to || s.t === "f") return
  ctx.strokeStyle = ctx.fillStyle = typeof s.c === "string" ? s.c : "#000000"
  ctx.lineWidth = typeof s.w === "number" && s.w > 0 ? s.w : BRUSHES[1]
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  if (isStrokeKind(s.t)) {
    if (from > 0 || to < 4) return
    const [x0, y0, x1, y1] = p
    ctx.beginPath()
    if (s.t === "l") {
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
    } else if (s.t === "r") {
      ctx.rect(
        Math.min(x0, x1),
        Math.min(y0, y1),
        Math.abs(x1 - x0),
        Math.abs(y1 - y0)
      )
    } else {
      ctx.ellipse(
        (x0 + x1) / 2,
        (y0 + y1) / 2,
        Math.abs(x1 - x0) / 2,
        Math.abs(y1 - y0) / 2,
        0,
        0,
        Math.PI * 2
      )
    }
    ctx.stroke()
    return
  }
  if (from === 0 && to === 2) {
    // A tap: a dot the size of the brush
    ctx.beginPath()
    ctx.arc(p[0], p[1], ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const start = Math.max(0, from - 2)
  ctx.beginPath()
  ctx.moveTo(p[start], p[start + 1])
  for (let i = start + 2; i + 1 < to; i += 2) ctx.lineTo(p[i], p[i + 1])
  ctx.stroke()
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(n)))
