import { PATTERN_TILE } from "./patterns"

/**
 * The glossy game type used by the match splash, the intro and the intro
 * avatars (GlossyText, IntroAvatar's initials). Static: no animation here.
 */
export const GLOSS_CSS = `
.pi-gloss{position:relative;display:inline-block;font-family:ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Nunito",var(--font-inter,system-ui),"Segoe UI",system-ui,sans-serif;
  font-weight:900;line-height:1.12;white-space:nowrap;letter-spacing:-.01em}
.pi-gloss-back{position:absolute;inset:0;color:var(--pi-rim);-webkit-text-stroke:.2em var(--pi-rim);text-shadow:0 .08em 0 var(--pi-rim),0 .16em .2em rgba(10,4,30,.22)}
.pi-gloss-face{position:relative;display:block;color:transparent;-webkit-background-clip:text;background-clip:text;
  background-image:linear-gradient(180deg,var(--pi-top) 0%,var(--pi-top) 50%,var(--pi-tint) 56%,var(--pi-tint) 100%)}
`

/**
 * The player intro's CSS (VS for two, colour bands for more). Built to stay
 * smooth while the game loads underneath on a mid-range phone:
 * - only transform and opacity animate (the GPU runs those even while the
 *   page is busy) — no animated clip-path, no filters, no blur;
 * - every moving part is its own layer (`will-change`) and starts from the
 *   first frame with an `animation-delay`, so nothing waits on JavaScript;
 * - each element's keyframes END on its resting state, so with reduced
 *   motion (`.pi-reduced`: animations off) the same markup is the still frame.
 */
export const INTRO_CSS = `${GLOSS_CSS}
.pi-root{position:fixed;inset:0;z-index:105;overflow:hidden;background:#150a2e;user-select:none;-webkit-user-select:none;touch-action:manipulation;cursor:pointer;
  --pi-ease:cubic-bezier(.2,.9,.28,1);contain:strict}
.pi-shake{position:absolute;inset:0;will-change:transform}
.pi-reduced{animation:pi-fade-in 200ms ease-out both}
.pi-reduced *,.pi-reduced *::before,.pi-reduced *::after{animation:none!important}
@keyframes pi-fade-in{from{opacity:0}}

/* slides */
@keyframes pi-from-l{0%{transform:translate3d(-104%,0,0)}64%{transform:translate3d(2.5%,0,0)}100%{transform:translate3d(0,0,0)}}
@keyframes pi-from-r{0%{transform:translate3d(104%,0,0)}64%{transform:translate3d(-2.5%,0,0)}100%{transform:translate3d(0,0,0)}}
.pi-in-l{animation:pi-from-l var(--pi-d,380ms) var(--pi-ease) both;will-change:transform}
.pi-in-r{animation:pi-from-r var(--pi-d,380ms) var(--pi-ease) both;will-change:transform}
@keyframes pi-name-l{0%{transform:translate3d(-38%,0,0) scale(.9);opacity:0}100%{transform:translate3d(0,0,0);opacity:1}}
@keyframes pi-name-r{0%{transform:translate3d(38%,0,0) scale(.9);opacity:0}100%{transform:translate3d(0,0,0);opacity:1}}
.pi-name-l{animation:pi-name-l 380ms var(--pi-ease) both}
.pi-name-r{animation:pi-name-r 380ms var(--pi-ease) both}
@keyframes pi-pop{0%{transform:scale(.35);opacity:0}55%{transform:scale(1.1);opacity:1}78%{transform:scale(.97)}100%{transform:scale(1)}}
.pi-pop{animation:pi-pop 340ms var(--pi-ease) both;will-change:transform}
@keyframes pi-up{0%{transform:translate3d(0,40%,0);opacity:0}100%{transform:translate3d(0,0,0);opacity:1}}
.pi-up{animation:pi-up 300ms var(--pi-ease) both}
@keyframes pi-down{0%{transform:translate3d(0,-60%,0);opacity:0}100%{transform:translate3d(0,0,0);opacity:1}}
.pi-down{animation:pi-down 340ms var(--pi-ease) both}

/* bands */
.pi-band{position:absolute;left:0}
.pi-band-bg{position:absolute;inset:0;overflow:hidden}
.pi-pattern{position:absolute;top:0;bottom:0;left:-${PATTERN_TILE}px;right:0;opacity:.17;background-size:${PATTERN_TILE}px ${PATTERN_TILE}px;animation:pi-drift 6s linear infinite;will-change:transform}
@keyframes pi-drift{to{transform:translate3d(${PATTERN_TILE}px,0,0)}}
.pi-sheen{position:absolute;top:-20%;bottom:-20%;left:0;width:42%;background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.0) 20%,rgba(255,255,255,.38) 50%,rgba(255,255,255,0) 80%,transparent 100%);
  transform:translate3d(260%,0,0) skewX(-18deg);animation:pi-sheen 650ms ease-out both;will-change:transform}
@keyframes pi-sheen{0%{transform:translate3d(-120%,0,0) skewX(-18deg)}100%{transform:translate3d(260%,0,0) skewX(-18deg)}}
.pi-you{display:inline-block;border-radius:999px;padding:.18em .7em;font:800 11px/1.2 ui-rounded,"Arial Rounded MT Bold",var(--font-inter),system-ui,sans-serif;letter-spacing:.12em;color:#fff;background:rgba(15,6,40,.35);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}
.pi-lv{color:#4a2a00;background:linear-gradient(180deg,#ffe58a,#ffbf2f);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7),0 2px 0 #b9660a}
.pi-team-a{background:linear-gradient(180deg,#ff6b5b,#d7263d)}
.pi-team-b{background:linear-gradient(180deg,#4fa3ff,#1f5fe0)}

/* VS */
.pi-half{position:absolute;inset:0}
/* The lightning: grows out from the middle (scaleX), then two shapes flicker in turn — glow drawn as soft strokes, not filters */
@keyframes pi-bolt-in{0%{transform:scaleX(0);opacity:.2}100%{transform:scaleX(1);opacity:1}}
.pi-bolt-in{animation:pi-bolt-in 280ms ease-out both;transform-origin:50% 50%;will-change:transform}
@keyframes pi-flick-a{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes pi-flick-b{0%,49%{opacity:0}50%,100%{opacity:1}}
.pi-bolt-a{animation:pi-flick-a 180ms steps(1) infinite}
.pi-bolt-b{opacity:0;animation:pi-flick-b 180ms steps(1) infinite}
@keyframes pi-slam{0%{transform:scale(3) rotate(-10deg);opacity:0}45%{transform:scale(.86) rotate(3deg);opacity:1}70%{transform:scale(1.08) rotate(-1deg)}100%{transform:scale(1) rotate(0);opacity:1}}
.pi-slam{animation:pi-slam 380ms cubic-bezier(.3,.7,.3,1) both;will-change:transform}
@keyframes pi-shake-k{0%,100%{transform:translate3d(0,0,0)}15%{transform:translate3d(-7px,4px,0)}35%{transform:translate3d(6px,-5px,0)}55%{transform:translate3d(-4px,3px,0)}75%{transform:translate3d(3px,-2px,0)}}
.pi-shake-on{animation:pi-shake-k 280ms linear both}
@keyframes pi-burst{0%{transform:scale(.2);opacity:.95}100%{transform:scale(2.4);opacity:0}}
.pi-burst{position:absolute;border-radius:50%;background:radial-gradient(circle,#fff 0%,rgba(255,255,255,.75) 30%,rgba(255,130,220,.35) 55%,transparent 70%);opacity:0;animation:pi-burst 460ms ease-out both;will-change:transform,opacity}
@keyframes pi-ring{0%{transform:scale(.7);opacity:0}100%{transform:scale(1);opacity:1}}
.pi-ring{position:absolute;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55),0 0 0 1px rgba(255,255,255,.12);animation:pi-ring 440ms var(--pi-ease) both}
@keyframes pi-dash{0%{transform:translate3d(-30vw,0,0);opacity:0}20%,80%{opacity:.9}100%{transform:translate3d(30vw,0,0);opacity:0}}
.pi-dash{position:absolute;height:3px;border-radius:3px;background:rgba(255,255,255,.85);animation:pi-dash 1.6s linear infinite;will-change:transform,opacity}
.pi-dash-r{animation-direction:reverse}

.pi-skip{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);border-radius:999px;padding:5px 12px;
  font:700 11px/1 var(--font-inter),system-ui,sans-serif;letter-spacing:.06em;color:rgba(255,255,255,.92);background:rgba(10,4,30,.5);pointer-events:none}
`
