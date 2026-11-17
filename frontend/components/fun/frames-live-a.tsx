/**
 * Live (animated) frames, first set: neon hazard tape, a witch's spellbook
 * frame, a night sky with a cat on a planet, a neon music stage and frosty
 * wings. Rounded-square plates with a round window for the photo; the motion
 * is small and slow, and rests in the drawn pose under reduced motion (see
 * frames-live-kit).
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
  roundSquare,
  shadow,
  sparkle,
  star,
  url,
  type FrameDraw,
} from "./frames-live-kit"

/* ── Pieces ───────────────────────────────────────────────────────────── */

/** Hazard tape along +x from x0 to x1 (12 tall, centred on y=0), with "WARNING!" labels centred at `labels`. */
function hazardTape(stripes: string, x0: number, x1: number, labels: number[]) {
  return (
    <g>
      <rect x={x0} y={-4.4} width={x1 - x0} height={12} fill="#1b0640" fillOpacity={0.3} />
      <rect x={x0} y={-6} width={x1 - x0} height={12} fill={stripes} />
      {labels.map((c) => (
        <g key={c}>
          <rect x={c - 19} y={-6} width={38} height={12} fill="#ffd21f" />
          <text
            x={c}
            y={2.8}
            textAnchor="middle"
            fontSize={7.4}
            fontWeight={900}
            fontFamily="Impact, 'Arial Black', sans-serif"
            letterSpacing={0.3}
            fill="#1d1a1a"
          >
            WARNING!
          </text>
        </g>
      ))}
      <path d={`M${x0} -5.6H${x1}M${x0} 5.6H${x1}`} stroke="#a07800" strokeWidth={0.8} />
    </g>
  )
}

/** The loose, ragged end of a hazard tape, hinged on (0,0). */
const tapeEnd = (stripes: string) => (
  <g>
    <path d="M0 -6H13L15.6 -3L13 0L16 3L13.4 6H0Z" fill="#1b0640" fillOpacity={0.3} transform="translate(0 1.6)" />
    <path d="M0 -6H13L15.6 -3L13 0L16 3L13.4 6H0Z" fill={stripes} stroke="#a07800" strokeWidth={0.7} strokeLinejoin="round" />
  </g>
)

/** A little electric spark centred on (0,0). */
const spark = (color: string) => (
  <g>
    <path
      d="M0 -6.4V-2.6M0 6.4V2.6M-6.4 0H-2.6M6.4 0H2.6M-4.2 -4.2L-2 -2M4.2 4.2L2 2M4.2 -4.2L2 -2M-4.2 4.2L-2 2"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
    <circle r={1.7} fill="#fff" />
  </g>
)

/** Gold scrollwork with a gem, centred on (0,0), lying along the x axis. */
function scrollwork(gem: string) {
  const curl = "M-5 2.4C-10 5.4 -17 5.4 -21 1.4C-24 -2 -21 -6.4 -17.2 -5C-14.6 -3.8 -15.4 -0.6 -17.6 -1.2"
  return (
    <g fill="none" strokeLinecap="round">
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d={curl} stroke="#9a6a10" strokeWidth={3.6} />
          <path d={curl} stroke="#f6cf5a" strokeWidth={2} />
          <path d="M-6 1.6C-9.6 3.4 -13.6 3.6 -16.4 2" stroke="#fff3c0" strokeWidth={0.8} />
        </g>
      ))}
      <path d="M0 -5.6L4 0L0 5.6L-4 0Z" fill={gem} stroke="#9a6a10" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M0 -5.6L1.4 -1L0 0L-1.4 -1Z" fill="#fff" fillOpacity={0.75} />
    </g>
  )
}

/** Small gold crown standing on (0,0). */
const crown = (gold: string) => (
  <g strokeLinejoin="round">
    <path d="M-8 1L-9.6 -8L-4.6 -3.4L0 -11L4.6 -3.4L9.6 -8L8 1Z" fill={gold} stroke="#9a6a10" strokeWidth={1.2} />
    <rect x={-8.6} y={0} width={17.2} height={4} rx={1.5} fill="#f6cf5a" stroke="#9a6a10" strokeWidth={1.1} />
    {[
      [-9.6, -8],
      [0, -11],
      [9.6, -8],
    ].map(([x, y]) => (
      <circle key={x} cx={x} cy={y} r={1.7} fill="#fff2b0" stroke="#9a6a10" strokeWidth={0.8} />
    ))}
    <circle cx={0} cy={2} r={1.2} fill="#5fd6e6" />
    <path d="M-5.6 -1.4L-6.6 -5.6" stroke="#fff6cf" strokeWidth={0.9} strokeLinecap="round" />
  </g>
)

/** Crescent moon centred on (0,0), opening to the right. */
const crescent = (r: number) => `M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r * 1.3} ${r * 1.3} 0 0 1 0 ${-r}Z`

/** A soft, puffy five-point star (filled and stroked in the same colour). */
const puffyStar = (cx: number, cy: number, R: number, rot: number, fill: string, light: string) => (
  <g strokeLinejoin="round">
    <path d={star(cx, cy, R, rot, 0.52)} fill={fill} stroke={fill} strokeWidth={R * 0.42} />
    <path d={star(cx - R * 0.12, cy - R * 0.14, R * 0.5, rot, 0.52)} fill={light} stroke={light} strokeWidth={R * 0.2} strokeOpacity={0.9} />
  </g>
)

/** Feather pointing along +x from (0,0), 32 long. */
const FEATHER = "M0 -3.6C9 -6.4 22 -6 31 -1.2C33 0 33 1 31 1.6C22 4.6 9 4.4 0 3.6Z"

const wing = (feathers: [number, number][], fill: string, line: string, vein: string) => (
  <g>
    {feathers.map(([a, s]) => (
      <g key={a} transform={`rotate(${a}) scale(${s})`}>
        <path d={FEATHER} fill={fill} stroke={line} strokeWidth={1.2 / s} strokeLinejoin="round" />
        <path d="M3 0.2C12 -0.6 22 -0.4 29 -0.4" fill="none" stroke={vein} strokeWidth={0.9 / s} strokeLinecap="round" />
      </g>
    ))}
  </g>
)

/* ── Frames ───────────────────────────────────────────────────────────── */

export const LIVE_FRAMES_A: Partial<Record<FrameId, FrameDraw>> = {
  /** Neon purple cyber plate taped off with hazard tape: tape flutters, neon flickers, sparks pop. */
  neon_hazard: ({ id }) => {
    const S = "lf-hz"
    const plate = "M41 27H167L173 33V159L159 173H33L27 167V41Z"
    const tape = url(id("tape"))
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .neon{animation:${S}-flick 5.2s linear infinite}` +
            `.${S} .strip{animation:${S}-pulse 2.8s ease-in-out infinite}` +
            `.${S} .scan{animation:${S}-scan 3.4s ease-in-out infinite alternate}` +
            `.${S} .flap{animation:${S}-flap 2.6s ease-in-out infinite}` +
            `.${S} .px{animation:${S}-px 2.2s ease-in-out infinite}` +
            `.${S} .spark{opacity:0;animation:${S}-spark 3.6s ease-out infinite}` +
            `@keyframes ${S}-flick{0%,44%,100%{opacity:1}45%{opacity:.35}46%{opacity:.95}48%{opacity:.5}49%,86%{opacity:1}87%{opacity:.62}88%{opacity:1}}` +
            `@keyframes ${S}-pulse{0%,100%{opacity:.5}50%{opacity:1}}` +
            `@keyframes ${S}-scan{from{transform:translateX(0)}to{transform:translateX(24px)}}` +
            `@keyframes ${S}-flap{0%,100%{transform:rotate(-6deg) skewY(-3deg)}50%{transform:rotate(9deg) skewY(3deg)}}` +
            `@keyframes ${S}-px{0%,100%{opacity:1}50%{opacity:.25}}` +
            `@keyframes ${S}-spark{0%,60%{opacity:0;transform:scale(.3)}68%{opacity:1;transform:scale(1)}84%,100%{opacity:0;transform:scale(1.3)}}`
        )}
        <defs>
          {lin(id("plate"), [[0, "#f190ff"], [0.45, "#b34ef2"], [1, "#6420c6"]], 30, 30, 170, 170)}
          {lin(id("tab"), [[0, "#a065ff"], [1, "#5a1ab8"]], 0, 18, 0, 30)}
          <pattern id={id("tape")} patternUnits="userSpaceOnUse" width={7} height={7} patternTransform="rotate(45)">
            <rect width={7} height={7} fill="#ffd21f" />
            <rect width={3.4} height={7} fill="#1d1a1a" />
          </pattern>
          {shadow(id("sh"), 1.4, 1.4, 0.35, "#1b0640")}
        </defs>
        <g filter={url(id("sh"))}>
          <path d={plate + hole()} fillRule="evenodd" fill={url(id("plate"))} stroke="#3a0c78" strokeWidth={2} strokeLinejoin="round" />
          <path d="M42.5 30.5H165.6L169.5 34.4M30.5 158V42.5L42.5 30.5" fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M170 60V156.5L157.5 169.5H62" fill="none" stroke="#2a0866" strokeOpacity={0.35} strokeWidth={1.5} strokeLinejoin="round" />
          <circle cx={100} cy={100} r={61} fill="none" stroke="#2a0a5c" strokeWidth={3.6} />
          {/* circuit marks, top left */}
          <path d="M34 66V48L48 34H64M38 76V58M58 40H72" fill="none" stroke="#ffd4ff" strokeOpacity={0.55} strokeWidth={1.2} strokeLinecap="round" />
          <circle cx={64} cy={34} r={1.5} fill="#ffd4ff" fillOpacity={0.8} />
          <circle cx={38} cy={76} r={1.5} fill="#ffd4ff" fillOpacity={0.8} />
          {/* little red tag on the left edge */}
          <path d="M21 74L30 70L32 77L23 81Z" fill="#ff4d6d" stroke="#8a0f2c" strokeWidth={1} strokeLinejoin="round" />
        </g>
        {/* glitchy pixels */}
        {[
          [44, 46, "#62f6ff", 0],
          [49, 46, "#ff7cf5", 0.7],
          [44, 51, "#fff", 1.3],
          [152, 162, "#62f6ff", 0.4],
          [157, 162, "#fff", 1.1],
        ].map(([x, y, c, d]) => (
          <rect key={`${x}${y}`} className="px" style={lag(d as number)} x={x as number} y={y as number} width={3.4} height={3.4} fill={c as string} />
        ))}
        {/* cyan light strips */}
        <rect className="strip" x={23.6} y={86} width={3.6} height={32} rx={1.8} fill="#5ff3ff" />
        <rect className="strip" style={lag(1.4)} x={172.8} y={70} width={3.6} height={28} rx={1.8} fill="#5ff3ff" />
        <g className="neon">
          <path d={plate} fill="none" stroke="#ff8af7" strokeOpacity={0.3} strokeWidth={4.4} strokeLinejoin="round" />
          <path d={plate} fill="none" stroke="#ffc4fb" strokeWidth={1} strokeLinejoin="round" />
        </g>
        {/* tape across the top right, its end flapping */}
        <g transform={at(149, 46, 31.6)}>
          {hazardTape(tape, -46, 28, [-6])}
          <g transform="translate(28 0)">
            <g className="flap">{tapeEnd(tape)}</g>
          </g>
        </g>
        {/* the top tab with a scanning light */}
        <rect x={72} y={18} width={56} height={11.4} rx={4} fill={url(id("tab"))} stroke="#2e0a66" strokeWidth={1.6} />
        <rect x={80} y={21.6} width={40} height={4} rx={2} fill="#1d0647" />
        <rect className="scan" x={81.4} y={22.4} width={13} height={2.4} rx={1.2} fill="#62f6ff" />
        {/* tape across the bottom */}
        <g transform={at(103, 171.5, -10.9)}>
          {hazardTape(tape, -86, 64, [-46, 30])}
          <g transform="translate(64 0)">
            <g className="flap" style={lag(1.1)}>
              {tapeEnd(tape)}
            </g>
          </g>
        </g>
        {/* neon edges */}
        <g className="neon">
          <circle cx={100} cy={100} r={58.8} fill="none" stroke="#62f6ff" strokeOpacity={0.35} strokeWidth={4.6} />
          <circle cx={100} cy={100} r={58.8} fill="none" stroke="#c4fcff" strokeWidth={1.3} />
        </g>
        {[
          [180, 28, "#ffd21f", 0],
          [22, 150, "#62f6ff", 1.3],
          [186, 146, "#ffd21f", 2.4],
        ].map(([x, y, c, d]) => (
          <g key={`${x}`} transform={at(x as number, y as number)}>
            <g className="spark fb" style={lag(d as number)}>
              {spark(c as string)}
            </g>
          </g>
        ))}
      </g>
    )
  },

  /** Lavender spellbook frame with gold filigree: the witch hat wobbles, the wand sparkles, stars twinkle. */
  spellbound: ({ id }) => {
    const S = "lf-sp"
    const gold = url(id("gold"))
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .hat{animation:${S}-hat 4.8s ease-in-out infinite}` +
            `.${S} .charm{animation:${S}-charm 2.4s ease-in-out infinite}` +
            `.${S} .tw{animation:${S}-tw 3.2s ease-in-out infinite}` +
            `.${S} .tip{animation:${S}-tip 2.6s ease-in-out infinite}` +
            `.${S} .bub{animation:${S}-bub 3s ease-in infinite}` +
            `@keyframes ${S}-hat{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3.5deg)}}` +
            `@keyframes ${S}-charm{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}` +
            `@keyframes ${S}-tw{0%,100%{opacity:1;transform:scale(1) rotate(0)}50%{opacity:.25;transform:scale(.45) rotate(45deg)}}` +
            `@keyframes ${S}-tip{0%,100%{opacity:.55;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}` +
            `@keyframes ${S}-bub{0%{opacity:0;transform:translateY(0)}25%{opacity:.9}100%{opacity:0;transform:translateY(-10px)}}`
        )}
        <defs>
          {lin(id("plate"), [[0, "#eadcff"], [0.5, "#bb9cf6"], [1, "#8a62dc"]], 0, 28, 0, 172)}
          {box(id("gold"), [[0, "#fff4c2"], [0.5, "#f3c552"], [1, "#b9831f"]])}
          {box(id("gem"), [[0, "#c4fbff"], [1, "#2bb0c6"]])}
          {box(id("hat"), [[0, "#9a6cf6"], [1, "#4b23a8"]], 0, 0, 1, 1)}
          {box(id("brim"), [[0, "#8456e6"], [1, "#3f1c92"]])}
          {ball(id("orb"), [[0, "#fff1d0"], [0.4, "#ffb36a"], [1, "#e0602a"]], 0.35, 0.3, 0.8)}
          {halo(id("glow"), "#fff3a0", 0.9)}
          {shadow(id("sh"), 1.3, 1.2, 0.3, "#2a1260")}
        </defs>
        <g filter={url(id("sh"))}>
          <path d={roundSquare(72, 24) + hole()} fillRule="evenodd" fill={url(id("plate"))} stroke="#6a43c4" strokeWidth={2} />
          <path d={roundSquare(69.4, 21.6)} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.3} />
          {[
            [36, 128, 5.4],
            [164, 128, 4.6],
            [130, 36, 4.4],
            [70, 166, 4.2],
          ].map(([x, y, r]) => (
            <path key={x} d={crescent(r)} transform={at(x, y, -20)} fill="#f6efff" fillOpacity={0.65} />
          ))}
          <circle cx={100} cy={100} r={59.6} fill="none" stroke="#9a6a10" strokeWidth={4} />
          <circle cx={100} cy={100} r={59.6} fill="none" stroke="#f3c552" strokeWidth={2.6} />
          <circle cx={100} cy={100} r={59.2} fill="none" stroke="#fff3c0" strokeOpacity={0.7} strokeWidth={0.7} />
          {[
            [100, 34, 0],
            [166, 100, 90],
            [100, 166, 180],
            [34, 100, 270],
          ].map(([x, y, r]) => (
            <g key={r} transform={at(x, y, r)}>
              {scrollwork(url(id("gem")))}
            </g>
          ))}
          <g transform={at(158, 42, 45)}>{crown(gold)}</g>
          <g transform={at(42, 158, 225)}>{crown(gold)}</g>
          {/* ribbon swooping under the potion */}
          <path d="M104 190C136 188 168 174 192 132" fill="none" stroke="#6a3cc8" strokeWidth={11} />
          <path d="M104 190C136 188 168 174 192 132" fill="none" stroke="#e4ccff" strokeWidth={8.4} />
          <path d="M104 190C136 188 168 174 192 132" fill="none" stroke="#f6cf5a" strokeWidth={1.8} />
        </g>
        {/* wand, tip twinkling */}
        <g strokeLinecap="round">
          <path d="M166 170L124 182" stroke="#1c0c48" strokeWidth={5.4} />
          <path d="M166 170L124 182" stroke="#4b23a8" strokeWidth={3} />
          <path d="M150 174.6L152 174M137 178.4L139 177.8" stroke="#f6cf5a" strokeWidth={3.4} />
        </g>
        <g transform={at(120, 183)}>
          <g className="tip fb">
            <circle r={13} fill={url(id("glow"))} />
          </g>
          <path d={star(0, 0, 6.4, -14, 0.5)} fill="#ffe28a" stroke="#c98a12" strokeWidth={1.4} strokeLinejoin="round" />
          <circle cx={-0.6} cy={-0.4} r={1.6} fill="#fff" />
        </g>
        {/* potion orb */}
        <g transform={at(156, 154, 38)}>
          <rect x={-3.8} y={-17} width={7.6} height={7} fill="#fff3d6" stroke="#6b3a12" strokeWidth={1.2} />
          <rect x={-4.6} y={-21.4} width={9.2} height={5} rx={1.5} fill="#b5702e" stroke="#5a2e0c" strokeWidth={1.1} />
          <path d="M3 -16C9 -20 13 -17 13 -13C9 -12 5 -13 3 -16Z" fill="#5cc76a" stroke="#226b32" strokeWidth={1} strokeLinejoin="round" />
          <circle r={12.2} fill={url(id("orb"))} stroke="#7a2a12" strokeWidth={1.5} />
          <path d={star(0, 1.4, 5.4, 0, 0.5)} fill="#ff5a7a" stroke="#c22a4c" strokeWidth={1} strokeLinejoin="round" />
          <ellipse cx={-5.2} cy={-5.6} rx={3.6} ry={2} transform="rotate(-38 -5.2 -5.6)" fill="#fff" fillOpacity={0.85} />
          <circle className="bub" cx={-3.6} cy={6} r={1.3} fill="#fff" fillOpacity={0.85} />
          <circle className="bub" style={lag(1.5)} cx={3.4} cy={7} r={1} fill="#fff" fillOpacity={0.85} />
        </g>
        {/* witch hat on the top-left corner */}
        <g transform={at(46, 43, -28, 0.78)}>
          <g className="hat" strokeLinejoin="round">
            <g transform="translate(-9 3)">
              <g className="charm">
                <path d="M0 0L0.6 9" stroke="#f3c552" strokeWidth={1} />
                <path d={star(0.6, 13, 5, 0, 0.5)} fill="#ffe28a" stroke="#c98a12" strokeWidth={1.1} />
              </g>
            </g>
            <ellipse cx={0} cy={-1} rx={31} ry={8.6} fill={url(id("brim"))} stroke="#1c0f4a" strokeWidth={1.9} />
            <path
              d="M-16 -2C-13 -18 -6 -34 4 -42C10 -47 19 -47 25 -40C19 -41 14 -37 12 -30C10 -21 13 -10 16 -2Q0 3 -16 -2Z"
              fill={url(id("hat"))}
              stroke="#1c0f4a"
              strokeWidth={1.9}
            />
            <path d="M-15.4 -4.6Q0 0.4 15.4 -4.6L14 -11.6Q0 -7 -13.8 -11.6Z" fill="#f6cf5a" stroke="#1c0f4a" strokeWidth={1.3} />
            <path d="M-10 -14C-8 -24 -3 -33 3 -38" fill="none" stroke="#d6c4ff" strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" />
            <path d="M-26 -4Q-10 -9.4 10 -8.6" fill="none" stroke="#b392ff" strokeOpacity={0.6} strokeWidth={1.3} strokeLinecap="round" />
            <path d={star(3, -24, 3.4, 10)} fill="#ffe28a" stroke="#c98a12" strokeWidth={0.6} />
          </g>
        </g>
        {/* twinkles */}
        {[
          [106, 170, 3.4, 0],
          [112, 194, 2.6, 1.1],
          [134, 194, 2.2, 2],
          [34, 70, 3, 0.6],
          [170, 72, 3.2, 1.7],
          [80, 32, 2.4, 2.5],
          [176, 160, 2.6, 0.9],
        ].map(([x, y, r, d]) => (
          <path key={`${x}${y}`} className="tw fb" style={lag(d)} d={sparkle(x, y, r)} fill="#fffbe6" stroke="#e8b830" strokeWidth={0.5} />
        ))}
      </g>
    )
  },

  /** Night-sky plate: a little black cat rides a ringed planet; stars twinkle, lightning flickers, the cat blinks. */
  cosmic_cat: ({ id }) => {
    const S = "lf-ck"
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .bob{animation:${S}-bob 5.4s ease-in-out infinite}` +
            `.${S} .blink{animation:${S}-blink 4.6s ease-in-out infinite}` +
            `.${S} .tw{animation:${S}-tw 3.4s ease-in-out infinite}` +
            `.${S} .big{animation:${S}-big 4.2s ease-in-out infinite}` +
            `.${S} .bolt{animation:${S}-bolt 4.8s linear infinite}` +
            `@keyframes ${S}-bob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-2.6px) rotate(-2.5deg)}}` +
            `@keyframes ${S}-blink{0%,88%,100%{transform:scaleY(1)}92%{transform:scaleY(.1)}96%{transform:scaleY(1)}}` +
            `@keyframes ${S}-tw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.2;transform:scale(.5)}}` +
            `@keyframes ${S}-big{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.12) rotate(8deg)}}` +
            `@keyframes ${S}-bolt{0%,30%,100%{opacity:1}32%{opacity:.25}34%{opacity:1}36%{opacity:.4}38%,74%{opacity:1}76%{opacity:.35}78%{opacity:1}}`
        )}
        <defs>
          {lin(id("plate"), [[0, "#4b4482"], [0.5, "#282448"], [1, "#191631"]], 0, 28, 0, 172)}
          {lin(id("rim"), [[0, "#e4dfff"], [1, "#8a82dc"]], 0, 28, 0, 172)}
          {box(id("ear"), [[0, "#86ece4"], [1, "#2c8d9c"]])}
          {box(id("visor"), [[0, "#ebe6ff"], [1, "#9284ee"]])}
          {ball(id("glass"), [[0, "#ffffff", 0.95], [0.35, "#d6e2ff", 0.8], [0.8, "#949ff0", 0.85], [1, "#5b62c4", 0.95]], 0.35, 0.3, 0.8)}
          {halo(id("yg"), "#ffe36a", 0.75)}
          {halo(id("cg"), "#9ff7ff", 0.8)}
          {shadow(id("sh"), 1.4, 1.4, 0.4, "#0a0820")}
        </defs>
        {/* ear domes peeking over the top */}
        {[52, 148].map((x) => (
          <g key={x} transform={at(x, 29)}>
            <path d="M-17 4C-16 -13 16 -13 17 4Z" fill={url(id("ear"))} stroke="#1d4f63" strokeWidth={1.6} />
            <path d="M-11 -3C-9 -7 -4 -9 1 -9" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" />
          </g>
        ))}
        <g filter={url(id("sh"))}>
          <path d={roundSquare(72, 22) + hole()} fillRule="evenodd" fill={url(id("plate"))} stroke={url(id("rim"))} strokeWidth={2.6} />
          <circle cx={100} cy={100} r={60.2} fill="none" stroke="#bdb6ff" strokeOpacity={0.3} strokeWidth={6} />
          <circle cx={100} cy={100} r={60} fill="none" stroke="#d4cfff" strokeWidth={2.4} />
          <circle cx={100} cy={100} r={58.4} fill="none" stroke="#120f26" strokeWidth={1.2} />
          <path d="M78 25H122L115 37H85Z" fill={url(id("visor"))} stroke="#3d3577" strokeWidth={1.4} strokeLinejoin="round" />
          <path d="M93 25.6L100 34L107 25.6" fill="none" stroke="#5a4fb0" strokeWidth={1.3} strokeLinejoin="round" />
          <path d="M82 27.6H91" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.2} strokeLinecap="round" />
          {[
            [167, 50, 22],
            [175, 63, 16],
          ].map(([x, y, w]) => (
            <rect key={y} x={-w / 2} y={-3.2} width={w} height={6.4} rx={3.2} transform={at(x, y, -38)} fill="#c8c1ff" stroke="#5a4fb0" strokeWidth={0.9} />
          ))}
          {[
            [34, 92],
            [170, 172],
            [84, 172],
            [150, 44],
            [36, 134],
            [166, 86],
            [62, 36],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={1.1} fill="#fff" fillOpacity={0.75} />
          ))}
        </g>
        {/* constellation lightning */}
        <g className="bolt">
          {[
            "M12 72L30 57L27 73L44 62",
            "M188 104L169 118L182 126L165 141",
          ].map((d) => (
            <g key={d} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={d} stroke="#9ff7ff" strokeOpacity={0.35} strokeWidth={4.4} />
              <path d={d} stroke="#f2feff" strokeWidth={1.4} />
            </g>
          ))}
          {[
            [12, 72],
            [44, 62],
            [188, 104],
            [165, 141],
          ].map(([x, y]) => (
            <g key={`${x}${y}`}>
              <circle cx={x} cy={y} r={5} fill={url(id("cg"))} />
              <circle cx={x} cy={y} r={2.2} fill="#e9fdff" />
            </g>
          ))}
        </g>
        {/* small twinkles */}
        {[
          [30, 112, 2.6, 0],
          [174, 92, 2.4, 1.2],
          [60, 174, 2.2, 2.1],
          [146, 174, 2.6, 0.6],
          [186, 30, 2.8, 1.7],
          [124, 22, 2.2, 2.6],
        ].map(([x, y, r, d]) => (
          <path key={`${x}${y}`} className="tw fb" style={lag(d)} d={sparkle(x, y, r)} fill="#fffbe0" />
        ))}
        {/* big puffy stars */}
        {[
          [40, 44, 9, -10, 0],
          [168, 150, 7.4, 12, 1.4],
          [116, 178, 6.4, -6, 2.6],
        ].map(([x, y, R, rot, d]) => (
          <g key={x} transform={at(x, y)}>
            <g className="big" style={lag(d)}>
              <circle r={R * 2.1} fill={url(id("yg"))} />
              {puffyStar(0, 0, R, rot, "#ffe36a", "#fff7c8")}
            </g>
          </g>
        ))}
        {/* the planet and its cat */}
        <g transform={at(38, 160)}>
          <g className="bob">
            <g transform="rotate(-16)" fill="none">
              <path d="M-28 0A28 7.6 0 0 1 28 0" stroke="#6c74c8" strokeWidth={4.6} />
              <path d="M-28 0A28 7.6 0 0 1 28 0" stroke="#dfe3ff" strokeWidth={2.8} />
            </g>
            <circle r={19} fill={url(id("glass"))} stroke="#5b62c4" strokeWidth={1.4} />
            {puffyStar(2, 4, 7, 8, "#ffe36a", "#fff7c8")}
            {puffyStar(-8.6, -4, 2.8, -10, "#ff9ec4", "#ffd6e6")}
            <circle cx={9} cy={-7} r={1.4} fill="#fff" />
            <ellipse cx={-8} cy={-9} rx={5} ry={2.6} transform="rotate(-38 -8 -9)" fill="#fff" fillOpacity={0.85} />
            <g transform="rotate(-16)" fill="none">
              <path d="M-28 0A28 7.6 0 0 0 28 0" stroke="#6c74c8" strokeWidth={4.6} />
              <path d="M-28 0A28 7.6 0 0 0 28 0" stroke="#dfe3ff" strokeWidth={2.8} />
              <path d="M-14 6A28 7.6 0 0 0 8 7.2" stroke="#fff" strokeWidth={1} />
            </g>
            {/* cat */}
            <g strokeLinejoin="round">
              <path d="M-7.6 -27L-6.8 -36.4L-1.4 -31Z" fill="#24213a" stroke="#0e0c1c" strokeWidth={1} />
              <path d="M7.6 -27L6.8 -36.4L1.4 -31Z" fill="#24213a" stroke="#0e0c1c" strokeWidth={1} />
              <path d="M-5.8 -29.4L-5.4 -33.6L-3 -31Z" fill="#ff9ec4" />
              <path d="M5.8 -29.4L5.4 -33.6L3 -31Z" fill="#ff9ec4" />
              <ellipse cx={0} cy={-25} rx={9} ry={8} fill="#24213a" stroke="#0e0c1c" strokeWidth={1} />
              <ellipse cx={-4.4} cy={-17.6} rx={2.8} ry={2} fill="#24213a" stroke="#0e0c1c" strokeWidth={0.9} />
              <ellipse cx={4.4} cy={-17.6} rx={2.8} ry={2} fill="#24213a" stroke="#0e0c1c" strokeWidth={0.9} />
              <g className="blink fb">
                <ellipse cx={-3.4} cy={-25.4} rx={1.6} ry={2} fill="#8ff5e8" />
                <ellipse cx={3.4} cy={-25.4} rx={1.6} ry={2} fill="#8ff5e8" />
                <circle cx={-3} cy={-26.2} r={0.6} fill="#fff" />
                <circle cx={3.8} cy={-26.2} r={0.6} fill="#fff" />
              </g>
              <ellipse cx={-6} cy={-22} rx={1.7} ry={1} fill="#ff8fb6" fillOpacity={0.85} />
              <ellipse cx={6} cy={-22} rx={1.7} ry={1} fill="#ff8fb6" fillOpacity={0.85} />
              <path d="M-1.8 -21.8Q-0.9 -20.6 0 -21.6Q0.9 -20.6 1.8 -21.8" fill="none" stroke="#e8fdff" strokeWidth={0.8} strokeLinecap="round" />
              <path d="M-5 -30C-3 -32 1 -32.4 3 -31.4" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.1} strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>
    )
  },

  /** Neon music stage: the equaliser bounces, notes float, marquee bulbs chase, the mic sways. */
  neon_beats: ({ id }) => {
    const S = "lf-nb"
    // bulbs in chase order: up the left side, across the top, down the right
    const bulbs: [number, number][] = [
      [34, 120],
      [34, 106],
      [34, 92],
      [34, 78],
      [86, 34],
      [100, 34],
      [114, 34],
      [166, 78],
      [166, 92],
      [166, 106],
      [166, 120],
    ]
    const eq: [number, number, number][] = [
      [38, 22, 1.3],
      [46, 28, 1.1],
      [54, 20, 1.5],
      [62, 22, 1.2],
      [70, 14, 1.4],
      [78, 11, 1],
    ]
    const clef =
      "M1 26C3 32 -5 34 -6 28M1 26L-3 -4C-5 -16 -4 -26 1 -24C6 -22 4 -12 -4 -4C-12 4 -10 18 0 18C8 18 8 6 0 6C-6 6 -6 13 -1 14"
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .bulb{animation:${S}-chase 2.2s ease-in-out infinite}` +
            `.${S} .bar{transform-box:fill-box;transform-origin:50% 100%;animation:${S}-eq 1.2s ease-in-out infinite alternate}` +
            `.${S} .float{animation:${S}-float 3.6s ease-in-out infinite}` +
            `.${S} .rise{animation:${S}-rise 4.4s ease-in-out infinite}` +
            `.${S} .sway{animation:${S}-sway 3.2s ease-in-out infinite}` +
            `.${S} .thump{animation:${S}-thump 1.2s ease-in-out infinite}` +
            `.${S} .neon{animation:${S}-glow 3s ease-in-out infinite}` +
            `@keyframes ${S}-chase{0%,100%{opacity:1}50%{opacity:.25}}` +
            `@keyframes ${S}-eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}` +
            `@keyframes ${S}-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(6deg)}}` +
            `@keyframes ${S}-rise{0%{opacity:0;transform:translate(0,4px)}25%,60%{opacity:1}100%{opacity:0;transform:translate(3px,-10px)}}` +
            `@keyframes ${S}-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}` +
            `@keyframes ${S}-thump{0%,100%{transform:scale(1)}15%{transform:scale(1.05)}}` +
            `@keyframes ${S}-glow{0%,100%{opacity:.8}50%{opacity:1}}`
        )}
        <defs>
          {lin(id("plate"), [[0, "#5a6cff"], [0.5, "#7a3cf0"], [1, "#d348dc"]], 0, 28, 0, 172)}
          {lin(id("edge"), [[0, "#6ff4ff"], [0.5, "#a98bff"], [1, "#ff5fd8"]], 28, 28, 172, 172)}
          {box(id("bar"), [[0, "#ffffff"], [1, "#7deaff"]])}
          {ball(id("bulb"), [[0, "#fffef2"], [0.5, "#fff1a6"], [1, "#ffc94a"]], 0.4, 0.35, 0.75)}
          {halo(id("bg"), "#fff1a6", 0.8)}
          {ball(id("mic"), [[0, "#ffe3c0"], [0.5, "#ff9a8a"], [1, "#e0457a"]], 0.35, 0.3, 0.8)}
          {box(id("handle"), [[0, "#b9a4ff"], [1, "#6a3cd6"]], 0, 0, 1, 0)}
          {box(id("cup"), [[0, "#ff8fc6"], [1, "#d43a8a"]])}
          {box(id("shell"), [[0, "#c9d2ff"], [1, "#7d8cf0"]])}
          {box(id("note"), [[0, "#d9ccff"], [1, "#9a82f4"]])}
          <clipPath id={id("rows")}>
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x={30} y={177 - (i + 1) * 4.6} width={60} height={3.6} />
            ))}
          </clipPath>
          {shadow(id("sh"), 1.4, 1.4, 0.45, "#10052e")}
        </defs>
        <g filter={url(id("sh"))}>
          <path d={roundSquare(72, 14) + hole()} fillRule="evenodd" fill={url(id("plate"))} stroke="#1d0a52" strokeWidth={2} />
          <path d={roundSquare(68.6, 10.6)} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={1.1} />
          <circle cx={100} cy={100} r={61} fill="none" stroke="#12093a" strokeWidth={5.2} />
        </g>
        <g className="neon">
          <path d={roundSquare(72, 14)} fill="none" stroke={url(id("edge"))} strokeOpacity={0.4} strokeWidth={5} />
          <path d={roundSquare(72, 14)} fill="none" stroke={url(id("edge"))} strokeWidth={1.6} />
          <circle cx={100} cy={100} r={58.8} fill="none" stroke="#6ff4ff" strokeOpacity={0.35} strokeWidth={4.4} />
          <circle cx={100} cy={100} r={58.8} fill="none" stroke="#d6fdff" strokeWidth={1.3} />
        </g>
        {bulbs.map(([x, y], i) => (
          <g key={`${x}${y}`} className="bulb" style={{ animationDelay: `${(i * 2.2) / bulbs.length - 2.2}s` }}>
            <circle cx={x} cy={y} r={6.4} fill={url(id("bg"))} />
            <circle cx={x} cy={y} r={3.3} fill={url(id("bulb"))} stroke="#c78a1a" strokeWidth={0.7} />
          </g>
        ))}
        {/* equaliser, cut into blocks by a still clip */}
        <g clipPath={url(id("rows"))}>
          {eq.map(([x, h, s], i) => (
            <rect key={x} className="bar" style={{ animationDuration: `${s}s`, animationDelay: `${-i * 0.37}s` }} x={x - 2.8} y={177 - h} width={5.6} height={h} fill={url(id("bar"))} />
          ))}
        </g>
        {/* treble clef */}
        <g transform={at(22, 134, 0, 0.9)}>
          <g className="float" style={lag(1.2)}>
            <path d={clef} fill="none" stroke="#3a1f8a" strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round" />
            <path d={clef} fill="none" stroke="#c8b8ff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={-5.6} cy={28.4} r={2.6} fill="#c8b8ff" stroke="#3a1f8a" strokeWidth={1.1} />
          </g>
        </g>
        {/* notes */}
        <g transform={at(164, 40)}>
          <g className="float">
            <path d="M4.4 0V-21C9 -19 13 -16 12 -10C14 -15 11 -21 4.4 -24" fill="none" stroke="#3a1f8a" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.4 0V-21C9 -19 13 -16 12 -10C14 -15 11 -21 4.4 -24" fill="none" stroke="#d9ccff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            <ellipse cx={0} cy={0} rx={5.6} ry={4.2} transform="rotate(-22)" fill={url(id("note"))} stroke="#3a1f8a" strokeWidth={1.3} />
          </g>
        </g>
        {[
          [128, 22, 0.75, 0],
          [186, 120, 0.65, 1.5],
          [12, 92, 0.6, 2.9],
        ].map(([x, y, s, d]) => (
          <g key={x} transform={at(x, y, 0, s)}>
            <g className="rise" style={lag(d)}>
              <path d="M-5 2V-12L5 -15V-1" fill="none" stroke="#ffd0f2" strokeWidth={2} strokeLinejoin="round" />
              <path d="M-5 -12L5 -15V-11L-5 -8Z" fill="#ffd0f2" />
              <ellipse cx={-7.4} cy={2.4} rx={3.4} ry={2.6} fill="#ffd0f2" />
              <ellipse cx={2.6} cy={-0.6} rx={3.4} ry={2.6} fill="#ffd0f2" />
            </g>
          </g>
        ))}
        {/* microphone on the top-left corner */}
        <g transform={at(34, 42, 35)}>
          <g className="sway" strokeLinejoin="round">
            <path d="M-4.6 1L-3.2 26Q0 29 3.2 26L4.6 1Z" fill={url(id("handle"))} stroke="#2b1466" strokeWidth={1.5} />
            <path d="M-1.4 6L-0.8 22" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.1} strokeLinecap="round" />
            <rect x={-8.6} y={-2.6} width={17.2} height={5.4} rx={2} fill="#ffb347" stroke="#7a2a12" strokeWidth={1.3} />
            <circle cx={0} cy={-11.6} r={10.6} fill={url(id("mic"))} stroke="#7a2a12" strokeWidth={1.5} />
            {[
              [-4, -15],
              [0, -16.6],
              [4, -15],
              [-6, -11],
              [-2, -12],
              [2, -12],
              [6, -11],
              [-4, -7.6],
              [0, -8],
              [4, -7.6],
            ].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r={1.1} fill="#b43a5a" fillOpacity={0.65} />
            ))}
            <ellipse cx={-4.4} cy={-16} rx={3} ry={1.7} transform="rotate(-35 -4.4 -16)" fill="#fff" fillOpacity={0.85} />
          </g>
        </g>
        {/* headphones on the bottom-right corner */}
        <g transform={at(162, 160, -35)}>
          <g className="thump fb" strokeLinejoin="round">
            <path d="M-17 6C-18 -22 18 -22 17 6" fill="none" stroke="#3a2a8a" strokeWidth={7} strokeLinecap="round" />
            <path d="M-17 6C-18 -22 18 -22 17 6" fill="none" stroke="#9fb0ff" strokeWidth={4.6} strokeLinecap="round" />
            <path d="M-12 -10C-6 -16 4 -16 9 -12" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.3} strokeLinecap="round" />
            {[-1, 1].map((s) => (
              <g key={s} transform={`translate(${s * 17} 9)`}>
                <ellipse rx={7} ry={10.4} fill={url(id("shell"))} stroke="#3a2a8a" strokeWidth={1.5} />
                <ellipse cx={-s * 2} rx={4.4} ry={8} fill={url(id("cup"))} stroke="#8a1f5a" strokeWidth={1.1} />
                <ellipse cx={-s * 2 - 1} cy={-4} rx={1.4} ry={2.6} fill="#fff" fillOpacity={0.6} />
              </g>
            ))}
          </g>
        </g>
      </g>
    )
  },

  /** Icy-blue plate with feathered wings and a smiley badge: wings flap, sparkles drift, the badge winks. */
  frost_wings: ({ id }) => {
    const S = "lf-fw"
    const feather = url(id("feather"))
    return (
      <g className={S}>
        {motion(
          S,
          `.${S} .flap{animation:${S}-flap 3.4s ease-in-out infinite}` +
            `.${S} .flap-l{animation:${S}-flapl 3.4s ease-in-out infinite}` +
            `.${S} .mini{animation:${S}-mini 3s ease-in-out infinite}` +
            `.${S} .wink{animation:${S}-wink 5.2s ease-in-out infinite}` +
            `.${S} .swirl{animation:${S}-spin 6s linear infinite}` +
            `.${S} .drift{animation:${S}-drift 4.6s ease-in-out infinite}` +
            `.${S} .tw{animation:${S}-tw 3s ease-in-out infinite}` +
            `.${S} .chev{animation:${S}-chev 2.4s ease-in-out infinite}` +
            `@keyframes ${S}-flap{0%,100%{transform:rotate(3deg)}50%{transform:rotate(-7deg)}}` +
            `@keyframes ${S}-flapl{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(4deg)}}` +
            `@keyframes ${S}-mini{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(6deg)}}` +
            `@keyframes ${S}-wink{0%,86%,100%{transform:scaleY(1)}90%,93%{transform:scaleY(.12)}97%{transform:scaleY(1)}}` +
            `@keyframes ${S}-spin{to{transform:rotate(360deg)}}` +
            `@keyframes ${S}-drift{0%{opacity:0;transform:translate(0,4px) scale(.6)}30%{opacity:1;transform:translate(1px,0) scale(1)}100%{opacity:0;transform:translate(4px,-10px) scale(.7)}}` +
            `@keyframes ${S}-tw{0%,100%{opacity:1}50%{opacity:.3}}` +
            `@keyframes ${S}-chev{0%,100%{opacity:.4}40%{opacity:1}}`
        )}
        <defs>
          {lin(id("plate"), [[0, "#cfeaff"], [0.45, "#7fb4f6"], [1, "#4a72dc"]], 30, 30, 170, 170)}
          {box(id("silver"), [[0, "#ffffff"], [0.5, "#d3deef"], [1, "#8ea3c4"]])}
          {ball(id("screw"), [[0, "#ffffff"], [0.6, "#c9d5e8"], [1, "#7f93b8"]], 0.35, 0.3, 0.8)}
          {box(id("feather"), [[0, "#ffffff"], [1, "#d7e6ff"]])}
          {box(id("pwing"), [[0, "#f0dcff"], [1, "#a77af2"]])}
          {ball(id("face"), [[0, "#fff6a6"], [0.55, "#ffc928"], [1, "#f29a0a"]], 0.4, 0.35, 0.8)}
          {shadow(id("sh"), 1.4, 1.3, 0.35, "#162a6a")}
        </defs>
        {/* teal offset outline behind the plate */}
        <path d={roundSquare(70, 22)} transform="translate(-5 5)" fill="none" stroke="#6fe3d6" strokeWidth={2.2} />
        <g filter={url(id("sh"))}>
          <path d={roundSquare(70, 22) + hole()} fillRule="evenodd" fill={url(id("plate"))} stroke="#2f56b8" strokeWidth={2} />
          <path d={roundSquare(67.4, 19.4)} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.2} />
          <circle cx={100} cy={100} r={59.8} fill="none" stroke="#2f56b8" strokeWidth={4} />
          <circle cx={100} cy={100} r={59.8} fill="none" stroke="#eaf6ff" strokeWidth={2.2} />
          {[
            [44, 70],
            [36, 118],
            [62, 166],
            [104, 165],
            [166, 104],
            [96, 35],
            [120, 37],
            [36, 92],
            [80, 168],
            [164, 82],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={1.1} fill="#fff" fillOpacity={0.85} />
          ))}
          {/* silver clasp over the top-right corner */}
          <path d="M126 33H149Q167 33 167 51V74" fill="none" stroke="#5f7598" strokeWidth={10.6} />
          <path d="M126 33H149Q167 33 167 51V74" fill="none" stroke={url(id("silver"))} strokeWidth={8.2} />
          <path d="M128 30.6H149Q169.4 30.6 169.4 51" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.2} />
          <circle cx={161.5} cy={38.5} r={5} fill={url(id("screw"))} stroke="#5f7598" strokeWidth={1.2} />
          <path d="M158.6 40.2L164.4 36.8" stroke="#5f7598" strokeWidth={1.4} strokeLinecap="round" />
        </g>
        {[64, 71, 78].map((x, i) => (
          <path
            key={x}
            className="chev"
            style={{ animationDelay: `${i * 0.3 - 2.4}s` }}
            d={`M${x - 2} 30.5L${x + 2} 35L${x - 2} 39.5`}
            fill="none"
            stroke="#a46bff"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* small purple wing and silver star, top left */}
        <g transform={at(40, 40)}>
          <g className="mini">{wing([[-165, 0.78], [-138, 0.95], [-111, 0.84]], url(id("pwing")), "#6a3cc8", "#fff")}</g>
          <path d={star(0, 0, 9.6, 0, 0.62, 8)} fill={url(id("silver"))} stroke="#7f93b8" strokeWidth={1.2} strokeLinejoin="round" />
          <circle r={3.2} fill="#fff" stroke="#b9c7de" strokeWidth={0.8} />
        </g>
        {/* feathered wings and the smiley badge, bottom right */}
        <g transform={at(147, 160)}>
          <g className="flap-l">{wing([[148, 0.86], [168, 0.74], [188, 0.56]], feather, "#8fb0e6", "#b8cdf0")}</g>
        </g>
        <g transform={at(158, 152)}>
          <g className="flap">{wing([[-80, 1.12], [-58, 1.28], [-36, 1.22], [-14, 1.04]], feather, "#8fb0e6", "#b8cdf0")}</g>
        </g>
        <g transform={at(154, 156)}>
          <circle r={15} fill="#4b3f8f" stroke="#2a2160" strokeWidth={1.6} />
          <g className="swirl" fill="none" stroke="#9d8ff6" strokeWidth={2} strokeLinecap="round">
            <path d="M-12.6 -2A12.8 12.8 0 0 1 2 -12.6" />
            <path d="M12.6 2A12.8 12.8 0 0 1 -2 12.6" />
          </g>
          <circle r={10.4} fill={url(id("face"))} stroke="#c06a00" strokeWidth={1} />
          <circle cx={-3.6} cy={-2.6} r={3.2} fill="#fff" stroke="#6b3a00" strokeWidth={0.7} />
          <circle cx={-3.4} cy={-3.4} r={1.5} fill="#2a1a00" />
          <g className="wink fb">
            <circle cx={3.8} cy={-3} r={3.2} fill="#fff" stroke="#6b3a00" strokeWidth={0.7} />
            <circle cx={4} cy={-3.8} r={1.5} fill="#2a1a00" />
          </g>
          <path d="M-4 3.2Q0 7.4 4.2 3" fill="none" stroke="#6b3a00" strokeWidth={1.4} strokeLinecap="round" />
          <ellipse cx={-6} cy={-6.6} rx={2.4} ry={1.3} transform="rotate(-40 -6 -6.6)" fill="#fff" fillOpacity={0.7} />
        </g>
        {/* drifting sparkles */}
        {[
          [30, 150, 3, 0],
          [178, 96, 2.6, 1.2],
          [110, 26, 2.8, 2.3],
          [70, 178, 2.4, 3.4],
          [26, 64, 2.4, 1.8],
        ].map(([x, y, r, d]) => (
          <path key={`${x}${y}`} className="drift fb" style={lag(d)} d={sparkle(x, y, r)} fill="#fff" />
        ))}
        {[
          [52, 52, 2],
          [174, 132, 2.2],
          [126, 172, 2],
        ].map(([x, y, r], i) => (
          <path key={`${x}${y}`} className="tw" style={lag(i)} d={sparkle(x, y, r)} fill="#fff" />
        ))}
      </g>
    )
  },
}
