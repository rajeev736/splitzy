import { PATTERN_TILE } from "./patterns"

/**
 * The intro's CSS. Everything moves with transforms / opacity / clip-path, and
 * each element's keyframes END on its resting state, so with reduced motion
 * (`.pi-reduced`: animations off) the same markup is simply the still frame.
 * Timing comes from inline `animation-delay`s set by the layouts.
 */
export const INTRO_CSS = `
.pi-root{position:fixed;inset:0;z-index:105;overflow:hidden;background:#150a2e;user-select:none;-webkit-user-select:none;touch-action:manipulation;cursor:pointer;
  --pi-font:ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Nunito",var(--font-inter),"Segoe UI",system-ui,sans-serif;
  --pi-ease:cubic-bezier(.2,.9,.28,1)}
.pi-shake{position:absolute;inset:0}
.pi-reduced{animation:pi-fade-in 200ms ease-out both}
.pi-reduced *,.pi-reduced *::before,.pi-reduced *::after{animation:none!important}
@keyframes pi-fade-in{from{opacity:0}}

/* glossy type */
.pi-gloss{position:relative;display:inline-block;font-family:var(--pi-font);font-weight:900;line-height:1.12;white-space:nowrap;letter-spacing:-.01em}
.pi-gloss-back{position:absolute;inset:0;color:var(--pi-rim);-webkit-text-stroke:.2em var(--pi-rim);text-shadow:0 .07em 0 var(--pi-rim),0 .14em .22em rgba(10,4,30,.45)}
.pi-gloss-face{position:relative;display:block;color:transparent;-webkit-background-clip:text;background-clip:text;
  background-image:linear-gradient(180deg,var(--pi-top) 0%,var(--pi-top) 47%,var(--pi-tint) 53%,var(--pi-tint) 100%)}

/* slides */
@keyframes pi-from-l{0%{transform:translate3d(-104%,0,0)}64%{transform:translate3d(2.5%,0,0)}100%{transform:none}}
@keyframes pi-from-r{0%{transform:translate3d(104%,0,0)}64%{transform:translate3d(-2.5%,0,0)}100%{transform:none}}
.pi-in-l{animation:pi-from-l var(--pi-d,340ms) var(--pi-ease) both}
.pi-in-r{animation:pi-from-r var(--pi-d,340ms) var(--pi-ease) both}
@keyframes pi-name-l{0%{transform:translate3d(-38%,0,0) scale(.9);opacity:0}100%{transform:none;opacity:1}}
@keyframes pi-name-r{0%{transform:translate3d(38%,0,0) scale(.9);opacity:0}100%{transform:none;opacity:1}}
.pi-name-l{animation:pi-name-l 360ms var(--pi-ease) both}
.pi-name-r{animation:pi-name-r 360ms var(--pi-ease) both}
@keyframes pi-pop{0%{transform:scale(.35);opacity:0}55%{transform:scale(1.1);opacity:1}78%{transform:scale(.97)}100%{transform:none}}
.pi-pop{animation:pi-pop 320ms var(--pi-ease) both}
@keyframes pi-up{0%{transform:translate3d(0,40%,0);opacity:0}100%{transform:none;opacity:1}}
.pi-up{animation:pi-up 280ms var(--pi-ease) both}
@keyframes pi-down{0%{transform:translate3d(0,-60%,0);opacity:0}100%{transform:none;opacity:1}}
.pi-down{animation:pi-down 320ms var(--pi-ease) both}

/* bands */
.pi-band{position:absolute;left:0;will-change:transform}
.pi-band-bg{position:absolute;inset:0;overflow:hidden}
.pi-pattern{position:absolute;top:0;bottom:0;left:-${PATTERN_TILE}px;right:0;opacity:.17;background-size:${PATTERN_TILE}px ${PATTERN_TILE}px;animation:pi-drift 5s linear infinite}
@keyframes pi-drift{to{transform:translate3d(${PATTERN_TILE}px,0,0)}}
.pi-sheen{position:absolute;top:-20%;bottom:-20%;left:0;width:42%;background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.0) 20%,rgba(255,255,255,.38) 50%,rgba(255,255,255,0) 80%,transparent 100%);
  transform:translate3d(260%,0,0) skewX(-18deg);animation:pi-sheen 620ms ease-out both}
@keyframes pi-sheen{0%{transform:translate3d(-120%,0,0) skewX(-18deg)}100%{transform:translate3d(260%,0,0) skewX(-18deg)}}
.pi-you{display:inline-block;border-radius:999px;padding:.18em .7em;font:800 11px/1.2 var(--pi-font);letter-spacing:.12em;color:#fff;background:rgba(15,6,40,.35);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}
.pi-lv{color:#4a2a00;background:linear-gradient(180deg,#ffe58a,#ffbf2f);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7),0 2px 0 #b9660a}
.pi-team-a{background:linear-gradient(180deg,#ff6b5b,#d7263d)}
.pi-team-b{background:linear-gradient(180deg,#4fa3ff,#1f5fe0)}

/* VS */
.pi-half{position:absolute;inset:0;will-change:transform}
.pi-bolt{filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 12px rgba(255,255,255,.85)) drop-shadow(0 0 26px rgba(255,255,255,.45))}
@keyframes pi-bolt-in{0%{clip-path:inset(-60% 50% -60% 50%);opacity:.2}100%{clip-path:inset(-60% 0 -60% 0);opacity:1}}
.pi-bolt-in{animation:pi-bolt-in 260ms ease-out both}
@keyframes pi-flick-a{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes pi-flick-b{0%,49%{opacity:0}50%,100%{opacity:1}}
.pi-bolt-a{animation:pi-flick-a 140ms steps(1) infinite}
.pi-bolt-b{opacity:0;animation:pi-flick-b 140ms steps(1) infinite}
@keyframes pi-slam{0%{transform:scale(3) rotate(-10deg);opacity:0}45%{transform:scale(.86) rotate(3deg);opacity:1}70%{transform:scale(1.08) rotate(-1deg)}100%{transform:none;opacity:1}}
.pi-slam{animation:pi-slam 340ms cubic-bezier(.3,.7,.3,1) both}
@keyframes pi-shake-k{0%,100%{transform:none}15%{transform:translate3d(-7px,4px,0)}35%{transform:translate3d(6px,-5px,0)}55%{transform:translate3d(-4px,3px,0)}75%{transform:translate3d(3px,-2px,0)}}
.pi-shake-on{animation:pi-shake-k 260ms linear both}
@keyframes pi-burst{0%{transform:scale(.2);opacity:.95}100%{transform:scale(2.4);opacity:0}}
.pi-burst{position:absolute;border-radius:50%;background:radial-gradient(circle,#fff 0%,rgba(255,255,255,.75) 30%,rgba(255,130,220,.35) 55%,transparent 70%);opacity:0;animation:pi-burst 420ms ease-out both}
@keyframes pi-ring{0%{transform:scale(.7);opacity:0}100%{transform:none;opacity:1}}
.pi-ring{position:absolute;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55),0 0 0 1px rgba(255,255,255,.12);animation:pi-ring 420ms var(--pi-ease) both}
@keyframes pi-dash{0%{transform:translate3d(-30vw,0,0);opacity:0}20%,80%{opacity:.9}100%{transform:translate3d(30vw,0,0);opacity:0}}
.pi-dash{position:absolute;height:3px;border-radius:3px;background:rgba(255,255,255,.85);animation:pi-dash 1.4s linear infinite}
.pi-dash-r{animation-direction:reverse}

.pi-skip{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);border-radius:999px;padding:5px 12px;
  font:700 11px/1 var(--font-inter),system-ui,sans-serif;letter-spacing:.06em;color:rgba(255,255,255,.92);background:rgba(10,4,30,.38);backdrop-filter:blur(4px);pointer-events:none}
`
