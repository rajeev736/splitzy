import type * as React from "react"

import type { CharacterArtProps } from "../../types"
import { Eye, MOTIF, Stage, baseCss, useUid } from "./kit"

const INK = "#140f1b"
const r2 = (n: number) => Math.round(n * 100) / 100

/** A flame tongue standing on (x, base): width w, height h, tip leaning by `lean`. */
const flame = (x: number, base: number, w: number, h: number, lean = 0) =>
  `M${r2(x - w / 2)} ${base}C${r2(x - w / 2)} ${r2(base - h * 0.5)} ${r2(x + lean - w * 0.25)} ${r2(base - h * 0.65)} ${r2(x + lean)} ${r2(base - h)}` +
  `C${r2(x + lean + w * 0.15)} ${r2(base - h * 0.6)} ${r2(x + w / 2)} ${r2(base - h * 0.5)} ${r2(x + w / 2)} ${base}` +
  `A${r2(w / 2)} ${r2(w / 2.6)} 0 0 1 ${r2(x - w / 2)} ${base}Z`

const BODY = "M100 42C142 40 168 66 168 104C168 134 158 158 164 200L36 200C42 158 32 134 32 104C32 66 58 44 100 42Z"
const CRACKS = "M46 116L58 126L54 142M150 70L140 84L148 98M66 176L80 164L94 176L108 164M130 186L142 172L152 178M120 52L112 62"
const HAIR = [
  [78, 60, 28, 42, -10, 0],
  [124, 60, 28, 44, 10, -0.25],
  [100, 56, 34, 62, 4, -0.12],
] as const

/** Sparks flung out when the fireball blooms: [dx, dy, delay s]. */
const EMBERS = [
  [-80, -50, 0],
  [-60, 40, 0.06],
  [70, -60, 0.03],
  [76, 30, 0.09],
  [-20, -78, 0.05],
  [30, 72, 0.02],
  [-86, 6, 0.1],
  [88, -10, 0.07],
  [10, -84, 0.12],
  [-44, 70, 0.04],
] as const

/** A fireball around the origin: core of radius 13, `n` tongues licking out. */
function Fireball({ u, tongues }: { u: (k: string) => string; tongues: readonly number[] }) {
  return (
    <g>
      <circle r="26" fill={u("halo")} />
      {tongues.map((a, i) => {
        // Every tongue curls upward, the top ones tallest, like real fire.
        const rad = (a * Math.PI) / 180
        const h = r2(24 + 12 * Math.cos(rad) + (i % 2) * 5)
        const lean = r2(-Math.sin(rad) * 9)
        return (
          <g key={a} transform={`rotate(${a})`}>
            <path className="gav-cinder-flick" d={flame(0, -4, 19, h, lean)} fill={u("flame")} style={{ animationDelay: `${-i * 0.13}s` }} />
            <path
              className="gav-cinder-flick"
              d={flame(0, -6, 10, h * 0.62, lean * 0.6)}
              fill={u("flame-in")}
              style={{ animationDelay: `${-i * 0.13 - 0.15}s` }}
            />
          </g>
        )
      })}
      <circle r="13" fill={u("core")} />
      <path className="gav-cinder-swirl" d="M-8-2A8 8 0 0 1 6-7M7 3A8 8 0 0 1-4 8" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.75" />
    </g>
  )
}

/** The fire one: a hot-headed lump of coal who juggles a fireball. */
export function Cinder({ mode, size }: CharacterArtProps) {
  const uid = useUid("cinder")
  const u = (k: string) => `url(#${uid}-${k})`
  return (
    <Stage
      name="cinder"
      uid={uid}
      mode={mode}
      size={size}
      band={["#ff7a5c", "#b5121b"]}
      motif={MOTIF.flame}
      css={CSS}
      defs={
        <>
          <radialGradient id={`${uid}-coal`} cx="34%" cy="26%" r="85%">
            <stop offset="0" stopColor="#9b8fae" />
            <stop offset="0.4" stopColor="#4c4459" />
            <stop offset="1" stopColor="#1a1521" />
          </radialGradient>
          <linearGradient id={`${uid}-flame`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffe36b" />
            <stop offset="0.45" stopColor="#ff8a1f" />
            <stop offset="1" stopColor="#e5262d" />
          </linearGradient>
          <linearGradient id={`${uid}-flame-in`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fffbe6" />
            <stop offset="1" stopColor="#ffd23f" />
          </linearGradient>
          <radialGradient id={`${uid}-core`} cx="40%" cy="36%" r="70%">
            <stop offset="0" stopColor="#fffdf0" />
            <stop offset="0.45" stopColor="#ffe066" />
            <stop offset="1" stopColor="#ff6a1a" />
          </radialGradient>
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0.3" stopColor="#ffb347" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-lava`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#ff4d1a" />
          </linearGradient>
          <radialGradient id={`${uid}-iris`} cx="50%" cy="72%" r="70%">
            <stop offset="0" stopColor="#fff7c2" />
            <stop offset="0.5" stopColor="#ff9f1a" />
            <stop offset="1" stopColor="#b8320c" />
          </radialGradient>
        </>
      }
    >
      <g className="gav-cinder-hero">
        {/* Flame hair */}
        {HAIR.map(([x, base, w, h, lean, delay]) => (
          <g key={x}>
            <path className="gav-cinder-flick" d={flame(x, base, w, h, lean)} fill={u("flame")} style={{ animationDelay: `${delay}s` }} />
            <path
              className="gav-cinder-flick"
              d={flame(x, base, w * 0.55, h * 0.6, lean * 0.6)}
              fill={u("flame-in")}
              style={{ animationDelay: `${delay - 0.2}s` }}
            />
          </g>
        ))}

        {/* The coal body, faceted, with lava in the cracks */}
        <path d={BODY} fill={u("coal")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M56 72L86 52L80 88Z" fill="#ffffff" opacity="0.12" />
        <path d="M128 54L154 76L132 86Z" fill="#ffffff" opacity="0.07" />
        <path d="M40 120L58 110L52 146Z" fill="#000000" opacity="0.18" />
        <g className="gav-cinder-glow" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={CRACKS} stroke="#ff6a1a" strokeWidth="7" opacity="0.45" />
          <path d={CRACKS} stroke="#ffd36b" strokeWidth="2.6" />
        </g>

        {/* Cocky face: heavy brows, one lazy lid, glowing smirk */}
        <g className="gav-cinder-eyes">
          <Eye uid={uid} k="l" cx={76} cy={104} r={17} ink={INK} look={[-1, 2]} lid={{ cover: 0.2, tilt: 12, fill: "#4c4459" }} />
          <Eye uid={uid} k="r" cx={124} cy={104} r={17} ink={INK} look={[-1, 2]} lid={{ cover: 0.42, tilt: -6, fill: "#4c4459" }} />
        </g>
        <path d="M54 82Q74 70 96 84M106 82Q126 70 148 80" stroke={INK} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M60 78Q74 71 88 77M112 76Q126 70 140 75" stroke="#8a7f9a" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M78 130Q104 146 132 124Q128 144 106 150Q86 150 78 130Z" fill={u("lava")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M117 137L124 135L121 143Z" fill="#ffffff" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />

        {/* Raised arm with the resting fireball */}
        <path
          d="M132 176C140 152 148 138 154 128L176 134C170 150 164 168 158 182Z"
          fill={u("coal")}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <g transform="translate(164 94)">
          <g className="gav-cinder-ball">
            <Fireball u={u} tongues={[-62, -28, 0, 30, 64]} />
          </g>
        </g>
        <circle cx="165" cy="123" r="12" fill={u("coal")} stroke={INK} strokeWidth="3" />
        <path d="M159 118L164 123L170 120" stroke="#ffb02e" strokeWidth="2" strokeLinecap="round" fill="none" />

        {mode !== "intro" && size >= 64 && (
          <g fill="#ffcf5c">
            <circle className="gav-cinder-ember" cx="160" cy="78" r="2.4" />
            <circle className="gav-cinder-ember gav-cinder-ember-b" cx="170" cy="80" r="1.8" />
            <circle className="gav-cinder-ember gav-cinder-ember-c" cx="164" cy="76" r="2" />
          </g>
        )}
      </g>

      {mode === "intro" && (
        <>
          <rect className="gav-cinder-flash" width="200" height="200" fill="#ffe9a8" />
          <g className="gav-cinder-boom">
            <Fireball u={u} tongues={[0, 36, 72, 108, 144, 180, 216, 252, 288, 324]} />
          </g>
          {EMBERS.map(([dx, dy, delay], i) => (
            <circle
              key={i}
              className="gav-cinder-spark"
              cx="118"
              cy="86"
              r={i % 2 ? 2.6 : 3.6}
              fill={i % 3 ? "#ffd23f" : "#fff3c4"}
              style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${0.5 + delay}s` } as React.CSSProperties}
            />
          ))}
        </>
      )}
    </Stage>
  )
}

const CSS =
  baseCss("cinder") +
  `
.gav-cinder-hero{transform-origin:100px 200px}
.gav-cinder-eyes{transform-origin:100px 104px}
.gav-cinder-ball,.gav-cinder-boom,.gav-cinder-swirl{transform-origin:0 0}
.gav-cinder-flick{transform-box:fill-box;transform-origin:50% 100%}
.gav-cinder-flash,.gav-cinder-boom,.gav-cinder-spark{opacity:0}
.gav-cinder-idle .gav-cinder-flick{animation:gav-cinder-flick .6s ease-in-out infinite}
.gav-cinder-idle .gav-cinder-swirl{animation:gav-cinder-swirl 1.4s linear infinite}
.gav-cinder-idle .gav-cinder-ball{animation:gav-cinder-pulse 1.2s ease-in-out infinite}
.gav-cinder-idle .gav-cinder-glow{animation:gav-cinder-glow 2.4s ease-in-out infinite}
.gav-cinder-idle .gav-cinder-eyes{animation:gav-cinder-blink 4.2s infinite}
.gav-cinder-ember{opacity:0}
.gav-cinder-idle .gav-cinder-ember{animation:gav-cinder-ember 1.8s ease-out infinite}
.gav-cinder-idle .gav-cinder-ember-b{animation-delay:-.6s}
.gav-cinder-idle .gav-cinder-ember-c{animation-delay:-1.2s}
@keyframes gav-cinder-flick{0%,100%{scale:1 1}25%{scale:.9 1.12}50%{scale:1.06 .9}75%{scale:.95 1.07}}
@keyframes gav-cinder-swirl{to{rotate:360deg}}
@keyframes gav-cinder-pulse{0%,100%{scale:1}50%{scale:1.07}}
@keyframes gav-cinder-glow{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes gav-cinder-blink{0%,90%,96%,100%{scale:1 1}93%{scale:1 .1}}
@keyframes gav-cinder-ember{0%{opacity:0;translate:0 0}20%{opacity:1}100%{opacity:0;translate:-6px -44px}}
.gav-cinder-intro .gav-cinder-flick{animation:gav-cinder-flick .3s ease-in-out 6}
.gav-cinder-intro .gav-cinder-swirl{animation:gav-cinder-swirl .5s linear 3}
.gav-cinder-intro .gav-cinder-ball{animation:gav-cinder-show 1.8s both}
.gav-cinder-intro .gav-cinder-boom{animation:gav-cinder-boom 1.8s both}
.gav-cinder-intro .gav-cinder-flash{animation:gav-cinder-flash 1.8s both}
.gav-cinder-intro .gav-cinder-glow{animation:gav-cinder-wake 1.8s both}
.gav-cinder-intro .gav-cinder-hero{animation:gav-cinder-recoil 1.8s both}
.gav-cinder-intro .gav-cinder-eyes{animation:gav-cinder-squint 1.8s both}
.gav-cinder-intro .gav-cinder-spark{animation:gav-cinder-spark .9s ease-out both}
@keyframes gav-cinder-show{0%,82%{opacity:0}85%,100%{opacity:1}}
@keyframes gav-cinder-boom{
0%,6%{opacity:1;translate:164px 94px;scale:0;animation-timing-function:cubic-bezier(.2,.9,.3,1.2)}
34%{translate:116px 88px;scale:3.3}
44%{translate:116px 88px;scale:2.9}
56%{translate:116px 88px;scale:3.15;animation-timing-function:cubic-bezier(.6,0,.4,1)}
82%{opacity:1;translate:164px 94px;scale:1}
86%,100%{opacity:0;translate:164px 94px;scale:1}}
@keyframes gav-cinder-flash{0%,22%{opacity:0}34%{opacity:.3}62%,100%{opacity:0}}
@keyframes gav-cinder-wake{0%,12%{opacity:.15}36%,100%{opacity:1}}
@keyframes gav-cinder-recoil{0%,20%{rotate:0deg;translate:0 0}36%{rotate:-3deg;translate:-4px 2px}62%,100%{rotate:0deg;translate:0 0}}
@keyframes gav-cinder-squint{0%,24%{scale:1 1}34%{scale:1 .55}58%{scale:1 .7}70%,100%{scale:1 1}}
@keyframes gav-cinder-spark{0%{opacity:0;translate:0 0;scale:.4}15%{opacity:1;scale:1}100%{opacity:0;translate:var(--dx) var(--dy);scale:.5}}
`
