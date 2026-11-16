"use client"

import type * as React from "react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"
import type { Mark, TttSceneProps, TttSeat } from "./types"

/**
 * "Night blue": a royal-blue table with a halftone glow at the top and bottom,
 * two player cards whose avatars sit on the card's top edge (the player on
 * turn gets a gold timer ring and a "Your Turn" pointer), and a navy board of
 * near-black tiles — bright green rings, crimson X's, and the winning row
 * flooding with the winner's colour one tile after another.
 *
 * Everything is sized in container units (`cqw`) so the table scales as one
 * picture from a 288px phone to a desktop column; on short screens the cards
 * shrink so the whole table still fits above the room's dock.
 */
export default function NeonScene({ board, winLine, lastMove, canPlay, onPlay, me, opponent, status, tone, round, bestOf, toWin }: TttSceneProps) {
  const over = tone === "win" || tone === "lose" || tone === "draw"
  const turn = over ? null : me.active ? "me" : opponent.active ? "opponent" : null
  // Once a round is won, the winner's card stays lit
  const winning = winLine ? board[winLine[0]] : null

  return (
    <div className="ttt-neon">
      <style>{CSS}</style>
      <div className="ttt-neon-in">
        <p className="ttt-neon-round">
          Round {Math.min(round, bestOf)}
          {bestOf > 1 && <> · first to {toWin}</>}
        </p>

        <div className="ttt-neon-pair">
          <SeatCard seat={me} on={turn === "me"} won={!!winning && winning === me.mark} />
          <SeatCard seat={opponent} on={turn === "opponent"} won={!!winning && winning === opponent.mark} />
        </div>

        <p className="sr-only" aria-live="polite">
          {status}
        </p>
        <div className="ttt-neon-pair ttt-neon-status" aria-hidden>
          {turn ? (
            <div className={cn("ttt-neon-turn", turn === "opponent" && "ttt-neon-turn-r")}>
              <span>{turn === "me" ? "Your Turn" : "Their Turn"}</span>
              <Chevrons />
            </div>
          ) : (
            <p className={cn("ttt-neon-result", `ttt-neon-t-${tone}`)}>{status}</p>
          )}
        </div>

        <div className="ttt-neon-board" role="grid" aria-label="Board">
          {Array.from(board).map((cell, i) => {
            const mark = cell === "x" || cell === "o" ? cell : null
            const step = winLine?.indexOf(i) ?? -1
            const playable = canPlay && !mark
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={mark ? `Square ${i + 1}, ${mark.toUpperCase()}` : `Square ${i + 1}, empty`}
                disabled={!playable}
                onClick={() => onPlay(i)}
                className={cn(
                  "ttt-neon-cell",
                  mark && `ttt-neon-c${mark}`,
                  playable && "ttt-neon-play",
                  playable && me.mark && `ttt-neon-c${me.mark}`,
                  step >= 0 && "ttt-neon-win"
                )}
                style={step >= 0 ? ({ "--d": `${250 + step * 170}ms` } as React.CSSProperties) : undefined}
              >
                {mark ? (
                  <span className={cn("ttt-neon-mark", lastMove === i && "ttt-neon-pop")}>
                    <MarkArt mark={mark} />
                  </span>
                ) : playable && me.mark ? (
                  <span className="ttt-neon-mark ttt-neon-ghost">
                    <MarkArt mark={me.mark} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SeatCard({ seat, on, won }: { seat: TttSeat; on: boolean; won: boolean }) {
  return (
    <div className={cn("ttt-neon-card", (on || won) && "ttt-neon-on", won && !on && "ttt-neon-won", seat.away && "ttt-neon-away")}>
      <span className="ttt-neon-wins" title={`${seat.wins} ${seat.wins === 1 ? "round" : "rounds"} won`}>
        <svg viewBox="0 0 20 20" aria-hidden>
          <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" fill="currentColor" />
        </svg>
        <span className="sr-only">Wins: </span>
        {seat.wins}
      </span>
      <span className="ttt-neon-ava">
        {on && <span className="ttt-neon-ring" />}
        <span className="ttt-neon-photo">
          <UserAvatar src={seat.photo} name={seat.name} size="xl" className="size-full text-[length:max(14px,5cqw)]" />
        </span>
        {seat.away && <span className="ttt-neon-awaytag">Away</span>}
      </span>
      <p className="ttt-neon-name">{seat.name}</p>
      <span className={cn("ttt-neon-chip", seat.mark && `ttt-neon-c${seat.mark}`)}>
        {seat.mark && <MarkArt mark={seat.mark} />}
      </span>
    </div>
  )
}

/** The marks are drawn on a 100×100 tile: a thick ring and a heavy, slightly wide X. */
function MarkArt({ mark }: { mark: Mark }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {mark === "o" ? (
        <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" strokeWidth="18" />
      ) : (
        <path d="M15 17.5H39L85 82.5H61ZM61 17.5H85L39 82.5H15Z" fill="currentColor" />
      )}
    </svg>
  )
}

function Chevrons() {
  return (
    <svg className="ttt-neon-chev" viewBox="0 0 24 30" aria-hidden>
      <path d="M7 2h10l-5 4z" />
      <path d="M4 9h16l-8 6z" />
      <path d="M1 18h22l-11 9z" />
    </svg>
  )
}

const CSS = `.ttt-neon{--g:#1fc90b;--r:#f30042;--gold:#ffd326;position:relative;isolation:isolate;container-type:inline-size;width:100%;max-width:max(288px,min(28rem,calc((100svh - 230px)*.63)));margin-inline:auto;overflow:hidden;border-radius:1.25rem;color:#fff;background:radial-gradient(110% 55% at 50% 0%,rgba(58,86,224,.32),transparent 70%),linear-gradient(180deg,#1b2b9a 0%,#172789 22%,#131f78 46%,#101a66 70%,#0b1248 100%);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.ttt-neon::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:radial-gradient(circle,rgba(140,160,255,.11) 0 36%,transparent 39%),radial-gradient(circle,rgba(140,160,255,.08) 0 24%,transparent 27%),radial-gradient(circle,rgba(140,160,255,.06) 0 44%,transparent 47%);background-size:6cqw 5.2cqw,6cqw 5.2cqw,13cqw 11cqw;background-position:0 0,3cqw 2.6cqw,1.5cqw 4cqw;-webkit-mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.3) 12%,transparent 26%,transparent 66%,rgba(0,0,0,.45) 84%,#000);mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.3) 12%,transparent 26%,transparent 66%,rgba(0,0,0,.45) 84%,#000)}
.ttt-neon-in{display:flex;flex-direction:column;padding:3cqw 5.6cqw 5.6cqw}
.ttt-neon-round{margin:0;text-align:center;font-size:max(10.5px,2.7cqw);font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(196,206,255,.62)}
.ttt-neon-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5.5cqw}
.ttt-neon-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:2.4cqw;min-width:0;margin-top:11cqw;padding:12cqw 2.2cqw 4.4cqw;border-radius:3.4cqw;background:rgba(6,10,60,.2);transition:background-color .3s}
.ttt-neon-on{background:rgba(6,10,60,.55)}
.ttt-neon-ava{position:absolute;top:0;left:50%;width:19cqw;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);transition:opacity .3s}
.ttt-neon-card:not(.ttt-neon-on) .ttt-neon-ava{opacity:.82}
.ttt-neon-on:not(.ttt-neon-won) .ttt-neon-ava{animation:ttt-neon-glow 1.6s ease-in-out infinite alternate}
.ttt-neon-ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--gold) 0 82%,#1d2a8f 82% 100%);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 15%),#000 calc(100% - 15% + .5px));mask:radial-gradient(farthest-side,transparent calc(100% - 15%),#000 calc(100% - 15% + .5px));animation:ttt-neon-spin 4s linear infinite}
.ttt-neon-photo{position:absolute;inset:8%;display:flex;border-radius:50%;background:#0b1248;box-shadow:0 0 0 max(1.5px,.55cqw) rgba(9,14,70,.75)}
.ttt-neon-on .ttt-neon-photo{inset:9.5%;box-shadow:0 0 0 max(1.5px,.55cqw) #fff}
.ttt-neon-won .ttt-neon-photo{inset:6%;box-shadow:0 0 0 max(2px,.7cqw) #fff,0 0 3cqw rgba(255,255,255,.35)}
.ttt-neon-away .ttt-neon-photo{filter:grayscale(1)}
.ttt-neon-awaytag{position:absolute;left:50%;bottom:-2%;transform:translateX(-50%);padding:.2cqw 1.4cqw;border-radius:99px;background:#0b1248;color:#aab4e6;font-size:max(9px,2.2cqw);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.ttt-neon-wins{position:absolute;top:1.8cqw;left:2cqw;display:flex;align-items:center;gap:.5cqw;padding:.4cqw 1.3cqw .4cqw 1cqw;border-radius:99px;background:rgba(255,211,38,.12);color:var(--gold);font-size:max(10px,2.6cqw);font-weight:800;line-height:1.3;font-variant-numeric:tabular-nums}
.ttt-neon-pair>.ttt-neon-card+.ttt-neon-card .ttt-neon-wins{left:auto;right:2cqw}
.ttt-neon-wins svg{width:1.1em;height:1.1em}
.ttt-neon-name{max-width:100%;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:max(12px,4.3cqw);font-weight:800;line-height:1.25;color:#8692ce;transition:color .3s}
.ttt-neon-on .ttt-neon-name{color:#fff}
.ttt-neon-chip{display:block;width:7.8cqw;height:7.8cqw;margin-block:-1cqw;color:var(--c);transition:opacity .3s}
.ttt-neon-card:not(.ttt-neon-on) .ttt-neon-chip{opacity:.55}
.ttt-neon-chip svg,.ttt-neon-mark svg{display:block;width:100%;height:100%}
.ttt-neon-co{--c:var(--g)}
.ttt-neon-cx{--c:var(--r)}
.ttt-neon-status{min-height:18.5cqw;padding-top:2.4cqw;align-items:start}
.ttt-neon-turn{display:flex;flex-direction:column;align-items:center;gap:1.4cqw;font-size:max(12px,3.5cqw);line-height:1.2;color:#e8ebf7}
.ttt-neon-turn-r{grid-column:2}
.ttt-neon-chev{width:5.4cqw;height:6.6cqw;fill:#fff;animation:ttt-neon-bob 1.3s ease-in-out infinite}
.ttt-neon-chev path:nth-child(1){opacity:.35;animation:ttt-neon-blink 1.3s ease-in-out infinite}
.ttt-neon-chev path:nth-child(2){opacity:.6;animation:ttt-neon-blink 1.3s ease-in-out .15s infinite}
.ttt-neon-chev path:nth-child(3){animation:ttt-neon-blink 1.3s ease-in-out .3s infinite}
.ttt-neon-result{grid-column:1/-1;align-self:center;margin:0;text-align:center;font-size:max(14px,4.6cqw);font-weight:800;color:#e8ebf7}
.ttt-neon-t-win{color:#4ff03c;text-shadow:0 0 3cqw rgba(31,201,11,.5)}
.ttt-neon-t-lose{color:#ff5b80}
.ttt-neon-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:2.6cqw;aspect-ratio:1;padding:2.9cqw;border-radius:4cqw;background:#1c2e8f;box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 1.5cqw 4cqw rgba(2,6,40,.35)}
.ttt-neon-cell{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;padding:0;border:0;border-radius:3.3cqw;background:#04082d;color:var(--c,#fff);overflow:hidden;cursor:default;transition:background-color .15s,box-shadow .15s,transform .12s}
.ttt-neon-cell:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.ttt-neon-play{cursor:pointer}
.ttt-neon-play:active{transform:scale(.94);background:#0d1450}
.ttt-neon-mark{position:relative;z-index:1;width:100%;height:100%}
.ttt-neon-ghost{opacity:0;transition:opacity .15s}
@media (hover:hover){.ttt-neon-play:hover{background:#0b1145;box-shadow:inset 0 0 0 max(1.5px,.5cqw) rgba(120,150,255,.38)}.ttt-neon-play:hover .ttt-neon-ghost{opacity:.22}}
.ttt-neon-pop{animation:ttt-neon-pop .4s ease-out both}
.ttt-neon-cell.ttt-neon-win::before{content:"";position:absolute;inset:-25%;border-radius:50%;background:var(--c);animation:ttt-neon-flood .45s cubic-bezier(.3,.7,.4,1) var(--d,0ms) both}
.ttt-neon-cell.ttt-neon-win{animation:ttt-neon-bump .5s ease-out var(--d,0ms) both}
.ttt-neon-cell.ttt-neon-win svg{color:#fff;animation:ttt-neon-white .45s ease-out var(--d,0ms) both}
@keyframes ttt-neon-pop{0%{transform:scale(.2);opacity:0}55%{transform:scale(1.16);opacity:1}80%{transform:scale(.96)}100%{transform:scale(1)}}
@keyframes ttt-neon-flood{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes ttt-neon-white{from{color:var(--c)}to{color:#fff}}
@keyframes ttt-neon-bump{0%,100%{transform:scale(1)}45%{transform:scale(1.06)}}
@keyframes ttt-neon-spin{to{transform:rotate(1turn)}}
@keyframes ttt-neon-glow{from{box-shadow:0 0 1cqw rgba(255,211,38,.15)}to{box-shadow:0 0 3.5cqw rgba(255,211,38,.45)}}
@keyframes ttt-neon-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(.9cqw)}}
@keyframes ttt-neon-blink{0%,100%{fill-opacity:1}50%{fill-opacity:.45}}
@media (max-height:700px){.ttt-neon-in{padding-top:2.4cqw;padding-bottom:4cqw}.ttt-neon-ava{width:15cqw}.ttt-neon-card{margin-top:8.5cqw;padding:9.2cqw 2cqw 3cqw;gap:1.6cqw}.ttt-neon-chip{width:6cqw;height:6cqw;margin-block:-.6cqw}.ttt-neon-status{min-height:12.5cqw;padding-top:1.6cqw}.ttt-neon-turn{gap:.8cqw}.ttt-neon-chev{width:4.4cqw;height:5.2cqw}}
@media (prefers-reduced-motion:reduce){.ttt-neon *,.ttt-neon *::before{animation:none!important;transition:none!important}}`
