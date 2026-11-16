"use client"

import type * as React from "react"
import { Nunito } from "next/font/google"

import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"
import type { Mark, TttSceneProps, TttSeat } from "./types"

// The reference's soft, rounded lettering (only this skin loads it)
const rounded = Nunito({ subsets: ["latin"], weight: ["800", "900"], display: "swap" })

/**
 * Pastel: a navy keypad "tablet" on a lavender desk. Nine raised keycaps
 * (empty ones show their faint number), pink rings and cyan crosses, and a
 * sign hanging underneath that says whose turn it is. All of it is CSS sized
 * in container units (cqw of the device's width), so it scales as one piece.
 */
export default function PastelScene({ board, winLine, lastMove, canPlay, onPlay, me, opponent, status, tone, round, bestOf, toWin }: TttSceneProps) {
  const myMark = me.mark ?? "x"
  const won = winLine?.length ? (board[winLine[0]] as Mark) : null
  return (
    <div className={cn("ttt-pastel-root", rounded.className)}>
      <PastelStyles />
      <Backdrop />

      <div className="ttt-pastel-players">
        <Chip seat={me} />
        <Chip seat={opponent} flip />
      </div>

      <div className="ttt-pastel-stage">
        <div className="ttt-pastel-device">
          <span className="ttt-pastel-handle" aria-hidden />
          <div className={cn("ttt-pastel-board", won && "has-win")} role="grid" aria-label="Board">
            {Array.from(board).map((cell, i) => {
              const empty = cell === "."
              const win = !!winLine?.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  aria-label={empty ? `Square ${i + 1}, empty` : `Square ${i + 1}, ${cell.toUpperCase()}`}
                  disabled={!canPlay || !empty}
                  onClick={() => onPlay(i)}
                  className={cn(
                    "ttt-pastel-cell",
                    empty && canPlay && "is-open",
                    !empty && `is-${cell}`,
                    lastMove === i && !empty && "is-new",
                    win && "is-win"
                  )}
                  style={win ? ({ "--ttt-pastel-i": winLine!.indexOf(i) } as React.CSSProperties) : undefined}
                >
                  <span className="ttt-pastel-face">
                    {empty ? (
                      <>
                        <span className="ttt-pastel-num" aria-hidden>
                          {i + 1}
                        </span>
                        {canPlay && <Glyph mark={myMark} className="ttt-pastel-ghost" />}
                      </>
                    ) : (
                      <Glyph mark={cell as Mark} />
                    )}
                  </span>
                </button>
              )
            })}
            {[0, 1, 2, 3].map((k) => (
              <span key={k} className={cn("ttt-pastel-pin", k % 2 ? "is-right" : "is-left", k > 1 ? "is-low" : "is-high")} aria-hidden />
            ))}
          </div>
        </div>

        <div className="ttt-pastel-hang">
          <span className="ttt-pastel-post is-left" aria-hidden />
          <span className="ttt-pastel-post is-right" aria-hidden />
          <div className="ttt-pastel-sign" role="status" aria-live="polite">
            <span className="sr-only">{status}</span>
            <SignText me={me} opponent={opponent} status={status} tone={tone} won={won} />
          </div>
        </div>

        <Pager me={me} opponent={opponent} round={round} bestOf={bestOf} toWin={toWin} />
      </div>
    </div>
  )
}

/** A ring or a cross; each stroke draws itself in when its cell is new. */
function Glyph({ mark, className }: { mark: Mark; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("ttt-pastel-glyph", `is-${mark}`, className)} aria-hidden>
      {mark === "o" ? (
        <path className="ttt-pastel-ink" pathLength={1} d="M50 24.5a25.5 25.5 0 1 1 0 51a25.5 25.5 0 1 1 0-51" />
      ) : (
        <>
          <path className="ttt-pastel-ink" pathLength={1} d="M29 29 71 71" />
          <path className="ttt-pastel-ink" pathLength={1} d="M71 29 29 71" />
        </>
      )}
    </svg>
  )
}

/** "PRIYA'S TURN" with a turning spinner, or the round's result. */
function SignText({ me, opponent, status, tone, won }: Pick<TttSceneProps, "me" | "opponent" | "status" | "tone"> & { won: Mark | null }) {
  const turn = tone === "turn" || tone === "wait" ? (me.active ? me : opponent.active ? opponent : null) : null
  if (turn) {
    const who = turn === me ? "Your" : `${turn.name}’s`
    return (
      <span className="ttt-pastel-say" aria-hidden>
        <span className={cn("ttt-pastel-spin", turn.mark && `is-${turn.mark}`)}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="6.5" pathLength={100} />
          </svg>
        </span>
        <span className={cn("ttt-pastel-who", turn.mark && `is-${turn.mark}`)}>{who}</span>
        <span className="ttt-pastel-turn">turn</span>
      </span>
    )
  }
  return (
    <span className="ttt-pastel-say" aria-hidden>
      <span className="ttt-pastel-badge">{won ? <Glyph mark={won} /> : <span className="ttt-pastel-even">=</span>}</span>
      <span className={cn("ttt-pastel-turn", tone === "win" && "is-cheer")}>{status}</span>
    </span>
  )
}

function Chip({ seat, flip }: { seat: TttSeat; flip?: boolean }) {
  return (
    <div className={cn("ttt-pastel-chip", flip && "is-flip", seat.mark && `is-${seat.mark}`, seat.active && "is-active", seat.away && "is-away")}>
      <UserAvatar src={seat.photo} name={seat.name} size="sm" className="ttt-pastel-avatar shrink-0" />
      <span className="ttt-pastel-id">
        <span className="ttt-pastel-name">{seat.name}</span>
        <span className="ttt-pastel-tag">
          {seat.mark && <Glyph mark={seat.mark} className="ttt-pastel-mini" />}
          {seat.away ? "away" : seat.active ? "playing" : ""}
        </span>
      </span>
      <span className="ttt-pastel-score" aria-label={`${seat.wins} ${seat.wins === 1 ? "win" : "wins"}`}>
        {seat.wins}
      </span>
    </div>
  )
}

/** The page dots: one per round, coloured by who took it, the current one ringed. */
function Pager({ me, opponent, round, bestOf, toWin }: Pick<TttSceneProps, "me" | "opponent" | "round" | "bestOf" | "toWin">) {
  const n = Math.min(Math.max(bestOf, round), 9)
  const draws = Math.max(0, round - 1 - me.wins - opponent.wins)
  const dots = [
    ...Array<string>(me.wins).fill(`is-${me.mark ?? "o"}`),
    ...Array<string>(opponent.wins).fill(`is-${opponent.mark ?? "x"}`),
    ...Array<string>(draws).fill("is-draw"),
  ]
  const now = Math.min(round, n) - 1
  return (
    <div className="ttt-pastel-pager">
      <span className="ttt-pastel-dots" aria-hidden>
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={cn("ttt-pastel-dot", dots[i], i === now && !dots[i] && "is-now")} />
        ))}
      </span>
      <span className="ttt-pastel-round">
        Round {Math.min(round, bestOf)} · first to {toWin}
      </span>
    </div>
  )
}

/** The lavender desk: a faint grid, soft hills and a few tilted app tiles. */
function Backdrop() {
  return (
    <div className="ttt-pastel-desk" aria-hidden>
      <span className="ttt-pastel-hill is-a" />
      <span className="ttt-pastel-hill is-b" />
      <span className="ttt-pastel-note" />
      <span className="ttt-pastel-bit is-a" />
      <span className="ttt-pastel-bit is-b" />
      <span className="ttt-pastel-app is-sparkle">
        <svg viewBox="0 0 48 48">
          <path d="M24 6c1.6 9.6 8.4 16.4 18 18-9.6 1.6-16.4 8.4-18 18-1.6-9.6-8.4-16.4-18-18 9.6-1.6 16.4-8.4 18-18Z" fill="#4c64ab" stroke="#a0e1fd" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="ttt-pastel-app is-sprout">
        <svg viewBox="0 0 48 48">
          <path d="M24 40V24" stroke="#c9f0b3" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M24 26c-1-7-6-11-15-11 0 8 5 12 15 11Z" fill="#c9f0b3" />
          <path d="M24 24c1-7 6-11 15-11 0 8-5 12-15 11Z" fill="#c9f0b3" />
          <path d="M14 16.5c3 1.5 6 4 8.5 8M34 14.5c-3 1.5-6 4-8.5 8" stroke="#7fae86" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="ttt-pastel-app is-star">
        <svg viewBox="0 0 48 48">
          <path d="m24 7 5.2 10.6 11.6 1.7-8.4 8.2 2 11.6L24 33.6 13.6 39.1l2-11.6-8.4-8.2 11.6-1.7Z" fill="#8b859f" stroke="#f8e7c9" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="ttt-pastel-app is-heart">
        <svg viewBox="0 0 48 48">
          <path d="M24 40C9 31 6 23 6 17.5 6 12 10.2 8 15.2 8c3.7 0 6.8 2 8.8 5.2C26 10 29.1 8 32.8 8 37.8 8 42 12 42 17.5 42 23 39 31 24 40Z" fill="#8a72c0" stroke="#f6bdff" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  )
}

/* Colours sampled from the reference: desk #929df6, tablet #2c2c5e, keycap
   #3d4293 on #323578, handle #626ccd, pins #7d8cff, sign #32377b on #272861,
   rings #ffbfff, crosses #a4e4ff. */
const CSS = `.ttt-pastel-root{--ttt-pastel-o:#ffbfff;--ttt-pastel-x:#a4e4ff;--ttt-pastel-navy:#2c2c5e;position:relative;isolation:isolate;overflow:hidden;width:100%;max-width:30rem;margin-inline:auto;display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:.5rem .5rem .45rem;border-radius:1.5rem;background:linear-gradient(180deg,#9caeff 0%,#929df6 38%,#8e99f3 100%);color:#f5f7ff;container-type:inline-size;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.ttt-pastel-root .is-o{--ttt-pastel-ink:var(--ttt-pastel-o);--ttt-pastel-deep:#d58fe6}
.ttt-pastel-root .is-x{--ttt-pastel-ink:var(--ttt-pastel-x);--ttt-pastel-deep:#6fb8de}
.ttt-pastel-desk{position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.075) 1px,transparent 1px);background-size:2.6rem 2.6rem;background-position:-1px -1px}
.ttt-pastel-hill{position:absolute;border-radius:50%;background:rgba(106,116,226,.16)}
.ttt-pastel-hill.is-a{left:-30%;top:-62%;width:160%;height:80%;background:rgba(160,180,255,.32)}
.ttt-pastel-hill.is-b{right:-38%;bottom:-28%;width:95%;height:70%;border-radius:46% 54% 40% 60%}
.ttt-pastel-note{position:absolute;right:-7%;top:12%;width:16%;aspect-ratio:1;border-radius:12%;background:#f6b9ef;opacity:.55;transform:rotate(32deg)}
.ttt-pastel-bit{position:absolute;width:.55rem;height:.55rem;background:#a2b4fe}
.ttt-pastel-bit.is-a{right:10%;top:7%}
.ttt-pastel-bit.is-b{left:7%;bottom:9%}
.ttt-pastel-app{position:absolute;display:grid;place-items:center;width:clamp(2.6rem,15cqw,4.6rem);aspect-ratio:1;border-radius:24%;background:#3d4293;box-shadow:0 .4rem 0 #32367d;transform:rotate(var(--ttt-pastel-tilt));animation:ttt-pastel-float 7s ease-in-out infinite}
.ttt-pastel-app svg{width:58%;height:58%}
.ttt-pastel-app.is-sparkle{--ttt-pastel-tilt:-24deg;left:-5%;top:44%}
.ttt-pastel-app.is-sprout{--ttt-pastel-tilt:14deg;right:-3%;top:30%;animation-delay:-2s}
.ttt-pastel-app.is-star{--ttt-pastel-tilt:12deg;left:-2%;bottom:13%;animation-delay:-4s}
.ttt-pastel-app.is-heart{--ttt-pastel-tilt:-18deg;right:-6%;bottom:6%;animation-delay:-5.5s}
.ttt-pastel-players{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.4rem;width:min(100%,23rem)}
.ttt-pastel-chip{--ttt-pastel-ink:#c9d2ff;display:flex;align-items:center;gap:.4rem;min-width:0;padding:.28rem .5rem .28rem .28rem;border-radius:.9rem;background:#3d4293;box-shadow:0 .2rem 0 #2c2f6e,0 0 0 2px transparent;transition:transform .2s ease,box-shadow .2s ease,opacity .2s}
.ttt-pastel-chip.is-flip{flex-direction:row-reverse;text-align:right;padding:.28rem .28rem .28rem .5rem}
.ttt-pastel-chip.is-active{transform:translateY(-2px);box-shadow:0 .2rem 0 #2c2f6e,0 0 0 2px var(--ttt-pastel-ink),0 0 .9rem rgba(255,255,255,.25)}
.ttt-pastel-chip.is-away{opacity:.55}
.ttt-pastel-avatar{box-shadow:0 0 0 2px var(--ttt-pastel-ink)}
.ttt-pastel-id{display:flex;flex:1;flex-direction:column;min-width:0;line-height:1.1}
.ttt-pastel-name{overflow:hidden;font-size:.72rem;font-weight:900;letter-spacing:.06em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
.ttt-pastel-tag{display:flex;align-items:center;gap:.25rem;min-height:.85rem;font-size:.58rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#aab4ff}
.is-flip .ttt-pastel-tag{flex-direction:row-reverse}
.ttt-pastel-glyph.ttt-pastel-mini{width:.85rem;height:.85rem;flex:none}
.ttt-pastel-mini .ttt-pastel-ink{stroke-width:15}
.ttt-pastel-score{flex:none;min-width:1.6rem;padding:.1rem .3rem .2rem;border-radius:.5rem;background:#2c2c5e;box-shadow:inset 0 -.15rem 0 #232450;font-size:1.05rem;font-weight:900;line-height:1.1;text-align:center;color:var(--ttt-pastel-ink);font-variant-numeric:tabular-nums}
.ttt-pastel-stage{position:relative;z-index:1;width:min(100%,23rem);container-type:inline-size}
.ttt-pastel-device{position:relative;z-index:1;padding:8.6cqw 4.6cqw 4.4cqw;border-radius:6cqw;background:var(--ttt-pastel-navy);box-shadow:0 2cqw 5cqw rgba(38,42,110,.28)}
.ttt-pastel-handle{position:absolute;left:50%;top:2.8cqw;width:24cqw;height:3.8cqw;border-radius:99px;background:#626ccd;transform:translateX(-50%)}
.ttt-pastel-handle::before{content:"";position:absolute;left:50%;bottom:62%;width:9.6cqw;height:3cqw;border-radius:99px 99px 0 0;background:inherit;transform:translateX(-50%)}
.ttt-pastel-board{--ttt-pastel-gap:5.2cqw;position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:var(--ttt-pastel-gap);aspect-ratio:1}
.ttt-pastel-pin{position:absolute;width:3cqw;height:3cqw;border-radius:50%;background:#7d8cff;transform:translate(-50%,-50%);pointer-events:none}
.ttt-pastel-pin.is-left{left:calc((100% - 2*var(--ttt-pastel-gap))/3 + var(--ttt-pastel-gap)/2)}
.ttt-pastel-pin.is-right{left:calc((100% - 2*var(--ttt-pastel-gap))*2/3 + var(--ttt-pastel-gap)*1.5)}
.ttt-pastel-pin.is-high{top:calc((100% - 2*var(--ttt-pastel-gap))/3 + var(--ttt-pastel-gap)/2)}
.ttt-pastel-pin.is-low{top:calc((100% - 2*var(--ttt-pastel-gap))*2/3 + var(--ttt-pastel-gap)*1.5)}
.ttt-pastel-cell{--ttt-pastel-edge:2.7cqw;position:relative;display:block;min-width:0;min-height:0;padding:0;border:0;border-radius:3.6cqw;background:#323578;color:inherit;font:inherit;cursor:default;outline:none;transition:opacity .3s}
.ttt-pastel-face{position:absolute;inset:0 0 var(--ttt-pastel-edge);display:grid;place-items:center;border-radius:3.6cqw;background:#3d4293;transition:transform .12s ease,background-color .15s}
.ttt-pastel-face>*{grid-area:1/1}
.ttt-pastel-num{font-size:10.5cqw;font-weight:900;line-height:1;color:#474ea3;transition:opacity .15s}
.ttt-pastel-glyph{width:100%;height:100%;overflow:visible}
.ttt-pastel-ink{fill:none;stroke:var(--ttt-pastel-ink);stroke-width:11.5;stroke-linecap:round;stroke-dasharray:1 2;stroke-dashoffset:0}
.ttt-pastel-ghost{opacity:0;transition:opacity .15s}
.ttt-pastel-cell.is-open{cursor:pointer}
.ttt-pastel-cell.is-open:hover .ttt-pastel-face{background:#4950aa}
.ttt-pastel-cell.is-open:hover .ttt-pastel-num{opacity:0}
.ttt-pastel-cell.is-open:hover .ttt-pastel-ghost{opacity:.4}
.ttt-pastel-cell.is-open:active .ttt-pastel-face{transform:translateY(calc(var(--ttt-pastel-edge)*.8))}
.ttt-pastel-cell:focus-visible{box-shadow:0 0 0 .7cqw var(--ttt-pastel-navy),0 0 0 1.5cqw var(--ttt-pastel-x)}
.ttt-pastel-cell.is-new .ttt-pastel-face{animation:ttt-pastel-press .45s cubic-bezier(.3,.7,.4,1)}
.ttt-pastel-cell.is-new .ttt-pastel-ink{animation:ttt-pastel-draw .34s ease-out .12s both}
.ttt-pastel-cell.is-new .ttt-pastel-ink+.ttt-pastel-ink{animation-delay:.36s}
.ttt-pastel-cell.is-new.is-o .ttt-pastel-ink{animation-duration:.5s}
.ttt-pastel-board.has-win .ttt-pastel-cell:not(.is-win){opacity:.55}
.ttt-pastel-cell.is-win{z-index:1;background:var(--ttt-pastel-deep);animation:ttt-pastel-bob 1.1s ease-in-out calc(.45s + var(--ttt-pastel-i,0)*.14s) infinite}
.ttt-pastel-cell.is-win .ttt-pastel-face{background:var(--ttt-pastel-ink);transition:background-color .3s ease .25s}
.ttt-pastel-cell.is-win .ttt-pastel-glyph{--ttt-pastel-ink:var(--ttt-pastel-navy)}
.ttt-pastel-hang{position:relative;z-index:2;margin-top:-3.4cqw;padding-top:6.8cqw}
.ttt-pastel-post{position:absolute;top:0;z-index:1;width:3.3cqw;height:10.4cqw;border-radius:99px;background:#3c4391;box-shadow:inset 0 -1.6cqw 0 #2f3478}
.ttt-pastel-post.is-left{left:8.6cqw}
.ttt-pastel-post.is-right{right:8.6cqw}
.ttt-pastel-sign{position:relative;display:flex;align-items:center;justify-content:center;height:max(12cqw,2.15rem);padding:0 4cqw max(1.9cqw,.3rem);border-radius:3.6cqw;background:#32377b;box-shadow:inset 0 calc(-1*max(1.9cqw,.3rem)) 0 #272861,0 1.4cqw 0 rgba(58,64,160,.22)}
.ttt-pastel-say{display:flex;align-items:center;justify-content:center;gap:.5em;min-width:0;font-size:clamp(.78rem,4.9cqw,1.15rem);font-weight:900;line-height:1;letter-spacing:.11em;text-transform:uppercase;white-space:nowrap}
.ttt-pastel-who{overflow:hidden;min-width:0;max-width:11em;color:var(--ttt-pastel-ink,#a4e4ff);text-overflow:ellipsis}
.ttt-pastel-turn{overflow:hidden;min-width:0;color:#f5f7ff;text-overflow:ellipsis}
.ttt-pastel-turn.is-cheer{color:#fff6d9}
.ttt-pastel-spin,.ttt-pastel-badge{display:grid;flex:none;place-items:center;width:1.55em;height:1.55em;border-radius:50%;background:#26285a}
.ttt-pastel-spin svg{width:100%;height:100%;animation:ttt-pastel-spin 1.1s linear infinite}
.ttt-pastel-spin circle{fill:none;stroke:var(--ttt-pastel-ink,#a4e4ff);stroke-width:2.6;stroke-linecap:round;stroke-dasharray:68 100}
.ttt-pastel-badge .ttt-pastel-glyph.is-o,.ttt-pastel-badge .ttt-pastel-glyph.is-x{width:78%;height:78%}
.ttt-pastel-badge .ttt-pastel-ink{stroke-width:14}
.ttt-pastel-even{font-size:1.1em;color:#c9d2ff}
.ttt-pastel-pager{display:flex;align-items:center;justify-content:center;gap:.55rem;margin-top:.45rem;min-height:.75rem}
.ttt-pastel-dots{display:flex;gap:.4rem}
.ttt-pastel-dot{width:.55rem;height:.55rem;border-radius:50%;background:#2c2a69;opacity:.45;transition:background-color .3s,opacity .3s}
.ttt-pastel-dot.is-o,.ttt-pastel-dot.is-x{background:var(--ttt-pastel-ink);opacity:1}
.ttt-pastel-dot.is-draw{background:#e6e9ff;opacity:1}
.ttt-pastel-dot.is-now{opacity:1}
.ttt-pastel-round{font-size:.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#2c2a69;opacity:.7}
@keyframes ttt-pastel-press{0%{transform:translateY(0)}28%{transform:translateY(var(--ttt-pastel-edge))}62%{transform:translateY(-.6cqw)}100%{transform:translateY(0)}}
@keyframes ttt-pastel-draw{0%{stroke-dashoffset:1;opacity:0}12%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}
@keyframes ttt-pastel-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6cqw)}}
@keyframes ttt-pastel-spin{to{transform:rotate(360deg)}}
@keyframes ttt-pastel-float{0%,100%{transform:rotate(var(--ttt-pastel-tilt)) translateY(0)}50%{transform:rotate(calc(var(--ttt-pastel-tilt) + 4deg)) translateY(-.35rem)}}
@media (prefers-reduced-motion:reduce){.ttt-pastel-root *,.ttt-pastel-root *::before{animation:none!important;transition:none!important}}`

function PastelStyles() {
  return <style>{CSS}</style>
}
