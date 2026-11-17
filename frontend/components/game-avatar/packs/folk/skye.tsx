import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Blush,
  Doodle,
  Eyes,
  Grad,
  Head,
  MIRROR,
  MOUTH,
  Neck,
  Portrait,
  SHOULDERS,
  SKIN,
  Stroke,
  TONGUE,
  url,
  useIds,
  vars,
  type Tone,
} from "./kit"

const ACCENT = "#b17cf5"
const CAP: Tone = ["#b4744a", "#8a4f2c", "#5a3017"]
const HAIR: Tone = ["#cf5c33", "#a33f20", "#702511"]
const RIM: Tone = ["#fff3dc", "#e9cf9f", "#b8956a"]
const LENS: Tone = ["#f2fdff", "#bfe6f3", "#7fb3c8"]
const JACKET: Tone = ["#c27d4b", "#99592f", "#663518"]
const SCARF: Tone = ["#ffffff", "#f6efe6", "#d8cbbb"]
const skin = SKIN.fair

/** Wind streaks for the intro: y, length, delay. */
const WIND = [
  [16, 26, 0],
  [30, 18, 0.12],
  [64, 30, 0.05],
  [78, 22, 0.2],
  [88, 28, 0.32],
  [46, 16, 0.4],
  [22, 20, 0.55],
  [70, 24, 0.62],
] as const

const CSS = `
.gav-skye-fig{transform-origin:50px 80px}
.gav-skye[data-mode=intro] .gav-skye-fig{animation:gav-skye-in .7s cubic-bezier(.2,.8,.3,1.15) both}
@keyframes gav-skye-in{0%{transform:translate(-60px,10px) rotate(-12deg)}100%{transform:none}}
.gav-skye-gog{transform-origin:50px 28px}
.gav-skye[data-mode=intro] .gav-skye-gog{animation:gav-skye-drop .6s .6s cubic-bezier(.3,1.5,.5,1) both}
@keyframes gav-skye-drop{0%{opacity:0;transform:translateY(-40px)}25%{opacity:1}100%{transform:none}}
.gav-skye-braid{transform-origin:31px 58px}
.gav-skye[data-mode=intro] .gav-skye-braid{animation:gav-skye-flap .16s 7 alternate ease-in-out}
.gav-skye[data-mode=idle] .gav-skye-braid{animation:gav-skye-sway 3s ease-in-out infinite}
@keyframes gav-skye-flap{from{transform:rotate(-12deg)}to{transform:rotate(8deg)}}
@keyframes gav-skye-sway{0%,100%{transform:none}50%{transform:rotate(-5deg)}}
.gav-skye-scarf{transform-origin:44px 80px}
.gav-skye[data-mode=intro] .gav-skye-scarf{animation:gav-skye-scarf .14s 9 alternate ease-in-out}
.gav-skye[data-mode=idle] .gav-skye-scarf{animation:gav-skye-scarf-s 1.8s ease-in-out infinite}
@keyframes gav-skye-scarf{from{transform:rotate(-10deg) scaleX(1.08)}to{transform:rotate(6deg)}}
@keyframes gav-skye-scarf-s{0%,100%{transform:none}50%{transform:rotate(-6deg) scaleX(1.04)}}
.gav-skye[data-mode=intro] .gav-skye-wind{animation:gav-skye-wind .6s var(--t) linear both}
.gav-skye[data-mode=idle] .gav-skye-wind:nth-of-type(3n+1){animation:gav-skye-gust 4.2s calc(var(--t) * 5 + .6s) linear infinite}
@keyframes gav-skye-gust{0%{opacity:0;transform:translateX(70px)}4%{opacity:.8}22%,100%{opacity:0;transform:translateX(-70px)}}
@keyframes gav-skye-wind{0%{opacity:0;transform:translateX(70px)}20%{opacity:.9}100%{opacity:0;transform:translateX(-70px)}}
`

function Braid() {
  const lumps = [0, 1, 2, 3, 4]
  return (
    <g className="gav-skye-braid">
      {lumps.map((i) => (
        <ellipse
          key={i}
          cx={27.5 - i * 4.4}
          cy={59 + i * 1.6}
          rx={3.2}
          ry={2.6}
          transform={`rotate(-25 ${27.5 - i * 4.4} ${59 + i * 1.6})`}
          fill={i % 2 ? HAIR[1] : HAIR[0]}
          stroke={HAIR[2]}
          strokeWidth={0.5}
        />
      ))}
      <rect
        x={6}
        y={63}
        width={3}
        height={4.4}
        rx={1.2}
        transform="rotate(-20 7.5 65.2)"
        fill="#ffd65a"
      />
      <path
        d="M6.4 66C3.6 66 1.6 68 0.6 70.4C2.6 70 4 70.2 5.4 71C4.6 69.6 5.4 68 6.8 67.2Z"
        fill={HAIR[1]}
      />
    </g>
  )
}

function Goggle({ x, id }: { x: number; id: (n: string) => string }) {
  return (
    <>
      <circle cx={x} cy={28.5} r={7.6} fill={url(id("rim"))} />
      <circle cx={x} cy={28.5} r={5.4} fill={url(id("lens"))} />
      <path
        d={`M${x - 3.4} ${27}A4 4 0 0 1 ${x + 0.6} ${24.2}`}
        fill="none"
        stroke="#fff"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  return (
    <Portrait
      cid="skye"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-skye-fig"
      back={
        <>
          <Doodle kind="heart" x={84} y={22} r={12} d={0.2} />
          <Doodle kind="hash" x={84} y={76} r={8} d={0.6} />
          <Doodle kind="ticks" x={16} y={30} r={-20} d={1} />
          {WIND.map(([y, len, t]) => (
            <path
              key={y}
              className="gav-folk-fx gav-skye-wind"
              style={vars({ "--t": `${t}s` })}
              d={`M${60} ${y}H${60 + len}`}
              stroke="#fff"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          ))}
        </>
      }
    >
      <Grad id={id("cap")} tone={CAP} />
      <Grad id={id("hair")} tone={HAIR} />
      <Grad id={id("rim")} tone={RIM} />
      <Grad id={id("lens")} tone={LENS} x1={0.3} x2={0.7} />
      <Grad id={id("jacket")} tone={JACKET} />
      <Grad id={id("scarf")} tone={SCARF} x1={0.5} x2={0.5} />

      <Braid />
      <g transform={MIRROR}>
        <Braid />
      </g>

      {/* Leather jacket with a white scarf */}
      <path d={SHOULDERS} fill={url(id("jacket"))} />
      <Stroke
        d="M38 82L44 104M62 82L56 104"
        color={JACKET[2]}
        w={1.4}
        opacity={0.7}
      />
      <Neck ids={id} skin={skin} />
      <g className="gav-skye-scarf">
        <path
          d="M45 80C40 84 30 87 18 85C21 90 30 94 43 90Z"
          fill={url(id("scarf"))}
        />
        <Stroke d="M40 86C34 88 28 88 23 87.4" color={SCARF[2]} w={0.8} />
      </g>
      <path
        d="M38 76C42 82 58 82 62 76L64 82C58 88 42 88 36 82Z"
        fill={url(id("scarf"))}
      />

      {/* Head, cap with ear flaps */}
      <Head ids={id} skin={skin}>
        <ellipse cx={50} cy={42} rx={26} ry={5} fill={skin[2]} opacity={0.45} />
      </Head>
      <path
        d="M31 45C34 38 42 35 50 35C58 35 66 38 69 45C66 44.4 63.4 42.4 61.6 39.6C58 42.4 52 43.4 47 41.4C43 43.4 37.6 44.4 33.4 42.4Z"
        fill={url(id("hair"))}
      />
      <path
        d="M26 47C25 29 36 18 50 18C64 18 75 29 74 47C70 39.4 61 35.4 50 35.4C39 35.4 30 39.4 26 47Z"
        fill={url(id("cap"))}
      />
      <path
        d="M26.4 43C24.4 51 25 59 28 63C31 64.4 33.6 62.4 33.4 58.4L33 45Z"
        fill={CAP[1]}
      />
      <path
        d="M73.6 43C75.6 51 75 59 72 63C69 64.4 66.4 62.4 66.6 58.4L67 45Z"
        fill={CAP[2]}
      />
      <Stroke d="M50 18.6V34.6" color={CAP[2]} w={1} opacity={0.7} />
      <Stroke
        d="M31 37C36 33 43 31 50 31C57 31 64 33 69 37"
        color={CAP[0]}
        w={0.8}
        strokeDasharray="1.4 1.2"
        opacity={0.8}
      />

      {/* Face */}
      <Stroke
        d="M36.4 45.6Q40 44 44 45.4M56 45.4Q60 44 63.6 45.6"
        color={HAIR[2]}
        w={2.4}
      />
      <Eyes y={51} />
      <Blush y={58} dx={13.5} opacity={0.35} />
      <Stroke d="M48.8 55.6Q50 56.6 51.2 55.6" color={skin[2]} w={1.1} />
      <path
        d="M44 60C46.4 61.4 53.6 61.4 56 60C55.2 64.8 52.6 66.4 50 66.4C47.4 66.4 44.8 64.8 44 60Z"
        fill={MOUTH}
      />
      <path
        d="M46.2 64.4C47.8 63 52.2 63 53.8 64.4C52.6 66 47.4 66 46.2 64.4Z"
        fill={TONGUE}
      />

      {/* Goggles resting on the cap */}
      <g className="gav-skye-gog">
        <path
          d="M25.6 31C38 25.6 62 25.6 74.4 31"
          stroke="#4a2c18"
          strokeWidth={3}
          fill="none"
        />
        <rect x={46} y={26} width={8} height={3.6} rx={1.6} fill={RIM[2]} />
        <Goggle x={40} id={id} />
        <Goggle x={60} id={id} />
      </g>
    </Portrait>
  )
}

export const SKYE: CharacterDef = {
  id: "skye",
  name: "Skye",
  tagline: "Flies straight to the finish",
  tier: "premium",
  price: 3500,
  earn: { level: 17 },
  accent: ACCENT,
  Art,
}
