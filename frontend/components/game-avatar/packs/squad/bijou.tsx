import type { CharacterArtProps } from "../../types"
import { Eye, MOTIF, Stage, baseCss, fluff, twinkle, useUid } from "./kit"

const INK = "#7a0f45"
const HEAD = fluff(100, 118, 58, 54, 18, 0.045, 0.2)
const POM = fluff(100, 52, 46, 30, 12, 0.11)
const EAR = fluff(40, 140, 21, 36, 10, 0.12)
const FRINGE =
  "M56 72C68 46 122 40 148 62C160 74 162 94 152 108C148 92 134 82 116 84C96 86 76 88 58 100C50 92 50 80 56 72Z"
const HEART = "M0 7C-7 2.5-8-2.5-6.4-4.8C-4.8-7.2-1.6-7.2 0-4C1.6-7.2 4.8-7.2 6.4-4.8C8-2.5 7 2.5 0 7Z"
const PEARLS = Array.from({ length: 9 }, (_, i) => [70 + i * 7.5, Math.round((166 + Math.sin((Math.PI * i) / 8) * 7) * 10) / 10] as const)

/** Hearts drifting up when she makes her entrance: [x, y, scale, delay s]. */
const HEARTS = [
  [168, 150, 1.6, 0.7],
  [30, 160, 1.2, 0.85],
  [150, 176, 1.1, 1],
] as const

/** Lashes and eyeliner flicks at each eye's outer corner (they move with the lids). */
const LASHES = "M64 113Q57 111 52 104M63 116Q56 116 50 112M136 113Q143 111 148 104M137 116Q144 116 150 112"

/** The diva: a pink poodle, unimpressed, flawless. */
export function Bijou({ mode, size }: CharacterArtProps) {
  const uid = useUid("bijou")
  const u = (k: string) => `url(#${uid}-${k})`
  const lid = { cover: 0.48, fill: "#ffb3db", className: "gav-bijou-lid" }
  return (
    <Stage
      name="bijou"
      uid={uid}
      mode={mode}
      size={size}
      band={["#f772d6", "#9c0f7c"]}
      motif={MOTIF.heart}
      css={CSS}
      defs={
        <>
          <radialGradient id={`${uid}-fur`} cx="36%" cy="28%" r="80%">
            <stop offset="0" stopColor="#fff0f8" />
            <stop offset="0.45" stopColor="#ffb0d8" />
            <stop offset="1" stopColor="#e2559e" />
          </radialGradient>
          <radialGradient id={`${uid}-curl`} cx="34%" cy="26%" r="85%">
            <stop offset="0" stopColor="#ffe3f3" />
            <stop offset="0.5" stopColor="#ff8fcb" />
            <stop offset="1" stopColor="#cf3f8c" />
          </radialGradient>
          <radialGradient id={`${uid}-hair`} cx="30%" cy="20%" r="90%">
            <stop offset="0" stopColor="#f9a8f0" />
            <stop offset="0.45" stopColor="#c03bc4" />
            <stop offset="1" stopColor="#5e1470" />
          </radialGradient>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.5" stopColor="#f6b91a" />
            <stop offset="1" stopColor="#b7791f" />
          </linearGradient>
          <radialGradient id={`${uid}-pearl`} cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#f2c9e0" />
          </radialGradient>
          <radialGradient id={`${uid}-iris`} cx="50%" cy="72%" r="70%">
            <stop offset="0" stopColor="#f5b8ff" />
            <stop offset="0.5" stopColor="#b02ad0" />
            <stop offset="1" stopColor="#4a0d6b" />
          </radialGradient>
          <radialGradient id={`${uid}-blush`}>
            <stop offset="0" stopColor="#ff3d8b" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ff3d8b" stopOpacity="0" />
          </radialGradient>
        </>
      }
    >
      <g className="gav-bijou-head">
        {/* Floppy curly ears, neck and pearls */}
        <path d={EAR} fill={u("curl")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d={EAR} fill={u("curl")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" transform="matrix(-1 0 0 1 200 0)" />
        <path d="M50 200C54 172 76 160 100 160C124 160 146 172 150 200Z" fill={u("fur")} stroke={INK} strokeWidth="2.5" />
        <path d={HEAD} fill={u("fur")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <g>
          {PEARLS.map(([x, y]) => (
            <circle key={x} cx={x} cy={y + 12} r="4.4" fill={u("pearl")} stroke="#c06496" strokeWidth="1" />
          ))}
        </g>

        {/* Pom-pom hairdo and tiara */}
        <path d={POM} fill={u("curl")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <ellipse cx="82" cy="40" rx="15" ry="6" fill="#ffffff" opacity="0.4" transform="rotate(-18 82 40)" />
        <path d="M78 34L84 16L93 28L100 8L107 28L116 16L122 34Z" fill={u("gold")} stroke="#8a5410" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="100" cy="26" r="4" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.2" />

        {/* Blush, nose, beauty mark and a pout */}
        <ellipse cx="58" cy="140" rx="13" ry="7" fill={u("blush")} />
        <ellipse cx="142" cy="140" rx="13" ry="7" fill={u("blush")} />
        <path d="M95 134Q100 130 105 134Q103 139 100 140Q97 139 95 134Z" fill="#c0266d" />
        <path d="M89 150Q94 144 100 147Q106 144 111 150Q100 158 89 150Z" fill="#e3176f" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M94 148Q97 147 99 148" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" fill="none" />
        <circle cx="124" cy="143" r="1.8" fill="#5a0c33" />

        {/* Heavy-lidded side-eye */}
        <g className="gav-bijou-eyes">
          <Eye uid={uid} k="l" cx={78} cy={116} r={15} ink={INK} look={[-5, 1]} irisClass="gav-bijou-iris" lid={{ ...lid, tilt: -5 }} />
          <Eye uid={uid} k="r" cx={122} cy={116} r={15} ink={INK} look={[-5, 1]} irisClass="gav-bijou-iris" lid={{ ...lid, tilt: 5 }} />
          <path className="gav-bijou-lid" d={LASHES} stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>
        <path className="gav-bijou-brow" d="M62 94Q74 84 90 92" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />

        {/* The swoopy fringe she flips */}
        <g className="gav-bijou-hair">
          <path d={FRINGE} fill={u("hair")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M66 66C86 52 118 50 138 64" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" fill="none" />
          <path d="M100 84Q122 78 142 92" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" fill="none" />
        </g>
      </g>

      {/* Sparkles: idle twinkles on the tiara; the intro adds more */}
      <path className="gav-bijou-spark" d={twinkle(126, 14, 7)} fill="#ffffff" />
      {mode === "intro" && (
        <>
          <path className="gav-bijou-spark gav-bijou-pop" d={twinkle(162, 54, 9)} fill="#fff7c2" style={{ animationDelay: ".45s" }} />
          <path className="gav-bijou-spark gav-bijou-pop" d={twinkle(36, 64, 8)} fill="#ffffff" style={{ animationDelay: ".6s" }} />
          <path className="gav-bijou-spark gav-bijou-pop" d={twinkle(174, 104, 6)} fill="#ffffff" style={{ animationDelay: ".75s" }} />
        </>
      )}
      {(mode === "intro" ? HEARTS : size >= 64 ? HEARTS.slice(0, 2) : []).map(([x, y, s, delay], i) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path
            className="gav-bijou-heart"
            d={HEART}
            transform={`scale(${s})`}
            fill="#ff5fae"
            stroke="#ffffff"
            strokeWidth="1"
            style={mode === "intro" ? { animationDelay: `${delay}s` } : { animationDelay: `${-i * 2.4}s` }}
          />
        </g>
      ))}
    </Stage>
  )
}

const CSS =
  baseCss("bijou") +
  `
.gav-bijou-head{transform-origin:100px 196px}
.gav-bijou-hair{transform-origin:58px 80px}
.gav-bijou-eyes{transform-origin:100px 116px}
.gav-bijou-spark{transform-box:fill-box;transform-origin:center}
.gav-bijou-pop,.gav-bijou-heart{opacity:0}
.gav-bijou-idle .gav-bijou-eyes{animation:gav-bijou-blink 5s ease-in-out infinite}
.gav-bijou-idle .gav-bijou-hair{animation:gav-bijou-sway 3.6s ease-in-out infinite}
.gav-bijou-idle .gav-bijou-spark{animation:gav-bijou-twinkle 2.2s ease-in-out infinite}
.gav-bijou-idle .gav-bijou-heart{animation:gav-bijou-float 4.8s ease-out infinite}
@keyframes gav-bijou-blink{0%,84%,100%{scale:1 1}89%,91%{scale:1 .08}}
@keyframes gav-bijou-sway{0%,100%{rotate:0deg}50%{rotate:-2.5deg}}
@keyframes gav-bijou-twinkle{0%,100%{scale:1;rotate:0deg;opacity:1}50%{scale:.3;rotate:45deg;opacity:.5}}
@keyframes gav-bijou-float{0%{opacity:0;translate:0 0;scale:.5}15%{opacity:1;scale:1}50%{translate:6px -50px}100%{opacity:0;translate:-4px -110px;scale:.8}}
.gav-bijou-intro .gav-bijou-head{animation:gav-bijou-toss 1.6s both}
.gav-bijou-intro .gav-bijou-hair{animation:gav-bijou-flip 1.6s both}
.gav-bijou-intro .gav-bijou-iris{animation:gav-bijou-look 1.6s both}
.gav-bijou-intro .gav-bijou-lid{animation:gav-bijou-lids 1.6s both}
.gav-bijou-intro .gav-bijou-brow{animation:gav-bijou-brow 1.6s both}
.gav-bijou-intro .gav-bijou-spark{animation:gav-bijou-sparkle .7s ease-in-out .3s 2 both}
.gav-bijou-intro .gav-bijou-pop{animation:gav-bijou-pop .7s ease-out both}
.gav-bijou-intro .gav-bijou-heart{animation:gav-bijou-float 1.1s ease-out both}
@keyframes gav-bijou-toss{0%{rotate:0deg}16%{rotate:7deg;translate:3px 0}40%{rotate:-4deg;translate:-2px 0}58%,100%{rotate:0deg;translate:0 0}}
@keyframes gav-bijou-flip{0%{rotate:0deg}16%{rotate:-38deg;animation-timing-function:cubic-bezier(.5,0,.5,1.4)}42%{rotate:7deg}54%{rotate:-3deg}64%,100%{rotate:0deg}}
@keyframes gav-bijou-look{0%,58%{translate:5px -1px}72%,100%{translate:0 0}}
@keyframes gav-bijou-lids{0%,60%{translate:0 -11px}78%,100%{translate:0 0}}
@keyframes gav-bijou-brow{0%,60%{translate:0 -3px}68%{translate:0 -6px}82%,100%{translate:0 0}}
@keyframes gav-bijou-sparkle{0%,100%{scale:1;rotate:0deg}50%{scale:1.5;rotate:90deg}}
@keyframes gav-bijou-pop{0%{opacity:0;scale:0;rotate:-90deg}40%{opacity:1;scale:1.3;rotate:0deg}100%{opacity:0;scale:.4;rotate:45deg}}
`
