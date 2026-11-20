import { GLOSS_CSS } from "../intro/styles"

/**
 * The match splash's CSS (prefix `sp-`). Budget: transforms and opacity only;
 * one-time entrances, a gentle bob on the three small item tiles, and the
 * bar's fill. Every keyframe ends on the resting look, so with reduced motion
 * (animations off) the same markup is simply the still frame.
 */
export const SPLASH_CSS = `${GLOSS_CSS}
.sp-root{position:fixed;inset:0;z-index:100;overflow:hidden;display:flex;flex-direction:column;align-items:center;
  user-select:none;-webkit-user-select:none;touch-action:manipulation;transition:opacity 250ms ease-out;
  --sp-font:ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Nunito",var(--font-inter,system-ui),"Segoe UI",system-ui,sans-serif;
  --sp-ease:cubic-bezier(.22,1,.36,1)}
.sp-font{font-family:var(--sp-font)}
.sp-deco{position:absolute;pointer-events:none}

/* Entrances (once) */
@keyframes sp-logo{0%{transform:scale(.55);opacity:0}60%{transform:scale(1.05);opacity:1}100%{transform:none;opacity:1}}
.sp-logo{animation:sp-logo 480ms var(--sp-ease) both}
@keyframes sp-fade{from{opacity:0}to{opacity:1}}
.sp-fade{animation:sp-fade 300ms ease-out both}
@keyframes sp-from-l{from{transform:translate3d(-45vw,0,0);opacity:0}to{transform:none;opacity:1}}
@keyframes sp-from-r{from{transform:translate3d(45vw,0,0);opacity:0}to{transform:none;opacity:1}}
.sp-in-l{animation:sp-from-l 480ms var(--sp-ease) both}
.sp-in-r{animation:sp-from-r 480ms var(--sp-ease) both}
@keyframes sp-pop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:none;opacity:1}}
.sp-pop{animation:sp-pop 380ms var(--sp-ease) both}
@keyframes sp-up{from{transform:translate3d(0,12px,0);opacity:0}to{transform:none;opacity:1}}
.sp-up{animation:sp-up 320ms var(--sp-ease) both}

/* The item tiles: tilted (outer, static), bobbing (inner) */
@keyframes sp-bob{from{transform:translate3d(0,-4px,0)}to{transform:translate3d(0,5px,0)}}
.sp-bob{animation:sp-bob 2.6s ease-in-out infinite alternate}
.sp-tile{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:26%;background:linear-gradient(180deg,#ffffff,#fff6e6);
  box-shadow:0 4px 0 var(--sp-edge),0 9px 14px rgba(30,20,70,.16)}
.sp-tile svg{width:76%;height:76%}

.sp-badge{display:inline-block;border-radius:.45em;padding:.08em .4em;font-family:var(--sp-font);font-weight:900;line-height:1.1;color:#fff;background:linear-gradient(180deg,#ff8a3d,#f0442b);
  box-shadow:inset 0 0 0 .1em rgba(255,255,255,.65),0 .12em 0 #a3261a}

/* Players */
.sp-disc{position:relative;display:flex;align-items:center;justify-content:center;border-radius:999px}
.sp-tag{display:inline-block;white-space:nowrap;border-radius:999px;padding:.2em .7em;font:800 10.5px/1.2 var(--sp-font);letter-spacing:.1em;color:#fff;background:var(--sp-rim)}
.sp-tag-lv{color:#4a2a00;background:linear-gradient(180deg,#ffe58a,#ffbf2f);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7)}
.sp-team-a{background:linear-gradient(180deg,#ff6b5b,#d7263d)}
.sp-team-b{background:linear-gradient(180deg,#4fa3ff,#1f5fe0)}

/* Loading bar: the fill is a full-width pill slid in from the left (transform only) */
.sp-label{font:900 15px/1 var(--sp-font);letter-spacing:.04em;color:var(--sp-rim);text-shadow:0 1px 0 rgba(255,255,255,.7)}
.sp-track{position:relative;height:24px;border-radius:999px;padding:3px;background:color-mix(in oklab,var(--sp-rim) 82%,black);
  box-shadow:inset 0 2px 3px rgba(0,0,0,.35),0 0 0 2.5px rgba(255,255,255,.9),0 6px 14px rgba(30,20,70,.18)}
.sp-track-in{position:relative;height:100%;overflow:hidden;border-radius:999px}
.sp-fill{position:absolute;inset:0;border-radius:999px;transform:translate3d(-100%,0,0);will-change:transform;
  background:linear-gradient(180deg,#c9fa7c 0%,#7fdc45 48%,#47b52e 52%,#3b9f28 100%);box-shadow:inset 0 -2px 0 rgba(0,60,0,.2)}
.sp-fill::after{content:"";position:absolute;left:8px;right:8px;top:2px;height:32%;border-radius:999px;background:rgba(255,255,255,.55)}
.sp-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 12.5px/1 var(--sp-font);color:#fff;
  text-shadow:0 1px 0 rgba(0,0,0,.45),0 0 3px rgba(0,0,0,.35);font-variant-numeric:tabular-nums}
.sp-rail{position:absolute;inset:0;pointer-events:none;transform:translate3d(-100%,0,0);will-change:transform}
.sp-rider{position:absolute;right:-15px;top:50%;width:30px;height:30px;margin-top:-17px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 0 2px var(--sp-rim),0 3px 6px rgba(30,20,70,.3)}
.sp-rider svg{width:72%;height:72%}

.sp-skip{font:700 11px/1 var(--sp-font);letter-spacing:.06em;color:var(--sp-rim);opacity:.7}

.sp-reduced *,.sp-reduced *::before,.sp-reduced *::after{animation:none!important}
@media (prefers-reduced-motion:reduce){.sp-root *,.sp-root *::before,.sp-root *::after{animation:none!important}}
`
