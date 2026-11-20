"use client"

import * as React from "react"
import Link from "next/link"
import { Nunito } from "next/font/google"

import { LevelBadge, validLevel } from "@/components/game-avatar/level-badge"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { Spinner } from "@/components/ui/spinner"
import type { LiveGameId } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { GameRewards } from "./game-rewards"
import { PlayerAvatarFill } from "./player-avatar"

// Chunky rounded lettering, like a game's result card (the Pastel Tic Tac Toe skin loads the same)
const rounded = Nunito({ subsets: ["latin"], weight: ["800", "900"], display: "swap" })

/** win · lose · draw · watch (you didn't play: the winner gets the crown). */
export type ResultTone = "win" | "lose" | "draw" | "watch"

export interface ResultRow {
  id: string
  name: string
  photo?: string
  /** Game profile (RoomPlayer avatar / frame): shown instead of the photo. */
  avatar?: string
  frame?: string
  /** Game level (RoomPlayer level), a crest on the avatar. */
  level?: number
  /** 1-based; winners who share the win are all 1. */
  place: number
  winner: boolean
  you: boolean
  score?: number
  /** The game's own numbers, e.g. ["Cut 3", "Got cut 1"]. */
  stats?: string[]
}

/** The yellow button: start a rematch (host), join one that exists, or wait for the host. */
export type PlayAgain =
  | { kind: "rematch"; onClick: () => void; pending: boolean }
  | { kind: "join"; href: string }
  | { kind: "wait"; hostName: string }

export interface ResultScreenProps {
  game: LiveGameId
  gameName: string
  code: string
  tone: ResultTone
  /** Small, under the ribbon: who won when it isn't you, and why it ended. */
  note?: string
  rows: ResultRow[]
  /** Just ended: the full entrance, and confetti for a win. An old result opens quickly. */
  fresh: boolean
  playAgain: PlayAgain
  onBack: () => void
  /** The sticker row, shown small at the bottom. */
  stickers?: React.ReactNode
  /** Under the two buttons: more ways on (the group game room: pick another game). */
  extra?: React.ReactNode
  /** The left button's label (default "Back"). */
  backLabel?: string
}

/**
 * The end of a live game, full screen: a crown with two stars on a ribbon
 * ("You Win" in gold and red, "You Lose" in silver and blue, a purple "Draw",
 * a green "Game Over" for someone who watched), the ranking as glossy rows,
 * and two big buttons. All the art is drawn here (SVG); the motion is CSS and
 * stops under reduced motion.
 */
export function ResultScreen({
  game,
  gameName,
  code,
  tone,
  note,
  rows,
  fresh,
  playAgain,
  onBack,
  stickers,
  extra,
  backLabel = "Back",
}: ResultScreenProps) {
  const look = TONES[tone]
  // You played (you have a row): the game counts on your record, and may pop up a reward
  const played = rows.some((r) => r.you)
  return (
    <div
      className={cn("rs-root", rounded.className)}
      data-tone={tone}
      data-fresh={fresh || undefined}
      data-many={rows.length > 2 || undefined}
      style={{ "--rs-glow": look.glow } as React.CSSProperties}
    >
      <ResultStyles />
      <Backdrop game={game} />

      <div className="rs-col">
        <p className="rs-top">
          <LiveGameLogo game={game} className="size-5 rounded-[5px]" />
          <span className="truncate">
            {gameName} · Room {code}
          </span>
        </p>

        <div className="rs-main">
          <h1 className="sr-only">{look.label}</h1>
          <Hero tone={tone} title={look.title} confetti={fresh && tone === "win"} />
          {note && <p className="rs-note">{note}</p>}

          <ol className="rs-rows" aria-label="Ranking">
            {rows.map((r, i) => (
              <Row key={r.id} row={r} draw={tone === "draw"} index={i} />
            ))}
          </ol>

          <div className="rs-btns" style={{ "--i": rows.length } as React.CSSProperties}>
            <button type="button" className="rs-btn rs-btn-teal" onClick={onBack}>
              {backLabel}
            </button>
            {playAgain.kind === "join" ? (
              <Link href={playAgain.href} replace className="rs-btn rs-btn-gold">
                Join Rematch
              </Link>
            ) : playAgain.kind === "rematch" ? (
              <button
                type="button"
                className="rs-btn rs-btn-gold"
                onClick={playAgain.onClick}
                disabled={playAgain.pending}
              >
                {playAgain.pending && <Spinner className="size-5" />}
                Play Again
              </button>
            ) : (
              <button
                type="button"
                className="rs-btn rs-btn-gold"
                data-off
                disabled
                aria-describedby="rs-wait"
              >
                Play Again
              </button>
            )}
          </div>
          {playAgain.kind === "wait" && (
            <p id="rs-wait" className="rs-wait">
              Waiting for {playAgain.hostName} to start a rematch
            </p>
          )}
          {extra}
        </div>

        {stickers && <div className="rs-stickers">{stickers}</div>}
      </div>

      <GameRewards
        code={code}
        game={game}
        outcome={!played || tone === "watch" ? null : tone === "win" ? "win" : tone === "draw" ? "draw" : "lose"}
      />
    </div>
  )
}

/* ── Looks ───────────────────────────────────────────────────────────── */

interface Metal {
  hi: string
  light: string
  mid: string
  shade: string
  deep: string
  line: string
}
interface Gem {
  light: string
  mid: string
  dark: string
  /** Round and smooth instead of cut. */
  pearl?: boolean
}
interface Ribbon {
  top: string
  mid: string
  bottom: string
  tail: string
  fold: string
  stripe: string
  stripeEdge: string
  /** The text's soft drop shadow (r g b). */
  shadow: string
  checker?: boolean
}

const GOLD: Metal = { hi: "#fffbe2", light: "#ffeb7a", mid: "#ffc82a", shade: "#ec9a12", deep: "#b9660a", line: "#8a4906" }
const SILVER: Metal = { hi: "#ffffff", light: "#eef5fc", mid: "#c8dbee", shade: "#93afcc", deep: "#6886a6", line: "#465f7d" }
const FROST: Metal = { hi: "#ffffff", light: "#e9f4fd", mid: "#c7e0f3", shade: "#a1c4e2", deep: "#7aa3c8", line: "#55809f" }

const RUBY: Gem = { light: "#ff9ccb", mid: "#ee1f72", dark: "#8a0640" }
const PEARL: Gem = { light: "#ffffff", mid: "#cfdcea", dark: "#7f93ad", pearl: true }
const AMETHYST: Gem = { light: "#e2c8ff", mid: "#9b5cf5", dark: "#4a1a9c" }
const EMERALD: Gem = { light: "#b5ffd9", mid: "#18c27e", dark: "#06603c" }

const RED: Ribbon = { top: "#ff8b74", mid: "#f0533f", bottom: "#cf3528", tail: "#d7412f", fold: "#8a2111", stripe: "#ffc15a", stripeEdge: "#e6801c", shadow: "125 22 12" }
const BLUE: Ribbon = { top: "#64b8f0", mid: "#3d95da", bottom: "#2870ba", tail: "#3283c8", fold: "#1b4677", stripe: "#94f7f9", stripeEdge: "#3cc2de", shadow: "14 48 108", checker: true }
const PURPLE: Ribbon = { top: "#bb95ff", mid: "#8f5cf0", bottom: "#6a3cce", tail: "#7d4ae0", fold: "#3a1c80", stripe: "#ffd56a", stripeEdge: "#e2a227", shadow: "48 18 110" }
const GREEN: Ribbon = { top: "#5fe6b8", mid: "#21ba8c", bottom: "#118d6a", tail: "#19a57c", fold: "#095740", stripe: "#ffd56a", stripeEdge: "#e2a227", shadow: "4 70 50" }

const TONES: Record<
  ResultTone,
  { title: string; label: string; crown: Metal; gem: Gem; stars: Metal; ribbon: Ribbon; glow: string }
> = {
  win: { title: "You Win", label: "You win", crown: GOLD, gem: RUBY, stars: GOLD, ribbon: RED, glow: "255 210 60" },
  lose: { title: "You Lose", label: "You lose", crown: SILVER, gem: PEARL, stars: FROST, ribbon: BLUE, glow: "70 140 255" },
  draw: { title: "Draw", label: "It's a draw", crown: SILVER, gem: AMETHYST, stars: SILVER, ribbon: PURPLE, glow: "160 110 255" },
  watch: { title: "Game Over", label: "Game over", crown: GOLD, gem: EMERALD, stars: GOLD, ribbon: GREEN, glow: "255 210 60" },
}

/* ── Backdrop ────────────────────────────────────────────────────────── */

/**
 * The game's own colours, huge and blurred (its logo, scaled past the screen),
 * under a dark scrim — the feel of the board behind glass, without running
 * the game behind it.
 */
function Backdrop({ game }: { game: LiveGameId }) {
  return (
    <div className="rs-bg" aria-hidden>
      <LiveGameLogo game={game} className="rs-bg-logo" />
      <div className="rs-bg-scrim" />
    </div>
  )
}

/* ── Crown, stars, ribbon ────────────────────────────────────────────── */

function Hero({ tone, title, confetti }: { tone: ResultTone; title: string; confetti: boolean }) {
  const look = TONES[tone]
  return (
    <div className="rs-hero" aria-hidden>
      <div className="rs-rays-box">
        <div className="rs-glow" />
        <div className="rs-rays" />
      </div>
      <Star metal={look.stars} className="rs-star rs-star-l" />
      <Star metal={look.stars} className="rs-star rs-star-r" />
      <RibbonArt ribbon={look.ribbon} />
      <Crown metal={look.crown} gem={look.gem} />
      <p
        className="rs-title"
        style={{
          fontSize: title.length > 7 ? "9.5cqw" : "11.5cqw",
          textShadow: `0 0.45cqw 0 rgb(${look.ribbon.shadow} / 0.55), 0 0.9cqw 2cqw rgb(${look.ribbon.shadow} / 0.45)`,
        }}
      >
        {title}
      </p>
      {confetti && <Confetti />}
    </div>
  )
}

/** The five front points; the valleys sit high so the body reads full. */
const CROWN_FRONT =
  "M36 134 L14 70 Q30 80 40 86 Q44 64 50 44 Q68 70 88 84 Q104 54 120 26 Q136 54 152 84 Q172 70 190 44 Q196 64 200 86 Q210 80 226 70 L204 134Z"

function Crown({ metal, gem }: { metal: Metal; gem: Gem }) {
  const id = React.useId().replace(/:/g, "")
  const m = metal
  return (
    <svg viewBox="0 0 240 182" className="rs-crown">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.light} />
          <stop offset="0.45" stopColor={m.mid} />
          <stop offset="1" stopColor={m.shade} />
        </linearGradient>
        <linearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.mid} />
          <stop offset="1" stopColor={m.deep} />
        </linearGradient>
        {/* Round metal: dark edges, a bright stripe left of centre */}
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={m.deep} stopOpacity="0.6" />
          <stop offset="0.16" stopColor={m.deep} stopOpacity="0" />
          <stop offset="0.36" stopColor={m.hi} stopOpacity="0.5" />
          <stop offset="0.44" stopColor={m.hi} stopOpacity="0" />
          <stop offset="0.8" stopColor={m.deep} stopOpacity="0" />
          <stop offset="1" stopColor={m.deep} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.35" stopColor={m.light} />
          <stop offset="1" stopColor={m.shade} />
        </linearGradient>
        <radialGradient id={`${id}-ball`} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.45" stopColor={m.mid} />
          <stop offset="1" stopColor={m.deep} />
        </radialGradient>
        <radialGradient id={`${id}-gem`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor={gem.light} />
          <stop offset="0.5" stopColor={gem.mid} />
          <stop offset="1" stopColor={gem.dark} />
        </radialGradient>
      </defs>

      {/* Back spikes, between the front ones */}
      <g fill={`url(#${id}-back)`} stroke={m.line} strokeWidth="2" strokeLinejoin="round">
        <path d="M62 104 Q74 80 80 52 Q88 80 102 104Z" />
        <path d="M138 104 Q152 80 160 52 Q166 80 178 104Z" />
      </g>
      <g fill={`url(#${id}-ball)`} stroke={m.line} strokeWidth="1.6">
        <circle cx="80" cy="48" r="6.5" />
        <circle cx="160" cy="48" r="6.5" />
      </g>

      {/* Front: five points */}
      <path
        d={CROWN_FRONT}
        fill={`url(#${id}-body)`}
        stroke={m.line}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d={CROWN_FRONT}
        fill={`url(#${id}-side)`}
      />
      {/* Light catching the left edges */}
      <g fill="none" stroke={m.hi} strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round">
        <path d="M20 78 L34 120" />
        <path d="M48 54 Q46 68 44 78" />
        <path d="M117 34 Q107 52 96 74" />
        <path d="M186 52 Q176 64 162 74" />
      </g>
      <g fill={`url(#${id}-ball)`} stroke={m.line} strokeWidth="1.6">
        <circle cx="14" cy="66" r="7" />
        <circle cx="50" cy="40" r="7.5" />
        <circle cx="120" cy="20" r="10" />
        <circle cx="190" cy="40" r="7.5" />
        <circle cx="226" cy="66" r="7" />
      </g>
      <g fill="#fff" opacity="0.85">
        <circle cx="11.5" cy="63" r="2" />
        <circle cx="47.5" cy="37" r="2.2" />
        <circle cx="116.5" cy="16" r="3" />
        <circle cx="187.5" cy="37" r="2.2" />
        <circle cx="223.5" cy="63" r="2" />
      </g>

      {/* Fleurs on the side panels */}
      <Fleur x={74} y={106} metal={m} />
      <Fleur x={166} y={106} metal={m} />

      {/* Band, with a velvet trim and the lip under it */}
      <path d="M30 124 Q120 148 210 124 L212 150 Q120 174 28 150Z" fill={`url(#${id}-band)`} stroke={m.line} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M30 124 Q120 148 210 124 L212 150 Q120 174 28 150Z" fill={`url(#${id}-side)`} />
      <path d="M34 130 Q120 153 206 130" fill="none" stroke={m.hi} strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 150 Q120 174 211 150" fill="none" stroke={gem.pearl ? "#4e6c8f" : "#b0241c"} strokeWidth="6" />
      <path d="M33 151 Q120 174.5 207 151" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" strokeDasharray="0 7" strokeLinecap="round" />
      <path d="M27 153 Q120 178 213 153 L211 160 Q120 185 29 160Z" fill={`url(#${id}-band)`} stroke={m.line} strokeWidth="2" strokeLinejoin="round" />

      {/* Small stones along the band */}
      <Chip x={58} y={139} fill={gem.pearl ? "#ffffff" : "#ff7fb3"} />
      <Chip x={88} y={145} fill={gem.pearl ? "#ffffff" : "#9fe3ff"} />
      <Chip x={152} y={145} fill={gem.pearl ? "#ffffff" : "#9fe3ff"} />
      <Chip x={182} y={139} fill={gem.pearl ? "#ffffff" : "#ff7fb3"} />

      {/* The big stone, set in a bezel */}
      {gem.pearl ? (
        <g>
          <circle cx="120" cy="118" r="20" fill={`url(#${id}-band)`} stroke={m.line} strokeWidth="2" />
          <circle cx="120" cy="118" r="14" fill={`url(#${id}-gem)`} stroke={m.deep} strokeWidth="1.5" />
          <circle cx="120" cy="118" r="6" fill={gem.dark} opacity="0.5" />
          <ellipse cx="114.5" cy="112.5" rx="4.5" ry="3" fill="#fff" opacity="0.95" />
        </g>
      ) : (
        <CutGem cx={120} cy={114} gem={gem} gradient={`url(#${id}-gem)`} metal={m} />
      )}
    </svg>
  )
}

/** An octagonal cut stone: bezel, faceted face, a table in the middle and a glint. */
function CutGem({ cx, cy, gem, gradient, metal }: { cx: number; cy: number; gem: Gem; gradient: string; metal: Metal }) {
  const ring = (r: number) => Array.from({ length: 8 }, (_, k) => polar(cx, cy, r, -112.5 + k * 45))
  const outer = ring(21)
  const table = ring(10.5)
  return (
    <g>
      <polygon points={pts(ring(26))} fill={metal.mid} stroke={metal.line} strokeWidth="2" strokeLinejoin="round" />
      <polygon points={pts(outer)} fill={gradient} stroke={gem.dark} strokeWidth="1.5" strokeLinejoin="round" />
      {outer.map((p, k) => {
        const q = outer[(k + 1) % 8]
        const light = Math.cos(((-112.5 + k * 45 + 22.5 - -135) * Math.PI) / 180)
        return (
          <polygon
            key={k}
            points={pts([p, q, table[(k + 1) % 8], table[k]])}
            fill={light > 0 ? "#fff" : gem.dark}
            opacity={(Math.abs(light) * (light > 0 ? 0.4 : 0.35)).toFixed(3)}
          />
        )
      })}
      <polygon points={pts(table)} fill={gem.light} opacity="0.55" />
      <path d={`M${cx - 6} ${cy - 11} l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z`} fill="#fff" />
    </g>
  )
}

/** A small stone on the band. */
function Chip({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <path
      d={`M${x - 6} ${y} L${x} ${y - 4.5} L${x + 6} ${y} L${x} ${y + 4.5}Z`}
      fill={fill}
      stroke="#000"
      strokeOpacity="0.35"
      strokeWidth="1"
    />
  )
}

/** A raised fleur-de-lis on the crown's side. */
function Fleur({ x, y, metal }: { x: number; y: number; metal: Metal }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={metal.shade} stroke={metal.deep} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M0 -12 C5 -7 5 -1 0 4 C-5 -1 -5 -7 0 -12Z" />
      <path d="M-1.5 3 C-4 -4 -11 -5 -11 0 C-11 3 -7 4 -5 2" fill="none" strokeWidth="2.6" stroke={metal.shade} />
      <path d="M1.5 3 C4 -4 11 -5 11 0 C11 3 7 4 5 2" fill="none" strokeWidth="2.6" stroke={metal.shade} />
      <rect x="-6" y="3" width="12" height="3.4" rx="1.2" />
      <path d="M-1 -9 C1.5 -6 1.5 -2 -0.5 1" fill="none" stroke={metal.hi} strokeOpacity="0.8" strokeWidth="1.2" />
    </g>
  )
}

/** A puffy five-point star with bevelled facets and a glossy spot. */
function Star({ metal, className }: { metal: Metal; className?: string }) {
  const id = React.useId().replace(/:/g, "")
  const m = metal
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={m.mid} />
          <stop offset="1" stopColor={m.deep} />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={m.light} />
          <stop offset="1" stopColor={m.mid} />
        </linearGradient>
      </defs>
      <polygon
        points={pts(STAR_RIM)}
        fill={`url(#${id}-rim)`}
        stroke={`url(#${id}-rim)`}
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <polygon points={pts(STAR_RIM)} fill="none" stroke={m.line} strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points={pts(STAR_FACE)} fill={`url(#${id}-face)`} stroke={m.light} strokeWidth="5" strokeLinejoin="round" />
      {STAR_FACETS.map((f, k) => (
        <polygon key={k} points={f.points} fill={f.light > 0 ? "#fff" : m.deep} opacity={(Math.abs(f.light) * (f.light > 0 ? 0.55 : 0.4)).toFixed(3)} />
      ))}
      <ellipse cx="33" cy="30" rx="7" ry="4" transform="rotate(-38 33 30)" fill="#fff" opacity="0.85" />
      <circle cx="42" cy="22" r="2" fill="#fff" opacity="0.8" />
    </svg>
  )
}

function RibbonArt({ ribbon }: { ribbon: Ribbon }) {
  const id = React.useId().replace(/:/g, "")
  const r = ribbon
  const band = "M70 40 Q200 -2 330 40 L324 104 Q200 68 76 104Z"
  const tail = "M110 64 C80 60 44 63 6 76 L28 100 L8 127 C46 114 80 112 110 118Z"
  const tailStripe = "M15 117 C48 105 80 102 110 106 L110 111 C80 107 48 110 12.5 121.5Z"
  // Drawn once for the left, mirrored for the right
  const tailArt = (
    <g>
      <path d={tail} fill={`url(#${id}-tail)`} stroke={r.fold} strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" />
      {r.checker && <path d={tail} fill={`url(#${id}-check)`} />}
      <path d={tailStripe} fill={r.stripe} opacity="0.9" />
      <path d={tail} fill={`url(#${id}-tailshade)`} />
      <path d="M76 104 L110 119 L110 96Z" fill={r.fold} />
    </g>
  )
  return (
    <svg viewBox="0 0 400 136" className="rs-ribbon">
      <defs>
        <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={r.top} />
          <stop offset="0.45" stopColor={r.mid} />
          <stop offset="1" stopColor={r.bottom} />
        </linearGradient>
        <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={r.top} />
          <stop offset="0.5" stopColor={r.tail} />
          <stop offset="1" stopColor={r.bottom} />
        </linearGradient>
        {/* Where the tail goes behind the band */}
        <linearGradient id={`${id}-tailshade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${id}-stripe`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={r.stripe} />
          <stop offset="1" stopColor={r.stripeEdge} />
        </linearGradient>
        <pattern id={`${id}-check`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="6" height="6" fill="#fff" opacity="0.09" />
          <rect x="6" y="6" width="6" height="6" fill="#fff" opacity="0.09" />
        </pattern>
      </defs>

      {tailArt}
      <g transform="translate(400 0) scale(-1 1)">{tailArt}</g>

      <path d={band} fill={`url(#${id}-band)`} stroke={r.fold} strokeOpacity="0.45" strokeWidth="1.5" strokeLinejoin="round" />
      {r.checker && <path d={band} fill={`url(#${id}-check)`} />}
      {/* Gloss along the top, the stripe along the bottom */}
      <path d="M80 47 Q200 8 320 47" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <path d="M77 88 Q200 52 323 88 L323.6 95 Q200 59 76.6 95Z" fill={`url(#${id}-stripe)`} />
      <path d="M77 88 Q200 52 323 88" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" />
      <path d="M76 104 Q200 68 324 104" fill="none" stroke={r.fold} strokeOpacity="0.6" strokeWidth="2" />
    </svg>
  )
}

/* ── Confetti ────────────────────────────────────────────────────────── */

/** A seeded spread, so every burst looks the same and render stays pure. */
const CONFETTI = (() => {
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const colors = ["#ffd84a", "#fff3a6", "#f5a70f", "#ffffff", "#ffc928", "#ffe680"]
  return Array.from({ length: 34 }, (_, k) => {
    const angle = (-170 + rand() * 160) * (Math.PI / 180)
    const dist = 22 + rand() * 40
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.8,
      fall: 18 + rand() * 26,
      spin: (rand() > 0.5 ? 1 : -1) * (240 + rand() * 360),
      delay: rand() * 0.25,
      size: 1.4 + rand() * 1.6,
      color: colors[k % colors.length],
      sparkle: k % 4 === 0,
    }
  })
})()

function Confetti() {
  return (
    <div className="rs-confetti">
      {CONFETTI.map((c, k) => (
        <span
          key={k}
          className={c.sparkle ? "rs-spark" : "rs-bit"}
          style={
            {
              "--x": `${c.x.toFixed(2)}cqw`,
              "--y": `${c.y.toFixed(2)}cqw`,
              "--fall": `${c.fall.toFixed(2)}cqw`,
              "--spin": `${c.spin.toFixed(0)}deg`,
              "--d": `${c.delay.toFixed(2)}s`,
              "--s": `${c.size.toFixed(2)}cqw`,
              backgroundColor: c.sparkle ? undefined : c.color,
              color: c.color,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/* ── Ranking ─────────────────────────────────────────────────────────── */

function Row({ row, draw, index }: { row: ResultRow; draw: boolean; index: number }) {
  const gold = row.winner
  const medal: MedalKind = draw ? "tie" : gold ? "gold" : row.place === 2 ? "silver" : row.place === 3 ? "bronze" : "plain"
  // The score goes in the pill; the game's numbers go there too, or under the name when there's a score
  const pill = row.score !== undefined ? [String(row.score)] : row.stats
  const under = row.score !== undefined ? row.stats : undefined
  const level = validLevel(row.level)
  return (
    <li
      className="rs-row"
      data-gold={gold || undefined}
      data-you={row.you || undefined}
      style={{ "--i": index } as React.CSSProperties}
    >
      <span className="rs-tab">
        <Medal kind={medal} place={gold ? 1 : row.place} />
      </span>
      <span className="rs-ava">
        <PlayerAvatarFill player={row} className="size-full" />
        {level && (
          <span className="rs-lv">
            <LevelBadge level={level} />
          </span>
        )}
      </span>
      <span className="rs-who">
        <span className="rs-name">
          {row.name}
          {row.you && <span className="sr-only"> (you)</span>}
          {row.winner && <CrownGlyph />}
        </span>
        {under && <span className="rs-under">{under.join(" · ")}</span>}
      </span>
      {pill && (
        <span className="rs-pill" data-score={row.score !== undefined || undefined}>
          {row.score !== undefined && <PointsGlyph />}
          <span className="flex flex-col leading-[1.1]">
            {pill.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </span>
        </span>
      )}
    </li>
  )
}

type MedalKind = "gold" | "silver" | "bronze" | "plain" | "tie"

const MEDALS: Record<Exclude<MedalKind, "plain">, { hi: string; mid: string; low: string; face: string; ink: string }> = {
  gold: { hi: "#fff2a0", mid: "#ffc21e", low: "#d97f06", face: "#ffd23f", ink: "#a8480a" },
  silver: { hi: "#ffffff", mid: "#bcd6f0", low: "#6f97c4", face: "#dcebfa", ink: "#24548f" },
  bronze: { hi: "#ffe0c2", mid: "#e19a5c", low: "#9c5422", face: "#f0b07a", ink: "#6e2f0c" },
  tie: { hi: "#ffffff", mid: "#cdbcf5", low: "#7d64c4", face: "#e6dcfd", ink: "#4a2f99" },
}

/** The place, struck on a round medal (plain glass from 4th down). */
function Medal({ kind, place }: { kind: MedalKind; place: number }) {
  const id = React.useId().replace(/:/g, "")
  const label = kind === "tie" ? "=" : String(place)
  if (kind === "plain") {
    return (
      <svg viewBox="0 0 40 40" className="rs-medal">
        <circle cx="20" cy="20" r="17" fill="#fff" fillOpacity="0.14" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
        <text x="20" y="26.5" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff">
          {label}
        </text>
      </svg>
    )
  }
  const c = MEDALS[kind]
  return (
    <svg viewBox="0 0 40 40" className="rs-medal">
      <defs>
        <linearGradient id={`${id}-o`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={c.hi} />
          <stop offset="0.5" stopColor={c.mid} />
          <stop offset="1" stopColor={c.low} />
        </linearGradient>
        <linearGradient id={`${id}-i`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={c.mid} />
          <stop offset="1" stopColor={c.face} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="21" r="18" fill="#000" opacity="0.22" />
      <circle cx="20" cy="20" r="18" fill={`url(#${id}-o)`} stroke={c.low} strokeWidth="1" />
      <circle cx="20" cy="20" r="13.2" fill={`url(#${id}-i)`} stroke={c.low} strokeOpacity="0.6" strokeWidth="1" />
      <text x="20" y="27.4" textAnchor="middle" fontSize="19" fontWeight="900" fill="#fff" opacity="0.7">
        {label}
      </text>
      <text x="20" y="26.4" textAnchor="middle" fontSize="19" fontWeight="900" fill={c.ink}>
        {label}
      </text>
      <path d="M30 6.5 l0.9 2.4 2.4 0.9 -2.4 0.9 -0.9 2.4 -0.9 -2.4 -2.4 -0.9 2.4 -0.9z" fill="#fff" />
    </svg>
  )
}

/** A small crown after a winner's name. */
function CrownGlyph() {
  return (
    <svg viewBox="0 0 24 18" className="rs-crown-glyph" role="img" aria-label="Winner">
      <path d="M2 6 L7 10 L12 2 L17 10 L22 6 L20 16 H4Z" fill="#ffd23f" stroke="#a8600a" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="1.8" fill="#ee1f72" />
    </svg>
  )
}

/** A gold star coin in front of a score. */
function PointsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="rs-pts" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#ffd23f" stroke="#c77a06" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="#f0a913" strokeWidth="1.4" />
      <path d="M12 6.6 l1.6 3.3 3.6 0.5 -2.6 2.5 0.6 3.6 -3.2 -1.7 -3.2 1.7 0.6 -3.6 -2.6 -2.5 3.6 -0.5z" fill="#fff6c8" stroke="#c77a06" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Geometry ────────────────────────────────────────────────────────── */

type Pt = readonly [number, number]

function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")

/** A five-point star's corners, tips and valleys, clockwise from the top. */
const starCorners = (R: number, r: number) =>
  Array.from({ length: 10 }, (_, k) => polar(50, 54, k % 2 ? r : R, -90 + k * 36))

const STAR_RIM = starCorners(40, 22)
const STAR_FACE = starCorners(31, 16.5)
/** Each arm split down its spine; lit from the top left. */
const STAR_FACETS = Array.from({ length: 10 }, (_, k) => {
  const tip = STAR_FACE[(k >> 1) * 2]
  const valley = STAR_FACE[k % 2 ? ((k >> 1) * 2 + 1) % 10 : ((k >> 1) * 2 + 9) % 10]
  const mx = (tip[0] + valley[0] + 50) / 3 - 50
  const my = (tip[1] + valley[1] + 54) / 3 - 54
  const light = Math.cos(Math.atan2(my, mx) - (-135 * Math.PI) / 180)
  return { points: pts([[50, 54], tip, valley]), light }
})

/* ── Styles ──────────────────────────────────────────────────────────── */

/** Layout, art placement and motion, once per page. */
function ResultStyles() {
  return (
    <style>{`
.rs-root{position:fixed;inset:0;z-index:45;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;color:#fff;background:#0a1c26;--t:1;color-scheme:dark}
.rs-root:not([data-fresh]){--t:.45}
.rs-root[data-tone=lose]{background:#0c1830}
.rs-root[data-tone=draw]{background:#140f2c}
.rs-bg{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.rs-bg-logo{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;transform:translate(-50%,-50%);filter:blur(36px) saturate(1.2);opacity:.6}
.rs-bg-scrim{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 30%,rgb(var(--rs-glow)/.16),transparent 70%),linear-gradient(rgb(6 16 24/.62),rgb(6 14 22/.78))}
.rs-root[data-tone=lose] .rs-bg-scrim{background:radial-gradient(ellipse 80% 55% at 50% 25%,rgb(40 110 230/.35),transparent 70%),linear-gradient(rgb(8 18 44/.7),rgb(10 10 22/.85))}
.rs-root[data-tone=draw] .rs-bg-scrim{background:radial-gradient(ellipse 80% 55% at 50% 25%,rgb(140 90 255/.28),transparent 70%),linear-gradient(rgb(20 12 44/.7),rgb(12 8 26/.85))}
.rs-col{position:relative;margin:0 auto;display:flex;min-height:100%;width:100%;max-width:28rem;flex-direction:column;padding:max(env(safe-area-inset-top),.6rem) 1rem max(env(safe-area-inset-bottom),.5rem);container-type:inline-size}
.rs-top{display:flex;align-items:center;gap:.4rem;font-size:.72rem;font-weight:800;letter-spacing:.02em;color:rgb(255 255 255/.6);min-width:0}
.rs-main{margin:auto 0;display:flex;flex-direction:column;align-items:center;padding:.4rem 0 .6rem}

/* Crown, stars and ribbon, placed in units of the hero's width */
.rs-hero{position:relative;width:min(100%,26rem,52svh);aspect-ratio:100/59;container-type:inline-size;margin-top:1svh}
.rs-root[data-many] .rs-hero{width:min(100%,24rem,40svh)}
.rs-rays-box{position:absolute;left:calc(50% - 50vw);top:-55cqw;width:100vw;height:150cqw;overflow:hidden;pointer-events:none}
.rs-glow,.rs-rays{position:absolute;left:50%;top:71cqw;border-radius:50%}
.rs-glow{width:115cqw;height:78cqw;transform:translate(-50%,-50%);background:radial-gradient(closest-side,rgb(var(--rs-glow)/.95),rgb(var(--rs-glow)/.7) 32%,rgb(var(--rs-glow)/.22) 62%,transparent);animation:rs-fade calc(.6s*var(--t)) ease-out both}
.rs-rays{width:160cqw;height:160cqw;margin:-80cqw 0 0 -80cqw;background:repeating-conic-gradient(from 4deg,rgb(var(--rs-glow)/.5) 0 15deg,transparent 15deg 40deg);-webkit-mask:radial-gradient(closest-side,#000 12%,rgb(0 0 0/.4) 36%,transparent 54%);mask:radial-gradient(closest-side,#000 12%,rgb(0 0 0/.4) 36%,transparent 54%);animation:rs-fade calc(.8s*var(--t)) ease-out both,rs-spin 60s linear infinite}
.rs-root[data-tone=lose] .rs-rays,.rs-root[data-tone=draw] .rs-rays{opacity:.55}
.rs-crown{position:absolute;left:29cqw;top:1.5cqw;width:42cqw;filter:drop-shadow(0 1.2cqw 1.6cqw rgb(0 0 0/.35));animation:rs-drop calc(.75s*var(--t)) cubic-bezier(.3,1.4,.5,1) calc(.22s*var(--t)) both}
.rs-star{position:absolute;top:14cqw;width:19.5cqw;filter:drop-shadow(0 .8cqw 1cqw rgb(0 0 0/.3))}
.rs-star-l{left:9cqw;--r:-16deg;animation:rs-pop calc(.6s*var(--t)) cubic-bezier(.3,1.5,.5,1) calc(.5s*var(--t)) both}
.rs-star-r{right:9cqw;--r:16deg;animation:rs-pop calc(.6s*var(--t)) cubic-bezier(.3,1.5,.5,1) calc(.6s*var(--t)) both}
.rs-ribbon{position:absolute;left:0;top:25cqw;width:100cqw;filter:drop-shadow(0 1cqw 1.4cqw rgb(0 0 0/.35));animation:rs-unfurl calc(.5s*var(--t)) cubic-bezier(.2,.8,.3,1) both}
.rs-title{position:absolute;left:0;right:0;top:31.4cqw;height:15.5cqw;display:flex;align-items:center;justify-content:center;font-weight:900;line-height:1;letter-spacing:.01em;white-space:nowrap;color:#fff;animation:rs-title calc(.55s*var(--t)) cubic-bezier(.3,1.5,.5,1) calc(.3s*var(--t)) both}
.rs-note{margin-top:.1rem;max-width:100%;text-align:center;font-size:.8rem;font-weight:800;color:rgb(255 255 255/.78);animation:rs-up calc(.4s*var(--t)) ease-out calc(.6s*var(--t)) both}

/* Confetti: a burst from the crown that drifts down and fades */
.rs-confetti{position:absolute;left:50cqw;top:16cqw;width:0;height:0;pointer-events:none}
.rs-bit,.rs-spark{position:absolute;left:0;top:0;width:var(--s);height:calc(var(--s)*.55);border-radius:1px;opacity:0;animation:rs-burst 1.7s cubic-bezier(.15,.7,.35,1) calc(.45s + var(--d)) backwards}
.rs-spark{width:calc(var(--s)*1.6);height:calc(var(--s)*1.6);background:currentColor;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)}

/* Rows */
.rs-rows{margin-top:.7rem;display:flex;width:100%;flex-direction:column;gap:.5rem;--rh:clamp(3rem,21cqw,5.25rem)}
.rs-root[data-many] .rs-rows{gap:.35rem;--rh:clamp(2.5rem,min(15cqw,7svh),4rem)}
.rs-row{position:relative;display:flex;height:var(--rh);align-items:center;gap:calc(var(--rh)*.16);padding-right:calc(var(--rh)*.18);border-radius:calc(var(--rh)*.2);border:2px solid rgb(120 236 220/.55);background:linear-gradient(rgb(84 214 196/.62),rgb(46 168 154/.55));box-shadow:inset 0 1px 0 rgb(255 255 255/.25),0 .3rem .8rem rgb(0 0 0/.25);overflow:hidden;animation:rs-up calc(.45s*var(--t)) cubic-bezier(.2,.8,.3,1) calc((.72s + var(--i)*.09s)*var(--t)) both}
.rs-row[data-gold]{border-color:#c49a12;background:linear-gradient(#fde45f,#ffdd6a 45%,#f5c51f);box-shadow:inset 0 2px 0 rgb(255 255 255/.55),inset 0 -2px 0 rgb(190 130 0/.35),0 .3rem .8rem rgb(0 0 0/.25)}
.rs-row[data-gold]::before{content:"";position:absolute;inset:0;background:repeating-conic-gradient(rgb(255 255 255/.32) 0 25%,transparent 0 50%) 0 0/calc(var(--rh)*.2) calc(var(--rh)*.2);-webkit-mask:linear-gradient(100deg,#000 0,rgb(0 0 0/.5) 30%,transparent 60%),linear-gradient(#000,transparent 85%);-webkit-mask-composite:source-in;mask:linear-gradient(100deg,#000 0,rgb(0 0 0/.5) 30%,transparent 60%) intersect,linear-gradient(#000,transparent 85%);pointer-events:none}
.rs-row[data-you]{border-color:#fff46a;box-shadow:0 0 0 1px rgb(255 244 106/.6),0 0 .9rem rgb(255 236 80/.7),inset 0 0 .5rem rgb(255 244 106/.35)}
.rs-tab{position:relative;display:flex;height:100%;width:calc(var(--rh)*1.02);flex-shrink:0;align-items:center;justify-content:center;background:rgb(140 240 226/.38);border-right:2px solid rgb(20 120 108/.35)}
.rs-row[data-gold] .rs-tab{background:linear-gradient(#ffd22e,#f7bf14);border-right-color:rgb(190 135 0/.45)}
.rs-medal{width:calc(var(--rh)*.62);height:calc(var(--rh)*.62);filter:drop-shadow(0 1px 1px rgb(0 0 0/.25))}
.rs-ava{position:relative;flex-shrink:0;width:calc(var(--rh)*.74);height:calc(var(--rh)*.74);border-radius:9999px;padding:calc(var(--rh)*.05);background:linear-gradient(#63e8ad,#0f8a5a);box-shadow:0 0 0 1.5px rgb(0 70 45/.55),0 2px 4px rgb(0 0 0/.25)}
.rs-lv{position:absolute;right:calc(var(--rh)*-.1);bottom:calc(var(--rh)*-.08);z-index:1;display:flex;width:max(19px,calc(var(--rh)*.38));aspect-ratio:40/46}
.rs-ava [data-slot=avatar]{box-shadow:0 0 0 1px rgb(0 60 40/.5)}
.rs-who{position:relative;display:flex;min-width:0;flex:1;flex-direction:column}
.rs-name{display:flex;min-width:0;align-items:center;gap:.3em;font-size:clamp(.85rem,calc(var(--rh)*.27),1.15rem);font-weight:900;line-height:1.15;color:#d2fffb;text-shadow:0 1px 0 rgb(0 70 64/.9),0 0 3px rgb(0 60 55/.6)}
.rs-name{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:block}
.rs-row[data-gold] .rs-name{color:#fff;text-shadow:0 1px 0 rgb(170 100 0/.95),0 0 3px rgb(170 100 0/.7)}
.rs-crown-glyph{display:inline-block;width:1.05em;height:.8em;margin-left:.3em;vertical-align:-.02em;filter:drop-shadow(0 1px 0 rgb(0 0 0/.25))}
.rs-under{font-size:.68rem;font-weight:800;color:rgb(255 255 255/.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-row[data-gold] .rs-under{color:rgb(120 70 0/.85)}
.rs-pill{position:relative;display:flex;flex-shrink:0;align-items:center;gap:.3rem;border-radius:9999px;padding:.22rem .6rem;font-size:clamp(.66rem,calc(var(--rh)*.18),.8rem);font-weight:900;text-align:right;white-space:nowrap;color:#fff;background:rgb(0 60 58/.42);box-shadow:inset 0 1px 2px rgb(0 0 0/.25)}
.rs-pill[data-score]{padding:.22rem .7rem .22rem .22rem;font-size:clamp(.85rem,calc(var(--rh)*.24),1.05rem)}
.rs-row[data-gold] .rs-pill{background:linear-gradient(#f0a414,#f5ae1c);box-shadow:inset 0 1px 2px rgb(150 80 0/.45)}
.rs-pts{width:1.35em;height:1.35em;flex-shrink:0}

/* The two big buttons */
.rs-btns{margin-top:1.1rem;display:grid;width:100%;grid-template-columns:1fr 1fr;gap:.8rem;animation:rs-up calc(.45s*var(--t)) cubic-bezier(.2,.8,.3,1) calc((.85s + var(--i)*.09s)*var(--t)) both}
.rs-btn{position:relative;display:flex;height:clamp(3rem,15cqw,3.6rem);align-items:center;justify-content:center;gap:.4rem;border-radius:.9rem;font-size:clamp(1.1rem,6.2cqw,1.55rem);font-weight:900;letter-spacing:.01em;white-space:nowrap;border:1.5px solid var(--rim);background:linear-gradient(var(--top),var(--bot));color:var(--ink);text-shadow:0 1px 0 rgb(255 255 255/.55);box-shadow:inset 0 2px 0 rgb(255 255 255/.6),inset 0 -.25rem 0 rgb(0 0 0/.06),0 .3rem 0 var(--edge),0 .55rem .9rem rgb(0 0 0/.35);transition:transform .08s,box-shadow .08s,filter .15s;-webkit-tap-highlight-color:transparent;cursor:pointer;outline:none}
.rs-btn::before{content:"";position:absolute;left:.35rem;right:.35rem;top:.2rem;height:42%;border-radius:.7rem .7rem .5rem .5rem;background:linear-gradient(rgb(255 255 255/.5),rgb(255 255 255/.08));pointer-events:none}
.rs-btn:hover{filter:brightness(1.05)}
.rs-btn:active:not(:disabled){transform:translateY(.22rem);box-shadow:inset 0 2px 0 rgb(255 255 255/.6),0 .08rem 0 var(--edge),0 .2rem .4rem rgb(0 0 0/.3)}
.rs-btn:focus-visible{box-shadow:0 0 0 3px #fff,inset 0 2px 0 rgb(255 255 255/.6),0 .3rem 0 var(--edge)}
.rs-btn-teal{--top:#43f5c4;--bot:#1fc79e;--edge:#0d8d6e;--rim:#17b58d;--ink:#05775d}
.rs-btn-gold{--top:#fff466;--bot:#ffd00a;--edge:#d39500;--rim:#f2be00;--ink:#a8710a}
.rs-btn:disabled{cursor:default}
.rs-btn[data-off]{filter:saturate(.35) brightness(.85);opacity:.75}
.rs-wait{margin-top:.75rem;font-size:.75rem;font-weight:800;text-align:center;color:rgb(255 255 255/.65);animation:rs-up calc(.4s*var(--t)) ease-out calc(1.1s*var(--t)) both}

/* Stickers: there, but quiet */
.rs-stickers{margin:0 -.5rem;opacity:.85;animation:rs-fade calc(.5s*var(--t)) ease-out calc(1.2s*var(--t)) both}
.rs-stickers [role=toolbar]>:first-child{margin-left:auto}
.rs-stickers [role=toolbar]>:last-child{margin-right:auto}
.rs-stickers button{width:2.25rem;height:2.25rem;font-size:1.05rem;border-color:rgb(255 255 255/.12);background:rgb(255 255 255/.07);color:#fde68a}
.rs-stickers button:hover{background:rgb(255 255 255/.14)}

@keyframes rs-fade{from{opacity:0}}
@keyframes rs-spin{to{transform:rotate(360deg)}}
@keyframes rs-drop{0%{opacity:0;transform:translateY(-60%) scale(.9)}35%{opacity:1}70%{transform:translateY(4%) scale(1.02,.97)}85%{transform:translateY(-2%)}100%{transform:none}}
@keyframes rs-pop{0%{opacity:0;transform:scale(0) rotate(calc(var(--r) - 200deg))}70%{opacity:1;transform:scale(1.15) rotate(calc(var(--r) + 8deg))}100%{transform:rotate(var(--r))}}
@keyframes rs-unfurl{0%{clip-path:inset(0 50% 0 50%);transform:scaleY(.7)}60%{transform:scaleY(1.04)}100%{clip-path:inset(0 0 0 0);transform:none}}
@keyframes rs-title{0%{opacity:0;transform:scale(.3)}100%{opacity:1;transform:none}}
@keyframes rs-up{0%{opacity:0;transform:translateY(1.2rem)}100%{opacity:1;transform:none}}
@keyframes rs-burst{0%{opacity:0;transform:translate(0,0) rotate(0) scale(.4)}8%{opacity:1}40%{opacity:1;transform:translate(var(--x),var(--y)) rotate(calc(var(--spin)*.5)) scale(1)}100%{opacity:0;transform:translate(calc(var(--x)*1.15),calc(var(--y) + var(--fall))) rotate(var(--spin)) scale(.8)}}
@media (prefers-reduced-motion:reduce){.rs-root *,.rs-root *::before{animation:none!important;transition:none!important}.rs-star-l{transform:rotate(-16deg)}.rs-star-r{transform:rotate(16deg)}.rs-confetti{display:none}}
`}</style>
  )
}
