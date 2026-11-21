"use client"

import * as React from "react"

import type { StreakMilestone } from "@/lib/live/streak"
import { cn } from "@/lib/utils"
import "./streak.css"

/*
 * The play streak's art, all flat SVG (gradients, no filters) so it stays
 * cheap in long lists: the flame, the five streak medallions — each tier its
 * own shape, metal and fire — and the daily reward's treasure chest.
 */

/** The flame, in a 40×48 box (base at the bottom). */
const FLAME_OUTER =
  "M20 0C23 9 34 15 34 30C34 40.5 27.7 48 20 48C12.3 48 6 40.5 6 30C6 23 9.5 18 13.5 14.5C13.6 20 15.6 23.5 18.5 24.5C16.5 16 17.5 7 20 0Z"
const FLAME_MID =
  "M20 15C22.4 22 28.5 26 28.5 34C28.5 40 24.6 44.5 20 44.5C15.4 44.5 11.5 40 11.5 34C11.5 30 13.4 27.3 15.8 25.2C16.1 28.6 17.7 30.6 20 31C18.7 26 18.7 20.5 20 15Z"
const FLAME_CORE = "M20 30C22.2 34 25 35.6 25 39.2C25 42.4 22.8 44.5 20 44.5C17.2 44.5 15 42.4 15 39.2C15 35.6 17.8 34 20 30Z"

/** The streak flame: lit (orange, flickering) or out (grey). Sized by `className` (default size-6). */
export function StreakFlame({
  lit = true,
  className,
  still,
}: {
  lit?: boolean
  className?: string
  /** No flicker (e.g. inside a list). */
  still?: boolean
}) {
  const id = React.useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 40 48" aria-hidden className={cn("size-6 shrink-0 overflow-visible", className)}>
      <defs>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lit ? "#ffb02e" : "#c9cdd6"} />
          <stop offset=".55" stopColor={lit ? "#ff6a1f" : "#a9aebb"} />
          <stop offset="1" stopColor={lit ? "#e8381a" : "#8c92a1"} />
        </linearGradient>
        <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lit ? "#ffe066" : "#e3e6ec"} />
          <stop offset="1" stopColor={lit ? "#ff9a1f" : "#c3c7d1"} />
        </linearGradient>
      </defs>
      <g className={lit && !still ? "stk-flicker" : undefined}>
        <path d={FLAME_OUTER} fill={`url(#${id}-o)`} />
        <path d={FLAME_MID} fill={`url(#${id}-m)`} />
        <path d={FLAME_CORE} fill={lit ? "#fff6c9" : "#f1f2f5"} />
        <path d="M11 27C11 22 13 19 15 17" stroke="#fff" strokeOpacity={lit ? 0.55 : 0.4} strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}

/* ── The streak medallions ─────────────────────────────────────────── */

type Tier = {
  /** Rim metal: light, base, deep. */
  metal: [string, string, string]
  /** The enamel disc: top-left light, bottom-right deep. */
  enamel: [string, string]
  /** The fire: tip, middle, base; and its core. */
  fire: [string, string, string, string]
  /** The day-count ribbon: face, folds. */
  ribbon: [string, string]
}

const TIERS: Record<StreakMilestone, Tier> = {
  // Bronze ring, ember-red enamel, a classic orange flame
  7: {
    metal: ["#ffd9b5", "#d48c55", "#8f532c"],
    enamel: ["#ff8d5c", "#c9361b"],
    fire: ["#ffe36b", "#ffa126", "#ff5b1f", "#fff6c9"],
    ribbon: ["#e8692c", "#a8441a"],
  },
  // A silver rosette on royal blue, a bright gold flame
  30: {
    metal: ["#ffffff", "#c8d1dc", "#7d8a99"],
    enamel: ["#6fa8ff", "#2546c4"],
    fire: ["#fff3a0", "#ffc531", "#ff7a1a", "#ffffff"],
    ribbon: ["#3d6fe0", "#22439b"],
  },
  // A gold star on violet, a magenta-hot flame
  50: {
    metal: ["#fff3b8", "#f2b93f", "#b0701a"],
    enamel: ["#b394ff", "#5330c9"],
    fire: ["#ffe27a", "#ff8a3d", "#ff3d7f", "#fff4e0"],
    ribbon: ["#7c5cf0", "#4a2bab"],
  },
  // A winged gold shield on emerald, the hottest flame — blue
  100: {
    metal: ["#fff6c8", "#f4c24a", "#a86b14"],
    enamel: ["#3fe0b8", "#077565"],
    fire: ["#e9fbff", "#7fd8ff", "#2f7bff", "#ffffff"],
    ribbon: ["#10a587", "#0a6b58"],
  },
  // Crowned and sunlit on midnight: a prism of fire
  365: {
    metal: ["#fff8d6", "#ffcf4a", "#c4790f"],
    enamel: ["#4d36b8", "#130b3d"],
    fire: ["#fff07a", "#ff9d2e", "#ff2e88", "#ffffff"],
    ribbon: ["#e5394f", "#9c1d31"],
  },
}

const C = { x: 50, y: 44 }

const polar = (r: number, a: number) => `${(C.x + r * Math.cos(a)).toFixed(2)} ${(C.y + r * Math.sin(a)).toFixed(2)}`

/** A scalloped rosette (the 30-day medal). */
const ROSETTE = (() => {
  const n = 14
  let d = `M${polar(35, -Math.PI / 2)}`
  for (let i = 1; i <= n; i++) d += `A6.6 6.6 0 0 1 ${polar(35, (i / n) * Math.PI * 2 - Math.PI / 2)}`
  return `${d}Z`
})()

/** A star of `n` points between radii `r1` (tips) and `r2`. */
const star = (n: number, r1: number, r2: number) => {
  let d = ""
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    d += `${i ? "L" : "M"}${polar(i % 2 ? r2 : r1, a)}`
  }
  return `${d}Z`
}
const STAR = star(10, 41, 33.5)
/** The sun's rays behind the year medal. */
const RAYS = star(16, 48, 30)
/** Seven studs around the week medal's ring, one per day. */
const STUDS = Array.from({ length: 7 }, (_, i) => polar(33, (i / 7) * Math.PI * 2 - Math.PI / 2).split(" ").map(Number))

const SHIELD = "M50 6L83 15V41C83 62 68 77 50 86C32 77 17 62 17 41V15Z"
const SHIELD_IN = "M50 12.5L77 20V41.5C77 58.5 65 70.5 50 78.5C35 70.5 23 58.5 23 41.5V20Z"
const WING =
  "M17 26C10 24 4 26 1 30C5 30 8 31 10 33C5 34 2 37 1 41C5 40 9 40 12 42C8 44 6 47 6 51C10 49 14 48 18 49Z"
const CROWN = "M33 15L35.5 2.5L43 9.5L50 0L57 9.5L64.5 2.5L67 15Z"

/**
 * A streak badge: a medallion for `days` (7, 30, 50, 100, 365) with its day
 * count on a ribbon. Locked ones are drawn in grey. Sized by `className`.
 */
export function StreakMedal({
  days,
  locked = false,
  className,
  shine,
}: {
  days: StreakMilestone
  locked?: boolean
  className?: string
  /** A slow glint across it (the big view of an earned one). */
  shine?: boolean
}) {
  const uid = React.useId().replace(/:/g, "")
  const t = TIERS[days]
  const g = (k: string) => `${uid}-${k}`
  const url = (k: string) => `url(#${g(k)})`

  const rim =
    days === 7 ? (
      <circle cx={C.x} cy={C.y} r="37" fill={url("metal")} />
    ) : days === 30 ? (
      <path d={ROSETTE} fill={url("metal")} />
    ) : days === 50 ? (
      <path d={STAR} fill={url("metal")} stroke={url("metal")} strokeWidth="3" strokeLinejoin="round" />
    ) : days === 100 ? (
      <path d={SHIELD} fill={url("metal")} />
    ) : (
      <circle cx={C.x} cy={C.y} r="36" fill={url("metal")} />
    )

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={cn("overflow-visible", locked && "stk-locked", className)}
    >
      <defs>
        <linearGradient id={g("metal")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.metal[0]} />
          <stop offset=".45" stopColor={t.metal[1]} />
          <stop offset="1" stopColor={t.metal[2]} />
        </linearGradient>
        <linearGradient id={g("metalIn")} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={t.metal[0]} />
          <stop offset=".5" stopColor={t.metal[1]} />
          <stop offset="1" stopColor={t.metal[2]} />
        </linearGradient>
        <radialGradient id={g("enamel")} cx=".35" cy=".3" r=".85">
          <stop offset="0" stopColor={t.enamel[0]} />
          <stop offset="1" stopColor={t.enamel[1]} />
        </radialGradient>
        <linearGradient id={g("fire")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.fire[0]} />
          <stop offset=".5" stopColor={t.fire[1]} />
          <stop offset="1" stopColor={t.fire[2]} />
        </linearGradient>
        <linearGradient id={g("fireIn")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.fire[3]} />
          <stop offset="1" stopColor={t.fire[0]} />
        </linearGradient>
        <radialGradient id={g("halo")} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={t.fire[0]} stopOpacity=".75" />
          <stop offset="1" stopColor={t.fire[1]} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("ribbon")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.ribbon[0]} />
          <stop offset="1" stopColor={t.ribbon[1]} />
        </linearGradient>
        <clipPath id={g("clip")}>
          {days === 100 ? <path d={SHIELD} /> : <circle cx={C.x} cy={C.y} r="42" />}
        </clipPath>
      </defs>

      {/* Behind: the year's sunburst, the century's wings */}
      {days === 365 && <path d={RAYS} fill={url("metal")} opacity=".55" />}
      {days === 100 && (
        <g fill={url("metal")} stroke={t.metal[2]} strokeWidth="1.2" strokeLinejoin="round">
          <path d={WING} />
          <path d={WING} transform="matrix(-1 0 0 1 100 0)" />
        </g>
      )}

      {/* The rim, its inner bevel, the enamel */}
      <g>
        {rim}
        {days === 100 ? (
          <>
            <path d={SHIELD_IN} fill={url("metalIn")} transform="translate(50 44) scale(1.06) translate(-50 -44)" />
            <path d={SHIELD_IN} fill={url("enamel")} />
          </>
        ) : (
          <>
            <circle cx={C.x} cy={C.y} r={days === 50 ? 29 : 30.5} fill={url("metalIn")} />
            <circle cx={C.x} cy={C.y} r={days === 50 ? 26.5 : 28} fill={url("enamel")} />
          </>
        )}
      </g>

      {/* The week's seven studs; stars on the bigger ones' enamel */}
      {days === 7 &&
        STUDS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.1" fill={t.metal[0]} stroke={t.metal[2]} strokeWidth=".8" />)}
      {(days === 50 || days === 365) && (
        <g fill="#fff" opacity=".85">
          <path d="M31 33l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" />
          <path d="M68 29l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" />
          {days === 365 && (
            <>
              <circle cx="36" cy="55" r=".9" />
              <circle cx="64" cy="52" r="1.1" />
              <circle cx="40" cy="25" r=".8" />
              <circle cx="62" cy="40" r=".7" />
            </>
          )}
        </g>
      )}

      {/* The fire, on a soft halo */}
      <circle cx={C.x} cy={C.y + 2} r="17" fill={url("halo")} />
      <g transform={`translate(${C.x} ${days === 100 ? 20 : 21}) scale(.74) translate(-20 0)`}>
        <path d={FLAME_OUTER} fill={url("fire")} />
        <path d={FLAME_MID} fill={url("fireIn")} opacity=".95" />
        <path d={FLAME_CORE} fill={t.fire[3]} />
      </g>

      {/* The rim's highlight */}
      <g clipPath={url("clip")}>
        <path d="M18 40A32 32 0 0 1 44 12" stroke="#fff" strokeOpacity=".6" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {shine && !locked && <rect className="stk-shine" x="-30" y="-10" width="18" height="120" fill="#fff" opacity=".35" transform="rotate(20 50 50)" />}
      </g>

      {/* The year's crown */}
      {days === 365 && (
        <g>
          <path d={CROWN} fill={url("metal")} stroke={t.metal[2]} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="50" cy="10.5" r="2.2" fill="#ff3d7f" stroke="#fff" strokeWidth=".7" />
          <circle cx="40" cy="12" r="1.5" fill="#3fd6ff" />
          <circle cx="60" cy="12" r="1.5" fill="#3fd6ff" />
        </g>
      )}

      {/* The day count on a ribbon */}
      <g>
        <path d="M12 72H28V88H12L17 80Z" fill={t.ribbon[1]} />
        <path d="M88 72H72V88H88L83 80Z" fill={t.ribbon[1]} />
        <path d="M24 85L28 88V84Z M76 85L72 88V84Z" fill="#000" opacity=".25" />
        <rect x="22" y="69" width="56" height="16" rx="3" fill={url("ribbon")} />
        <rect x="22" y="69" width="56" height="3" rx="1.5" fill="#fff" opacity=".25" />
        <text
          x="50"
          y="81.6"
          textAnchor="middle"
          fontWeight="700"
          fill="#fff"
          stroke={t.ribbon[1]}
          strokeWidth="2.4"
          paintOrder="stroke"
          style={{ fontFamily: "var(--gu-font)", letterSpacing: ".02em" }}
        >
          <tspan fontSize="13.5">{days}</tspan>
          <tspan fontSize="8.5" dx="1.6">
            DAYS
          </tspan>
        </text>
      </g>
    </svg>
  )
}

/* ── The daily reward's chest ─────────────────────────────────────── */

/** The day-7 treasure chest (gold-banded, glowing at the seam). `open`: the lid up and coins showing. */
export function TreasureChest({ className, open }: { className?: string; open?: boolean }) {
  const id = React.useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 64 58" aria-hidden className={cn("overflow-visible", className)}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a6bff" />
          <stop offset="1" stopColor="#5330c9" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b896ff" />
          <stop offset="1" stopColor="#6e48e6" />
        </linearGradient>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0a6" />
          <stop offset=".5" stopColor="#ffc93a" />
          <stop offset="1" stopColor="#d18a0c" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="1" stopColor="#ffd34d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="54" rx="25" ry="3.4" fill="#2c3f73" opacity=".18" />
      {open && (
        <>
          {/* The lid thrown back (its inside showing), the glow and the heap of coins, behind the front */}
          <path d="M8 28L11.5 9C12.2 5.6 15 3.6 18.5 4L49 7.5C52.4 7.9 54.8 10.6 54.8 14L56 28Z" fill="#4a2aa8" />
          <path d="M11.5 9C12.2 5.6 15 3.6 18.5 4L49 7.5C52.4 7.9 54.8 10.6 54.8 14L54.5 16L12 12Z" fill={`url(#${id}-l)`} />
          <path d="M19 4.5L16.5 28M45.5 7L46.5 28" stroke="#e0a321" strokeWidth="4" opacity=".7" />
          <ellipse cx="32" cy="25" rx="26" ry="11" fill={`url(#${id}-glow)`} />
          {[
            [17, 26],
            [24, 22.5],
            [32, 20.5],
            [40, 22.5],
            [47, 26],
            [21, 28],
            [28.5, 26],
            [36, 26],
            [43, 28],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4.4" fill={`url(#${id}-g)`} stroke="#c47a06" strokeWidth=".8" />
              <circle cx={x - 1.2} cy={y - 1.3} r="1.1" fill="#fff8d6" opacity=".9" />
            </g>
          ))}
        </>
      )}
      {/* Body */}
      <rect x="7" y="27" width="50" height="26" rx="4.5" fill={`url(#${id}-b)`} />
      <rect x="7" y="47" width="50" height="6" rx="3" fill="#000" opacity=".14" />
      <rect x="15" y="27" width="6" height="26" fill={`url(#${id}-g)`} />
      <rect x="43" y="27" width="6" height="26" fill={`url(#${id}-g)`} />
      {open ? (
        <rect x="7" y="27" width="50" height="3.5" fill={`url(#${id}-g)`} />
      ) : (
        <>
          {/* Lid */}
          <path d="M7 29V20C7 11.5 15 6.5 32 6.5C49 6.5 57 11.5 57 20V29Z" fill={`url(#${id}-l)`} />
          <path d="M12 14C16 10.5 22 9.2 30 9" stroke="#fff" strokeOpacity=".5" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M18 9V29M46 8.6V29" stroke="#ffc93a" strokeWidth="6" />
          <rect x="7" y="26" width="50" height="4.5" fill={`url(#${id}-g)`} />
          {/* A glow leaking at the seam */}
          <rect x="9" y="25" width="46" height="1.6" rx=".8" fill="#fff6c2" className="stk-seam" />
        </>
      )}
      {/* Lock plate (on the front, below the coins, once open) */}
      <g transform={open ? "translate(0 5)" : undefined}>
        <rect x="26.5" y="23" width="11" height="13" rx="3" fill={`url(#${id}-g)`} stroke="#b0700c" strokeWidth=".8" />
        <circle cx="32" cy="28.5" r="1.9" fill="#5a3a12" />
        <path d="M31.2 29.5h1.6l.5 3.4h-2.6z" fill="#5a3a12" />
      </g>
    </svg>
  )
}
