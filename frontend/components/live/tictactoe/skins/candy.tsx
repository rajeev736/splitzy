"use client"

import { useId, type CSSProperties, type ReactNode } from "react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"
import type { Mark, TttSceneProps, TttSeat } from "./types"

/**
 * Candy: squishy glossy X's and O's with googly eyes on a deep purple table,
 * a stitched board whose winning tiles turn yellow, and a teal flower mascot.
 * Everything is vector (SVG + CSS gradients) and sized in container units, so
 * it stays crisp and in proportion from a 288px phone to a 30rem column.
 * Narrow: both cards above the board. Wide (≥440px): cards beside the board.
 */
export default function CandyScene({ board, winLine, lastMove, canPlay, onPlay, me, opponent, status, tone, round, bestOf, toWin }: TttSceneProps) {
  const ghost = canPlay ? me.mark : null
  const looking = me.active ? "is-look-me" : opponent.active ? "is-look-opp" : ""

  return (
    <div className="ttt-candy-root">
      <style>{CSS}</style>
      <div className={cn("ttt-candy-scene", `is-${tone}`)}>
        <Backdrop />
        <div className="ttt-candy-stage" aria-hidden />

        <div className="ttt-candy-mid">
          <Logo />
          <p className="ttt-candy-round">
            Round {Math.min(round, bestOf)} of {bestOf}
          </p>
          <p className={cn("ttt-candy-cue-mid", me.active ? "is-me" : opponent.active ? "is-opp" : "is-none")} aria-hidden>
            <Chevron />
            <span>{me.active ? "Your turn" : "Their turn"}</span>
          </p>
        </div>

        <Seat seat={me} you toWin={toWin} />
        <Seat seat={opponent} toWin={toWin} />

        <div className="ttt-candy-board">
          <svg className="ttt-candy-stitch" aria-hidden>
            <rect x="0" y="0" width="100%" height="100%" rx="8.5%" />
          </svg>
          <div className="ttt-candy-cells" role="grid" aria-label="Board">
            {Array.from(board).map((cell, i) => {
              const empty = cell === "."
              const k = winLine ? winLine.indexOf(i) : -1
              const r = Math.floor(i / 3)
              const c = i % 3
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  aria-label={empty ? `Square ${i + 1}, empty` : `Square ${i + 1}, ${cell.toUpperCase()}`}
                  disabled={!canPlay || !empty}
                  onClick={() => onPlay(i)}
                  className={cn("ttt-candy-cell", (r + c) % 2 ? "is-odd" : "is-even", k >= 0 && "is-win", empty && canPlay && "is-open")}
                  style={{ "--k": Math.max(k, 0), "--i": i } as CSSProperties}
                >
                  {k >= 0 && <Sparkles />}
                  {!empty && (
                    <span className={cn("ttt-candy-piece", lastMove === i && "is-new")}>
                      <CandyMark mark={cell as Mark} />
                    </span>
                  )}
                  {empty && ghost && (
                    <span className="ttt-candy-ghost" aria-hidden>
                      <CandyMark mark={ghost} />
                    </span>
                  )}
                </button>
              )
            })}
            <svg className="ttt-candy-lines" aria-hidden>
              <line x1="33.333%" y1="0" x2="33.333%" y2="100%" />
              <line x1="66.667%" y1="0" x2="66.667%" y2="100%" />
              <line x1="0" y1="33.333%" x2="100%" y2="33.333%" />
              <line x1="0" y1="66.667%" x2="100%" y2="66.667%" />
            </svg>
          </div>
        </div>

        <p className="ttt-candy-status" aria-live="polite">
          <span>{status}</span>
        </p>

        <Mascot className={looking} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ players */

function Seat({ seat, you, toWin }: { seat: TttSeat; you?: boolean; toWin: number }) {
  const label = seat.away ? "Away" : seat.mark === "x" ? "Player 1" : seat.mark === "o" ? "Player 2" : "Player"
  const slots = Math.min(Math.max(toWin, seat.wins), 5)
  return (
    <div className={cn("ttt-candy-seat", you ? "is-me" : "is-opp", seat.active && "is-active", seat.away && "is-away")}>
      <p className="ttt-candy-cue" aria-hidden>
        <Chevron />
        <span>{you ? "Your turn" : "Their turn"}</span>
      </p>
      <div className="ttt-candy-card">
        <span className="ttt-candy-avatar">
          <UserAvatar src={seat.photo} name={seat.name} size="lg" className="size-full text-[length:inherit]" />
        </span>
        <p className="ttt-candy-label">{label}</p>
        <p className="ttt-candy-name" title={seat.name}>
          {seat.name}
        </p>
        <span className="ttt-candy-cardmark">{seat.mark && <CandyMark mark={seat.mark} />}</span>
      </div>
      <div className="ttt-candy-tally" role="img" aria-label={`${seat.name}: ${seat.wins} ${seat.wins === 1 ? "win" : "wins"}`}>
        {Array.from({ length: slots }, (_, i) => (
          <TallyMark key={i} mark={seat.mark ?? "x"} won={i < seat.wins} />
        ))}
        {seat.wins > slots && <span className="ttt-candy-tally-more">{seat.wins}</span>}
      </div>
    </div>
  )
}

function TallyMark({ mark, won }: { mark: Mark; won: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("ttt-candy-tick", won && "is-won")}>
      {mark === "x" ? <path d="M5 5 15 15M15 5 5 15" /> : <circle cx="10" cy="10" r="5.6" />}
    </svg>
  )
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" className="ttt-candy-chevron">
      <path d="M4.5 3.5h4.2l6 6.5-6 6.5H4.5l6-6.5z" />
    </svg>
  )
}

/* -------------------------------------------------------------------- marks */

const svgId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "")

/** A glossy, squishy X or O with googly eyes. */
function CandyMark({ mark }: { mark: Mark }) {
  const id = svgId(useId())
  return mark === "x" ? (
    <svg viewBox="-4 -4 108 108" className="ttt-candy-mark is-x">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="14" x2="0" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff7aac" />
          <stop offset=".42" stopColor="#ee4a85" />
          <stop offset="1" stopColor="#c81d57" />
        </linearGradient>
        <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <path d="M25 25 75 75M75 25 25 75" stroke="#a3123f" strokeWidth="23" strokeLinecap="round" transform="translate(0 1.6)" />
      <path d="M25 25 75 75M75 25 25 75" stroke={`url(#${id}b)`} strokeWidth="21" strokeLinecap="round" />
      <path
        d="M25 25 75 75M75 25 25 75"
        stroke="#ffa3cb"
        strokeOpacity=".7"
        strokeWidth="8"
        strokeLinecap="round"
        transform="translate(-1.2 -2.8)"
        filter={`url(#${id}f)`}
      />
      <path d="M21.5 25.5 24.5 22.5M78.5 25.5 75.5 22.5" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" />
      <path d="M30.5 28.5 71.5 69.5M69.5 28.5 28.5 69.5" stroke="#fff" strokeOpacity=".9" strokeWidth="1.9" strokeLinecap="round" strokeDasharray="4.5 6" />
      <Eye cx={39.5} cy={40} r={8} px={1.3} py={1.1} />
      <Eye cx={60.5} cy={40} r={8} px={-1.1} py={1.1} />
      <path d="M47.6 48.2q2.4 2.4 4.8 0" stroke="#5c0a2a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  ) : (
    <svg viewBox="-4 -4 108 108" className="ttt-candy-mark is-o">
      <defs>
        <radialGradient id={`${id}b`} cx="50" cy="57" r="34.5" gradientUnits="userSpaceOnUse">
          <stop offset=".42" stopColor="#0a56b8" />
          <stop offset=".52" stopColor="#1b8fee" />
          <stop offset=".66" stopColor="#43d6ff" />
          <stop offset=".8" stopColor="#25b5f8" />
          <stop offset=".93" stopColor="#127bdc" />
          <stop offset="1" stopColor="#0b55b4" />
        </radialGradient>
        <linearGradient id={`${id}t`} x1="0" y1="22" x2="0" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".42" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset=".7" stopColor="#0a2a8c" stopOpacity="0" />
          <stop offset="1" stopColor="#0a2a8c" stopOpacity=".4" />
        </linearGradient>
        <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation=".8" />
        </filter>
      </defs>
      <circle cx="50" cy="57" r="24.5" fill="none" stroke={`url(#${id}b)`} strokeWidth="20" />
      <circle cx="50" cy="57" r="24.5" fill="none" stroke={`url(#${id}t)`} strokeWidth="20" />
      <path d="M28.5 58A21.5 21.5 0 0 1 40 38.2" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="3.4" strokeLinecap="round" filter={`url(#${id}f)`} />
      <circle cx="61" cy="80.5" r="1.6" fill="#fff" fillOpacity=".55" />
      <Eye cx={39} cy={28} r={7.8} px={0.4} py={0.8} />
      <Eye cx={61} cy={28} r={7.8} px={-0.4} py={0.8} />
      <path d="M47.8 34.4q2.2 2.2 4.4 0" stroke="#082c6b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** A googly eye: white ball, black pupil (which wobbles), a glint. */
function Eye({ cx, cy, r, px, py }: { cx: number; cy: number; r: number; px: number; py: number }) {
  return (
    <g className="ttt-candy-eye">
      <circle cx={cx} cy={cy + r * 0.12} r={r} fill="#1d0630" fillOpacity=".35" />
      <circle cx={cx} cy={cy} r={r} fill="#fff" />
      <path d={`M${cx - r * 0.85} ${cy + r * 0.3}a${r} ${r} 0 0 0 ${r * 1.7} 0`} fill="none" stroke="#c9c0de" strokeWidth={r * 0.18} strokeLinecap="round" />
      <g className="ttt-candy-pupil">
        <circle cx={cx + px} cy={cy + py} r={r * 0.6} fill="#120a1c" />
        <circle cx={cx + px - r * 0.2} cy={cy + py - r * 0.24} r={r * 0.18} fill="#fff" />
      </g>
    </g>
  )
}

function Sparkles() {
  return (
    <span className="ttt-candy-sparkles" aria-hidden>
      {[0, 1, 2].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className="ttt-candy-sparkle">
          <path d="M10 0c.9 6 3.4 8.6 10 10-6.6 1.4-9.1 4-10 10-.9-6-3.4-8.6-10-10 6.6-1.4 9.1-4 10-10z" />
        </svg>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------- decorations */

const LETTERS: Record<string, ReactNode> = {
  T: <path d="M.6.6h6.2M3.7.6v7" />,
  I: <path d="M3.5.6v7" />,
  C: <path d="M6.2 1.5A3.5 3.5 0 1 0 6.2 6.7" />,
  A: <path d="M.7 7.6 3.6.6l2.9 7M1.8 5.1h3.6" />,
  O: <ellipse cx="3.6" cy="4.1" rx="3" ry="3.5" />,
  E: <path d="M6.1.6H1.2v7h4.9M1.2 4.1H5.4" />,
}

/** Left and right edges of each letter's centre line, to space a row evenly. */
const EDGES: Record<string, [number, number]> = { T: [0.6, 6.8], I: [3.5, 3.5], C: [0.36, 6.2], A: [0.7, 6.5], O: [0.6, 6.6], E: [1.2, 6.1] }
/** Where the little glint sits on each letter. */
const GLINTS: Record<string, [number, number]> = { T: [1.5, 0.6], I: [3.5, 1.4], C: [1.4, 2.2], A: [3, 1.8], O: [1.2, 2.6], E: [1.2, 1.6] }

/** The "TIC TAC TOE" sticker: monoline candy letters in a stitched box. */
function Logo() {
  const rows = ["TIC", "TAC", "TOE"]
  return (
    <svg viewBox="0 0 40 40" className="ttt-candy-logo" role="img" aria-label="Tic Tac Toe">
      <rect x="1" y="1" width="38" height="38" rx="6" className="ttt-candy-logo-box" />
      {rows.map((word, r) => {
        const gap = 3.7
        const width = Array.from(word).reduce((w, ch) => w + EDGES[ch][1] - EDGES[ch][0], 0) + gap * (word.length - 1)
        let x = 20 - width / 2
        return Array.from(word).map((ch, c) => {
          const pink = (r + c) % 2 === 0
          const left = x - EDGES[ch][0]
          x += EDGES[ch][1] - EDGES[ch][0] + gap
          return (
            <g key={`${r}${c}`} transform={`translate(${left} ${6.2 + r * 9.8})`}>
              <g className="ttt-candy-logo-shadow">{LETTERS[ch]}</g>
              <g className={pink ? "ttt-candy-logo-pink" : "ttt-candy-logo-cyan"}>{LETTERS[ch]}</g>
              <circle cx={GLINTS[ch][0]} cy={GLINTS[ch][1]} r=".42" fill="#fff" fillOpacity=".85" />
            </g>
          )
        })
      })}
    </svg>
  )
}

/** The teal flower friend in the corner. Its eyes follow whoever's turn it is. */
function Mascot({ className }: { className?: string }) {
  const id = svgId(useId())
  const petals = [0, 1, 2, 3, 4, 5].map((n) => {
    const a = ((n * 60 - 75) * Math.PI) / 180
    return { x: 60 + Math.cos(a) * 25, y: 60 + Math.sin(a) * 25, a }
  })
  const body = (
    <>
      <circle cx="60" cy="60" r="28" />
      {petals.map((p, n) => (
        <circle key={n} cx={p.x} cy={p.y} r="20" />
      ))}
    </>
  )
  return (
    <div className={cn("ttt-candy-mascot", className)} aria-hidden>
      <svg viewBox="0 0 120 126">
        <defs>
          <radialGradient id={`${id}b`} cx="44" cy="36" r="80" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6ffff4" />
            <stop offset=".3" stopColor="#12e0cc" />
            <stop offset=".72" stopColor="#00bba9" />
            <stop offset="1" stopColor="#008a8e" />
          </radialGradient>
          <linearGradient id={`${id}s`} x1="0" y1="20" x2="0" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset=".55" stopColor="#004a66" stopOpacity="0" />
            <stop offset="1" stopColor="#004a66" stopOpacity=".38" />
          </linearGradient>
          <filter id={`${id}f`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <ellipse cx="62" cy="112" rx="40" ry="7" fill="#12003a" fillOpacity=".45" filter={`url(#${id}f)`} />
        <g className="ttt-candy-mascot-body">
          <g fill={`url(#${id}b)`}>{body}</g>
          <g fill={`url(#${id}s)`}>{body}</g>
          <path d="M38 22q8-6 16-4" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" fill="none" />
          {petals.map((p, n) =>
            n === 0 || n === 5 ? null : (
              <line
                key={n}
                x1={60 + Math.cos(p.a + 0.2) * 30}
                y1={60 + Math.sin(p.a + 0.2) * 30}
                x2={60 + Math.cos(p.a + 0.2) * 37}
                y2={60 + Math.sin(p.a + 0.2) * 37}
                stroke="#fff"
                strokeOpacity=".92"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
            )
          )}
          <line x1="45" y1="27" x2="47" y2="34" stroke="#fff" strokeOpacity=".92" strokeWidth="3.4" strokeLinecap="round" />
          <g className="ttt-candy-mascot-eyes">
            <Eye cx={47} cy={66} r={10} px={1.5} py={0.8} />
            <Eye cx={72} cy={52} r={12} px={1.6} py={1} />
          </g>
          <path d="M57 72.5q4 4 8 0" stroke="#043c3c" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  )
}

/** Faint stitched x's and o's plus dashed doodle lines behind everything. */
function Backdrop() {
  return (
    <div className="ttt-candy-backdrop" aria-hidden>
      <svg className="ttt-candy-doodle is-narrow" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M-2 86C14 80 22 97 40 95S70 84 84 90 96 99 102 97" />
        <path d="M76 -2C76 4 80 6 86 6S98 4 102 9" />
      </svg>
      <svg className="ttt-candy-doodle is-wide" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M48 -2C48 6 52 9 58 9S70 6 72 -2" />
        <path d="M102 40C93 40 90 45 90 53V78C90 87 86 89 78 89H42C28 89 18 91 12 102" />
      </svg>
      <XoRow className="ttt-candy-xo is-a" />
      <XoRow className="ttt-candy-xo is-b" />
      <XoRow className="ttt-candy-xo is-c" />
    </div>
  )
}

function XoRow({ className }: { className: string }) {
  const shape = "M6 6 30 30M30 6 6 30M58 18a12 12 0 1 0 24 0 12 12 0 1 0-24 0M110 6l24 24M134 6l-24 24M162 18a12 12 0 1 0 24 0 12 12 0 1 0-24 0"
  return (
    <svg viewBox="0 0 192 36" className={className}>
      <path d={shape} className="ttt-candy-xo-fill" />
      <path d={shape} className="ttt-candy-xo-stitch" />
    </svg>
  )
}

/* --------------------------------------------------------------------- CSS */

const CSS = `
.ttt-candy-root{container:ttt-candy/inline-size;width:100%;max-width:30rem;margin-inline:auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.ttt-candy-scene{--fs-label:max(10px,2.9cqw);--fs-name:max(11px,3.7cqw);position:relative;isolation:isolate;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) 25cqw minmax(0,1fr);grid-template-areas:"me mid opp" "board board board" "status status status";column-gap:2.4cqw;row-gap:2cqw;padding:2.4cqw 3cqw 2.4cqw;border-radius:5cqw;color:#fff;background:radial-gradient(70% 45% at 50% 58%,#5a1dc6 0%,#4a18a8 45%,transparent 80%),linear-gradient(180deg,#3b1489,#39137f);box-shadow:inset 0 0 0 1px #ffffff14}
.ttt-candy-stage{position:absolute;z-index:-1;inset:1.6cqw 1.6cqw 11cqw;border-radius:4cqw;background:linear-gradient(170deg,#4d1aac 0%,#4417a0 55%,#42169a 100%);box-shadow:0 1.2cqw 3cqw #12003a59,inset 0 1px 0 #ffffff14}
.ttt-candy-backdrop{position:absolute;inset:0;z-index:-2;pointer-events:none}
.ttt-candy-doodle{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.ttt-candy-doodle path{fill:none;stroke:#fff;stroke-opacity:.8;stroke-width:1.7px;stroke-dasharray:6 6;stroke-linecap:round;vector-effect:non-scaling-stroke}
.ttt-candy-doodle.is-wide{display:none}
.ttt-candy-xo{position:absolute;width:44cqw;height:auto;overflow:visible}
.ttt-candy-xo-fill{fill:none;stroke:#7a4fe0;stroke-opacity:.2;stroke-width:9;stroke-linecap:round}
.ttt-candy-xo-stitch{fill:none;stroke:#2a0b6e;stroke-opacity:.28;stroke-width:1.4;stroke-dasharray:1.5 3.5;stroke-linecap:round}
.ttt-candy-xo.is-a{right:-6cqw;bottom:1cqw;transform:rotate(-4deg)}
.ttt-candy-xo.is-b{left:-14cqw;bottom:-3cqw;transform:rotate(3deg)}
.ttt-candy-xo.is-c{display:none}

.ttt-candy-mid{grid-area:mid;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2cqw;min-width:0}
.ttt-candy-logo{width:18cqw;height:auto;display:block;filter:drop-shadow(0 .6cqw .8cqw #12003a66)}
.ttt-candy-logo-box{fill:#ffffff0d;stroke:#9c7ae6;stroke-opacity:.75;stroke-width:.7;stroke-dasharray:2 1.7;stroke-linecap:round}
.ttt-candy-logo g g,.ttt-candy-logo-shadow{fill:none;stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round}
.ttt-candy-logo-shadow{stroke:#1c0552;stroke-opacity:.55;transform:translateY(.7px)}
.ttt-candy-logo-pink{stroke:#ff6a92}
.ttt-candy-logo-cyan{stroke:#3ccfff}
.ttt-candy-round{margin:0;font-size:max(10px,2.6cqw);line-height:1.1;font-weight:700;color:#cbb8ff;white-space:nowrap}
.ttt-candy-cue,.ttt-candy-cue-mid{display:flex;align-items:center;gap:.8cqw;margin:0;font-size:max(10px,2.9cqw);line-height:1;font-weight:800;color:#fff;white-space:nowrap}
.ttt-candy-cue-mid.is-none{visibility:hidden}
.ttt-candy-cue-mid.is-me{flex-direction:row}
.ttt-candy-cue-mid.is-me .ttt-candy-chevron{transform:scaleX(-1);animation-name:ttt-candy-nudge-l}
.ttt-candy-cue-mid.is-opp{flex-direction:row-reverse}
.ttt-candy-chevron{width:1.15em;height:1.15em;flex:none;fill:#fff;animation:ttt-candy-nudge 1.1s ease-in-out infinite}
.ttt-candy-cue{display:none}

.ttt-candy-seat{position:relative;display:flex;flex-direction:column;align-items:stretch;min-width:0;padding-top:5.5cqw}
.ttt-candy-seat.is-me{grid-area:me}
.ttt-candy-seat.is-opp{grid-area:opp}
.ttt-candy-card{position:relative;display:flex;flex-direction:column;align-items:center;padding:6.8cqw 1.6cqw 2.4cqw;border-radius:4.2cqw;background:linear-gradient(180deg,#22075a5c,#22075a40);box-shadow:inset 0 0 0 1px #ffffff12;transition:background .35s,box-shadow .35s,transform .35s cubic-bezier(.3,1.5,.5,1),opacity .3s}
.ttt-candy-seat.is-active .ttt-candy-card{background:linear-gradient(180deg,#a582ff70,#8f68f257);box-shadow:inset 0 0 0 1.5px #ffffff59,0 0 0 .8cqw #fed64326,0 1cqw 4cqw #b48cff66;transform:translateY(-.6cqw);animation:ttt-candy-glow 1.8s ease-in-out infinite}
.ttt-candy-seat.is-away .ttt-candy-card{opacity:.55}
.ttt-candy-seat.is-away .ttt-candy-avatar{filter:grayscale(1)}
.ttt-candy-avatar{position:absolute;top:-5.5cqw;left:50%;width:11cqw;height:11cqw;margin-left:-5.5cqw;padding:.55cqw;border-radius:50%;background:linear-gradient(180deg,#fff,#d8ccf6);box-shadow:0 .6cqw 1.4cqw #12003a73;font-size:max(10px,3.6cqw);transition:box-shadow .35s}
.ttt-candy-seat.is-active .ttt-candy-avatar{box-shadow:0 0 0 .6cqw #fed643,0 .6cqw 1.6cqw #12003a73}
.ttt-candy-label{margin:0;font-size:var(--fs-label);line-height:1.2;font-weight:600;color:#e3d8ff;opacity:.85}
.ttt-candy-name{margin:.2cqw 0 0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--fs-name);line-height:1.2;font-weight:800;letter-spacing:.02em;text-transform:uppercase}
.ttt-candy-cardmark{position:absolute;top:1.2cqw;width:6.4cqw;height:6.4cqw}
.ttt-candy-seat.is-me .ttt-candy-cardmark{left:1.4cqw}
.ttt-candy-seat.is-opp .ttt-candy-cardmark{right:1.4cqw}
.ttt-candy-cardmark .ttt-candy-mark{width:100%;height:100%}
.ttt-candy-tally{display:flex;justify-content:center;align-items:center;gap:1.2cqw;margin:1.4cqw 8% 0;padding-top:1.5cqw;border-top:2px dashed #ffffffc4;min-height:3.6cqw}
.ttt-candy-tick{width:max(10px,3.4cqw);height:max(10px,3.4cqw);fill:none;stroke:#fff;stroke-opacity:.16;stroke-width:3.6;stroke-linecap:round;transition:stroke .3s,stroke-opacity .3s}
.ttt-candy-tick.is-won{stroke:#d6c6ff;stroke-opacity:.95}
.ttt-candy-tally-more{font-size:var(--fs-label);font-weight:800;color:#d6c6ff}

.ttt-candy-board{grid-area:board;position:relative;container-type:inline-size;width:100%;aspect-ratio:1;padding:4.6%;border-radius:9%;background:linear-gradient(160deg,#6a2ad8 0%,#5822c8 45%,#4a1bb0 100%);box-shadow:0 2.6cqw 5cqw #12003a73,0 .8cqw 0 #3a1294,inset 0 .5cqw 0 #ffffff1f,inset 0 -.6cqw 0 #2a0a7a40}
.ttt-candy-stitch{position:absolute;inset:2.1%;width:95.8%;height:95.8%;overflow:visible;pointer-events:none}
.ttt-candy-stitch rect{fill:none;stroke:#fff;stroke-opacity:.92;stroke-width:1.7px;stroke-dasharray:5.5 4.5;stroke-linecap:round;vector-effect:non-scaling-stroke}
.ttt-candy-cells{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));width:100%;height:100%;border-radius:6.5%;overflow:hidden;background:#3d1590;box-shadow:inset 0 .8cqw 1.6cqw #12003a59}
.ttt-candy-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ttt-candy-lines line{stroke:#fff;stroke-opacity:.55;stroke-width:1.5px;stroke-dasharray:5 4.5;stroke-linecap:round;vector-effect:non-scaling-stroke}
.ttt-candy-cell{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;padding:0;border:0;outline:0;cursor:default;background:var(--cell);transition:background-color .35s ease calc(var(--k)*.12s),box-shadow .2s}
.ttt-candy-cell.is-even{--cell:linear-gradient(170deg,#4a189f,#43168f)}
.ttt-candy-cell.is-odd{--cell:linear-gradient(170deg,#4f19ab,#47179b)}
.ttt-candy-cell.is-open{cursor:pointer}
.ttt-candy-cell.is-open:hover{--cell:linear-gradient(170deg,#6326cc,#5820b8)}
.ttt-candy-cell.is-open:active{--cell:linear-gradient(170deg,#6f2fd6,#6326c4)}
.ttt-candy-cell:focus-visible{box-shadow:inset 0 0 0 .9cqw #fed643}
.ttt-candy-cell.is-win{--cell:linear-gradient(175deg,#ffdb4f,#fdd443 60%,#f6c93b);animation:ttt-candy-tile .5s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--k)*.12s);z-index:1}
.ttt-candy-piece,.ttt-candy-ghost{position:relative;display:block;width:80%;height:80%;pointer-events:none}
.ttt-candy-piece .ttt-candy-mark,.ttt-candy-ghost .ttt-candy-mark{width:100%;height:100%}
.ttt-candy-mark{display:block;overflow:visible;filter:drop-shadow(0 1.1cqw 1cqw #1a003f80)}
.ttt-candy-ghost{opacity:0;transform:scale(.8);transition:opacity .18s,transform .25s cubic-bezier(.3,1.6,.5,1)}
.ttt-candy-ghost .ttt-candy-mark{filter:none}
.ttt-candy-cell.is-open:hover .ttt-candy-ghost{opacity:.32;transform:scale(.9)}
.ttt-candy-cell.is-open:active .ttt-candy-ghost{opacity:.5;transform:scale(.78)}
.ttt-candy-piece.is-new{animation:ttt-candy-pop .62s cubic-bezier(.25,1.5,.5,1) both}
.ttt-candy-piece.is-new .ttt-candy-pupil{animation:ttt-candy-wobble .9s ease-out .25s both}
.ttt-candy-pupil{transform-box:fill-box;transform-origin:center}
.ttt-candy-eye{animation:ttt-candy-blink 5.5s calc(var(--i,0)*-.7s) infinite;transform-box:fill-box;transform-origin:center}
.ttt-candy-cell.is-win .ttt-candy-piece{animation:ttt-candy-bounce 1.15s ease-in-out infinite;animation-delay:calc(.45s + var(--k)*.14s)}
.ttt-candy-cell.is-win .ttt-candy-piece.is-new{animation:ttt-candy-pop .62s cubic-bezier(.25,1.5,.5,1) both,ttt-candy-bounce 1.15s ease-in-out .7s infinite}
.ttt-candy-cell.is-win .ttt-candy-mark{filter:drop-shadow(0 1.1cqw .9cqw #b0570070)}
.ttt-candy-sparkles{position:absolute;inset:0;pointer-events:none}
.ttt-candy-sparkle{position:absolute;width:13%;height:13%;fill:#fff;opacity:0;animation:ttt-candy-twinkle 1.6s ease-in-out infinite}
.ttt-candy-sparkle:nth-child(1){top:8%;left:9%;animation-delay:calc(.3s + var(--k)*.2s)}
.ttt-candy-sparkle:nth-child(2){top:12%;right:8%;width:9%;height:9%;animation-delay:calc(.9s + var(--k)*.2s)}
.ttt-candy-sparkle:nth-child(3){bottom:8%;right:14%;width:10%;height:10%;animation-delay:calc(.6s + var(--k)*.2s)}

.ttt-candy-status{grid-area:status;display:flex;justify-content:center;margin:0;padding-left:13cqw;padding-right:13cqw;min-width:0}
.ttt-candy-status span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1.3cqw 3.4cqw;border-radius:999px;font-size:max(12px,3.4cqw);line-height:1.25;font-weight:800;color:#e7ddff;background:#1e05508c;box-shadow:inset 0 0 0 1px #ffffff1f}
.ttt-candy-scene.is-turn .ttt-candy-status span{color:#fed643}
.ttt-candy-scene.is-win .ttt-candy-status span{color:#3a0f86;background:linear-gradient(180deg,#ffe066,#fbcf3c);box-shadow:0 .6cqw 2cqw #fed64359;animation:ttt-candy-tile .5s cubic-bezier(.3,1.6,.5,1) both}
.ttt-candy-scene.is-lose .ttt-candy-status span{color:#ff9ac0}

.ttt-candy-mascot{position:absolute;z-index:2;left:-.8cqw;bottom:-2.6cqw;width:17cqw;pointer-events:none}
.ttt-candy-mascot svg{display:block;width:100%;height:auto;overflow:visible}
.ttt-candy-mascot-body{transform-box:fill-box;transform-origin:50% 90%;animation:ttt-candy-bob 3.2s ease-in-out infinite}
.ttt-candy-scene.is-win .ttt-candy-mascot-body{animation:ttt-candy-hop .7s cubic-bezier(.3,1.4,.5,1) infinite}
.ttt-candy-mascot .ttt-candy-pupil{transition:transform .5s cubic-bezier(.3,1.5,.5,1)}
.ttt-candy-mascot.is-look-me .ttt-candy-pupil{transform:translate(-3.4px,-1.5px)}
.ttt-candy-mascot.is-look-opp .ttt-candy-pupil{transform:translate(1.6px,-2.4px)}

@keyframes ttt-candy-pop{0%{transform:scale(.15) rotate(-28deg);opacity:0}45%{transform:scale(1.2,.86) rotate(7deg);opacity:1}65%{transform:scale(.9,1.1) rotate(-4deg)}82%{transform:scale(1.05,.96) rotate(1.5deg)}100%{transform:none}}
@keyframes ttt-candy-wobble{0%{transform:none}20%{transform:translate(1.8px,-1.2px)}40%{transform:translate(-1.6px,1px)}58%{transform:translate(1.2px,1.2px)}76%{transform:translate(-.7px,-.6px)}100%{transform:none}}
@keyframes ttt-candy-blink{0%,93%,100%{transform:none}96%{transform:scaleY(.12)}}
@keyframes ttt-candy-bounce{0%,100%{transform:none}30%{transform:translateY(-9%) scale(.96,1.05)}55%{transform:translateY(0) scale(1.08,.92)}72%{transform:translateY(-2%) scale(.98,1.02)}}
@keyframes ttt-candy-tile{0%{transform:scale(.86)}60%{transform:scale(1.05)}100%{transform:none}}
@keyframes ttt-candy-twinkle{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:.95;transform:scale(1) rotate(45deg)}}
@keyframes ttt-candy-glow{0%,100%{box-shadow:inset 0 0 0 1.5px #ffffff59,0 0 0 .8cqw #fed64326,0 1cqw 4cqw #b48cff66}50%{box-shadow:inset 0 0 0 1.5px #ffffff80,0 0 0 .8cqw #fed64347,0 1cqw 5cqw #b48cffa6}}
@keyframes ttt-candy-nudge{0%,100%{translate:0}50%{translate:.25em}}
@keyframes ttt-candy-nudge-l{0%,100%{translate:0}50%{translate:-.25em}}
@keyframes ttt-candy-bob{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-4%) rotate(-2deg)}}
@keyframes ttt-candy-hop{0%,100%{transform:translateY(0) rotate(-6deg) scale(1)}35%{transform:translateY(-14%) rotate(4deg) scale(.96,1.05)}70%{transform:translateY(0) rotate(-2deg) scale(1.06,.94)}}

@container ttt-candy (min-width:440px){
.ttt-candy-scene{--fs-label:max(10px,2.1cqw);--fs-name:max(11px,2.6cqw);grid-template-columns:minmax(0,1fr) 54cqw minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"mid board me" "opp board me" ". status .";column-gap:3.4cqw;row-gap:2.4cqw;padding:3.6cqw 3.4cqw 2.6cqw;border-radius:3.4cqw}
.ttt-candy-stage{inset:1.8cqw 2cqw 9.4cqw;border-radius:2.4cqw}
.ttt-candy-mid{align-items:flex-start;justify-content:flex-start;gap:.8cqw}
.ttt-candy-logo{width:11.5cqw}
.ttt-candy-round{font-size:max(10px,1.9cqw)}
.ttt-candy-cue-mid{display:none}
.ttt-candy-cue{position:absolute;bottom:calc(100% + 1.2cqw);left:.4cqw;display:flex;visibility:hidden;font-size:max(11px,2.3cqw)}
.ttt-candy-seat.is-active .ttt-candy-cue{visibility:visible}
.ttt-candy-seat{align-self:center;padding-top:4.6cqw;margin-top:4cqw}
.ttt-candy-seat.is-opp{align-self:start;margin-top:5.4cqw}
.ttt-candy-card{padding:5.8cqw 1.2cqw 2.2cqw;border-radius:2.8cqw}
.ttt-candy-avatar{top:-4.6cqw;width:9.2cqw;height:9.2cqw;margin-left:-4.6cqw;padding:.45cqw;font-size:max(10px,2.6cqw)}
.ttt-candy-cardmark{position:static;width:5.4cqw;height:5.4cqw;margin-top:1.4cqw}
.ttt-candy-tally{margin:1.8cqw 6% 0;padding-top:1.4cqw;gap:.9cqw}
.ttt-candy-tick{width:max(10px,2.4cqw);height:max(10px,2.4cqw)}
.ttt-candy-status{padding:0}
.ttt-candy-status span{font-size:max(12px,2.4cqw);padding:.9cqw 2.6cqw}
.ttt-candy-mascot{left:-.6cqw;bottom:-2.2cqw;width:12.5cqw}
.ttt-candy-doodle.is-narrow{display:none}
.ttt-candy-doodle.is-wide{display:block}
.ttt-candy-xo{width:30cqw}
.ttt-candy-xo.is-a{right:-3cqw;bottom:5cqw;left:auto}
.ttt-candy-xo.is-b{right:-12cqw;bottom:-2cqw;left:auto}
.ttt-candy-xo.is-c{display:block;left:14cqw;bottom:-2.6cqw}
}

@media (prefers-reduced-motion:reduce){
.ttt-candy-root *,.ttt-candy-root *::before,.ttt-candy-root *::after{animation:none!important;transition-duration:0s!important}
}
`
