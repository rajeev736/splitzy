"use client"

import type * as React from "react"

import { CharacterFill } from "@/components/game-avatar/character-tile"
import { characterById } from "@/components/game-avatar/registry"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Mark, TttSceneProps, TttSeat } from "./types"

/**
 * "Flat duo": a steel-blue table with a red-vs-blue score pill, square player
 * badges and chunky flat marks on dark navy tiles. Every size is in `--u`, a
 * 610th of the scene's width, so the whole table scales like one picture.
 */
export default function FlatScene({
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
  const won = !!winLine?.length
  // The mini "three in a row" shows whose mark is in play: the mover's, the
  // round winner's, or else yours
  const shown: Mark =
    (won && winLine ? (board[winLine[0]] as Mark) : null) ??
    (opponent.active ? opponent.mark : me.mark) ??
    "x"
  const pointer = me.active ? "me" : opponent.active ? "them" : null

  return (
    <div className="ttt-flat-wrap">
      <style>{CSS}</style>
      <div className="ttt-flat">
        <div
          className="ttt-flat-score"
          aria-label={`Score: you ${me.wins}, ${opponent.name} ${opponent.wins}`}
          role="img"
        >
          <div className="ttt-flat-half ttt-flat-half-me">
            <PersonOutline />
            <span>{me.wins}</span>
          </div>
          <div className="ttt-flat-half ttt-flat-half-them">
            <span>{opponent.wins}</span>
            <PersonOutline />
          </div>
          <div className="ttt-flat-vs" aria-hidden>
            <span className="ttt-flat-v">V</span>
            <span className="ttt-flat-s">S</span>
          </div>
        </div>

        <div className="ttt-flat-seats">
          <Badge seat={me} you />
          <Badge seat={opponent} />
          <svg
            className={cn(
              "ttt-flat-turn",
              pointer === "them" && "ttt-flat-turn-them",
              !pointer && "ttt-flat-turn-off"
            )}
            viewBox="0 0 30 36"
            aria-hidden
          >
            <path d="M26 4 L26 32 L4 18 Z" />
          </svg>

          <div className={cn("ttt-flat-mid", !pointer && "ttt-flat-mid-wide")}>
            <p
              className={cn("ttt-flat-status", `ttt-flat-tone-${tone}`)}
              aria-live="polite"
            >
              {status}
            </p>
            <p className="ttt-flat-round">
              Round {Math.min(round, bestOf)} · first to {toWin}
            </p>
          </div>

          <div className="ttt-flat-mini" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="ttt-flat-mini-tile">
                <MarkArt mark={shown} />
              </span>
            ))}
            <span className="ttt-flat-mini-line" />
          </div>
        </div>

        <div
          className={cn(
            "ttt-flat-board",
            canPlay && "ttt-flat-can",
            won && "ttt-flat-over"
          )}
          role="grid"
          aria-label="Board"
        >
          <div className="ttt-flat-grid">
            {Array.from(board).map((cell, i) => {
              const empty = cell === "."
              const at = winLine ? winLine.indexOf(i) : -1
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
                  disabled={!canPlay || !empty}
                  onClick={() => onPlay(i)}
                  className={cn(
                    "ttt-flat-cell",
                    at >= 0 && "ttt-flat-win",
                    !empty && won && at < 0 && "ttt-flat-dim"
                  )}
                  style={
                    at >= 0
                      ? ({ "--ttt-flat-i": at } as React.CSSProperties)
                      : undefined
                  }
                >
                  {!empty && (
                    <span
                      className={cn(
                        "ttt-flat-mark",
                        lastMove === i && "ttt-flat-new"
                      )}
                    >
                      <MarkArt mark={cell as Mark} />
                    </span>
                  )}
                  {empty && canPlay && me.mark && (
                    <span className="ttt-flat-mark ttt-flat-ghost">
                      <MarkArt mark={me.mark} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {winLine && winLine.length === 3 && <Strike line={winLine} />}
        </div>
      </div>
    </div>
  )
}

function Badge({ seat, you }: { seat: TttSeat; you?: boolean }) {
  // Their game character fills the square face (flat look: no frame)
  const character = characterById(seat.avatar)
  return (
    <>
      <div
        className={cn(
          "ttt-flat-badge",
          you ? "ttt-flat-badge-me" : "ttt-flat-badge-them",
          seat.active && "ttt-flat-badge-on",
          seat.away && "ttt-flat-away"
        )}
      >
        {character ? (
          <span className="ttt-flat-face">
            <CharacterFill def={character} shape="square" />
          </span>
        ) : (
          <Avatar className="ttt-flat-face size-auto rounded-none after:hidden">
            {seat.photo && (
              <AvatarImage
                src={seat.photo}
                alt=""
                className="rounded-none"
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="rounded-none bg-transparent">
              {you ? <PersonSolid /> : <Robot />}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <p
        className={cn(
          "ttt-flat-name",
          you ? "ttt-flat-name-me" : "ttt-flat-name-them"
        )}
      >
        {seat.mark && (
          <span className="ttt-flat-name-mark" aria-hidden>
            <MarkArt mark={seat.mark} />
          </span>
        )}
        <span className="ttt-flat-name-text">
          {seat.name}
          {seat.away && " · away"}
        </span>
      </p>
    </>
  )
}

/** A flat mark with its darker copy peeking out underneath. */
function MarkArt({ mark }: { mark: Mark }) {
  return (
    <>
      <svg className="ttt-flat-under" viewBox="0 0 100 100" aria-hidden>
        <MarkPath mark={mark} under />
      </svg>
      <svg className="ttt-flat-top" viewBox="0 0 100 100" aria-hidden>
        <MarkPath mark={mark} />
      </svg>
    </>
  )
}

function MarkPath({ mark, under }: { mark: Mark; under?: boolean }) {
  if (mark === "o") {
    return (
      <circle
        cx="50"
        cy={under ? 54.5 : 50}
        r="30.5"
        fill="none"
        stroke={under ? "#1b5a80" : "#329fdf"}
        strokeWidth="14"
      />
    )
  }
  const dy = under ? 3.5 : 0
  return (
    <path
      d={`M27 ${27 + dy} L73 ${73 + dy} M73 ${27 + dy} L27 ${73 + dy}`}
      fill="none"
      stroke={under ? "#8c2c2f" : "#e14f4b"}
      strokeWidth="17"
      strokeLinecap="round"
    />
  )
}

/** Tile centres in the grid's own units: 170px tiles, 18px gaps. */
const centre = (i: number) => 85 + 188 * i

function Strike({ line }: { line: number[] }) {
  const [a, , c] = line
  const x1 = centre(a % 3)
  const y1 = centre(Math.floor(a / 3))
  const x2 = centre(c % 3)
  const y2 = centre(Math.floor(c / 3))
  const len = Math.hypot(x2 - x1, y2 - y1)
  const ex = ((x2 - x1) / len) * 58
  const ey = ((y2 - y1) / len) * 58
  const d = `M${x1 - ex} ${y1 - ey} L${x2 + ex} ${y2 + ey}`
  return (
    <svg className="ttt-flat-strike" viewBox="0 0 546 546" aria-hidden>
      <path className="ttt-flat-strike-sh" d={d} pathLength={1} />
      <path className="ttt-flat-strike-ln" d={d} pathLength={1} />
    </svg>
  )
}

function PersonOutline() {
  return (
    <svg className="ttt-flat-score-icon" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="12.5" r="7.5" />
      <path d="M6.5 35.5 v-3 a9 9 0 0 1 9 -9 h9 a9 9 0 0 1 9 9 v3 Z" />
    </svg>
  )
}

function PersonSolid() {
  return (
    <svg className="ttt-flat-fallback" viewBox="0 0 100 100" aria-hidden>
      <path
        d="M20 82 a28 24 0 0 1 60 0 a6 6 0 0 1 -6 6 h-48 a6 6 0 0 1 -6 -6 Z"
        fill="#f1ecf2"
      />
      <circle cx="50" cy="38" r="21" fill="#f1ecf2" stroke="#953d49" strokeWidth="5" />
    </svg>
  )
}

function Robot() {
  return (
    <svg className="ttt-flat-fallback" viewBox="0 0 100 100" aria-hidden>
      <rect x="47" y="14" width="6" height="16" rx="3" fill="#7b7a80" />
      <circle cx="50" cy="14" r="7" fill="#7b7a80" />
      <rect x="22" y="30" width="56" height="54" rx="10" fill="#7b7a80" />
      <circle cx="39" cy="52" r="6" fill="#20304a" />
      <circle cx="61" cy="52" r="6" fill="#20304a" />
      <rect x="41" y="67" width="18" height="5" rx="2.5" fill="#20304a" />
    </svg>
  )
}

const U = "var(--u)"
const u = (n: number) => `calc(${n} * ${U})`

const CSS = `
.ttt-flat-wrap{container-type:inline-size;width:100%;max-width:30rem;margin-inline:auto}
.ttt-flat{--u:calc(100cqw / 610);position:relative;display:flex;flex-direction:column;gap:${u(20)};padding:${u(18)} ${u(14)} ${u(24)};border-radius:${u(30)};background:#84aec6;color:#fff;font-weight:800;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}

.ttt-flat-score{position:relative;display:flex;align-self:center;width:${u(446)};height:${u(74)};border-radius:${u(24)};overflow:hidden}
.ttt-flat-half{flex:1;display:flex;align-items:center;justify-content:center;gap:${u(16)};font-size:${u(46)};line-height:1;font-variant-numeric:tabular-nums;color:#f6f0f0}
.ttt-flat-half-me{background:#d55959;padding:0 ${u(37)} 0 0}
.ttt-flat-half-them{background:#6392bc;padding:0 0 0 ${u(37)}}
.ttt-flat-score-icon{width:${u(38)};height:${u(38)};fill:none;stroke:#f6f0f0;stroke-width:3.6;stroke-linejoin:round}
.ttt-flat-vs{position:absolute;inset-block:0;left:50%;width:${u(74)};transform:translateX(-50%);display:flex;align-items:center;justify-content:center;border-radius:${u(22)};background:#eeeaea;font-size:${u(33)};font-weight:900;letter-spacing:-.02em;line-height:1}
.ttt-flat-v{color:#d8504e}.ttt-flat-s{color:#3b95cf}

.ttt-flat-seats{position:relative;height:${u(134)}}
.ttt-flat-badge{position:absolute;top:0;width:${u(90)};height:${u(90)};padding:${u(10)};border-radius:${u(15)};transition:transform .3s cubic-bezier(.3,1.6,.5,1),opacity .3s}
.ttt-flat-badge-me{left:${u(6)};background:#cf4f55;box-shadow:0 ${u(6)} 0 #a3324a}
.ttt-flat-badge-them{right:${u(6)};background:#284861;box-shadow:0 ${u(6)} 0 #163049}
.ttt-flat-badge-on{transform:translateY(${u(-3)})}
.ttt-flat-face{width:100%;height:100%;display:flex;overflow:hidden;border-radius:${u(9)}}
.ttt-flat-badge-me .ttt-flat-face{background:#953d49}
.ttt-flat-badge-them .ttt-flat-face{background:#20304a}
.ttt-flat-face img{width:100%;height:100%;object-fit:cover}
.ttt-flat-fallback{width:84%;height:84%}
.ttt-flat-away{opacity:.55;filter:grayscale(.6)}

.ttt-flat-name{position:absolute;top:${u(104)};display:flex;align-items:center;gap:${u(6)};max-width:${u(200)};font-size:max(11px,${u(24)});line-height:1.2;color:#fff;text-shadow:0 ${u(2)} 0 rgba(35,58,102,.45)}
.ttt-flat-name-me{left:${u(6)}}
.ttt-flat-name-them{right:${u(6)};flex-direction:row-reverse}
.ttt-flat-name-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ttt-flat-name-mark{position:relative;flex:none;width:max(12px,${u(26)});height:max(12px,${u(26)})}

.ttt-flat-turn{position:absolute;top:${u(27)};left:${u(118)};width:${u(30)};height:${u(36)};overflow:visible;fill:#f1ecef;stroke:#f1ecef;stroke-width:6;stroke-linejoin:round;filter:drop-shadow(0 ${u(3)} 0 rgba(52,86,118,.45));transition:left .45s cubic-bezier(.5,1.5,.5,1),transform .45s cubic-bezier(.5,1.5,.5,1),opacity .3s}
.ttt-flat-turn-them{left:calc(100% - ${u(148)});transform:scaleX(-1)}
.ttt-flat-turn-off{opacity:0}

.ttt-flat-mid{position:absolute;top:0;left:${u(156)};right:${u(156)};height:${u(96)};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(4)};text-align:center}
.ttt-flat-mid>*{flex:none}
.ttt-flat-mid-wide{left:${u(108)};right:${u(108)}}
.ttt-flat-status{max-width:100%;font-size:max(12px,${u(27)});line-height:1.15;color:#1f3659;text-wrap:balance;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ttt-flat-tone-wait{color:#2f4c72;font-weight:700}
.ttt-flat-tone-win,.ttt-flat-tone-lose,.ttt-flat-tone-draw{padding:${u(4)} ${u(12)};border-radius:${u(14)};background:#eeeaea;box-shadow:0 ${u(4)} 0 rgba(35,58,102,.3)}
.ttt-flat-tone-win{color:#d8504e}
.ttt-flat-tone-lose{color:#3b7fb5}
.ttt-flat-tone-draw{color:#2f4c72}
.ttt-flat-round{font-size:max(10px,${u(19)});font-weight:700;color:rgba(31,54,89,.7);white-space:nowrap}

.ttt-flat-mini{position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;gap:${u(4)};padding:${u(3)}}
.ttt-flat-mini-tile{position:relative;width:${u(32)};height:${u(32)};border-radius:${u(6)};background:#232f49}
.ttt-flat-mini-tile .ttt-flat-under,.ttt-flat-mini-tile .ttt-flat-top{inset:${u(3)};width:calc(100% - ${u(6)});height:calc(100% - ${u(6)})}
.ttt-flat-mini-line{position:absolute;left:${u(8)};right:${u(8)};top:50%;height:${u(4)};margin-top:${u(-2)};border-radius:${u(2)};background:#ffe2e6}

.ttt-flat-board{position:relative;width:100%;aspect-ratio:1;padding:${u(18)};border-radius:${u(24)};background:#394d82;box-shadow:0 ${u(8)} 0 #233a66}
.ttt-flat-grid{display:grid;width:100%;height:100%;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:${u(18)}}
.ttt-flat-cell{position:relative;display:block;min-width:0;min-height:0;padding:0;border:0;border-radius:${u(15)};background:#29304a;box-shadow:inset 0 ${u(3)} 0 rgba(10,14,34,.25);cursor:default;outline:none;transition:background-color .15s,transform .12s,box-shadow .12s}
.ttt-flat-can .ttt-flat-cell:enabled{cursor:pointer}
@media (hover:hover){.ttt-flat-can .ttt-flat-cell:enabled:hover{background:#2f375a}.ttt-flat-can .ttt-flat-cell:enabled:hover .ttt-flat-ghost{opacity:.3}}
.ttt-flat-can .ttt-flat-cell:enabled:active{transform:translateY(${u(4)});background:#252b43;box-shadow:inset 0 ${u(7)} 0 rgba(10,14,34,.35)}
.ttt-flat-cell:focus-visible{box-shadow:0 0 0 ${u(5)} #f1ecef}

.ttt-flat-mark{position:absolute;inset:0;pointer-events:none}
.ttt-flat-under,.ttt-flat-top{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.ttt-flat-cell .ttt-flat-top,.ttt-flat-cell .ttt-flat-under{transform-origin:50% 72%}
.ttt-flat-ghost{opacity:0;transition:opacity .15s}
.ttt-flat-ghost .ttt-flat-under{display:none}

.ttt-flat-new .ttt-flat-top{animation:ttt-flat-drop .62s cubic-bezier(.3,.7,.4,1) both}
.ttt-flat-new .ttt-flat-under{animation:ttt-flat-base .62s ease-out both}
@keyframes ttt-flat-drop{0%{transform:translateY(-38%) scale(1.3);opacity:0}38%{transform:translateY(4.5%) scale(1.14,.82);opacity:1}58%{transform:translateY(-4%) scale(.95,1.07)}76%{transform:translateY(1.5%) scale(1.03,.97)}100%{transform:none}}
@keyframes ttt-flat-base{0%{transform:scale(.6);opacity:0}38%{transform:scale(1.12,.86);opacity:1}58%{transform:scale(.97,1.04)}100%{transform:none}}

.ttt-flat-win{animation:ttt-flat-pulse 1.3s ease-in-out calc(var(--ttt-flat-i,0) * .12s + .5s) infinite both}
.ttt-flat-win .ttt-flat-mark{animation:ttt-flat-bob 1.3s ease-in-out calc(var(--ttt-flat-i,0) * .12s + .5s) infinite both}
@keyframes ttt-flat-pulse{0%,100%{background:#29304a;box-shadow:inset 0 ${u(3)} 0 rgba(10,14,34,.25),0 0 0 0 rgba(241,236,239,0)}50%{background:#36406a;box-shadow:inset 0 ${u(3)} 0 rgba(10,14,34,.25),0 0 0 ${u(5)} rgba(241,236,239,.75)}}
@keyframes ttt-flat-bob{0%,100%{transform:none}50%{transform:scale(1.07)}}
.ttt-flat-dim .ttt-flat-mark{opacity:.45;transition:opacity .4s .3s}

.ttt-flat-strike{position:absolute;inset:${u(18)};width:calc(100% - ${u(36)});height:calc(100% - ${u(36)});overflow:visible;pointer-events:none}
.ttt-flat-strike path{fill:none;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:ttt-flat-draw .5s cubic-bezier(.6,0,.3,1) .3s forwards}
.ttt-flat-strike-ln{stroke:#fff3f4;stroke-width:16}
.ttt-flat-strike-sh{stroke:rgba(14,20,44,.45);stroke-width:16;transform:translateY(6px)}
@keyframes ttt-flat-draw{to{stroke-dashoffset:0}}

@media (prefers-reduced-motion:reduce){
.ttt-flat *{animation:none!important;transition:none!important}
.ttt-flat-strike path{stroke-dashoffset:0}
}
`
