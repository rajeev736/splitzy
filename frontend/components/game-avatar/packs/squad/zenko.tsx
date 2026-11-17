import type { CharacterArtProps } from "../../types"
import { Eye, MOTIF, Stage, baseCss, twinkle, useUid } from "./kit"

const INK = "#1b1747"
const HOOD = "M100 40C146 40 164 70 162 104C160 136 134 152 100 152C66 152 40 136 38 104C36 70 54 40 100 40Z"
const SLIT = "M42 90C62 78 138 78 158 90C160 102 157 112 153 118C130 109 70 109 47 118C43 112 40 102 42 90Z"
const EAR = "M52 66L42 16Q45 11 51 15L90 46Z"
const EAR_IN = "M55 58L49 28L78 48Z"

/** A glossy steel shuriken of radius ~20 around the origin. */
function Shuriken({ u }: { u: (k: string) => string }) {
  return (
    <g>
      <path d="M0-21Q4-5 21 0Q4 5 0 21Q-4 5-21 0Q-4-5 0-21Z" fill={u("steel")} stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
      <path d="M0-14Q2-3 3-1M14 0Q3 2 1 3M0 14Q-2 3-3 1M-14 0Q-3-2-1-3" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" fill="none" />
      <circle r="5.5" fill="#64748b" stroke="#e2e8f0" strokeWidth="2" />
      <circle r="2.2" fill="#0f172a" />
    </g>
  )
}

/** The ninja: a hooded fox who flips in, throws, and lands cool. */
export function Zenko({ mode, size }: CharacterArtProps) {
  const uid = useUid("zenko")
  const u = (k: string) => `url(#${uid}-${k})`
  return (
    <Stage
      name="zenko"
      uid={uid}
      mode={mode}
      size={size}
      band={["#ffe866", "#f29e00"]}
      motif={MOTIF.shuriken}
      css={CSS}
      defs={
        <>
          <radialGradient id={`${uid}-hood`} cx="34%" cy="26%" r="85%">
            <stop offset="0" stopColor="#7a74e0" />
            <stop offset="0.45" stopColor="#3b3590" />
            <stop offset="1" stopColor="#17134a" />
          </radialGradient>
          <linearGradient id={`${uid}-fur`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc06b" />
            <stop offset="0.6" stopColor="#ff8a2a" />
            <stop offset="1" stopColor="#d9531a" />
          </linearGradient>
          <linearGradient id={`${uid}-red`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff6b81" />
            <stop offset="1" stopColor="#c2103a" />
          </linearGradient>
          <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#cbd5e1" />
            <stop offset="0.55" stopColor="#8a99ad" />
            <stop offset="1" stopColor="#e2e8f0" />
          </linearGradient>
          <radialGradient id={`${uid}-iris`} cx="50%" cy="72%" r="70%">
            <stop offset="0" stopColor="#fff3a3" />
            <stop offset="0.55" stopColor="#f5b301" />
            <stop offset="1" stopColor="#a35a00" />
          </radialGradient>
        </>
      }
    >
      <g className="gav-zenko-fly">
        <g className="gav-zenko-land">
          {/* Big fox tail behind */}
          <g className="gav-zenko-tail">
            <path
              d="M70 200C26 196 4 160 12 122C17 98 38 86 50 96C42 120 52 152 90 178Z"
              fill={u("fur")}
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M13 121C17 99 37 87 49 96C44 104 42 112 42 121C33 116 22 116 13 121Z" fill="#fff6e6" />
          </g>

          {/* Gi with a fur chest and red sash */}
          <path d="M34 200C34 166 62 150 100 150C138 150 166 166 166 200Z" fill={u("hood")} stroke={INK} strokeWidth="3" />
          <path d="M86 152L100 174L114 152Z" fill="#fff1dc" />
          <path d="M80 152L100 180L120 152" fill="none" stroke="#8b85f0" strokeWidth="3" strokeLinejoin="round" />
          <path d="M36 186Q100 176 164 186L166 200L34 200Z" fill={u("red")} stroke={INK} strokeWidth="2.5" />

          {/* Headband tails stream from the knot */}
          <g className="gav-zenko-ribbon" fill={u("red")} stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M46 72C30 64 18 52 2 52C14 60 22 72 40 82Z" />
            <path d="M44 80C30 84 18 94 6 104C22 102 34 94 48 88Z" />
          </g>

          {/* Ears poke through the hood */}
          {[false, true].map((flip) => (
            <g key={String(flip)} transform={flip ? "matrix(-1 0 0 1 200 0)" : undefined}>
              <path d={EAR} fill={u("fur")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d={EAR_IN} fill="#fff1dc" />
              <path d="M43 18Q45 11 51 15L58 20L45 28Z" fill="#3a1d0c" />
            </g>
          ))}

          <path d={HOOD} fill={u("hood")} stroke={INK} strokeWidth="3" />
          <ellipse cx="74" cy="56" rx="22" ry="9" fill="#ffffff" opacity="0.28" transform="rotate(-22 74 56)" />

          {/* Eye slit: a strip of fox fur and narrowed, confident eyes */}
          <path d={SLIT} fill={u("fur")} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <g className="gav-zenko-eyes">
            <Eye
              uid={uid}
              k="l"
              cx={76}
              cy={99}
              r={13.5}
              ink={INK}
              look={[3, 2]}
              lid={{ cover: 0.36, tilt: 14, fill: "#ff9a3c" }}
            />
            <Eye
              uid={uid}
              k="r"
              cx={124}
              cy={99}
              r={13.5}
              ink={INK}
              look={[3, 2]}
              lid={{ cover: 0.32, tilt: -10, fill: "#ff9a3c" }}
            />
          </g>
          <path d="M40 74C70 62 130 62 160 74L161 86C130 75 70 75 39 86Z" fill={u("red")} stroke={INK} strokeWidth="2.5" />
          <path d="M60 70C80 65 120 65 140 70" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.5" fill="none" />
          <circle cx="44" cy="79" r="7" fill={u("red")} stroke={INK} strokeWidth="2.5" />

          {/* Mask folds over the snout */}
          <path d="M66 128Q100 140 134 128M80 140Q100 146 120 140" fill="none" stroke="#6d67d6" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="100" cy="124" rx="14" ry="6" fill="#ffffff" opacity="0.14" />

          {/* Raised paw holding a shuriken */}
          <g className="gav-zenko-arm">
            <path
              d="M132 168C140 142 152 126 160 116L178 124C171 138 162 158 156 174Z"
              fill={u("hood")}
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <g transform="translate(171 88)">
              <g className="gav-zenko-held">
                <Shuriken u={u} />
              </g>
            </g>
            <circle cx="169" cy="113" r="11" fill={u("fur")} stroke={INK} strokeWidth="3" />
            <path d="M162 106Q166 102 171 104" stroke="#fff1dc" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        </g>
      </g>

      {mode === "intro" && (
        <>
          <g className="gav-zenko-throw">
            <path d="M-4-4L-52-46L-44-52Z" fill="#ffffff" opacity="0.5" />
            <path d="M4-6L-34-56L-28-58Z" fill="#ffffff" opacity="0.3" />
            <g className="gav-zenko-spin">
              <Shuriken u={u} />
            </g>
          </g>
          <path className="gav-zenko-glint" d={twinkle(186, 72, 12)} fill="#ffffff" />
        </>
      )}
    </Stage>
  )
}

const CSS =
  baseCss("zenko") +
  `
.gav-zenko-fly{transform-origin:100px 120px}
.gav-zenko-land{transform-origin:100px 200px}
.gav-zenko-arm{transform-origin:146px 170px}
.gav-zenko-ribbon{transform-origin:46px 78px}
.gav-zenko-tail{transform-origin:66px 196px}
.gav-zenko-eyes{transform-origin:100px 99px}
.gav-zenko-held,.gav-zenko-spin,.gav-zenko-throw{transform-origin:0 0}
.gav-zenko-throw,.gav-zenko-glint{opacity:0}
.gav-zenko-glint{transform-box:fill-box;transform-origin:center}
.gav-zenko-idle .gav-zenko-ribbon{animation:gav-zenko-flutter 1.2s ease-in-out infinite}
.gav-zenko-idle .gav-zenko-tail{animation:gav-zenko-sway 3.4s ease-in-out infinite}
.gav-zenko-idle .gav-zenko-held{animation:gav-zenko-twirl 3.8s ease-in-out infinite}
.gav-zenko-idle .gav-zenko-eyes{animation:gav-zenko-blink 4.6s infinite}
@keyframes gav-zenko-flutter{0%,100%{rotate:0deg}35%{rotate:-8deg}70%{rotate:4deg}}
@keyframes gav-zenko-sway{0%,100%{rotate:0deg}50%{rotate:5deg}}
@keyframes gav-zenko-twirl{0%,70%{rotate:0deg}100%{rotate:360deg}}
@keyframes gav-zenko-blink{0%,90%,96%,100%{scale:1 1}93%{scale:1 .1}}
.gav-zenko-intro .gav-zenko-fly{animation:gav-zenko-flip 1.7s both}
.gav-zenko-intro .gav-zenko-land{animation:gav-zenko-land 1.7s both}
.gav-zenko-intro .gav-zenko-arm{animation:gav-zenko-arm 1.7s both}
.gav-zenko-intro .gav-zenko-held{animation:gav-zenko-catch 1.7s both}
.gav-zenko-intro .gav-zenko-ribbon{animation:gav-zenko-flutter .3s ease-in-out 6}
.gav-zenko-intro .gav-zenko-throw{animation:gav-zenko-throw 1.7s both}
.gav-zenko-intro .gav-zenko-spin{animation:gav-zenko-spin .22s linear 6}
.gav-zenko-intro .gav-zenko-glint{animation:gav-zenko-glint 1.7s both}
@keyframes gav-zenko-flip{
0%{translate:-170px 70px;rotate:-420deg;scale:.5;animation-timing-function:cubic-bezier(.2,.6,.4,1)}
20%{translate:-80px -80px;rotate:-210deg;scale:.72;animation-timing-function:cubic-bezier(.6,0,.9,.6)}
40%,100%{translate:0 0;rotate:0deg;scale:1}}
@keyframes gav-zenko-land{0%,39%{scale:1 1}46%{scale:1.15 .82}56%{scale:.96 1.05}64%,100%{scale:1 1}}
@keyframes gav-zenko-arm{0%,46%{rotate:40deg}60%{rotate:-14deg}70%{rotate:5deg}78%,100%{rotate:0deg}}
@keyframes gav-zenko-catch{0%,54%{scale:0;rotate:-200deg}64%{scale:1.25;rotate:10deg}72%,100%{scale:1;rotate:0deg}}
@keyframes gav-zenko-throw{0%,16%{opacity:0;translate:46px 40px}18%{opacity:1;translate:56px 48px}40%{opacity:1;translate:236px 214px}41%,100%{opacity:0;translate:236px 214px}}
@keyframes gav-zenko-spin{to{rotate:360deg}}
@keyframes gav-zenko-glint{0%,74%{opacity:0;scale:0;rotate:0deg}84%{opacity:1;scale:1.2;rotate:45deg}96%,100%{opacity:0;scale:0;rotate:90deg}}
`
