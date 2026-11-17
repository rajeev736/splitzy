/**
 * Live (animated) frames, second set: a ring of fire, a thunderstorm, an
 * ocean ring full of bubbles and a Diwali ring of diyas and sparklers. Round
 * rings like the classic frames; the motion is small and slow, and rests in
 * the drawn pose under reduced motion (see frames-live-kit).
 */
import type { FrameId } from "@/lib/fun/catalog"
import {
  at,
  ball,
  box,
  halo,
  hole,
  lag,
  lin,
  motion,
  pt,
  r2,
  shadow,
  smooth,
  sparkle,
  star,
  flame,
  tongue,
  url,
  type FrameDraw,
  type Pt,
} from "./frames-live-kit"

/* ── Pieces ───────────────────────────────────────────────────────────── */

/** Ring band centred on the photo with a dark rim on both edges and a gloss along the top left. */
function ring(gid: string, stops: [number, string][], edge: string, w = 12, r = 64) {
  return (
    <g fill="none">
      <defs>{lin(gid, stops, 0, 100 - r - w / 2, 0, 100 + r + w / 2)}</defs>
      <circle cx={100} cy={100} r={r} stroke={url(gid)} strokeWidth={w} />
      <circle cx={100} cy={100} r={r + w / 2} stroke={edge} strokeWidth={1.6} />
      <circle cx={100} cy={100} r={r - w / 2} stroke={edge} strokeWidth={1.6} />
      <path d={arcPath(r + w * 0.18, 285, 390)} stroke="#fff" strokeOpacity={0.45} strokeWidth={w * 0.22} strokeLinecap="round" />
    </g>
  )
}

/** Clockwise arc along the circle centred at (100,100). */
const arcPath = (r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(r, a0)
  const [x1, y1] = pt(r, a1)
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

/** A cloud made of overlapping circles: dark outline, body, then a lighter top. */
function cloud(puffs: [number, number, number][], body: string, light: string, line: string) {
  return (
    <g>
      {puffs.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r + 1.8} fill={line} />
      ))}
      {puffs.map(([x, y, r], i) => (
        <circle key={`b${i}`} cx={x} cy={y} r={r} fill={body} />
      ))}
      {puffs.map(([x, y, r], i) => (
        <circle key={`l${i}`} cx={x - r * 0.14} cy={y - r * 0.26} r={r * 0.62} fill={light} fillOpacity={0.55} />
      ))}
    </g>
  )
}

const BOLT = "M0 0L-8 22L-1 22L-6 42L10 14L3 14L8 0Z"

/** Clay diya standing on (0,0) with its flame at (0,-3). */
function diya(clay: string, glowId: string, d: number) {
  return (
    <g strokeLinejoin="round">
      <g transform="translate(0 -6)">
        <g className="glow fb" style={lag(d)}>
          <circle r={14} fill={glowId} />
        </g>
      </g>
      <path d="M-12.6 -2Q-10.4 8.6 0 8.6Q10.4 8.6 12.6 -2Q6.4 -0.2 0 -0.2Q-6.4 -0.2 -12.6 -2Z" fill={clay} stroke="#5a1e08" strokeWidth={1.2} />
      <path d="M-12.6 -2Q-6.4 -4.2 0 -4.2Q6.4 -4.2 12.6 -2Q6.4 -0.2 0 -0.2Q-6.4 -0.2 -12.6 -2Z" fill="#7a3510" stroke="#f3c552" strokeWidth={1.1} />
      {[-7, -3.5, 0, 3.5, 7].map((x) => (
        <circle key={x} cx={x} cy={3.6 - Math.abs(x) * 0.12} r={0.9} fill="#ffd36a" />
      ))}
      <path d="M-8.6 3Q-4 6.4 2 6.6" fill="none" stroke="#ffb27a" strokeOpacity={0.6} strokeWidth={1} strokeLinecap="round" />
      <g transform="translate(0 -2.6)">
        <g className="flick" style={lag(d * 0.7)}>
          <path d={tongue(3.6, 12)} fill="#ff8a1a" />
          <path d={tongue(2.3, 8.4)} fill="#ffd03a" />
          <ellipse cx={0} cy={-2.4} rx={1} ry={2} fill="#fff8dc" />
        </g>
      </g>
    </g>
  )
}

/** Sparkler burst centred on (0,0). */
const burst = (n: number, r0: number, r1: number, rot: number) => (
  <g strokeLinecap="round">
    {Array.from({ length: n }, (_, i) => {
      const a = rot + (i * 360) / n
      const r = i % 2 ? r1 * 0.72 : r1
      const [x0, y0] = pt(r0, a, 0, 0)
      const [x1, y1] = pt(r, a, 0, 0)
      return (
        <g key={i}>
          <path d={`M${x0} ${y0}L${x1} ${y1}`} stroke="#ffe9a0" strokeWidth={1.1} />
          <circle cx={x1} cy={y1} r={0.9} fill="#fff" />
        </g>
      )
    })}
  </g>
)

/* ── Frames ───────────────────────────────────────────────────────────── */

export const LIVE_FRAMES_B: Partial<Record<FrameId, FrameDraw>> = {
  /** Ring of fire: soft flames lick up from the rim and embers drift away. */
  wildfire: ({ id }) => {
    const S = "lf-wf"
    // a back row of red-gold flames and a front row of small golden ones, all leaning upwards:
    // tallest up the sides, low and lazy along the bottom
    const back = Array.from({ length: 18 }, (_, i) => -170 + i * 20)
    const front = Array.from({ length: 18 }, (_, i) => -180 + i * 20)
    const len = (a: number, i: number) => {
      const t = Math.abs(a)
      return r2((15 + (i % 3) * 4) * (t <= 110 ? 1 + (0.4 * t) / 110 : 1.4 - ((t - 110) / 70) * 0.9))
    }
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .tg{animation:${S}-lick 2.8s ease-in-out infinite}` +
            `.${S} .heat{animation:${S}-heat 3.6s ease-in-out infinite}` +
            `.${S} .ember{animation:${S}-ember 4s ease-out infinite}` +
            `@keyframes ${S}-lick{0%,100%{transform:scale(1,1) skewX(0)}30%{transform:scale(.94,1.12) skewX(-4deg)}65%{transform:scale(1.04,.92) skewX(3deg)}}` +
            `@keyframes ${S}-heat{0%,100%{opacity:.6}50%{opacity:1}}` +
            `@keyframes ${S}-ember{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}100%{opacity:0;transform:translate(4px,-22px)}}`
        )}
        <defs>
          <radialGradient id={id("heat")} gradientUnits="userSpaceOnUse" cx={100} cy={100} r={98}>
            <stop offset={0.6} stopColor="#ff7a1a" stopOpacity={0} />
            <stop offset={0.72} stopColor="#ff7a1a" stopOpacity={0.45} />
            <stop offset={1} stopColor="#ff7a1a" stopOpacity={0} />
          </radialGradient>
          {box(id("outer"), [[0, "#e8340c"], [0.55, "#ff6a14"], [1, "#ffa52a"]])}
          {box(id("inner"), [[0, "#ffb21f"], [1, "#fff3b0"]])}
          {halo(id("ember"), "#ffb347", 0.9)}
          {shadow(id("sh"), 1.2, 1.2, 0.4, "#2a0600")}
        </defs>
        <circle className="heat" cx={100} cy={100} r={98} fill={url(id("heat"))} />
        {back.map((a, i) => (
          <g key={a} transform={at(...pt(66, a), a * 0.55)}>
            <g className="tg" style={{ animationDuration: `${2.4 + (i % 3) * 0.45}s`, animationDelay: `${-i * 0.61}s` }}>
              <path d={flame(8.4, len(a, i), i % 2 ? 3 : -3)} fill={url(id("outer"))} />
              <path d={flame(4.6, len(a, i) * 0.6, i % 2 ? 1.6 : -1.6)} fill={url(id("inner"))} />
            </g>
          </g>
        ))}
        {front.map((a, i) => (
          <g key={a} transform={at(...pt(68, a), a * 0.55)}>
            <g className="tg" style={{ animationDuration: `${2.2 + (i % 4) * 0.35}s`, animationDelay: `${-i * 0.77 - 0.4}s` }}>
              <path d={flame(5.6, len(a, i + 1) * 0.62, i % 2 ? -2 : 2)} fill="#ff8a1f" />
              <path d={flame(3, len(a, i + 1) * 0.38)} fill="#ffe27a" />
            </g>
          </g>
        ))}
        <g filter={url(id("sh"))}>
          {ring(id("ring"), [[0, "#9a2a0c"], [0.5, "#561206"], [1, "#2e0804"]], "#1a0402")}
          {/* glowing cracks */}
          {[
            [-60, -38],
            [28, 52],
            [96, 120],
            [198, 224],
            [250, 274],
            [310, 330],
          ].map(([a0, a1]) => (
            <path key={a0} d={smooth([pt(62.4, a0), pt(65.6, (a0 + a1) / 2 - 4), pt(62.8, (a0 + a1) / 2 + 3), pt(65, a1)] as Pt[])} fill="none" stroke="#ff9a2a" strokeOpacity={0.75} strokeWidth={0.9} strokeLinecap="round" />
          ))}
        </g>
        <g className="heat">
          <circle cx={100} cy={100} r={58.8} fill="none" stroke="#ff9a2a" strokeOpacity={0.45} strokeWidth={4} />
          <circle cx={100} cy={100} r={58.6} fill="none" stroke="#ffe9a0" strokeWidth={1.4} />
        </g>
        {[
          [64, 18, 1.8, 0],
          [100, 10, 1.5, 0.9],
          [134, 16, 1.9, 1.7],
          [22, 64, 1.5, 2.4],
          [178, 60, 1.7, 0.4],
          [84, 4, 1.3, 3.1],
          [154, 26, 1.4, 2.8],
          [42, 30, 1.6, 1.3],
        ].map(([x, y, r, d]) => (
          <g key={`${x}${y}`} className="ember" style={lag(d)}>
            <circle cx={x} cy={y} r={r * 2.6} fill={url(id("ember"))} />
            <circle cx={x} cy={y} r={r} fill="#ffe08a" />
          </g>
        ))}
      </g>
    )
  },

  /** Storm ring: lightning flickers from the clouds, electricity crawls around the ring, rain falls. */
  thunder: ({ id }) => {
    const S = "lf-th"
    const crackle = (a0: number) =>
      Array.from({ length: 11 }, (_, i) => pt(64 + (i % 2 ? 3.4 : -3.4) * (i % 3 ? 1 : 0.5), a0 + i * 4, 0, 0))
        .map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`)
        .join("")
    const puffs: [number, number, number][] = [
      [56, 40, 10],
      [70, 34, 14],
      [88, 26, 17],
      [110, 24, 18],
      [130, 32, 14],
      [146, 38, 10],
    ]
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .crawl{animation:${S}-spin 8s linear infinite}` +
            `.${S} .zap{animation:${S}-zap 2.6s linear infinite}` +
            `.${S} .bolt{animation:${S}-bolt 4.6s linear infinite}` +
            `.${S} .flash{opacity:0;animation:${S}-flash 4.6s linear infinite}` +
            `.${S} .drop{animation:${S}-drop 2s linear infinite}` +
            `.${S} .rim{animation:${S}-rim 3.2s ease-in-out infinite}` +
            `@keyframes ${S}-spin{to{transform:rotate(360deg)}}` +
            `@keyframes ${S}-zap{0%,100%{opacity:.9}20%{opacity:.3}24%{opacity:1}60%{opacity:.5}}` +
            `@keyframes ${S}-bolt{0%,58%,100%{opacity:1}60%{opacity:.15}61.5%{opacity:1}63%{opacity:.3}64.5%{opacity:1}}` +
            `@keyframes ${S}-flash{0%,60%,63%,66%,100%{opacity:0}61.5%{opacity:.55}64.5%{opacity:.4}}` +
            `@keyframes ${S}-drop{0%{opacity:0;transform:translate(1px,-6px)}20%{opacity:.9}100%{opacity:0;transform:translate(-3px,10px)}}` +
            `@keyframes ${S}-rim{0%,100%{opacity:.7}50%{opacity:1}}`
        )}
        <defs>
          {lin(id("cloud"), [[0, "#b4bed8"], [1, "#58648a"]], 0, 6, 0, 50)}
          {box(id("bolt"), [[0, "#fffef0"], [1, "#ffe03a"]])}
          {halo(id("bg"), "#fff6a0", 0.6)}
          {shadow(id("sh"), 1.3, 1.3, 0.4, "#060a1a")}
        </defs>
        <g filter={url(id("sh"))}>{ring(id("ring"), [[0, "#7383aa"], [0.5, "#343e60"], [1, "#161b30"]], "#0b0f1f")}</g>
        <g className="rim">
          <circle cx={100} cy={100} r={58.6} fill="none" stroke="#7fe8ff" strokeOpacity={0.35} strokeWidth={4.4} />
          <circle cx={100} cy={100} r={58.6} fill="none" stroke="#d8fbff" strokeWidth={1.2} />
        </g>
        <g transform="translate(100 100)">
          <g className="crawl">
            <g className="zap" fill="none" strokeLinejoin="round" strokeLinecap="round">
              {[10, 130, 250].map((a) => (
                <g key={a}>
                  <path d={crackle(a)} stroke="#7fe8ff" strokeOpacity={0.35} strokeWidth={3.2} />
                  <path d={crackle(a)} stroke="#e8fdff" strokeWidth={1} />
                </g>
              ))}
            </g>
          </g>
        </g>
        {/* bolts behind the clouds */}
        <g className="bolt">
          <ellipse cx={174} cy={72} rx={14} ry={26} fill={url(id("bg"))} />
          <path d={BOLT} transform={at(170, 44, 6, 1.2)} fill={url(id("bolt"))} stroke="#e0a000" strokeWidth={0.9} strokeLinejoin="round" />
          <ellipse cx={28} cy={68} rx={11} ry={20} fill={url(id("bg"))} />
          <path d={BOLT} transform="translate(32 48) rotate(-8) scale(-0.9 0.9)" fill={url(id("bolt"))} stroke="#e0a000" strokeWidth={1} strokeLinejoin="round" />
        </g>
        <g filter={url(id("sh"))}>{cloud(puffs, url(id("cloud")), "#e4eaf8", "#2b3352")}</g>
        <g className="flash">
          {puffs.map(([x, y, r]) => (
            <circle key={x} cx={x} cy={y} r={r} fill="#f4fbff" />
          ))}
        </g>
        <g transform={at(160, 170)}>
          {cloud(
            [
              [-10, 2, 8],
              [0, -3, 10],
              [11, 1, 8],
            ],
            url(id("cloud")),
            "#e4eaf8",
            "#2b3352"
          )}
        </g>
        {[
          [18, 118, 0],
          [28, 140, 0.7],
          [14, 158, 1.3],
          [182, 112, 0.3],
          [188, 132, 1.1],
          [150, 186, 0.5],
          [164, 190, 1.5],
          [176, 184, 0.9],
        ].map(([x, y, d]) => (
          <path key={`${x}${y}`} className="drop" style={lag(d)} d={`M${x} ${y}L${x - 2} ${y + 6}`} stroke="#a8dcff" strokeWidth={1.4} strokeLinecap="round" />
        ))}
      </g>
    )
  },

  /** Ocean ring: waves roll round the rim, bubbles rise, seaweed sways, a little fish swims. */
  deep_blue: ({ id }) => {
    const S = "lf-db"
    const crest = smooth(
      Array.from({ length: 72 }, (_, i) => pt(71.6 + 2.4 * Math.sin((i * 5 * 12 * Math.PI) / 180), i * 5)),
      true
    )
    const frond = "M0 0C-4 -10 4 -18 0 -28C-4 -36 2 -42 0 -48"
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .waves{animation:${S}-roll 5s linear infinite}` +
            `.${S} .shim{animation:${S}-shim 3.4s ease-in-out infinite}` +
            `.${S} .sway{animation:${S}-sway 4.2s ease-in-out infinite}` +
            `.${S} .swim{animation:${S}-swim 4s ease-in-out infinite}` +
            `.${S} .bub{animation:${S}-bub 5s ease-in-out infinite}` +
            `@keyframes ${S}-roll{to{transform:rotate(30deg)}}` +
            `@keyframes ${S}-shim{0%,100%{opacity:.35}50%{opacity:.9}}` +
            `@keyframes ${S}-sway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}` +
            `@keyframes ${S}-swim{0%,100%{transform:translate(0,0)}50%{transform:translate(-3px,-2px)}}` +
            `@keyframes ${S}-bub{0%{opacity:0;transform:translate(0,6px)}20%{opacity:1}55%{transform:translate(2px,-14px)}100%{opacity:0;transform:translate(-1px,-32px)}}`
        )}
        <defs>
          {ball(id("bubble"), [[0, "#ffffff", 0.9], [0.4, "#dffaff", 0.35], [1, "#9feaff", 0.15]], 0.35, 0.3, 0.8)}
          {box(id("weed"), [[0, "#6ff0a8"], [1, "#1b8a5a"]])}
          {box(id("fish"), [[0, "#ffc06a"], [1, "#ff6a1a"]])}
          {shadow(id("sh"), 1.3, 1.3, 0.35, "#04203f")}
        </defs>
        <g transform="translate(100 100)">
          <g className="waves">
            <path d={crest + hole(66)} fillRule="evenodd" transform="translate(-100 -100)" fill="#7fe6ff" stroke="#0a3a78" strokeWidth={1.4} />
          </g>
        </g>
        <g filter={url(id("sh"))}>
          {ring(id("ring"), [[0, "#9af5ff"], [0.5, "#2ab0e4"], [1, "#1458b0"]], "#0a3a78")}
          {[20, 75, 140, 200, 260, 320].map((a) => (
            <path key={a} d={arcPath(62, a, a + 14)} fill="none" stroke="#e8fdff" strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
          ))}
        </g>
        <path className="shim" d={arcPath(66.6, 292, 352)} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
        {/* seaweed, bottom left */}
        {[
          [24, 184, -34, 0.8, 0],
          [40, 190, -8, 1, 1.2],
          [52, 192, 12, 0.7, 2.3],
        ].map(([x, y, r, s, d]) => (
          <g key={x} transform={at(x, y, r, s)}>
            <g className="sway" style={lag(d)} fill="none" strokeLinecap="round">
              <path d={frond} stroke="#0f5a3a" strokeWidth={6.4} />
              <path d={frond} stroke={url(id("weed"))} strokeWidth={4.4} />
              <path d="M-0.6 -6C-2 -12 1.6 -18 0 -24" stroke="#c8ffe0" strokeOpacity={0.6} strokeWidth={1} />
            </g>
          </g>
        ))}
        {/* pebbles the seaweed grows from */}
        {[
          [22, 188, 8, 5.4, "#7d8fb0"],
          [48, 191, 9, 5.8, "#93a6c6"],
          [35, 192, 10, 6.4, "#a9bad6"],
        ].map(([x, y, rx, ry, c]) => (
          <g key={x}>
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={c as string} stroke="#3e4f72" strokeWidth={1.2} />
            <ellipse cx={(x as number) - 2.4} cy={(y as number) - 2.2} rx={(rx as number) * 0.4} ry={(ry as number) * 0.3} fill="#fff" fillOpacity={0.45} />
          </g>
        ))}
        {/* coral and a starfish, bottom right */}
        <g transform={at(166, 182)} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 0V-16M0 -8L-8 -16V-23M0 -15L6 -22M0 -4L9 -10V-19" stroke="#a8264f" strokeWidth={5.6} />
          <path d="M0 0V-16M0 -8L-8 -16V-23M0 -15L6 -22M0 -4L9 -10V-19" stroke="#ff7aa0" strokeWidth={3.6} />
        </g>
        <path d={star(142, 184, 6, 14, 0.48)} fill="#ffa24a" stroke="#ffa24a" strokeWidth={2.4} strokeLinejoin="round" />
        <circle cx={142} cy={184} r={1.2} fill="#ffd9a0" />
        {/* little fish, right */}
        <g transform={at(184, 98)}>
          <g className="swim">
            <path d="M7 0L13 -5L12 0L13 5Z" fill="#ff6a1a" stroke="#7a2400" strokeWidth={0.9} strokeLinejoin="round" />
            <ellipse rx={8.4} ry={5.2} fill={url(id("fish"))} stroke="#7a2400" strokeWidth={1} />
            <path d="M-1 -4.8Q1 0 -1 4.8M3.6 -4Q5.2 0 3.6 4" fill="none" stroke="#fff" strokeWidth={1.4} />
            <circle cx={-4.4} cy={-1.2} r={1.3} fill="#1a1a2a" />
            <circle cx={-4.8} cy={-1.6} r={0.45} fill="#fff" />
          </g>
        </g>
        {/* bubbles */}
        {[
          [16, 152, 3.6, 0],
          [26, 172, 2.4, 1.3],
          [20, 120, 2.8, 2.7],
          [184, 146, 3.2, 0.6],
          [176, 170, 2.2, 2],
          [186, 124, 2, 3.4],
          [62, 26, 2.8, 1.8],
          [138, 22, 2.2, 3.9],
          [48, 158, 2, 4.4],
        ].map(([x, y, r, d]) => (
          <g key={`${x}${y}`} className="bub" style={lag(d)}>
            <circle cx={x} cy={y} r={r} fill={url(id("bubble"))} stroke="#4fbfe8" strokeWidth={1} />
            <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill="#fff" />
          </g>
        ))}
      </g>
    )
  },

  /** Diwali ring: marigold toran on top, diyas flicker along the bottom, sparklers fizz at the corners. */
  diwali: ({ id }) => {
    const S = "lf-dw"
    const gold = "#f3c552"
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .flick{animation:${S}-flick 2.2s ease-in-out infinite}` +
            `.${S} .glow{animation:${S}-glow 2.8s ease-in-out infinite}` +
            `.${S} .fizz{animation:${S}-fizz 2s ease-in-out infinite}` +
            `.${S} .fizz2{animation:${S}-fizz 2s ease-in-out infinite reverse}` +
            `.${S} .tw{animation:${S}-tw 3.2s ease-in-out infinite}` +
            `@keyframes ${S}-flick{0%,100%{transform:scale(1,1) rotate(0)}25%{transform:scale(.92,1.12) rotate(-4deg)}50%{transform:scale(1.04,.94) rotate(2deg)}75%{transform:scale(.96,1.08) rotate(-1deg)}}` +
            `@keyframes ${S}-glow{0%,100%{opacity:.7;transform:scale(.94)}50%{opacity:1;transform:scale(1.08)}}` +
            `@keyframes ${S}-fizz{0%,100%{opacity:1;transform:scale(1) rotate(0)}50%{opacity:.35;transform:scale(.82) rotate(14deg)}}` +
            `@keyframes ${S}-tw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.5)}}`
        )}
        <defs>
          {box(id("clay"), [[0, "#f6954a"], [1, "#a3431c"]])}
          {halo(id("warm"), "#ffc04a", 0.85)}
          {ball(id("mari"), [[0, "#ffe07a"], [0.6, "#ff9a1a"], [1, "#e0620a"]], 0.4, 0.35, 0.75)}
          {ball(id("mari2"), [[0, "#fff3a0"], [0.6, "#ffcc2a"], [1, "#e09a0a"]], 0.4, 0.35, 0.75)}
          {box(id("leaf"), [[0, "#7fdc6a"], [1, "#2f8a3a"]])}
          {shadow(id("sh"), 1.3, 1.3, 0.35, "#3a0420")}
        </defs>
        <g filter={url(id("sh"))}>
          {ring(id("ring"), [[0, "#f0408a"], [0.5, "#a3124f"], [1, "#5e0a3a"]], "#3a0420", 13)}
          <circle cx={100} cy={100} r={70.6} fill="none" stroke={gold} strokeWidth={2.4} />
          <circle cx={100} cy={100} r={57.9} fill="none" stroke={gold} strokeWidth={2} />
          {Array.from({ length: 16 }, (_, i) => i * 22.5 + 11.25).map((a) => (
            <path key={a} d="M0 -4.6C2.4 -2.2 2.4 2.2 0 4.6C-2.4 2.2 -2.4 -2.2 0 -4.6Z" transform={at(...pt(64, a), a)} fill={gold} stroke="#9a6a10" strokeWidth={0.6} />
          ))}
          {Array.from({ length: 16 }, (_, i) => i * 22.5).map((a) => (
            <circle key={a} cx={pt(64, a)[0]} cy={pt(64, a)[1]} r={1.3} fill="#ffe9a0" />
          ))}
          {/* marigold toran across the top, mango leaves between */}
          {[-49, -35, -21, -7, 7, 21, 35, 49].map((a) => (
            <path key={a} d="M0 0C3.2 -3 3.4 -8.6 0 -12C-3.4 -8.6 -3.2 -3 0 0Z" transform={at(...pt(72, a), a)} fill={url(id("leaf"))} stroke="#1f5a26" strokeWidth={0.8} />
          ))}
          {[-56, -42, -28, -14, 0, 14, 28, 42, 56].map((a, i) => (
            <g key={a} transform={at(...pt(71, a))}>
              <circle r={4.8} fill={url(id(i % 2 ? "mari2" : "mari"))} stroke="#b04a00" strokeWidth={0.9} strokeDasharray="1.6 0.9" />
              <circle r={1.6} fill="#c25a00" fillOpacity={0.6} />
            </g>
          ))}
        </g>
        {/* sparklers in the top corners */}
        {[
          [30, 34, 1],
          [170, 34, -1],
        ].map(([x, y, s]) => (
          <g key={x}>
            <path d={`M${x + s * 10} ${y + 22}L${x + s * 2} ${y + 3}`} stroke="#6a6a72" strokeWidth={1.8} strokeLinecap="round" />
            <circle cx={x} cy={y} r={8} fill={url(id("warm"))} />
            <g transform={at(x, y)}>
              <g className="fizz" style={lag(s > 0 ? 0 : 0.8)}>
                {burst(12, 2.6, 11, 0)}
              </g>
              <g className="fizz2" style={lag(s > 0 ? 0 : 0.8)}>
                {burst(8, 4, 8, 22)}
              </g>
            </g>
            <circle cx={x} cy={y} r={1.8} fill="#fff" />
          </g>
        ))}
        {/* diyas along the bottom */}
        <g transform={at(60, 171, 0, 0.82)}>{diya(url(id("clay")), url(id("warm")), 0.6)}</g>
        <g transform={at(140, 171, 0, 0.82)}>{diya(url(id("clay")), url(id("warm")), 1.4)}</g>
        <g transform={at(100, 181)}>{diya(url(id("clay")), url(id("warm")), 0)}</g>
        {[
          [18, 100, 3, 0],
          [182, 100, 3, 1.1],
          [100, 12, 2.8, 2],
          [40, 190, 2.4, 0.6],
          [160, 190, 2.4, 1.6],
          [184, 66, 2.2, 2.6],
          [16, 136, 2.2, 1.9],
        ].map(([x, y, r, d]) => (
          <path key={`${x}${y}`} className="tw fb" style={lag(d)} d={sparkle(x, y, r)} fill="#ffe08a" />
        ))}
      </g>
    )
  },
}
