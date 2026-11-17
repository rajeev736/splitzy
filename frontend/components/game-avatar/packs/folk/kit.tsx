/**
 * Shared drawing kit for the Folk pack: the portrait frame (flat colour
 * square, soft glow, thin cream outline around the figure), the common bust
 * anatomy and the little white doodles (#, ♪, sparkles, swirls…).
 *
 * Every portrait is drawn in a 100×100 viewBox: head centred near (50,47),
 * shoulders running off the bottom edge. The whole thing is the art's square,
 * so every effect stays inside it (the svg clips).
 *
 * Motion rules: the drawing as written IS the resting pose. Intro-only
 * particles carry `gav-folk-fx` (hidden unless animated), modes switch on via
 * `data-mode` on the root, and reduced motion turns every animation off —
 * which leaves exactly the resting pose.
 */
import * as React from "react"

import type { CharacterMode } from "../../types"

export type Ids = (name: string) => string
/** light (lit side), base, deep (shade) */
export type Tone = readonly [string, string, string]

export const INK = "#2b1b17"
export const MOUTH = "#6e1d22"
export const TONGUE = "#ff7d8a"
/** The thin outline around every figure. */
const LINE = "#fff8e8"
export const MIRROR = "matrix(-1 0 0 1 100 0)"

export const SKIN = {
  fair: ["#ffe6d2", "#f8caa8", "#dd9f7c"],
  peach: ["#ffdcc0", "#f2b98f", "#cf8c63"],
  tan: ["#f6cba4", "#dca077", "#b2724d"],
  brown: ["#e9b088", "#c98a5d", "#9a5f3a"],
} as const satisfies Record<string, Tone>

export const url = (id: string) => `url(#${id})`

/** Unique ids for this instance's gradients, clips and filters. */
export function useIds(): Ids {
  const prefix = "gf" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  return (name) => `${prefix}-${name}`
}

/** A three-stop gradient, light at (x1,y1) to deep at (x2,y2). */
export function Grad({
  id,
  tone,
  x1 = 0.2,
  y1 = 0,
  x2 = 0.8,
  y2 = 1,
  mid = 0.5,
}: {
  id: string
  tone: Tone
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  mid?: number
}) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      <stop offset={0} stopColor={tone[0]} />
      <stop offset={mid} stopColor={tone[1]} />
      <stop offset={1} stopColor={tone[2]} />
    </linearGradient>
  )
}

/** CSS custom properties for inline styles. */
export const vars = (v: Record<string, string | number>) =>
  v as React.CSSProperties
/** Transform origin in viewBox units. */
export const origin = (x: number, y: number): React.CSSProperties => ({
  transformOrigin: `${x}px ${y}px`,
})

/* ── Bust anatomy ──────────────────────────────────────────────────────── */

export const HEAD =
  "M28 46C28 30 37 22 50 22C63 22 72 30 72 46L72 52C72 63 62 71 50 71C38 71 28 63 28 52Z"
export const SHOULDERS = "M6 106C8 89 22 80 37 78L63 78C78 80 92 89 94 106Z"
export const NECK = "M41 60L41 79C45 83 55 83 59 79L59 60Z"

/** A head shape with soft shading: shade on the right and under the jaw, a lit forehead. */
export function Head({
  ids,
  skin,
  d = HEAD,
  children,
}: {
  ids: Ids
  skin: Tone
  d?: string
  children?: React.ReactNode
}) {
  return (
    <>
      <Grad id={ids("skin")} tone={skin} x1={0.15} x2={0.85} />
      <clipPath id={ids("head")}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={url(ids("skin"))} />
      <g clipPath={url(ids("head"))}>
        <ellipse
          cx={80}
          cy={56}
          rx={15}
          ry={28}
          fill={skin[2]}
          opacity={0.38}
        />
        <ellipse cx={50} cy={78} rx={28} ry={10} fill={skin[2]} opacity={0.4} />
        <ellipse cx={38} cy={33} rx={10} ry={6} fill="#fff" opacity={0.2} />
        {children}
      </g>
    </>
  )
}

/** Neck, darker under the chin, optionally with a V/scoop cut into the clothes. */
export function Neck({
  ids,
  skin,
  d = NECK,
}: {
  ids: Ids
  skin: Tone
  d?: string
}) {
  return (
    <>
      <Grad
        id={ids("neck")}
        tone={[skin[2], skin[1], skin[1]]}
        x1={0.5}
        x2={0.5}
        mid={0.45}
      />
      <path d={d} fill={url(ids("neck"))} />
    </>
  )
}

export function Ear({
  x,
  y,
  skin,
  flip = false,
  r = 1,
}: {
  x: number
  y: number
  skin: Tone
  flip?: boolean
  r?: number
}) {
  const s = flip ? -1 : 1
  return (
    <g transform={`translate(${x} ${y}) scale(${s * r} ${r})`}>
      <ellipse cx={-0.6} cy={0} rx={4} ry={5.4} fill={skin[1]} />
      <path
        d="M-2.2 -2.6C-0.4 -3.2 0.8 -1 -0.4 0.6C0.6 1.4 0.2 2.8 -1.6 2.8"
        fill="none"
        stroke={skin[2]}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
    </g>
  )
}

/**
 * A pair of eyes that blink in idle. Each eye sits in its own group
 * (`gav-folk-eye-l` / `-r`) so a character can wink or glance.
 */
export function Eyes({
  y = 50,
  cx = 50,
  dx = 9,
  rx = 2.6,
  ry = 3.4,
  color = INK,
}: {
  y?: number
  cx?: number
  dx?: number
  rx?: number
  ry?: number
  color?: string
}) {
  return (
    <g className="gav-folk-blink" style={origin(cx, y)}>
      {[
        ["l", cx - dx],
        ["r", cx + dx],
      ].map(([side, x]) => (
        <g key={side} className={`gav-folk-eye-${side}`} style={origin(+x, y)}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={color} />
          <circle
            cx={+x + rx * 0.32}
            cy={y - ry * 0.38}
            r={rx * 0.36}
            fill="#fff"
          />
        </g>
      ))}
    </g>
  )
}

export function Blush({
  y = 58,
  dx = 13,
  cx = 50,
  color = "#ff6f6f",
  opacity = 0.3,
}: {
  y?: number
  dx?: number
  cx?: number
  color?: string
  opacity?: number
}) {
  return (
    <g fill={color} opacity={opacity}>
      <ellipse cx={cx - dx} cy={y} rx={4.2} ry={2.5} />
      <ellipse cx={cx + dx} cy={y} rx={4.2} ry={2.5} />
    </g>
  )
}

/** A stroked shape (brows, lids, smiles). */
export function Stroke({
  d,
  color = INK,
  w = 1.4,
  ...rest
}: { d: string; color?: string; w?: number } & React.SVGProps<SVGPathElement>) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  )
}

/* ── Doodles ───────────────────────────────────────────────────────────── */

const r2 = (n: number) => Math.round(n * 100) / 100

/** Four-point twinkle. */
export const sparkle = (cx: number, cy: number, r: number) => {
  const k = r * 0.18
  return (
    `M${r2(cx)} ${r2(cy - r)}Q${r2(cx + k)} ${r2(cy - k)} ${r2(cx + r)} ${r2(cy)}` +
    `Q${r2(cx + k)} ${r2(cy + k)} ${r2(cx)} ${r2(cy + r)}` +
    `Q${r2(cx - k)} ${r2(cy + k)} ${r2(cx - r)} ${r2(cy)}` +
    `Q${r2(cx - k)} ${r2(cy - k)} ${r2(cx)} ${r2(cy - r)}Z`
  )
}

export type DoodleKind =
  | "hash"
  | "note"
  | "sparkle"
  | "swirl"
  | "heart"
  | "question"
  | "ticks"
  | "plus"
  | "graph"

/** Doodles drawn around (0,0), about 9 units across. */
export function DoodleShape({
  kind,
  color = "#fff",
}: {
  kind: DoodleKind
  color?: string
}) {
  switch (kind) {
    case "hash":
      return (
        <Stroke
          d="M-1.4 -4.2L-2.6 4.2M2.6 -4.2L1.4 4.2M-4.2 -1.4H4.2M-4.6 1.7H3.8"
          color={color}
          w={1.3}
        />
      )
    case "note":
      return (
        <>
          <ellipse
            cx={-1.6}
            cy={3}
            rx={2.1}
            ry={1.5}
            transform="rotate(-22 -1.6 3)"
            fill={color}
          />
          <Stroke d="M0.3 2.7V-4.4Q3 -3.4 3.9 -0.8" color={color} w={1.2} />
        </>
      )
    case "sparkle":
      return <path d={sparkle(0, 0, 4.4)} fill={color} />
    case "swirl":
      return (
        <Stroke
          d="M0 0C1 -1 2.1 0 1.7 1.2C1.1 2.7 -1.5 2.7 -2.3 1C-3.3 -1.1 -1.6 -3.5 1 -3.5C3.7 -3.5 5.1 -1 4.5 1.7"
          color={color}
          w={1.2}
        />
      )
    case "heart":
      return (
        <Stroke
          d="M0 3.6C-2 2.2 -4 0.4 -4 -1.5C-4 -3.1 -2.8 -3.9 -1.8 -3.9C-0.9 -3.9 -0.2 -3.3 0 -2.4C0.2 -3.3 0.9 -3.9 1.8 -3.9C2.8 -3.9 4 -3.1 4 -1.5C4 0.4 2 2.2 0 3.6Z"
          color={color}
          w={1.2}
        />
      )
    case "question":
      return (
        <>
          <Stroke
            d="M-2.4 -2.4C-2.4 -4.8 2.6 -5 2.6 -2C2.6 0 0 0.3 0 2.3"
            color={color}
            w={1.3}
          />
          <circle cx={0} cy={4.6} r={0.85} fill={color} />
        </>
      )
    case "ticks":
      return (
        <Stroke
          d="M-3.4 -1.6L-5.2 -3.6M0 -2.6V-5.4M3.4 -1.6L5.2 -3.6"
          color={color}
          w={1.2}
        />
      )
    case "plus":
      return <Stroke d="M0 -3.2V3.2M-3.2 0H3.2" color={color} w={1.3} />
    case "graph":
      return (
        <Stroke
          d="M-4.4 -4.6V4H4.6M-4.4 4L-1.8 -0.4L0.4 1.4L4 -3.6M2.2 -3.8H4.1V-1.9"
          color={color}
          w={1.1}
        />
      )
  }
}

/** A background doodle: pops in at the end of the intro, twinkles in idle. `d` staggers it. */
export function Doodle({
  kind,
  x,
  y,
  s = 1,
  r = 0,
  d = 0,
  color,
}: {
  kind: DoodleKind
  x: number
  y: number
  s?: number
  r?: number
  d?: number
  color?: string
}) {
  return (
    <g
      className="gav-folk-doodle"
      style={{ ...origin(x, y), ...vars({ "--d": `${d}s` }) }}
    >
      <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
        <DoodleShape kind={kind} color={color} />
      </g>
    </g>
  )
}

/* ── Frame ─────────────────────────────────────────────────────────────── */

const KIT_CSS = `
.gav-folk *{transform-box:view-box}
.gav-folk .gav-folk-fx{opacity:0}
.gav-folk[data-mode=idle] .gav-folk-blink{animation:gav-folk-blink 4.6s infinite}
@keyframes gav-folk-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
.gav-folk[data-mode=idle] .gav-folk-breathe{animation:gav-folk-breathe 3.8s ease-in-out infinite}
@keyframes gav-folk-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(.9px)}}
.gav-folk[data-mode=idle] .gav-folk-doodle{animation:gav-folk-twinkle 3.2s var(--d) ease-in-out infinite}
@keyframes gav-folk-twinkle{0%,100%{opacity:1;transform:none}50%{opacity:.4;transform:scale(.78) rotate(-10deg)}}
.gav-folk[data-mode=intro] .gav-folk-doodle{animation:gav-folk-pop .45s calc(1.05s + var(--d) * .35) cubic-bezier(.3,1.7,.5,1) both}
@keyframes gav-folk-pop{from{opacity:0;transform:scale(0) rotate(-45deg)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.gav-folk *{animation:none!important}}
`

/**
 * The portrait's square: accent background with a soft glow, `back` effects,
 * the outlined figure (`children`), then `front` effects. `figureClass` goes
 * on the group that carries the figure's entrance.
 */
export function Portrait({
  cid,
  ids,
  mode,
  size,
  accent,
  css,
  back,
  front,
  figureClass,
  children,
}: {
  cid: string
  ids: Ids
  mode: CharacterMode
  size: number
  accent: string
  css: string
  back?: React.ReactNode
  front?: React.ReactNode
  figureClass?: string
  children: React.ReactNode
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={`gav-folk gav-${cid}`}
      data-mode={mode}
      style={{ display: "block", overflow: "hidden" }}
    >
      <style>{KIT_CSS + css}</style>
      <defs>
        <radialGradient id={ids("glow")} cx={0.5} cy={0.36} r={0.75}>
          <stop offset={0} stopColor="#fff" stopOpacity={0.3} />
          <stop offset={0.55} stopColor="#fff" stopOpacity={0} />
          <stop offset={1} stopColor="#000" stopOpacity={0.12} />
        </radialGradient>
        <filter id={ids("line")} x="-20%" y="-20%" width="140%" height="140%">
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius={0.95}
            result="grow"
          />
          <feFlood floodColor={LINE} />
          <feComposite in2="grow" operator="in" result="line" />
          <feMerge>
            <feMergeNode in="line" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={100} height={100} fill={accent} />
      <rect width={100} height={100} fill={url(ids("glow"))} />
      {back}
      <g filter={url(ids("line"))}>
        <g className={figureClass}>
          <g className="gav-folk-breathe">{children}</g>
        </g>
      </g>
      {front}
    </svg>
  )
}
