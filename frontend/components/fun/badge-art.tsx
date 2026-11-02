"use client"

import { useId, type ReactNode } from "react"
import { cn } from "cn"

import type { BadgeId, BadgeTier } from "@/lib/fun/catalog"

const CX = 50
const CY = 42

/** A 16-scallop rosette around the medal, built once. */
const ROSETTE = (() => {
  const n = 16
  const r = 33.5
  const bump = 7.4
  const pt = (i: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`
  }
  let d = `M${pt(0)}`
  for (let i = 1; i <= n; i++) d += `A${bump} ${bump} 0 0 1 ${pt(i)}`
  return `${d}Z`
})()

const HEART =
  "M0 8.5C-6.4 4.4-10 0.6-10-3.3C-10-6.4-7.7-8.6-4.9-8.6C-2.9-8.6-1.1-7.5 0-5.7C1.1-7.5 2.9-8.6 4.9-8.6C7.7-8.6 10-6.4 10-3.3C10 0.6 6.4 4.4 0 8.5Z"

type Metal = { light: string; base: string; dark: string }

const METALS: Record<BadgeTier | 0, Metal> = {
  0: { light: "#E6E8EC", base: "#C6CBD2", dark: "#A3AAB4" },
  1: { light: "#F6CDA8", base: "#D08A55", dark: "#8F532C" },
  2: { light: "#FAFCFE", base: "#C3CCD7", dark: "#7F8B99" },
  3: { light: "#FFF1B0", base: "#F4BC45", dark: "#B97A1C" },
}

/** Enamel colours: top-left light, bottom-right deep, and the ribbon. */
type Enamel = { light: string; deep: string; ribbon: string; ribbonDark: string }

const ENAMEL: Record<BadgeId, Enamel> = {
  earlybird: { light: "#FFB25C", deep: "#E0631F", ribbon: "#F27E33", ribbonDark: "#C4561A" },
  swift: { light: "#6F9BFF", deep: "#2F57D6", ribbon: "#4673EC", ribbonDark: "#2E4FB8" },
  champ: { light: "#A98BFF", deep: "#6542DB", ribbon: "#7C5CF0", ribbonDark: "#5636C2" },
  bigheart: { light: "#FF86A6", deep: "#DB3466", ribbon: "#F0527E", ribbonDark: "#C42E5C" },
  lovebird: { light: "#45D3B2", deep: "#0F8D78", ribbon: "#1FAE93", ribbonDark: "#147F6C" },
}

const LOCKED: Enamel = { light: "#D3D7DD", deep: "#B4BAC3", ribbon: "#BCC2CA", ribbonDark: "#A4ABB5" }

/** The central glyph, drawn in `ink` with `accent` details. */
function Glyph({ badge, ink, accent, beak }: { badge: BadgeId; ink: string; accent: string; beak: string }): ReactNode {
  switch (badge) {
    case "earlybird":
      return (
        <>
          {/* the sun rising over the horizon, a little bird already up */}
          <path d="M37.5 49.5A12.5 12.5 0 0 1 62.5 49.5Z" fill={ink} />
          <path
            d="M50 31.5V34.5M38.6 36.2L40.8 38.4M61.4 36.2L59.2 38.4M33.8 45.6H36.8M63.2 45.6H66.2"
            stroke={ink}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M33 53H67" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M40 56.8H60" stroke={ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
          <path
            d="M44.5 27.2C46 25.6 47.6 25.6 49 27.2C50.4 25.6 52 25.6 53.5 27.2"
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
    case "swift":
      return (
        <>
          <circle cx={CX} cy={CY} r="13.5" fill="none" stroke={ink} strokeWidth="2.6" opacity="0.9" />
          <path
            d="M54.5 22.5L40 45H49L45.5 61.5L60.5 38H51.5Z"
            fill={ink}
            stroke={accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
            paintOrder="stroke"
          />
        </>
      )
    case "champ":
      return (
        <>
          <path d="M41 30H35.8C35.8 37.5 38.6 41 43 41.4M59 30H64.2C64.2 37.5 61.4 41 57 41.4" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M39.5 26.5H60.5V34.5C60.5 41.6 55.9 47 50 47C44.1 47 39.5 41.6 39.5 34.5Z" fill={ink} />
          <rect x="47.6" y="46" width="4.8" height="7" fill={ink} />
          <rect x="41" y="52.5" width="18" height="6" rx="2" fill={ink} />
          <path
            d="M50 30.6L51.5 33.7L54.9 34.1L52.4 36.4L53.1 39.8L50 38.1L46.9 39.8L47.6 36.4L45.1 34.1L48.5 33.7Z"
            fill={accent}
          />
        </>
      )
    case "bigheart":
      return (
        <>
          <path d={HEART} fill={ink} transform={`translate(${CX} 45) scale(1.5)`} />
          <path d="M50 37.6V57" stroke={accent} strokeWidth="3.6" />
          <path
            d="M50 36.5C46.5 30.5 40.5 30.5 41.5 34.6C42.4 38 47 37.8 50 36.5ZM50 36.5C53.5 30.5 59.5 30.5 58.5 34.6C57.6 38 53 37.8 50 36.5Z"
            fill={accent}
            stroke={ink}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="36.6" r="2.2" fill={accent} stroke={ink} strokeWidth="1.4" />
        </>
      )
    case "lovebird":
      return (
        <>
          <path d={HEART} fill={ink} transform={`translate(${CX} 45) scale(1.55)`} />
          {/* two birds, each one half of the heart, beak to beak */}
          <path d="M50 42.5V58" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M37.6 41C38.4 47.6 43 53 48.2 55.6C47.4 49.4 43.8 44 37.6 41ZM62.4 41C61.6 47.6 57 53 51.8 55.6C52.6 49.4 56.2 44 62.4 41Z" fill={accent} opacity="0.45" />
          <path d="M46.6 38.2L50 40.4L46.6 42.4ZM53.4 38.2L50 40.4L53.4 42.4Z" fill={beak} />
          <circle cx="44.6" cy="37.4" r="1.7" fill={accent} />
          <circle cx="55.4" cy="37.4" r="1.7" fill={accent} />
        </>
      )
  }
}

/**
 * A badge medallion. Tier 1 bronze, 2 silver, 3 gold; 0 is locked, drawn in
 * soft greys.
 */
export function BadgeArt({ badge, tier, className }: { badge: BadgeId; tier: BadgeTier | 0; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const metal = METALS[tier]
  const locked = tier === 0
  const enamel = locked ? LOCKED : ENAMEL[badge]
  const ink = locked ? "#F3F4F6" : "#FFFDF7"

  return (
    <svg viewBox="0 0 100 100" className={cn("size-9 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.5" stopColor={metal.base} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.55" stopColor={metal.base} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        <radialGradient id={`${id}e`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={enamel.light} />
          <stop offset="1" stopColor={enamel.deep} />
        </radialGradient>
      </defs>
      <g opacity={locked ? 0.75 : 1}>
        {/* ribbon tails */}
        <path d="M37 62L49.5 67L41.5 96L35.6 90L28.5 93.2Z" fill={enamel.ribbon} />
        <path d="M63 62L50.5 67L58.5 96L64.4 90L71.5 93.2Z" fill={enamel.ribbonDark} />
        {/* rosette rim with a bevel, then the enamel disc */}
        <path d={ROSETTE} fill={`url(#${id}m)`} />
        <circle cx={CX} cy={CY} r="28.5" fill={`url(#${id}r)`} />
        <circle cx={CX} cy={CY} r="26" fill={`url(#${id}e)`} />
        <Glyph badge={badge} ink={ink} accent={enamel.deep} beak={locked ? enamel.deep : "#FFB648"} />
        {/* gloss */}
        <path d="M29.5 36A21 21 0 0 1 45 21.5" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" opacity="0.35" />
      </g>
    </svg>
  )
}
