import * as React from "react"

import type { CharacterArtProps } from "../../types"

/**
 * Shared drawing kit for the free (basic) characters.
 *
 * Every basic character is drawn in a 100×100 box, centred so the face sits
 * well inside the round tile it gets clipped to. They are still art: the only
 * motion is a blink in "idle" and a small pop-in (plus one blink) in "intro",
 * all off under prefers-reduced-motion.
 */

export type Tones = readonly [light: string, base: string, deep: string]

/** Paint-server ids unique to this render: `u("skin")` → "r1-skin". */
export function useIds() {
  const prefix = "gav" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  return React.useCallback((name: string) => `${prefix}-${name}`, [prefix])
}

export const url = (id: string) => `url(#${id})`

/** Soft top-left lit shading for a flat shape. */
export function Soft({ id, tones, cx = "38%", cy = "30%", r = "80%" }: { id: string; tones: Tones; cx?: string; cy?: string; r?: string }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r}>
      <stop offset="0" stopColor={tones[0]} />
      <stop offset="0.55" stopColor={tones[1]} />
      <stop offset="1" stopColor={tones[2]} />
    </radialGradient>
  )
}

const motionCss = (cid: string, blink: number) => {
  const c = `gav-${cid}`
  return (
    `.${c}-pop,.${c}-blink{transform-box:fill-box;transform-origin:center}` +
    `.${c}--idle .${c}-blink{animation:${c}-blink ${blink}s ease-in-out infinite}` +
    `.${c}--intro .${c}-pop{animation:${c}-pop .55s cubic-bezier(.34,1.56,.64,1) both}` +
    `.${c}--intro .${c}-blink{animation:${c}-blink 1.2s ease-in-out .45s 1 both}` +
    `@keyframes ${c}-blink{0%,88%,100%{transform:scaleY(1)}93%{transform:scaleY(.12)}}` +
    `@keyframes ${c}-pop{0%{transform:scale(.62);opacity:0}60%{opacity:1}100%{transform:scale(1);opacity:1}}` +
    `@media (prefers-reduced-motion:reduce){.${c}-pop,.${c}-blink{animation:none!important}}`
  )
}

/**
 * The character's square: a soft glow on the accent, a ground shadow, and the
 * drawing inside a group that pops in on "intro".
 */
export function Stage({
  cid,
  mode,
  size,
  blink = 4.6,
  defs,
  backdrop,
  children,
}: CharacterArtProps & {
  cid: string
  /** Seconds between blinks in "idle" (vary it so a lobby doesn't blink in sync). */
  blink?: number
  defs?: React.ReactNode
  /** Drawn on the glow, behind the character (not popped). */
  backdrop?: React.ReactNode
  children: React.ReactNode
}) {
  const u = useIds()
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={`gav-${cid} gav-${cid}--${mode} block`}
    >
      <style>{motionCss(cid, blink)}</style>
      <defs>
        <radialGradient id={u("glow")} cx="50%" cy="42%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity={0.42} />
          <stop offset="0.7" stopColor="#fff" stopOpacity={0.1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        {defs}
      </defs>
      <circle cx={50} cy={44} r={46} fill={url(u("glow"))} />
      {backdrop}
      <g className={`gav-${cid}-pop`}>{children}</g>
    </svg>
  )
}

/** Wrap the eyes (both at one height) so they blink together. */
export function Blink({ cid, children }: { cid: string; children: React.ReactNode }) {
  return <g className={`gav-${cid}-blink`}>{children}</g>
}

export const INK = "#22182e"

/** A glossy round eye: dark pupil with a catch-light. */
export function Eye({ x, y, r, fill = INK }: { x: number; y: number; r: number; fill?: string }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} fill={fill} />
      <circle cx={x - r * 0.32} cy={y - r * 0.36} r={r * 0.36} fill="#fff" />
      <circle cx={x + r * 0.38} cy={y + r * 0.3} r={r * 0.14} fill="#fff" opacity={0.8} />
    </>
  )
}

/** A pair of rosy cheeks. */
export function Cheeks({ x, y, rx = 5, ry = 3, color = "#ff6b8b", opacity = 0.45 }: { x: [number, number]; y: number; rx?: number; ry?: number; color?: string; opacity?: number }) {
  return (
    <g fill={color} opacity={opacity}>
      <ellipse cx={x[0]} cy={y} rx={rx} ry={ry} />
      <ellipse cx={x[1]} cy={y} rx={rx} ry={ry} />
    </g>
  )
}

/** Shoulders filling the bottom of the tile. `top` is where they peak. */
export const shoulders = (top = 76, spread = 42) =>
  `M${50 - spread - 6} 104C${50 - spread} ${top + 10} ${36 - spread / 6} ${top} 50 ${top}` +
  `C${64 + spread / 6} ${top} ${50 + spread} ${top + 10} ${50 + spread + 6} 104Z`

/** A small four-point twinkle (backdrop decoration). */
export const twinkle = (cx: number, cy: number, r: number) => {
  const k = r * 0.22
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`
}

export const MIRROR = "matrix(-1 0 0 1 100 0)"

/** Draw a left-side part, then its mirror on the right. */
export function Pair({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <g transform={MIRROR}>{children}</g>
    </>
  )
}
