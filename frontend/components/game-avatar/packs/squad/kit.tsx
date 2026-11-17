import * as React from "react"

import type { CharacterMode } from "../../types"

/**
 * Shared drawing kit for the squad mascots. Every character draws in a
 * 200×200 square: its own colour band with a faint motif, then itself. All
 * motion is CSS on classes scoped `gav-<name>-…`; the square's svg clips
 * everything, so effects never leave the character's frame.
 */

export type Pt = readonly [number, number]

/** A CSS-safe prefix unique to this copy, for gradient and clip ids. */
export function useUid(name: string) {
  return `gav-${name}-` + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * A fluffy outline: an ellipse whose edge bulges into `n` soft tufts.
 * Computed once at module scope, rounded so server and client agree.
 */
export function fluff(cx: number, cy: number, rx: number, ry: number, n: number, bump: number, phase = 0) {
  const at = (a: number, k: number) => `${r2(cx + Math.cos(a) * rx * k)} ${r2(cy + Math.sin(a) * ry * k)}`
  const step = (Math.PI * 2) / n
  let d = `M${at(phase, 1)}`
  for (let i = 0; i < n; i++) {
    const a = phase + i * step
    d += `Q${at(a + step / 2, 1 + bump * 2)} ${at(a + step, 1)}`
  }
  return d + "Z"
}

/** A four-point twinkle of radius `r` centred on (x, y). */
export const twinkle = (x: number, y: number, r: number) => {
  const k = r * 0.2
  return `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`
}

/** Band motifs, drawn in a ~22-unit box around the origin. */
export const MOTIF = {
  twinkle: twinkle(0, 0, 11),
  shuriken: "M0-11L3-3L11 0L3 3L0 11L-3 3L-11 0L-3-3ZM2.6 0A2.6 2.6 0 1 0-2.6 0A2.6 2.6 0 1 0 2.6 0Z",
  flame: "M0-11C3-6 8-3 7 3C6 8 2 10 0 10C-4 10-7 7-7 3C-7-2-2-4 0-11ZM0 0C-2 2-3 4-2 6C-1 7 1 7 2 6C3 4 2 2 0 0Z",
  heart: "M0 9C-9 3-10-3-8-6C-6-9-2-9 0-5C2-9 6-9 8-6C10-3 9 3 0 9Z",
  gear: (() => {
    const pts: string[] = []
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const r = i % 2 ? 7.5 : 10.5
      const da = Math.PI / 22
      pts.push(`${r2(Math.cos(a - da) * r)} ${r2(Math.sin(a - da) * r)}`, `${r2(Math.cos(a + da) * r)} ${r2(Math.sin(a + da) * r)}`)
    }
    return `M${pts.join("L")}ZM3.5 0A3.5 3.5 0 1 0-3.5 0A3.5 3.5 0 1 0 3.5 0Z`
  })(),
}

/** Where the band's motif sits: [x, y, turn, scale], hand-placed so it never reads as wallpaper. */
const SPOTS: readonly (readonly [number, number, number, number])[] = [
  [18, 20, -15, 1],
  [64, 12, 20, 0.7],
  [138, 14, 10, 0.85],
  [186, 46, -20, 0.8],
  [14, 82, 25, 0.75],
  [188, 112, 15, 1],
  [20, 146, -10, 1],
  [58, 190, 30, 0.8],
  [180, 180, -25, 0.9],
  [112, 192, 0, 0.6],
  [100, 26, -30, 0.55],
]

/**
 * The square a squad character draws in: band, motif, then the character.
 * The CSS is a per-character constant, hoisted and de-duplicated by React
 * so a lobby full of the same mascot ships it once.
 */
export function Stage({
  name,
  uid,
  mode,
  size,
  band,
  motif,
  css,
  defs,
  children,
}: {
  name: string
  uid: string
  mode: CharacterMode
  size: number
  /** Band centre and edge colour. */
  band: readonly [string, string]
  motif: string
  css: string
  defs?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <style href={`gav-squad-${name}`} precedence="default">
        {css}
      </style>
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className={`gav-${name} gav-${name}-${mode}`}
        style={{ display: "block", overflow: "hidden" }}
      >
        <defs>
          <radialGradient id={`${uid}-band`} cx="50%" cy="36%" r="78%">
            <stop offset="0" stopColor={band[0]} />
            <stop offset="1" stopColor={band[1]} />
          </radialGradient>
          <radialGradient id={`${uid}-sclera`} cx="42%" cy="38%" r="62%">
            <stop offset="0.6" stopColor="#ffffff" />
            <stop offset="1" stopColor="#d9def0" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#${uid}-band)`} />
        {size >= 64 && (
          <g fill="#ffffff" fillRule="evenodd" opacity="0.15">
            {SPOTS.map(([x, y, a, s], i) => (
              <path key={i} d={motif} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} />
            ))}
          </g>
        )}
        <ellipse cx="100" cy="118" rx="86" ry="78" fill="#ffffff" opacity="0.14" />
        {defs && <defs>{defs}</defs>}
        {children}
      </svg>
    </>
  )
}

/**
 * A glossy cartoon eye: sclera, iris (`url(#<uid>-iris)`), pupil and two
 * catch-lights, with an optional eyelid clipped to the eye.
 */
export function Eye({
  uid,
  k,
  cx,
  cy,
  r,
  ink,
  look = [0, 0],
  iris = 0.6,
  irisClass,
  lid,
}: {
  uid: string
  /** Distinguishes this eye's clip from its twin's. */
  k: string
  cx: number
  cy: number
  r: number
  ink: string
  look?: Pt
  /** Iris radius as a share of the eye's. */
  iris?: number
  irisClass?: string
  /** `cover`: how far down the lid comes (0–1); `tilt` in degrees. */
  lid?: { cover: number; tilt?: number; fill: string; className?: string }
}) {
  const [lx, ly] = look
  const ir = r * iris
  const ix = cx + lx
  const iy = cy + ly
  const y0 = r2(cy - r + 2 * r * (lid?.cover ?? 0))
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-sclera)`} />
      <g className={irisClass}>
        <circle cx={ix} cy={iy} r={ir} fill={`url(#${uid}-iris)`} />
        <circle cx={ix} cy={iy} r={r2(ir * 0.5)} fill="#120a24" />
        <circle cx={r2(ix - ir * 0.36)} cy={r2(iy - ir * 0.4)} r={r2(ir * 0.32)} fill="#ffffff" />
        <circle cx={r2(ix + ir * 0.36)} cy={r2(iy + ir * 0.34)} r={r2(ir * 0.14)} fill="#ffffff" opacity="0.85" />
      </g>
      {lid && (
        <>
          <clipPath id={`${uid}-eye-${k}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <g clipPath={`url(#${uid}-eye-${k})`}>
            <g className={lid.className}>
              <g transform={`rotate(${lid.tilt ?? 0} ${cx} ${y0})`}>
                <rect x={cx - r - 8} y={y0 - 2 * r - 8} width={2 * r + 16} height={2 * r + 8} fill={lid.fill} />
                <line x1={cx - r - 8} x2={cx + r + 8} y1={y0} y2={y0} stroke={ink} strokeWidth={r2(r * 0.2)} />
              </g>
            </g>
          </g>
        </>
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={r2(Math.max(2.2, r * 0.13))} />
    </g>
  )
}

/** The CSS every squad character shares: reduced motion stops everything. */
export const baseCss = (name: string) =>
  `.gav-${name} *{transform-box:view-box}` +
  `@media (prefers-reduced-motion:reduce){.gav-${name} *{animation:none!important}}`
