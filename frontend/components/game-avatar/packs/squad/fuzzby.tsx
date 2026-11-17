import type { CharacterArtProps } from "../../types"
import { Eye, MOTIF, Stage, baseCss, fluff, twinkle, useUid } from "./kit"

const INK = "#3b2fa8"
const BODY = fluff(100, 126, 76, 70, 22, 0.06, 0.12)
const TUFT = "M82 62Q80 42 94 48Q96 30 110 42Q124 36 120 62Z"
const EAR = "M46 84C30 62 30 34 44 22C60 30 74 54 74 76Z"
const EAR_IN = "M50 74C40 58 40 40 46 32C56 40 64 56 64 70Z"

/** Where the sparkles pop when Fuzzby lands: [x, y, radius, delay s]. */
const POPS = [
  [30, 64, 11, 0.95],
  [170, 58, 13, 1.02],
  [158, 26, 8, 1.12],
  [40, 26, 9, 1.18],
  [182, 120, 8, 1.08],
  [16, 116, 7, 1.15],
] as const

/** The super-cute one: a periwinkle puffball with enormous sparkly eyes. */
export function Fuzzby({ mode, size }: CharacterArtProps) {
  const uid = useUid("fuzzby")
  const u = (k: string) => `url(#${uid}-${k})`
  return (
    <Stage
      name="fuzzby"
      uid={uid}
      mode={mode}
      size={size}
      band={["#66c2ff", "#1556c4"]}
      motif={MOTIF.twinkle}
      css={CSS}
      defs={
        <>
          <radialGradient id={`${uid}-fur`} cx="36%" cy="28%" r="80%">
            <stop offset="0" stopColor="#eef0ff" />
            <stop offset="0.42" stopColor="#a9b6ff" />
            <stop offset="1" stopColor="#5d5ce0" />
          </radialGradient>
          <linearGradient id={`${uid}-rim`} x1="0.2" y1="0.1" x2="0.9" y2="0.9">
            <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id={`${uid}-iris`} cx="50%" cy="72%" r="70%">
            <stop offset="0" stopColor="#8fd3ff" />
            <stop offset="0.5" stopColor="#4a5bf0" />
            <stop offset="1" stopColor="#2a1f8a" />
          </radialGradient>
          <radialGradient id={`${uid}-blush`}>
            <stop offset="0" stopColor="#ff5fa2" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ff5fa2" stopOpacity="0" />
          </radialGradient>
        </>
      }
    >
      <g className="gav-fuzzby-body">
        {/* Ears behind the head; the left one twitches */}
        <g className="gav-fuzzby-ear">
          <path d={EAR} fill={u("fur")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d={EAR_IN} fill="#ff9ccc" />
        </g>
        <g transform="matrix(-1 0 0 1 200 0)">
          <path d={EAR} fill={u("fur")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d={EAR_IN} fill="#ff9ccc" />
        </g>
        <path d={TUFT} fill="#b7c2ff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d={BODY} fill={u("fur")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <clipPath id={`${uid}-in`}>
          <path d={BODY} />
        </clipPath>
        <g clipPath={u("in")}>
          <path d={BODY} fill="none" stroke={u("rim")} strokeWidth="9" transform="translate(-5 -5)" />
        </g>
        <ellipse cx="62" cy="78" rx="24" ry="11" fill="#ffffff" opacity="0.45" transform="rotate(-28 62 78)" />

        {/* Muzzle, cheeks, nose and a tiny open smile */}
        <ellipse cx="100" cy="148" rx="32" ry="22" fill="#f1f2ff" />
        <ellipse className="gav-fuzzby-blush" cx="44" cy="146" rx="15" ry="9" fill={u("blush")} />
        <ellipse className="gav-fuzzby-blush" cx="156" cy="146" rx="15" ry="9" fill={u("blush")} />
        <path d="M94 135Q100 131 106 135Q104 141 100 142Q96 141 94 135Z" fill="#ff5d9e" />
        <path d="M90 147Q100 162 110 147Q100 151 90 147Z" fill="#5b1037" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="100" cy="154.5" rx="5" ry="2.6" fill="#ff7aa8" />

        {/* Huge sparkly eyes */}
        <g className="gav-fuzzby-eyes">
          <Eye uid={uid} k="l" cx={68} cy={112} r={26} ink={INK} look={[2, 2]} iris={0.66} />
          <Eye uid={uid} k="r" cx={132} cy={112} r={26} ink={INK} look={[-2, 2]} iris={0.66} />
          <path className="gav-fuzzby-twinkle" d={twinkle(77, 121, 5)} fill="#ffffff" />
          <path className="gav-fuzzby-twinkle gav-fuzzby-twinkle-b" d={twinkle(133, 121, 5)} fill="#ffffff" />
        </g>
        {mode === "intro" && (
          <path
            className="gav-fuzzby-happy"
            d="M50 114Q68 94 86 114M114 114Q132 94 150 114"
            fill="none"
            stroke={INK}
            strokeWidth="6"
            strokeLinecap="round"
          />
        )}

        {/* Little paws */}
        <g fill="#c8d0ff" stroke={INK} strokeWidth="3">
          <ellipse cx="70" cy="188" rx="16" ry="12" />
          <ellipse cx="130" cy="188" rx="16" ry="12" />
        </g>
        <path d="M64 182v6M76 182v6M124 182v6M136 182v6" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </g>

      {mode === "intro" &&
        POPS.map(([x, y, r, delay]) => (
          <path
            key={`${x}-${y}`}
            className="gav-fuzzby-pop"
            d={twinkle(x, y, r)}
            fill="#fff8c4"
            stroke="#ffffff"
            strokeWidth="1.5"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
    </Stage>
  )
}

const CSS =
  baseCss("fuzzby") +
  `
.gav-fuzzby-body{transform-origin:100px 200px}
.gav-fuzzby-eyes{transform-origin:100px 112px}
.gav-fuzzby-ear{transform-origin:58px 82px}
.gav-fuzzby-twinkle{transform-box:fill-box;transform-origin:center}
.gav-fuzzby-blush{opacity:.8}
.gav-fuzzby-happy,.gav-fuzzby-pop{opacity:0}
.gav-fuzzby-idle .gav-fuzzby-body{animation:gav-fuzzby-breathe 3.2s ease-in-out infinite}
.gav-fuzzby-idle .gav-fuzzby-eyes{animation:gav-fuzzby-blink 4.4s infinite}
.gav-fuzzby-idle .gav-fuzzby-ear{animation:gav-fuzzby-twitch 5.2s ease-in-out infinite}
.gav-fuzzby-idle .gav-fuzzby-twinkle{animation:gav-fuzzby-twinkle 1.8s ease-in-out infinite}
.gav-fuzzby-idle .gav-fuzzby-twinkle-b{animation-delay:-.9s}
.gav-fuzzby-idle .gav-fuzzby-blush{animation:gav-fuzzby-glow 3.2s ease-in-out infinite}
@keyframes gav-fuzzby-breathe{0%,100%{scale:1 1}50%{scale:.985 1.025}}
@keyframes gav-fuzzby-blink{0%,91%,97%,100%{scale:1 1}94%{scale:1 .08}}
@keyframes gav-fuzzby-twitch{0%,62%,76%,100%{rotate:0deg}66%{rotate:-16deg}71%{rotate:5deg}}
@keyframes gav-fuzzby-twinkle{0%,100%{scale:1;opacity:1}50%{scale:.35;opacity:.6}}
@keyframes gav-fuzzby-glow{0%,100%{opacity:.7}50%{opacity:1}}
.gav-fuzzby-intro .gav-fuzzby-body{animation:gav-fuzzby-drop 1.6s both}
.gav-fuzzby-intro .gav-fuzzby-eyes{animation:gav-fuzzby-open 1.6s both}
.gav-fuzzby-intro .gav-fuzzby-happy{animation:gav-fuzzby-happy 1.6s both}
.gav-fuzzby-intro .gav-fuzzby-blush{animation:gav-fuzzby-flush 1.6s both}
.gav-fuzzby-intro .gav-fuzzby-pop{transform-box:fill-box;transform-origin:center;animation:gav-fuzzby-pop .6s ease-out both}
@keyframes gav-fuzzby-drop{
0%{translate:0 -215px;scale:.9 1.12;animation-timing-function:cubic-bezier(.55,0,1,.8)}
24%{translate:0 0;scale:.94 1.08;animation-timing-function:ease-out}
32%{translate:0 0;scale:1.22 .76;animation-timing-function:ease-out}
47%{translate:0 -36px;scale:.94 1.08;animation-timing-function:ease-in}
59%{translate:0 0;scale:1.1 .9;animation-timing-function:ease-out}
69%{translate:0 0;scale:.97 1.03}
78%,100%{translate:0 0;scale:1 1}}
@keyframes gav-fuzzby-open{0%,56%{scale:1 .05;opacity:0}58%{opacity:1}66%{scale:1.04 1.14}75%,100%{scale:1 1}}
@keyframes gav-fuzzby-happy{0%,56%{opacity:1}60%,100%{opacity:0}}
@keyframes gav-fuzzby-flush{0%,58%{opacity:.35}72%{opacity:1}100%{opacity:.8}}
@keyframes gav-fuzzby-pop{0%{opacity:0;scale:0;rotate:-90deg}40%{opacity:1;scale:1.25;rotate:0deg}100%{opacity:0;scale:.5;rotate:40deg}}
`
