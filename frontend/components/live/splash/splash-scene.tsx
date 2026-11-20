"use client"

import * as React from "react"

import { LiveGameLogo } from "@/components/live/live-game-logo"
import type { LiveGameId } from "@/lib/live/types"
import { GlossyText } from "../intro/glossy-text"
import { TileArt, type SplashTheme } from "./themes"

/* ── Sky and clouds (static) ─────────────────────────────────────────── */

/** A puffy cartoon cloud: white circles over a tinted copy for the underside. */
function Cloud({ shade, className, style }: { shade: string; className?: string; style?: React.CSSProperties }) {
  const puffs = (
    <>
      <circle cx="58" cy="66" r="30" />
      <circle cx="96" cy="48" r="40" />
      <circle cx="142" cy="56" r="32" />
      <circle cx="174" cy="74" r="22" />
      <rect x="28" y="66" width="168" height="30" rx="15" />
    </>
  )
  return (
    <svg viewBox="0 0 220 104" aria-hidden className={className} style={style}>
      <g fill={shade} transform="translate(0 7)">
        {puffs}
      </g>
      <g fill="#fff">{puffs}</g>
    </svg>
  )
}

/** The page: the game's sky, a soft light behind the logo, clouds at the edges. */
export function SplashBackdrop({ theme }: { theme: SplashTheme }) {
  return (
    <div aria-hidden className="absolute inset-0" style={{ background: theme.sky }}>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 38% at 50% 22%, rgba(255,255,255,.42), transparent 70%)" }}
      />
      <Cloud shade={theme.cloudShade} className="sp-deco" style={{ width: "min(34vw,240px)", top: "9%", right: "-7%", opacity: 0.85 }} />
      <Cloud shade={theme.cloudShade} className="sp-deco" style={{ width: "min(28vw,200px)", top: "40%", left: "-9%", opacity: 0.7 }} />
      <Cloud shade={theme.cloudShade} className="sp-deco" style={{ width: "min(26vw,190px)", top: "48%", right: "-6%", opacity: 0.55 }} />
      <Cloud shade={theme.cloudShade} className="sp-deco" style={{ width: "min(max(78vw,380px),110vh)", bottom: "-7%", left: "-22%" }} />
      <Cloud shade={theme.cloudShade} className="sp-deco" style={{ width: "min(max(86vw,420px),120vh)", bottom: "-11%", right: "-30%" }} />
    </div>
  )
}

/* ── Logo ────────────────────────────────────────────────────────────── */

/** Where the three tiles sit around the title, in em of the title's size. */
const TILE_SLOTS: React.CSSProperties[] = [
  { left: "-0.3em", top: "-0.62em", rotate: "-14deg" },
  { right: "-0.28em", top: "-0.42em", rotate: "12deg" },
  { right: "-0.05em", bottom: "-0.6em", rotate: "-9deg" },
]

/**
 * The game's logotype: big chunky glossy type (one GlossyText per line), an
 * optional "3D" sticker, and the three item tiles around it bobbing gently.
 * `big`: alone on the screen (no players), with the game's icon above.
 */
export function SplashLogo({ game, theme, big = false }: { game: LiveGameId; theme: SplashTheme; big?: boolean }) {
  const longest = Math.max(...theme.title.map((l) => l.length))
  const size = `min(${(84 / (longest * 0.66)).toFixed(2)}vw, ${big ? 11 : 9}vh, ${big ? 112 : 92}px)`
  return (
    <div className="sp-logo flex flex-col items-center">
      {big ? (
        <LiveGameLogo game={game} className="mb-[3vh] size-[clamp(64px,18vw,104px)] rounded-[22%] shadow-[0_8px_18px_rgba(30,20,70,.22)]" />
      ) : null}
      <div className="relative flex flex-col items-center py-[0.62em]" style={{ fontSize: size }}>
        {theme.tiles.map((icon, i) => (
          <span
            key={icon}
            aria-hidden
            className="absolute size-[0.8em] max-h-16 max-w-16"
            style={{ ...TILE_SLOTS[i], ["--sp-edge" as string]: `color-mix(in oklab, ${theme.rim} 30%, #e4dccd)` }}
          >
            <span className="sp-bob block size-full" style={{ animationDelay: `${-i * 0.9}s` }}>
              <span className="sp-tile">
                <TileArt icon={icon} />
              </span>
            </span>
          </span>
        ))}
        {theme.title.map((line, i) => (
          <span key={line} className="relative" style={{ marginTop: i ? "-0.16em" : 0 }}>
            <GlossyText size="1em" rim={theme.rim} tint={theme.tint}>
              {line}
            </GlossyText>
            {theme.badge && i === theme.title.length - 1 ? (
              <span className="sp-badge absolute -top-[0.1em] -right-[0.55em] rotate-[10deg] text-[0.4em]">{theme.badge}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Loading bar ─────────────────────────────────────────────────────── */

/**
 * "Loading…" over a glossy bar with the percentage and the game's item riding
 * the fill's end. It runs to ~92% over `minMs` on its own, creeps after that,
 * and glides to 100% once `finish`. Driven by requestAnimationFrame straight
 * on the DOM (transform + text), so nothing else re-renders per frame.
 */
export function LoadingBar({
  minMs,
  finish,
  theme,
}: {
  minMs: number
  finish: boolean
  theme: SplashTheme
}) {
  const fill = React.useRef<HTMLDivElement>(null)
  const rail = React.useRef<HTMLDivElement>(null)
  const pct = React.useRef<HTMLSpanElement>(null)
  const finishRef = React.useRef(finish)
  React.useEffect(() => {
    finishRef.current = finish
  }, [finish])

  React.useEffect(() => {
    const t0 = performance.now()
    let last = t0
    let p = 0.04
    let raf = 0
    let shown = -1
    const frame = (now: number) => {
      const t = now - t0
      const dt = Math.min(64, now - last)
      last = now
      const target = finishRef.current
        ? 1
        : t < minMs
          ? 0.04 + 0.88 * (1 - Math.pow(1 - t / minMs, 2))
          : 0.92 + 0.06 * (1 - Math.exp(-(t - minMs) / 1500))
      p += (target - p) * Math.min(1, dt / (finishRef.current ? 70 : 110))
      if (target === 1 && 1 - p < 0.002) p = 1
      const x = `translate3d(${((p - 1) * 100).toFixed(2)}%,0,0)`
      if (fill.current) fill.current.style.transform = x
      if (rail.current) rail.current.style.transform = x
      const n = Math.round(p * 100)
      if (n !== shown && pct.current) {
        pct.current.textContent = `${n}%`
        shown = n
      }
      if (p < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // `finish` is read live through the ref: the bar must not restart when it flips
  }, [minMs])

  return (
    <div className="flex w-[min(78vw,400px)] flex-col items-center gap-2.5">
      <span className="sp-label">Loading…</span>
      <div className="sp-track w-full" role="progressbar" aria-label="Loading the game">
        <div className="sp-track-in">
          <div ref={fill} className="sp-fill" />
        </div>
        <span ref={pct} className="sp-pct">
          4%
        </span>
        <div ref={rail} className="sp-rail">
          <span className="sp-rider">
            <TileArt icon={theme.tiles[0]} />
          </span>
        </div>
      </div>
    </div>
  )
}
