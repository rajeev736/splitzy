"use client"

import { useId } from "react"
import { Saira_Condensed } from "next/font/google"

import { cn } from "@/lib/utils"
import type { Mark, TttSceneProps, TttSeat } from "./types"

/**
 * Brushed steel: a machined case of three plates — the score plate, the board
 * plate and a strip with a rubber button — split by rubber grooves and held by
 * screws. Every surface is drawn here (gradients + SVG noise), so it stays
 * crisp at any size. X is glossy amber, O is polished silver.
 */

const stencil = Saira_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
})

// Chunky X with filleted inner corners, and a fat ring, in a 100×100 box
const PATHS: Record<Mark, string> = {
  x: "M45.76 27.38Q50 31.62 54.24 27.38L68.81 12.81A13 13 0 0 1 87.19 31.19L72.62 45.76Q68.38 50 72.62 54.24L87.19 68.81A13 13 0 0 1 68.81 87.19L54.24 72.62Q50 68.38 45.76 72.62L31.19 87.19A13 13 0 0 1 12.81 68.81L27.38 54.24Q31.62 50 27.38 45.76L12.81 31.19A13 13 0 0 1 31.19 12.81Z",
  o: "M6 50a44 44 0 1 0 88 0a44 44 0 1 0-88 0ZM32 50a18 18 0 1 0 36 0a18 18 0 1 0-36 0Z",
}

const noise = (freq: string, matrix: string, size: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='${matrix}'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
  )}")`

// Fine grain (light and dark specks) and faint horizontal brushing
const GRAIN = noise(".8", "3 0 0 0 -1 3 0 0 0 -1 3 0 0 0 -1 0 0 0 0 .07", 180)
const BRUSH = noise(
  ".004 .7",
  "3 0 0 0 -1 3 0 0 0 -1 3 0 0 0 -1 0 0 0 0 .06",
  240
)

const SCREW_TILT = [-35, 20, 70, -10, 45, -60, 5, 30]

export default function MetalScene({
  board,
  winLine,
  lastMove,
  canPlay,
  onPlay,
  me,
  opponent,
  status,
  tone,
  round,
  bestOf,
  toWin,
}: TttSceneProps) {
  const uid = "tm" + useId().replace(/[^\w-]/g, "")

  return (
    <div className={cn("ttt-metal-root", stencil.className)}>
      <style>{CSS}</style>
      <Defs uid={uid} />
      <div className="ttt-metal-case" style={{ backgroundImage: CASE_BG }}>
        <section className="ttt-metal-plate ttt-metal-top">
          <Screws at={["tl", "tr", "bl", "br"]} tilt={0} />
          <Seat seat={me} uid={uid} />
          <div
            className="ttt-metal-score"
            aria-label={`Score: ${me.name} ${me.wins}, ${opponent.name} ${opponent.wins}`}
            role="group"
          >
            <span className="ttt-metal-title">Score</span>
            <span className="ttt-metal-digits" aria-hidden>
              <span>{me.wins}</span>
              <i />
              <span>{opponent.wins}</span>
            </span>
            <span className="ttt-metal-round">
              Round {Math.min(round, bestOf)} · first to {toWin}
            </span>
          </div>
          <Seat seat={opponent} uid={uid} />
        </section>

        <div className="ttt-metal-groove" aria-hidden />

        <section className="ttt-metal-plate ttt-metal-boardplate">
          <Screws at={["tl", "tr", "bl", "br"]} tilt={4} />
          <div className="ttt-metal-board" role="grid" aria-label="Board">
            {Array.from(board).map((cell, i) => {
              const empty = cell === "."
              const open = canPlay && empty
              const win = !!winLine?.includes(i)
              const fresh = lastMove === i && !empty
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  aria-label={
                    empty
                      ? `Square ${i + 1}, empty`
                      : `Square ${i + 1}, ${cell.toUpperCase()}`
                  }
                  disabled={!open}
                  onClick={() => onPlay(i)}
                  className={cn(
                    "ttt-metal-well",
                    `ttt-metal-r${Math.floor(i / 3)}`,
                    `ttt-metal-c${i % 3}`,
                    open && "ttt-metal-open",
                    win && "ttt-metal-win",
                    fresh && "ttt-metal-thud"
                  )}
                >
                  <span className="ttt-metal-floor" />
                  {!empty && (
                    <Piece
                      uid={uid}
                      mark={cell as Mark}
                      className={cn(fresh && "ttt-metal-drop")}
                      glint={win ? winLine!.indexOf(i) : undefined}
                    />
                  )}
                  {open && me.mark && (
                    <Piece
                      uid={uid}
                      mark={me.mark}
                      className="ttt-metal-ghost"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <div className="ttt-metal-groove" aria-hidden />

        <section className="ttt-metal-plate ttt-metal-strip">
          <Screws at={["ml", "mr"]} tilt={6} />
          <p
            className={cn("ttt-metal-button", `ttt-metal-tone-${tone}`)}
            aria-live="polite"
          >
            <span>{status}</span>
          </p>
        </section>
      </div>
    </div>
  )
}

function Seat({ seat, uid }: { seat: TttSeat; uid: string }) {
  return (
    <div
      className={cn(
        "ttt-metal-seat",
        seat.active && "ttt-metal-on",
        seat.away && "ttt-metal-away"
      )}
    >
      <p className="ttt-metal-name">
        <span className="ttt-metal-led" aria-hidden />
        <span className="ttt-metal-label">{seat.name}</span>
        {seat.away && <span className="sr-only"> (away)</span>}
        {seat.active && <span className="sr-only"> (to move)</span>}
      </p>
      <span className="ttt-metal-slot">
        {seat.mark && <Piece uid={uid} mark={seat.mark} />}
      </span>
    </div>
  )
}

/** A glossy 3D mark: a soft shadow on the well floor, then the body. */
function Piece({
  uid,
  mark,
  className,
  glint,
}: {
  uid: string
  mark: Mark
  className?: string
  /** Position in the winning line: its specular sweep runs in turn. */
  glint?: number
}) {
  const shape = `#${uid}-${mark}`
  return (
    <span className={cn("ttt-metal-piece", className)} aria-hidden>
      <svg className="ttt-metal-shadow" viewBox="0 0 100 100">
        <use
          href={shape}
          fill="#05090b"
          opacity=".55"
          transform="translate(4 7)"
          filter={`url(#${uid}-soft)`}
        />
      </svg>
      <svg className="ttt-metal-body" viewBox="0 0 100 100">
        <use
          href={shape}
          fill={`url(#${uid}-${mark}-side)`}
          transform="translate(0 4.5)"
        />
        <use
          href={shape}
          fill={`url(#${uid}-${mark}-face)`}
          filter={`url(#${uid}-bevel)`}
        />
        {glint !== undefined && glint >= 0 && (
          <g clipPath={`url(#${uid}-${mark}-clip)`}>
            <g transform="rotate(28 50 50)">
              <rect
                className="ttt-metal-glint"
                style={{ animationDelay: `${0.35 + glint * 0.3}s` }}
                x="-75"
                y="-40"
                width="36"
                height="180"
                fill={`url(#${uid}-glint)`}
              />
            </g>
          </g>
        )}
      </svg>
    </span>
  )
}

/** Shapes, gradients and filters every piece shares. */
function Defs({ uid }: { uid: string }) {
  return (
    <svg
      width="0"
      height="0"
      className="absolute"
      aria-hidden
      focusable="false"
    >
      <defs>
        {(["x", "o"] as const).map((m) => (
          <g key={m}>
            <path
              id={`${uid}-${m}`}
              d={PATHS[m]}
              fillRule="evenodd"
              clipRule="evenodd"
            />
            <clipPath id={`${uid}-${m}-clip`}>
              <path d={PATHS[m]} clipRule="evenodd" />
            </clipPath>
          </g>
        ))}
        <linearGradient id={`${uid}-x-face`} x1="0" y1="0" x2=".35" y2="1">
          <stop offset="0" stopColor="#ffd56e" />
          <stop offset=".45" stopColor="#fbbd40" />
          <stop offset=".8" stopColor="#f0a42b" />
          <stop offset="1" stopColor="#e0901d" />
        </linearGradient>
        <linearGradient id={`${uid}-x-side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d07f18" />
          <stop offset="1" stopColor="#9c560b" />
        </linearGradient>
        <linearGradient id={`${uid}-o-face`} x1="0" y1="0" x2=".35" y2="1">
          <stop offset="0" stopColor="#c3c9cd" />
          <stop offset=".5" stopColor="#959ea3" />
          <stop offset="1" stopColor="#7a8388" />
        </linearGradient>
        <linearGradient id={`${uid}-o-side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f676c" />
          <stop offset="1" stopColor="#3b4246" />
        </linearGradient>
        <linearGradient id={`${uid}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        {/* Rounds the face: light from the top left, plus a glossy specular */}
        <filter
          id={`${uid}-bevel`}
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="b" />
          <feDiffuseLighting
            in="b"
            surfaceScale="5"
            diffuseConstant="1.18"
            lightingColor="#fff"
            result="d"
          >
            <feDistantLight azimuth="235" elevation="52" />
          </feDiffuseLighting>
          <feComposite
            in="SourceGraphic"
            in2="d"
            operator="arithmetic"
            k1="1"
            result="lit"
          />
          <feSpecularLighting
            in="b"
            surfaceScale="5"
            specularConstant=".9"
            specularExponent="24"
            lightingColor="#fff"
            result="s"
          >
            <feDistantLight azimuth="235" elevation="42" />
          </feSpecularLighting>
          <feComposite in="s" in2="SourceAlpha" operator="in" result="s2" />
          <feComposite
            in="s2"
            in2="lit"
            operator="arithmetic"
            k2=".8"
            k3="1"
            result="out"
          />
          <feComposite in="out" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
    </svg>
  )
}

function Screws({
  at,
  tilt,
}: {
  at: ("tl" | "tr" | "bl" | "br" | "ml" | "mr")[]
  tilt: number
}) {
  return at.map((pos, i) => (
    <span
      key={pos}
      className={cn("ttt-metal-screw", `ttt-metal-screw-${pos}`)}
      style={{ rotate: `${SCREW_TILT[(i + tilt) % SCREW_TILT.length]}deg` }}
      aria-hidden
    />
  ))
}

const CASE_BG = [
  GRAIN,
  BRUSH,
  // Spun sheen: soft light and dark sectors fanning out from one point
  "conic-gradient(from 10deg at 42% 36%, rgba(255,255,255,.2), rgba(20,26,30,.1) 45deg, rgba(255,255,255,.24) 100deg, rgba(20,26,30,.14) 165deg, rgba(255,255,255,.16) 215deg, rgba(20,26,30,.08) 290deg, rgba(255,255,255,.2))",
  "linear-gradient(114deg, transparent 20%, rgba(255,255,255,.36) 32%, transparent 45%, transparent 60%, rgba(255,255,255,.2) 70%, transparent 82%)",
  "linear-gradient(58deg, transparent 40%, rgba(30,36,40,.16) 54%, transparent 68%)",
  "linear-gradient(90deg, rgba(40,46,50,.1), transparent 14%, transparent 80%, rgba(40,46,50,.26))",
  "linear-gradient(180deg, #a9aeb2 0%, #bfc4c8 12%, #cdd2d6 30%, #c6cdd0 45%, #949c9f 57%, #aab1b4 68%, #a1a8ab 80%, #8f9699 89%, #a6abaf 100%)",
].join(",")

const CSS = `
.ttt-metal-root{container-type:inline-size;width:100%;max-width:30rem;margin-inline:auto;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
.ttt-metal-case{position:relative;overflow:hidden;border-radius:1.4cqw;background-color:#b8bdc1;background-size:180px 180px,240px 240px,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%;box-shadow:0 0 0 1px rgba(20,26,30,.55),0 1.2cqw 3cqw rgba(0,0,0,.35);color:#3d4548;text-transform:uppercase;line-height:1}
.ttt-metal-plate{position:relative;box-shadow:inset 0 .3cqw 0 rgba(255,255,255,.5),inset 0 -.3cqw 0 rgba(30,36,40,.16)}
.ttt-metal-groove{position:relative;height:2.5cqw;min-height:7px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px),linear-gradient(180deg,#5d6266 0,#14191d 10%,#0f1418 22%,#1f2428 48%,#20262a 58%,#12171b 86%,#000307 100%);box-shadow:0 .2cqw 0 rgba(255,255,255,.7),0 -.15cqw 0 rgba(255,255,255,.55)}
.ttt-metal-screw{position:absolute;width:1.9cqw;min-width:6px;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 38%,#7c8487 0,#5a6265 50%,#40474a 100%);box-shadow:0 .18cqw 0 rgba(255,255,255,.75),0 -.1cqw 0 rgba(40,46,50,.35),inset 0 .12cqw .2cqw rgba(0,0,0,.45)}
.ttt-metal-screw::after{content:"";position:absolute;left:14%;right:14%;top:42%;height:16%;border-radius:1px;background:#353c3f;box-shadow:0 .12cqw 0 rgba(255,255,255,.22)}
.ttt-metal-screw-tl{left:3.2cqw;top:3.2cqw}.ttt-metal-screw-tr{right:3.2cqw;top:3.2cqw}
.ttt-metal-screw-bl{left:3.2cqw;bottom:3.2cqw}.ttt-metal-screw-br{right:3.2cqw;bottom:3.2cqw}
.ttt-metal-screw-ml{left:3.2cqw;top:50%;translate:0 -50%}.ttt-metal-screw-mr{right:3.2cqw;top:50%;translate:0 -50%}

.ttt-metal-top{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:2cqw;padding:5cqw 7cqw 5.4cqw;--slot:16.7cqw}
.ttt-metal-seat{display:flex;min-width:0;flex-direction:column;align-items:center;gap:2.6cqw;transition:opacity .3s}
.ttt-metal-away{opacity:.55}
.ttt-metal-name{display:flex;max-width:100%;min-width:0;align-items:center;gap:1.2cqw;font-weight:700;font-size:max(3.6cqw,10px);letter-spacing:.03em;color:#4b5457;text-shadow:0 1px 0 rgba(255,255,255,.55);transition:color .3s}
.ttt-metal-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-block:.1em}
.ttt-metal-led{flex:none;width:1.5cqw;min-width:5px;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 40% 35%,#6c7477,#3d4447);box-shadow:0 .15cqw 0 rgba(255,255,255,.6),inset 0 .1cqw .2cqw rgba(0,0,0,.5);transition:background .3s,box-shadow .3s}
.ttt-metal-on .ttt-metal-name{color:#262c2f}
.ttt-metal-on .ttt-metal-led{background:radial-gradient(circle at 40% 35%,#fff3c4,#ffb733 45%,#e07f0c);box-shadow:0 0 1.2cqw 0.3cqw rgba(255,176,40,.7),0 .15cqw 0 rgba(255,255,255,.6);animation:ttt-metal-led 1.6s ease-in-out infinite}
.ttt-metal-away .ttt-metal-led{background:radial-gradient(circle at 40% 35%,#9a6a6a,#5a3434)}
@keyframes ttt-metal-led{50%{box-shadow:0 0 .5cqw .1cqw rgba(255,176,40,.45),0 .15cqw 0 rgba(255,255,255,.6)}}
.ttt-metal-slot{position:relative;display:block;width:var(--slot);aspect-ratio:1;border-style:solid;border-width:1.7cqw .5cqw .5cqw 1.5cqw;border-color:#6b7477 #3e484a #5b6467 #6b7577;background:radial-gradient(120% 120% at 35% 40%,#535d5f,#434d4f);box-shadow:0 .3cqw 0 rgba(255,255,255,.55),0 -.25cqw 0 rgba(60,66,70,.3),inset 0 0 1cqw rgba(0,0,0,.25);transition:box-shadow .35s}
.ttt-metal-slot .ttt-metal-piece{inset:9%}
.ttt-metal-on .ttt-metal-slot{box-shadow:0 .3cqw 0 rgba(255,255,255,.55),0 -.25cqw 0 rgba(60,66,70,.3),inset 0 0 1cqw rgba(0,0,0,.25),inset 0 0 3cqw rgba(255,184,60,.42),0 0 2cqw rgba(255,190,80,.35)}
.ttt-metal-seat:not(.ttt-metal-on) .ttt-metal-slot .ttt-metal-body{filter:grayscale(1) brightness(.92)}
.ttt-metal-score{display:flex;flex-direction:column;align-items:center;gap:2.4cqw;text-shadow:0 1px 0 rgba(255,255,255,.55)}
.ttt-metal-title{font-weight:700;font-size:6.2cqw;letter-spacing:.09em;padding-left:.09em;color:#3e4649}
.ttt-metal-digits{display:flex;align-items:center;gap:5.5cqw;font-weight:700;font-size:9.6cqw;color:#384043;font-variant-numeric:tabular-nums}
.ttt-metal-digits i{display:block;width:2px;height:7.5cqw;background:linear-gradient(90deg,rgba(60,68,72,.45) 50%,rgba(255,255,255,.6) 50%)}
.ttt-metal-round{font-weight:600;font-size:max(1.9cqw,8px);letter-spacing:.18em;color:#555e62;white-space:nowrap}

.ttt-metal-boardplate{padding:6.8cqw}
.ttt-metal-board{display:grid;aspect-ratio:1;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:5.2cqw}
.ttt-metal-well{position:relative;display:block;min-width:0;min-height:0;padding:0;border-style:solid;background:#4b5557;outline:none;box-shadow:0 .35cqw 0 rgba(255,255,255,.6),0 -.3cqw 0 rgba(70,76,80,.32),0 0 0 .15cqw rgba(60,66,70,.18);touch-action:manipulation}
.ttt-metal-c0{border-left-width:2.6cqw;border-right-width:.4cqw;border-left-color:#6a7376;border-right-color:#3a4446;--fx:28%}
.ttt-metal-c1{border-left-width:.5cqw;border-right-width:.5cqw;border-left-color:#5c6568;border-right-color:#3d4749;--fx:50%}
.ttt-metal-c2{border-left-width:.4cqw;border-right-width:2.6cqw;border-left-color:#3a4446;border-right-color:#6c7679;--fx:72%}
.ttt-metal-r0{border-top-width:2.8cqw;border-bottom-width:.5cqw;border-top-color:#687075;border-bottom-color:#3b4547;--fy:30%}
.ttt-metal-r1{border-top-width:1.7cqw;border-bottom-width:1.3cqw;border-top-color:#646c70;border-bottom-color:#5f686b;--fy:50%}
.ttt-metal-r2{border-top-width:.7cqw;border-bottom-width:2.4cqw;border-top-color:#4a5355;border-bottom-color:#636c6f;--fy:70%}
.ttt-metal-floor{position:absolute;inset:0;background:${GRAIN},radial-gradient(130% 130% at var(--fx) var(--fy),#566062,#4d5759 45%,#3d4749 100%);background-size:180px 180px,100% 100%;box-shadow:inset 0 0 1.4cqw rgba(0,0,0,.3);transition:filter .15s,box-shadow .35s}
.ttt-metal-win .ttt-metal-floor{box-shadow:inset 0 0 1.4cqw rgba(0,0,0,.3),inset 0 0 4cqw rgba(255,196,96,.32)}
.ttt-metal-open{cursor:pointer}
.ttt-metal-open:focus-visible{outline:.6cqw solid #f5a623;outline-offset:.5cqw}
@media (hover:hover){.ttt-metal-open:hover .ttt-metal-floor{filter:brightness(1.14)}.ttt-metal-open:hover .ttt-metal-ghost{opacity:.3;transform:scale(1)}}
.ttt-metal-open:active .ttt-metal-floor{filter:brightness(.88)}
.ttt-metal-open:active .ttt-metal-ghost{opacity:.5;transform:scale(.93)}

.ttt-metal-piece{position:absolute;inset:6%;pointer-events:none}
.ttt-metal-piece svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.ttt-metal-ghost{opacity:0;transform:scale(.88);transition:opacity .18s,transform .18s}
.ttt-metal-ghost .ttt-metal-shadow{display:none}
.ttt-metal-drop .ttt-metal-body{animation:ttt-metal-drop .66s cubic-bezier(.45,0,.75,.4) both}
.ttt-metal-drop .ttt-metal-shadow{animation:ttt-metal-settle .66s ease-in both}
.ttt-metal-thud{animation:ttt-metal-thud .66s ease-out}
@keyframes ttt-metal-drop{
0%{opacity:0;transform:translateY(-16%) scale(1.55)}
15%{opacity:1}
46%{transform:translateY(0) scale(.92);animation-timing-function:cubic-bezier(.2,.6,.35,1)}
64%{transform:translateY(-3%) scale(1.04);animation-timing-function:ease-in-out}
82%{transform:scale(.985)}
100%{opacity:1;transform:none}}
@keyframes ttt-metal-settle{
0%{opacity:0;transform:translate(10%,16%) scale(1.35)}
46%{opacity:1;transform:translate(1%,1.5%) scale(.97);animation-timing-function:ease-out}
64%{transform:translate(2%,3%) scale(1.02)}
100%{opacity:1;transform:none}}
@keyframes ttt-metal-thud{0%,42%{translate:0 0}50%{translate:0 .35cqw}66%{translate:0 -.08cqw}100%{translate:0 0}}
.ttt-metal-glint{animation:ttt-metal-glint 2.6s cubic-bezier(.4,0,.3,1) infinite both}
@keyframes ttt-metal-glint{0%{transform:translateX(0)}38%,100%{transform:translateX(190px)}}

.ttt-metal-strip{display:flex;align-items:center;justify-content:center;height:11cqw;min-height:34px;padding-inline:9cqw}
.ttt-metal-button{display:flex;min-width:16cqw;max-width:100%;height:6.4cqw;min-height:22px;align-items:center;justify-content:center;padding:0 3.4cqw 0 calc(3.4cqw + .32em);border-radius:.9cqw;background:linear-gradient(180deg,#05090c 0,#11191c 18%,#1c2125 48%,#14191d 70%,#0b1014 100%);box-shadow:0 0 0 .22cqw rgba(232,236,240,.75),0 0 0 .4cqw rgba(60,66,70,.3),0 .5cqw .8cqw rgba(0,0,0,.25),inset 0 .15cqw 0 rgba(255,255,255,.06);font-weight:700;font-size:max(2.3cqw,10px);letter-spacing:.32em;color:#b6babd;transition:color .3s,text-shadow .3s}
.ttt-metal-button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ttt-metal-tone-turn{color:#ffc04d;text-shadow:0 0 .6em rgba(255,170,40,.75)}
.ttt-metal-tone-win{color:#ffd36a;text-shadow:0 0 .7em rgba(255,190,60,.9)}
.ttt-metal-tone-lose,.ttt-metal-tone-draw{color:#9da3a7}
.ttt-metal-tone-wait{color:#c2c6c9}

@media (max-height:640px){
.ttt-metal-top{padding:3cqw 7cqw 3.4cqw;gap:1.5cqw;--slot:11.5cqw}
.ttt-metal-seat{gap:1.6cqw}
.ttt-metal-score{gap:1.4cqw}
.ttt-metal-title{font-size:4.6cqw}
.ttt-metal-digits{font-size:7.4cqw;gap:4.5cqw}
.ttt-metal-digits i{height:5.6cqw}
.ttt-metal-strip{height:9cqw;min-height:30px}
}
@media (prefers-reduced-motion:reduce){
.ttt-metal-drop .ttt-metal-body,.ttt-metal-drop .ttt-metal-shadow,.ttt-metal-thud,.ttt-metal-glint,.ttt-metal-on .ttt-metal-led{animation:none}
.ttt-metal-glint{opacity:0}
.ttt-metal-ghost,.ttt-metal-floor,.ttt-metal-slot{transition:none}
}
`
