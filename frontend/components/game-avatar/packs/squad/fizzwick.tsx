import type * as React from "react"

import type { CharacterArtProps } from "../../types"
import { Eye, MOTIF, Stage, baseCss, twinkle, useUid } from "./kit"

const INK = "#0b4d31"
const EAR = "M40 92C26 86 14 78 6 70C9 90 24 112 42 118Z"
const EAR_IN = "M36 98C27 93 19 87 13 81C18 95 27 106 38 110Z"
const MOUTH = "M46 120C64 131 112 131 130 116C127 145 111 160 88 160C65 160 49 146 46 120Z"

/** Fizz flung from the bulb when it zaps: [dx, dy, delay s]. */
const FIZZ = [
  [-34, -40, 0],
  [-14, -58, 0.05],
  [10, -64, 0.02],
  [26, -44, 0.08],
  [-40, -14, 0.1],
  [32, -18, 0.04],
  [-24, -70, 0.12],
] as const

/** The gadget tinkerer: a grinning goblin with a bubbling zap gun. */
export function Fizzwick({ mode, size }: CharacterArtProps) {
  const uid = useUid("fizzwick")
  const u = (k: string) => `url(#${uid}-${k})`
  return (
    <Stage
      name="fizzwick"
      uid={uid}
      mode={mode}
      size={size}
      band={["#e4fa62", "#6fb81c"]}
      motif={MOTIF.gear}
      css={CSS}
      defs={
        <>
          <radialGradient id={`${uid}-skin`} cx="34%" cy="28%" r="80%">
            <stop offset="0" stopColor="#b8f7cf" />
            <stop offset="0.45" stopColor="#35c77f" />
            <stop offset="1" stopColor="#11784a" />
          </radialGradient>
          <linearGradient id={`${uid}-coat`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c3cfdd" />
          </linearGradient>
          <linearGradient id={`${uid}-brass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="0.5" stopColor="#d99a1e" />
            <stop offset="1" stopColor="#8a5410" />
          </linearGradient>
          <radialGradient id={`${uid}-lens`} cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#e0fbff" />
            <stop offset="0.5" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0c4a6e" />
          </radialGradient>
          <linearGradient id={`${uid}-goo`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9ff7a" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
          <radialGradient id={`${uid}-iris`} cx="50%" cy="72%" r="70%">
            <stop offset="0" stopColor="#fff3a1" />
            <stop offset="0.55" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#9a3412" />
          </radialGradient>
          <linearGradient id={`${uid}-copper`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f59e5b" />
            <stop offset="1" stopColor="#9a3412" />
          </linearGradient>
          <clipPath id={`${uid}-mouth`}>
            <path d={MOUTH} />
          </clipPath>
          <clipPath id={`${uid}-bulb`}>
            <circle cx="158" cy="132" r="19" />
          </clipPath>
        </>
      }
    >
      <g className="gav-fizzwick-hero">
        {/* Lab coat */}
        <path d="M28 200C30 170 56 152 88 152C120 152 144 166 150 200Z" fill={u("coat")} stroke={INK} strokeWidth="3" />
        <path d="M74 154L88 184L102 154Z" fill="#334155" />
        <path d="M66 156L88 192L80 200M110 156L88 192" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Long goblin ears */}
        {[false, true].map((flip) => (
          <g key={String(flip)} transform={flip ? "matrix(-1 0 0 1 176 0)" : undefined}>
            <path d={EAR} fill={u("skin")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d={EAR_IN} fill="#f59ab5" opacity="0.8" />
          </g>
        ))}

        {/* Spiky tuft, head, goggles up on the forehead */}
        <path d="M70 62L62 32L80 46L86 18L97 44L110 28L106 60Z" fill="#0f7a44" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="88" cy="106" rx="57" ry="51" fill={u("skin")} stroke={INK} strokeWidth="3" />
        <ellipse cx="62" cy="74" rx="20" ry="8" fill="#ffffff" opacity="0.35" transform="rotate(-24 62 74)" />
        <path d="M33 86C54 62 122 60 144 82" fill="none" stroke="#5b3416" strokeWidth="6" strokeLinecap="round" />
        <path d="M82 64L94 63" stroke={u("brass")} strokeWidth="5" />
        {[
          [70, 66],
          [106, 64],
        ].map(([x, y]) => (
          <g key={x}>
            <circle cx={x} cy={y} r="13.5" fill={u("brass")} stroke={INK} strokeWidth="2.5" />
            <circle cx={x} cy={y} r="9" fill={u("lens")} />
            <path d={`M${x - 5} ${y - 2}Q${x - 4} ${y - 6} ${x} ${y - 6}`} stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        ))}
        <g fill="#0f7a44" opacity="0.5">
          <circle cx="44" cy="118" r="2.2" />
          <circle cx="50" cy="125" r="2" />
          <circle cx="40" cy="126" r="1.8" />
        </g>

        {/* Mismatched wild eyes, darting at the gadget */}
        <g className="gav-fizzwick-eyes">
          <Eye uid={uid} k="l" cx={67} cy={102} r={17} ink={INK} look={[4, -3]} iris={0.48} />
          <Eye uid={uid} k="r" cx={108} cy={98} r={21} ink={INK} look={[5, -4]} iris={0.44} />
        </g>

        {/* The big toothy grin */}
        <path d={MOUTH} fill="#4a0f1c" />
        <g clipPath={u("mouth")}>
          <ellipse cx="86" cy="160" rx="22" ry="9" fill="#e2556b" />
          <rect x="40" y="114" width="96" height="16" fill="#fffdf4" />
          <path d="M54 118v14M64 120v12M74 121v10M84 121v10M94 121v10M104 120v10M114 118v12M124 116v12" stroke="#c9c2b0" strokeWidth="1.6" />
          <path d="M56 152L64 146L72 152L80 146L88 152L96 146L104 152L112 146L120 152L120 162L56 162Z" fill="#fffdf4" />
        </g>
        <path d={MOUTH} fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M42 116Q44 122 48 124M132 112Q134 118 130 120" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />

        {/* The zap gun: bubbling bulb, brass collar, copper nozzle */}
        <g className="gav-fizzwick-gun">
          <path d="M154 166L149 198" stroke="#3f1d0b" strokeWidth="14" strokeLinecap="round" />
          <path d="M154 166L149 198" stroke="#8a4216" strokeWidth="7" strokeLinecap="round" />
          <path d="M166 114L177 96" stroke="#7c2d12" strokeWidth="10" strokeLinecap="round" />
          <path d="M166 114L177 96" stroke="#ea7a2c" strokeWidth="5" strokeLinecap="round" />
          <path d="M163 109l9 4M166 104l9 4M169 99l9 4" stroke={u("brass")} strokeWidth="3" strokeLinecap="round" />
          <path d="M172 95L180 100L192 88L182 78Z" fill={u("brass")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="187" cy="83" r="4" fill="#fff7cc" stroke={INK} strokeWidth="1.5" />
          <circle cx="158" cy="132" r="21" fill="#e6fffb" opacity="0.35" />
          <g clipPath={u("bulb")}>
            <g className="gav-fizzwick-goo">
              <rect x="136" y="128" width="44" height="30" fill={u("goo")} />
              <ellipse cx="158" cy="128" rx="20" ry="3.2" fill="#ecffb0" />
            </g>
            <g fill="#f0fff4" opacity="0.9">
              <circle className="gav-fizzwick-bub" cx="151" cy="150" r="3" />
              <circle className="gav-fizzwick-bub gav-fizzwick-bub-b" cx="162" cy="152" r="2.2" />
              <circle className="gav-fizzwick-bub gav-fizzwick-bub-c" cx="157" cy="148" r="2.6" />
            </g>
          </g>
          <circle cx="158" cy="132" r="21" fill="none" stroke="#f0fdfa" strokeWidth="2.5" />
          <circle cx="158" cy="132" r="22.5" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.6" />
          <path d="M145 124Q148 116 156 114" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M134 150H182L177 170Q158 177 139 170Z" fill={u("copper")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M138 155H178" stroke="#ffd0a0" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <circle cx="143" cy="162" r="2" fill="#fde68a" />
          <circle cx="173" cy="162" r="2" fill="#fde68a" />
          <ellipse cx="151" cy="184" rx="12" ry="10" fill={u("skin")} stroke={INK} strokeWidth="2.5" />
          <path className="gav-fizzwick-spark" d={twinkle(187, 83, 8)} fill="#fff59d" />
        </g>
      </g>

      {mode === "intro" && (
        <>
          <g className="gav-fizzwick-zap" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M187 83L170 62L186 52L170 28L190 6M187 83L200 66M187 83L162 76L166 56L142 44" stroke="#bef264" strokeWidth="11" opacity="0.55" />
            <path d="M187 83L170 62L186 52L170 28L190 6M187 83L200 66M187 83L162 76L166 56L142 44" stroke="#fefce8" strokeWidth="4.5" />
          </g>
          <circle className="gav-fizzwick-flash" cx="187" cy="83" r="14" fill="#ffffff" />
          {FIZZ.map(([dx, dy, delay], i) => (
            <circle
              key={i}
              className="gav-fizzwick-fizz"
              cx="158"
              cy="112"
              r={i % 2 ? 3.6 : 5}
              fill={i % 3 ? "#d9ff7a" : "#5eead4"}
              stroke="#ffffff"
              strokeWidth="1"
              style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${0.86 + delay}s` } as React.CSSProperties}
            />
          ))}
        </>
      )}
    </Stage>
  )
}

const CSS =
  baseCss("fizzwick") +
  `
.gav-fizzwick-hero{transform-origin:100px 200px}
.gav-fizzwick-eyes{transform-origin:88px 100px}
.gav-fizzwick-gun{transform-origin:151px 184px}
.gav-fizzwick-goo{transform-origin:158px 154px}
.gav-fizzwick-spark,.gav-fizzwick-flash{transform-box:fill-box;transform-origin:center}
.gav-fizzwick-zap,.gav-fizzwick-flash,.gav-fizzwick-fizz{opacity:0}
.gav-fizzwick-idle .gav-fizzwick-bub{animation:gav-fizzwick-rise 1.8s ease-in infinite}
.gav-fizzwick-idle .gav-fizzwick-bub-b{animation-delay:-.6s}
.gav-fizzwick-idle .gav-fizzwick-bub-c{animation-delay:-1.2s}
.gav-fizzwick-idle .gav-fizzwick-spark{animation:gav-fizzwick-crackle 1.1s steps(2,jump-none) infinite}
.gav-fizzwick-idle .gav-fizzwick-eyes{animation:gav-fizzwick-blink 3.8s infinite}
.gav-fizzwick-idle .gav-fizzwick-hero{animation:gav-fizzwick-bob 2.6s ease-in-out infinite}
@keyframes gav-fizzwick-rise{0%{opacity:0;translate:0 0}15%{opacity:1}85%{opacity:1}100%{opacity:0;translate:0 -30px}}
@keyframes gav-fizzwick-crackle{0%,100%{scale:1;rotate:0deg;opacity:1}50%{scale:.55;rotate:45deg;opacity:.7}}
@keyframes gav-fizzwick-blink{0%,88%,94%,100%{scale:1 1}91%{scale:1 .1}}
@keyframes gav-fizzwick-bob{0%,100%{translate:0 0}50%{translate:0 -2px}}
.gav-fizzwick-intro .gav-fizzwick-hero{animation:gav-fizzwick-pop 1.5s both}
.gav-fizzwick-intro .gav-fizzwick-goo{animation:gav-fizzwick-fill 1.5s both}
.gav-fizzwick-intro .gav-fizzwick-bub{animation:gav-fizzwick-rise .38s ease-in .4s 3 backwards}
.gav-fizzwick-intro .gav-fizzwick-bub-b{animation-delay:.52s}
.gav-fizzwick-intro .gav-fizzwick-bub-c{animation-delay:.46s}
.gav-fizzwick-intro .gav-fizzwick-zap{animation:gav-fizzwick-zap 1.5s both}
.gav-fizzwick-intro .gav-fizzwick-flash{animation:gav-fizzwick-flash 1.5s both}
.gav-fizzwick-intro .gav-fizzwick-gun{animation:gav-fizzwick-kick 1.5s both}
.gav-fizzwick-intro .gav-fizzwick-eyes{animation:gav-fizzwick-wide 1.5s both}
.gav-fizzwick-intro .gav-fizzwick-fizz{animation:gav-fizzwick-fizz .6s ease-out both}
@keyframes gav-fizzwick-pop{
0%{translate:0 150px;scale:1 1;animation-timing-function:cubic-bezier(.2,.8,.4,1)}
24%{translate:0 -12px;scale:.95 1.06;animation-timing-function:ease-in}
33%{translate:0 0;scale:1.07 .93}
42%,100%{translate:0 0;scale:1 1}}
@keyframes gav-fizzwick-fill{0%,28%{scale:1 .12}54%{scale:1 1.18}62%,100%{scale:1 1}}
@keyframes gav-fizzwick-zap{0%,54%{opacity:0}56%{opacity:1}60%{opacity:.15}63%{opacity:1}67%{opacity:.25}71%{opacity:1}75%{opacity:.3}79%{opacity:1}84%,100%{opacity:0}}
@keyframes gav-fizzwick-flash{0%,54%{opacity:0;scale:0}60%{opacity:.95;scale:1.6}76%,100%{opacity:0;scale:2.4}}
@keyframes gav-fizzwick-kick{0%,54%{rotate:0deg}58%{rotate:-7deg}70%{rotate:2deg}80%,100%{rotate:0deg}}
@keyframes gav-fizzwick-wide{0%,54%{scale:1}62%{scale:1.16}78%,100%{scale:1}}
@keyframes gav-fizzwick-fizz{0%{opacity:0;translate:0 0;scale:.4}20%{opacity:1;scale:1}100%{opacity:0;translate:var(--dx) var(--dy);scale:.6}}
`
