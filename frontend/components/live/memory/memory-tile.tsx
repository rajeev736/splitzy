"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { MemoryPicture, PICTURE_NAMES } from "./pictures"

/** How a tile is showing. */
export type TileLook =
  | { kind: "down" }
  /** Flipped by this device, the server hasn't shown its picture yet. */
  | { kind: "waiting" }
  /** Face up this turn (a miss while peeking). */
  | { kind: "up"; pic: number; miss?: boolean }
  /** A found pair, in its finder's colour. */
  | { kind: "found"; pic: number; colour: string }

/**
 * One tile: a glossy chunky tile with a thick bottom edge that turns over
 * (a 3D Y-rotation, transform only). Face down it shows the tile back; face
 * up, its picture — or a shimmer while the server reveals it.
 */
export const MemoryTile = React.memo(function MemoryTile({
  index,
  look,
  size,
  canTap,
  onTap,
}: {
  index: number
  look: TileLook
  /** Px. */
  size: number
  canTap: boolean
  onTap: (index: number, el: HTMLElement) => void
}) {
  const up = look.kind !== "down"
  const pic = look.kind === "up" || look.kind === "found" ? look.pic : null
  const label =
    look.kind === "down"
      ? `Tile ${index + 1}, face down`
      : pic === null
        ? `Tile ${index + 1}, turning over`
        : `Tile ${index + 1}, ${PICTURE_NAMES[pic]}${look.kind === "found" ? ", found" : ""}`
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => onTap(index, e.currentTarget)}
      className={cn(
        "mt-tile",
        up && "mt-up",
        look.kind === "found" && "mt-found",
        look.kind === "up" && look.miss && "mt-miss",
        canTap && !up && "mt-tap"
      )}
      style={
        {
          width: size,
          height: size,
          "--mt-r": `${Math.round(size * 0.2)}px`,
          "--mt-edge": `${Math.max(3, Math.round(size * 0.075))}px`,
          "--mt-glow": look.kind === "found" ? look.colour : undefined,
        } as React.CSSProperties
      }
    >
      <span className="mt-pop">
        <span className="mt-card">
          <span className="mt-face mt-back">
            <span className="mt-emblem">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2.5l2.4 6.1 6.6.4-5.1 4.2 1.7 6.4L12 16l-5.6 3.6 1.7-6.4L3 9l6.6-.4z" fill="#fff" />
              </svg>
            </span>
          </span>
          <span className={cn("mt-face mt-front", look.kind === "waiting" && "mt-shimmer")}>
            {pic !== null && <MemoryPicture pic={pic} className="mt-pic" />}
          </span>
        </span>
      </span>
    </button>
  )
})

/** The tiles' look (scoped to .mt-tile; animations use transform / opacity only). */
export const MEMORY_TILE_CSS = `
.mt-tile{position:relative;display:block;padding:0;border:0;background:none;cursor:default;-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.mt-tile.mt-tap{cursor:pointer}
.mt-pop{position:absolute;inset:0;display:block;perspective:640px;border-radius:var(--mt-r)}
.mt-card{position:absolute;inset:0;display:block;transform-style:preserve-3d;transition:transform .32s cubic-bezier(.3,.7,.35,1.05)}
.mt-up .mt-card{transform:rotateY(180deg)}
.mt-tap:active .mt-card{transform:scale(.93);transition-duration:.08s}
.mt-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-bottom:var(--mt-edge);border-radius:var(--mt-r);overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.mt-back{
  background:
    radial-gradient(120% 70% at 25% 0%,rgba(255,255,255,.5),rgba(255,255,255,0) 55%),
    linear-gradient(155deg,#6db6ff 0%,#8a86ff 52%,#a56cf5 100%);
  box-shadow:inset 0 calc(var(--mt-edge) * -1) 0 #5a3cc4,inset 0 2px 0 rgba(255,255,255,.55),0 3px 7px rgba(40,30,120,.28);
}
.mt-emblem{display:flex;align-items:center;justify-content:center;width:62%;height:62%;border-radius:calc(var(--mt-r) * .7);border:2px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12)}
.mt-emblem svg{width:56%;height:56%;opacity:.92;filter:drop-shadow(0 1px 0 rgba(60,40,160,.35))}
.mt-front{
  transform:rotateY(180deg);
  background:linear-gradient(180deg,#fffef8 0%,#fff4dd 100%);
  box-shadow:inset 0 calc(var(--mt-edge) * -1) 0 var(--mt-edge-c,#ebbd62),inset 0 2px 0 #fff,0 3px 7px rgba(40,30,120,.24);
  transition:box-shadow .3s;
}
.mt-pic{width:74%;height:74%;filter:drop-shadow(0 2px 0 rgba(59,42,74,.15))}
.mt-miss .mt-front{--mt-edge-c:#ff7b8a}
.mt-miss .mt-pop{animation:mt-nope .42s .3s ease-in-out}
.mt-found .mt-front{--mt-edge-c:var(--mt-glow)}
.mt-found .mt-pic{opacity:.8;transition:opacity .4s .9s}
.mt-found .mt-pop{animation:mt-pop .7s .26s ease-out both}
.mt-shimmer{background:linear-gradient(180deg,#fffef8 0%,#fff4dd 100%)}
.mt-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,rgba(255,255,255,0) 30%,rgba(255,226,170,.9) 50%,rgba(255,255,255,0) 70%);background-size:260% 100%;animation:mt-shim .9s linear infinite}
@keyframes mt-shim{from{background-position:130% 0}to{background-position:-130% 0}}
@keyframes mt-pop{
  0%{transform:scale(1);box-shadow:0 0 0 0 transparent}
  35%{transform:scale(1.16);box-shadow:0 0 0 3px var(--mt-glow),0 0 22px 6px var(--mt-glow)}
  100%{transform:scale(1);box-shadow:0 0 0 0 transparent}
}
@keyframes mt-nope{0%,100%{transform:translateX(0)}20%{transform:translateX(-5%) rotate(-3deg)}50%{transform:translateX(4%) rotate(2deg)}75%{transform:translateX(-2%)}}
@media (prefers-reduced-motion:reduce){.mt-card{transition-duration:.01s}.mt-found .mt-pop,.mt-miss .mt-pop{animation:none}}
`
