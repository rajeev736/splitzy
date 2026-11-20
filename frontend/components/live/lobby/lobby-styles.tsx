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

/* Glass buttons on the scene (no backdrop blur: it re-blurs whatever animates behind, every frame) */
.lb-glass{background:rgba(12,6,30,.48);color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28)}
.lb-glass:hover{background:rgba(12,6,30,.6)}

/* Duel: the waiting "?" */
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

/* Countdown: "Starting in" + the number popping in each second */
.lb-count-scrim{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 60% at 50% 50%,transparent 40%,rgba(8,3,22,.5) 100%);animation:lb-fade-in 300ms ease-out both}
@keyframes lb-fade-in{from{opacity:0}to{opacity:1}}
.lb-count-num{display:flex;align-items:center;justify-content:center;border-radius:999px;
  background:radial-gradient(circle at 50% 30%,#9b5cff 0%,#6a2ee0 50%,#3b1585 100%);
  box-shadow:0 0 0 4px #fff,0 0 0 8px rgba(255,255,255,.25),0 10px 22px rgba(20,6,50,.4)}
@keyframes lb-count{0%{transform:scale(.55);opacity:0}55%{transform:scale(1.1);opacity:1}100%{transform:none;opacity:1}}
.lb-count{animation:lb-count 340ms var(--lb-ease) both}
.lb-dot{width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.35);transition:background-color 200ms,transform 200ms}
.lb-dot-on{background:#ffd24a;transform:scale(1.25)}

/* The big gold button */
.lb-gold{position:relative;overflow:hidden;font-family:var(--lb-font);font-weight:900;letter-spacing:.01em;color:#6b3300;
  background:linear-gradient(180deg,#fff1a8 0%,#ffd24a 42%,#f6a623 100%);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.75),inset 0 -4px 0 rgba(186,92,0,.35),0 5px 0 #a95a00,0 10px 18px rgba(40,10,0,.35);
  text-shadow:0 1px 0 rgba(255,255,255,.6);transition:transform 120ms,box-shadow 120ms,filter 120ms}
.lb-gold:active:not(:disabled){transform:translateY(3px);box-shadow:inset 0 0 0 2px rgba(255,255,255,.75),inset 0 -4px 0 rgba(186,92,0,.35),0 2px 0 #a95a00,0 6px 12px rgba(40,10,0,.3)}
.lb-gold:disabled{filter:grayscale(.85) brightness(.92);color:#4a3a2a;cursor:default}
.lb-gold::after{content:"";position:absolute;top:-30%;bottom:-30%;width:30%;left:0;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:translate3d(-140%,0,0) skewX(-18deg);animation:lb-shine 3.2s ease-in-out infinite}
.lb-gold:disabled::after{display:none}
@keyframes lb-shine{0%,60%{transform:translate3d(-140%,0,0) skewX(-18deg)}100%{transform:translate3d(440%,0,0) skewX(-18deg)}}

@media (prefers-reduced-motion:reduce){.lb-root *,.lb-root *::before,.lb-root *::after{animation:none!important}}
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
