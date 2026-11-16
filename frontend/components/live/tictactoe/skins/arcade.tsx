"use client"

import type * as React from "react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"
import type { Mark, TttSceneProps, TttSeat } from "./types"

/**
 * Arcade: an 8-bit cabinet. Everything sits on one pixel grid of `--u` whole
 * pixels (41 across), so the yellow bars, the mint X's and the orange critters
 * snap to the same dark-grey grid that covers the black screen.
 */

const YELLOW = "#ffee00"
const MINT = "#00ffad"
const ORANGE = "#ff5500"

/** 41 grid units across: a 2-unit margin, three 11-unit cells and two 2-unit bars. */
const SIDE = 41
const CELL = 11
const BAR = 2
const EDGE = 2
const cellAt = (n: number) => EDGE + n * (CELL + BAR)

type Sprite = string[]

const X_SPRITE: Sprite = [
  "##...##",
  "###.###",
  ".#####.",
  "..###..",
  ".#####.",
  "###.###",
  "##...##",
]

/** Our own little critters, two frames each so they shuffle on the spot. */
const CRITTERS: [Sprite, Sprite][] = [
  // Fuzzball: tufts and feet swap
  [
    ["#..#.#..#", ".#######.", "##..#..##", "##..#..##", "#########", "##.#.#.##", ".#######.", ".#.....#."],
    [".", ".#.#.#.#.", ".#######.", "##..#..##", "##..#..##", "#########", "##.#.#.##", ".#######.", "#.......#"],
  ],
  // Peeper: a one-eyed jelly with wiggly tentacles
  [
    ["..###..", ".#####.", "##...##", "##.#.##", "##...##", "#######", "#.#.#.#", ".#.#.#."],
    ["..###..", ".#####.", "##...##", "###..##", "##...##", "#######", ".#.#.#.", "#.#.#.#"],
  ],
  // Flapper: a bat-eared puff beating its wings
  [
    ["#.......#", "##.#.#.##", "#########", ".##.#.##.", "..#####..", "..#.#.#..", "...#.#..."],
    [".", "...#.#...", ".#######.", "###.#.###", "#.#####.#", "#.#.#.#.#", "...#.#..."],
  ],
  // Bolt: a boxy bot with a sparking antenna
  [
    ["....#....", "..#####..", ".#######.", ".#..#..#.", ".#######.", ".#.#.#.#.", "#########", "..#...#.."],
    ["...#.#...", "..#####..", ".#######.", ".#..#..#.", ".#######.", ".##.#.##.", ".#######.", ".#.....#."],
  ],
  // Gloop: a grinning slime that squashes and stretches
  [
    ["....#....", "...###...", "..#####..", ".##.#.##.", ".#######.", "##.###.##", "###...###", "#########"],
    [".", ".", "....#....", "..#####..", ".##.#.##.", "##.###.##", "###...###", "#########"],
  ],
]

/** Which critter lives in each cell: neighbours always differ. */
const CRITTER_OF_CELL = [0, 1, 2, 3, 4, 0, 2, 3, 4]
const critterFor = (cell: number) => CRITTERS[CRITTER_OF_CELL[cell]]

/** A sprite as one rect per horizontal run, each with its build-up delay (ms). */
function runs(sprite: Sprite) {
  const out: { x: number; y: number; w: number; delay: number }[] = []
  sprite.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (row[x] !== "#") {
        x++
        continue
      }
      const start = x
      while (row[x] === "#") x++
      out.push({ x: start, y, w: x - start, delay: y * 55 + ((start * 7) % 3) * 18 })
    }
  })
  return out
}

function size(frames: Sprite[]) {
  return {
    w: Math.max(...frames.flatMap((f) => f.map((r) => r.length))),
    h: Math.max(...frames.map((f) => f.length)),
  }
}

function Pixels({ sprite, ox, oy }: { sprite: Sprite; ox: number; oy: number }) {
  return (
    <>
      {runs(sprite).map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          className="ttt-arcade-px"
          x={ox + r.x}
          y={oy + r.y}
          width={r.w}
          height={1}
          style={{ animationDelay: `${r.delay}ms` }}
        />
      ))}
    </>
  )
}

/** A mark centred in an 11×11 cell: the X, or the critter that lives there. */
function MarkSprite({ mark, cell, className, style }: { mark: Mark; cell: number; className?: string; style?: React.CSSProperties }) {
  const frames = mark === "x" ? [X_SPRITE] : critterFor(cell)
  const { w, h } = size(frames)
  const ox = Math.floor((CELL - w) / 2)
  const oy = Math.floor((CELL - h) / 2)
  return (
    <g className={cn("ttt-arcade-sprite", className)} style={{ "--c": mark === "x" ? MINT : ORANGE, ...style } as React.CSSProperties}>
      {frames.length === 1 ? (
        <Pixels sprite={frames[0]} ox={ox} oy={oy} />
      ) : (
        <>
          <g className="ttt-arcade-f1">
            <Pixels sprite={frames[0]} ox={ox} oy={oy} />
          </g>
          <g className="ttt-arcade-f2">
            <Pixels sprite={frames[1]} ox={ox} oy={oy} />
          </g>
        </>
      )}
    </g>
  )
}

/** Corner brackets: the arcade cursor over a square you can take. */
const CURSOR = [
  [0, 0, 3, 1], [0, 0, 1, 3],
  [8, 0, 3, 1], [10, 0, 1, 3],
  [0, 10, 3, 1], [0, 8, 1, 3],
  [8, 10, 3, 1], [10, 8, 1, 3],
]

/** The win stroke: a stepped line of pixels through the three cell centres. */
function strike(line: number[]) {
  const [a, , c] = [...line].sort((p, q) => p - q)
  const at = (i: number) => ({ x: cellAt(i % 3) + 5, y: cellAt(Math.floor(i / 3)) + 5 })
  const from = at(a)
  const to = at(c)
  const dx = Math.sign(to.x - from.x)
  const dy = Math.sign(to.y - from.y)
  const n = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y))
  return Array.from({ length: n + 9 }, (_, k) => ({ x: from.x + (k - 4) * dx, y: from.y + (k - 4) * dy, k }))
}

const CSS = `
.ttt-arcade-root{container-type:inline-size;width:100%}
.ttt-arcade{--u:calc(min(100cqw,28rem)/41);--grid:#1e1e1e;position:relative;margin:0 auto;width:calc(var(--u)*41);
  padding-bottom:0;background-color:#000;color:#fff;
  background-image:linear-gradient(to right,var(--grid) 1px,transparent 1px),linear-gradient(to bottom,var(--grid) 1px,transparent 1px);
  background-size:var(--u) var(--u);
  font-family:var(--font-mono),ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700;text-transform:uppercase;
  -webkit-font-smoothing:none;user-select:none}
@supports (width:round(down,10.5px,1px)){.ttt-arcade{--u:round(down,min(100cqw,28rem)/41,1px)}}
.ttt-arcade-hud{display:flex;justify-content:space-between;align-items:center;height:calc(var(--u)*3);padding:calc(var(--u)*1) var(--u) 0;
  font-size:calc(var(--u)*1.25);letter-spacing:.14em;color:#8a8a8a;line-height:1}
.ttt-arcade-hud b{color:${YELLOW};font-weight:700}
.ttt-arcade-seats{display:grid;grid-template-columns:calc(var(--u)*18) calc(var(--u)*3) calc(var(--u)*18);margin:var(--u) var(--u) 0;height:calc(var(--u)*7)}
.ttt-arcade-vs{display:flex;align-items:center;justify-content:center;font-size:calc(var(--u)*1.3);color:#fff;text-shadow:1px 1px 0 ${ORANGE}}
.ttt-arcade-seat{--b:max(2px,calc(var(--u)*.3));--bc:color-mix(in srgb,var(--mc) 45%,transparent);position:relative;display:flex;align-items:center;gap:var(--u);
  margin:var(--b);padding:0 calc(var(--u) - var(--b));min-width:0;background:rgba(0,0,0,.72);
  box-shadow:0 calc(var(--b)*-1) 0 0 var(--bc),0 var(--b) 0 0 var(--bc),calc(var(--b)*-1) 0 0 0 var(--bc),var(--b) 0 0 0 var(--bc)}
.ttt-arcade-seat.is-right{flex-direction:row-reverse;text-align:right}
.ttt-arcade-seat.is-active{--bc:${YELLOW};background:rgba(255,238,0,.1);animation:ttt-arcade-glow 1s steps(1,end) infinite}
.ttt-arcade-seat.is-away{opacity:.5}
.ttt-arcade-tag{position:absolute;top:calc(var(--b)*-1 - var(--u)*.65);left:var(--u);padding:0 calc(var(--u)*.4);font-size:calc(var(--u)*1.05);line-height:calc(var(--u)*1.3);
  letter-spacing:.1em;background:#000;color:var(--mc);white-space:nowrap}
.ttt-arcade-seat.is-right .ttt-arcade-tag{left:auto;right:var(--u)}
.ttt-arcade-seat.is-active .ttt-arcade-tag{background:${YELLOW};color:#000;animation:ttt-arcade-tag 1s steps(1,end) infinite}
.ttt-arcade-avatar{width:calc(var(--u)*5)!important;height:calc(var(--u)*5)!important;flex-shrink:0;border-radius:0!important;box-shadow:0 0 0 max(1px,calc(var(--u)*.2)) var(--mc);font-size:calc(var(--u)*1.6)}
.ttt-arcade-avatar *,.ttt-arcade-avatar::after{border-radius:0!important}
.ttt-arcade-avatar::after{display:none}
.ttt-arcade-avatar [data-slot=avatar-fallback]{background:#111;color:var(--mc)}
.ttt-arcade-info{display:flex;flex-direction:column;justify-content:center;gap:calc(var(--u)*.45);min-width:0;flex:1}
.ttt-arcade-seat.is-right .ttt-arcade-info{align-items:flex-end}
.ttt-arcade-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(var(--u)*1.35);line-height:1.1;letter-spacing:.08em;color:#fff}
.ttt-arcade-score{display:flex;align-items:center;gap:calc(var(--u)*.6);font-size:calc(var(--u)*2.5);line-height:1;letter-spacing:.06em;color:${YELLOW};
  text-shadow:calc(var(--u)*.25) calc(var(--u)*.25) 0 #a3360a;font-variant-numeric:tabular-nums}
.ttt-arcade-seat.is-right .ttt-arcade-score{flex-direction:row-reverse}
.ttt-arcade-mini{width:calc(var(--u)*2.1);height:calc(var(--u)*2.1);flex-shrink:0;fill:var(--mc)}
.ttt-arcade-status{display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*.3);height:calc(var(--u)*3);margin-top:var(--u);padding:0 var(--u);
  font-size:calc(var(--u)*1.5);letter-spacing:.14em;line-height:1;white-space:nowrap;overflow:hidden;color:#bdbdbd}
.ttt-arcade-status>span{overflow:hidden;text-overflow:ellipsis}
.ttt-arcade-status.is-turn{color:${YELLOW};text-shadow:2px 2px 0 #7a4a00}
.ttt-arcade-status.is-win{color:${MINT};text-shadow:2px 2px 0 #00664a;animation:ttt-arcade-blink .5s steps(1,end) infinite}
.ttt-arcade-status.is-lose{color:${ORANGE};text-shadow:2px 2px 0 #5a1d00}
.ttt-arcade-status.is-draw{color:#fff}
.ttt-arcade-caret{display:inline-block;flex-shrink:0;width:calc(var(--u)*.9);height:calc(var(--u)*1.5);background:currentColor;animation:ttt-arcade-blink 1s steps(1,end) infinite}
.ttt-arcade-board{position:relative;display:grid;width:calc(var(--u)*41);height:calc(var(--u)*41);
  grid-template-columns:${[EDGE, CELL, BAR, CELL, BAR, CELL, EDGE].map((n) => `calc(var(--u)*${n})`).join(" ")};
  grid-template-rows:${[EDGE, CELL, BAR, CELL, BAR, CELL, EDGE].map((n) => `calc(var(--u)*${n})`).join(" ")}}
.ttt-arcade-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ttt-arcade-scan{position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(to right,rgba(0,0,0,.36) 1px,transparent 1px),linear-gradient(to bottom,rgba(0,0,0,.36) 1px,transparent 1px);background-size:var(--u) var(--u)}
.ttt-arcade-cell{position:relative;display:block;width:100%;height:100%;padding:0;border:0;background:none;color:inherit;outline:none;-webkit-tap-highlight-color:transparent}
.ttt-arcade-cell:disabled{cursor:default}
.ttt-arcade-cell svg{display:block;width:100%;height:100%;overflow:visible}
.ttt-arcade-sprite{fill:var(--c)}
.ttt-arcade-f2{opacity:0;animation:ttt-arcade-f2 .9s steps(1,end) infinite;animation-delay:var(--d,0s)}
.ttt-arcade-f1{animation:ttt-arcade-f1 .9s steps(1,end) infinite;animation-delay:var(--d,0s)}
.ttt-arcade-new .ttt-arcade-px{animation:ttt-arcade-build .05s steps(1,end) both}
.ttt-arcade-new{animation:ttt-arcade-flicker .42s steps(1,end) .5s both}
.ttt-arcade-cursor,.ttt-arcade-ghost{opacity:0}
.ttt-arcade-cursor{fill:#fff}
.ttt-arcade-cell.can:hover .ttt-arcade-cursor,.ttt-arcade-cell.can:focus-visible .ttt-arcade-cursor{opacity:1;animation:ttt-arcade-blink .6s steps(1,end) infinite}
.ttt-arcade-cell.can:hover .ttt-arcade-ghost,.ttt-arcade-cell.can:focus-visible .ttt-arcade-ghost{opacity:.3}
.ttt-arcade-cell.can:active .ttt-arcade-cursor{animation:none;opacity:1}
.ttt-arcade-cell.can:active .ttt-arcade-ghost{opacity:.7}
.ttt-arcade-cell.can:active .ttt-arcade-flash{opacity:1}
.ttt-arcade-flash{fill:rgba(255,255,255,.14);opacity:0}
.ttt-arcade-cell.win .ttt-arcade-flash{fill:rgba(255,255,255,.22);animation:ttt-arcade-blink .5s steps(1,end) infinite}
.ttt-arcade-cell.win .ttt-arcade-sprite{animation:ttt-arcade-winfill .5s steps(1,end) infinite}
.ttt-arcade-cell.dim{opacity:.4}
.ttt-arcade-strike rect{animation:ttt-arcade-build .04s steps(1,end) both}
.ttt-arcade-strike{fill:#fff;animation:ttt-arcade-strike .5s steps(1,end) 1.4s infinite}
@keyframes ttt-arcade-f1{0%{opacity:1}50%{opacity:0}}
@keyframes ttt-arcade-f2{0%{opacity:0}50%{opacity:1}}
@keyframes ttt-arcade-build{0%{opacity:0}100%{opacity:1}}
@keyframes ttt-arcade-flicker{0%{opacity:1}25%{opacity:.15}50%{opacity:1}75%{opacity:.15}}
@keyframes ttt-arcade-strike{0%{fill:#fff}50%{fill:${YELLOW}}}
@keyframes ttt-arcade-tag{0%{background:${YELLOW};color:#000}50%{background:#000;color:${YELLOW}}}
@keyframes ttt-arcade-blink{0%{opacity:1}50%{opacity:0}}
@keyframes ttt-arcade-glow{0%{--bc:${YELLOW}}50%{--bc:#b5a800}}
@keyframes ttt-arcade-winfill{0%{fill:#fff}50%{fill:var(--c)}}
@media (prefers-reduced-motion:reduce){
  .ttt-arcade *,.ttt-arcade *::after{animation:none!important}
  .ttt-arcade-f2{opacity:0!important}
  .ttt-arcade-f1,.ttt-arcade-px,.ttt-arcade-new,.ttt-arcade-caret,.ttt-arcade-strike rect{opacity:1}
  .ttt-arcade-cell.win .ttt-arcade-flash{opacity:1}
}
`

/** The arcade cabinet: black pixel-grid screen, yellow bars, mint X's, orange critters. */
export default function ArcadeScene({ board, winLine, lastMove, canPlay, onPlay, me, opponent, status, tone, round, bestOf, toWin }: TttSceneProps) {
  const cells = Array.from(board)
  const won = !!winLine && winLine.length === 3
  return (
    <div className="ttt-arcade-root">
      <style>{CSS}</style>
      <div className="ttt-arcade">
        <div className="ttt-arcade-hud">
          <span>
            Round <b>{Math.min(round, bestOf)}</b>/{bestOf}
          </span>
          <span>
            First to <b>{toWin}</b>
          </span>
        </div>

        <div className="ttt-arcade-seats">
          <Seat seat={me} tag={me.active ? "Your turn" : "1UP · You"} />
          <div className="ttt-arcade-vs" aria-hidden>
            VS
          </div>
          <Seat seat={opponent} tag={opponent.active ? "Their turn" : "2UP"} right />
        </div>

        <p className={cn("ttt-arcade-status", `is-${tone}`)} aria-live="polite">
          <span>{status}</span>
          {(tone === "turn" || tone === "wait") && <i className="ttt-arcade-caret" aria-hidden />}
        </p>

        <div className="ttt-arcade-board" role="grid" aria-label="Board">
          <svg className="ttt-arcade-layer" viewBox={`0 0 ${SIDE} ${SIDE}`} shapeRendering="crispEdges" aria-hidden>
            {[0, 1].map((n) => {
              const at = cellAt(n) + CELL
              return (
                <g key={n} fill={YELLOW}>
                  <rect x={at} y={EDGE} width={BAR} height={SIDE - EDGE * 2} />
                  <rect x={EDGE} y={at} width={SIDE - EDGE * 2} height={BAR} />
                </g>
              )
            })}
          </svg>

          {cells.map((cell, i) => {
            const empty = cell === "."
            const can = canPlay && empty
            const win = won && winLine.includes(i)
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={empty ? `Square ${i + 1}, empty` : `Square ${i + 1}, ${cell.toUpperCase()}`}
                disabled={!can}
                onClick={() => onPlay(i)}
                className={cn("ttt-arcade-cell", can && "can", win && "win", won && !win && !empty && "dim")}
                style={{ gridColumn: (i % 3) * 2 + 2, gridRow: Math.floor(i / 3) * 2 + 2 }}
              >
                <svg viewBox={`0 0 ${CELL} ${CELL}`} shapeRendering="crispEdges" aria-hidden>
                  <rect className="ttt-arcade-flash" width={CELL} height={CELL} />
                  {!empty && (
                    <MarkSprite
                      mark={cell as Mark}
                      cell={i}
                      className={lastMove === i ? "ttt-arcade-new" : undefined}
                      style={{ "--d": `${-(i % 4) * 0.22}s` } as React.CSSProperties}
                    />
                  )}
                  {can && me.mark && <MarkSprite mark={me.mark} cell={i} className="ttt-arcade-ghost" />}
                  {can && (
                    <g className="ttt-arcade-cursor">
                      {CURSOR.map(([x, y, w, h], k) => (
                        <rect key={k} x={x} y={y} width={w} height={h} />
                      ))}
                    </g>
                  )}
                </svg>
              </button>
            )
          })}

          {won && (
            <svg className="ttt-arcade-layer ttt-arcade-strike" viewBox={`0 0 ${SIDE} ${SIDE}`} shapeRendering="crispEdges" aria-hidden>
              {strike(winLine).map((p) => (
                <rect key={p.k} x={p.x} y={p.y} width={1} height={1} style={{ animationDelay: `${300 + p.k * 22}ms` }} />
              ))}
            </svg>
          )}
          <div className="ttt-arcade-scan" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function Seat({ seat, tag, right }: { seat: TttSeat; tag: string; right?: boolean }) {
  const colour = seat.mark === "x" ? MINT : seat.mark === "o" ? ORANGE : "#9a9a9a"
  return (
    <div
      className={cn("ttt-arcade-seat", right && "is-right", seat.active && "is-active", seat.away && "is-away")}
      style={{ "--mc": colour } as React.CSSProperties}
    >
      <span className="ttt-arcade-tag">{seat.away ? "Offline" : tag}</span>
      <UserAvatar src={seat.photo} name={seat.name} size="md" className="ttt-arcade-avatar" />
      <div className="ttt-arcade-info">
        <p className="ttt-arcade-name">{seat.name}</p>
        <p className="ttt-arcade-score">
          {seat.mark && (
            <svg className="ttt-arcade-mini" viewBox="0 0 11 11" shapeRendering="crispEdges" aria-label={seat.mark.toUpperCase()}>
              <MarkSprite mark={seat.mark} cell={right ? 4 : 0} />
            </svg>
          )}
          <span aria-label={`${seat.wins} wins`}>{String(seat.wins).padStart(2, "0")}</span>
        </p>
      </div>
    </div>
  )
}
