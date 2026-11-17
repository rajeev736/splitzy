import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The lobby's CSS (class prefix `lb-`). Motion is transforms / opacity only,
 * and every animation ends on (or loops around) its resting look, so with
 * reduced motion the same markup is simply the still picture.
 */
const LOBBY_CSS = `
.lb-root{--lb-font:ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Nunito",var(--font-inter),"Segoe UI",system-ui,sans-serif;--lb-ease:cubic-bezier(.2,.9,.28,1)}
.lb-font{font-family:var(--lb-font)}

/* Glossy game type: a thick rim behind, a face white on top and tinted below */
.lb-gloss{position:relative;display:inline-block;font-family:var(--lb-font);font-weight:900;line-height:1.12;white-space:nowrap;letter-spacing:-.01em}
.lb-gloss-back{position:absolute;inset:0;color:var(--lb-rim);-webkit-text-stroke:.2em var(--lb-rim);text-shadow:0 .07em 0 var(--lb-rim),0 .14em .22em rgba(10,4,30,.45)}
.lb-gloss-face{position:relative;display:block;color:transparent;-webkit-background-clip:text;background-clip:text;
  background-image:linear-gradient(180deg,var(--lb-top,#fff) 0%,var(--lb-top,#fff) 47%,var(--lb-tint) 53%,var(--lb-tint) 100%)}

/* Glass buttons on the scene */
.lb-glass{background:rgba(12,6,30,.38);color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.lb-glass:hover{background:rgba(12,6,30,.5)}

/* Duel: lightning, streaks, the waiting "?" */
.lb-bolt{filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 12px rgba(255,255,255,.8)) drop-shadow(0 0 24px rgba(255,255,255,.4))}
@keyframes lb-flick-a{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes lb-flick-b{0%,49%{opacity:0}50%,100%{opacity:1}}
.lb-bolt-a{animation:lb-flick-a 160ms steps(1) infinite}
.lb-bolt-b{opacity:0;animation:lb-flick-b 160ms steps(1) infinite}
@keyframes lb-dash{0%{transform:translate3d(-30vw,0,0);opacity:0}20%,80%{opacity:.9}100%{transform:translate3d(30vw,0,0);opacity:0}}
.lb-dash{position:absolute;height:3px;border-radius:3px;background:rgba(255,255,255,.85);animation:lb-dash 1.8s linear infinite}
.lb-dash-r{animation-direction:reverse}
@keyframes lb-ping{0%{transform:scale(.9);opacity:.85}100%{transform:scale(1.55);opacity:0}}
.lb-ping{position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 3px rgba(255,255,255,.75);animation:lb-ping 1.8s ease-out infinite}
@keyframes lb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.lb-breathe{animation:lb-breathe 1.8s ease-in-out infinite}
@keyframes lb-slam{0%{transform:scale(3) rotate(-10deg);opacity:0}45%{transform:scale(.86) rotate(3deg);opacity:1}70%{transform:scale(1.08) rotate(-1deg)}100%{transform:none;opacity:1}}
.lb-slam{animation:lb-slam 380ms cubic-bezier(.3,.7,.3,1) both}
@keyframes lb-pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:none}}
.lb-pop{animation:lb-pop 360ms var(--lb-ease) both}
@keyframes lb-fade-up{0%{transform:translate3d(0,10px,0);opacity:0}100%{transform:none;opacity:1}}
.lb-fade-up{animation:lb-fade-up 320ms var(--lb-ease) both}

/* Party: hanging banners sway a little, lights twinkle */
@keyframes lb-sway{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.2deg)}}
.lb-sway{transform-origin:50% 0;animation:lb-sway 5s ease-in-out infinite}
@keyframes lb-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
.lb-twinkle{animation:lb-twinkle 2.4s ease-in-out infinite}
@keyframes lb-drift{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-6px,0)}}
.lb-drift{animation:lb-drift 4s ease-in-out infinite}

/* The big gold button */
.lb-gold{position:relative;overflow:hidden;font-family:var(--lb-font);font-weight:900;letter-spacing:.01em;color:#6b3300;
  background:linear-gradient(180deg,#fff1a8 0%,#ffd24a 42%,#f6a623 100%);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.75),inset 0 -4px 0 rgba(186,92,0,.35),0 5px 0 #a95a00,0 10px 18px rgba(40,10,0,.35);
  text-shadow:0 1px 0 rgba(255,255,255,.6);transition:transform 120ms,box-shadow 120ms,filter 120ms}
.lb-gold:active:not(:disabled){transform:translateY(3px);box-shadow:inset 0 0 0 2px rgba(255,255,255,.75),inset 0 -4px 0 rgba(186,92,0,.35),0 2px 0 #a95a00,0 6px 12px rgba(40,10,0,.3)}
.lb-gold:disabled{filter:grayscale(.85) brightness(.92);color:#4a3a2a;cursor:default}
.lb-gold::after{content:"";position:absolute;top:-30%;bottom:-30%;width:30%;left:-40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg);animation:lb-shine 3.2s ease-in-out infinite}
.lb-gold:disabled::after{display:none}
@keyframes lb-shine{0%,60%{left:-40%}100%{left:130%}}

@media (prefers-reduced-motion:reduce){.lb-root *,.lb-root *::before,.lb-root *::after{animation:none!important}.lb-bolt-b{opacity:0}}
`

export function LobbyStyles() {
  return <style>{LOBBY_CSS}</style>
}

/** Big chunky game type (see `.lb-gloss`). */
export function Gloss({
  children,
  size,
  rim,
  tint,
  top,
  className,
}: {
  children: React.ReactNode
  size: number
  rim: string
  tint: string
  top?: string
  className?: string
}) {
  const vars = {
    fontSize: size,
    "--lb-rim": rim,
    "--lb-tint": tint,
    "--lb-top": top,
  } as React.CSSProperties
  return (
    <span className={cn("lb-gloss", className)} style={vars}>
      <span aria-hidden className="lb-gloss-back">
        {children}
      </span>
      <span className="lb-gloss-face">{children}</span>
    </span>
  )
}
