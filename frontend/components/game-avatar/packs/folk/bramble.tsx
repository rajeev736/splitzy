import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Blush,
  Doodle,
  DoodleShape,
  Ear,
  Eyes,
  Grad,
  Head,
  INK,
  MIRROR,
  Portrait,
  SHOULDERS,
  Stroke,
  origin,
  url,
  useIds,
  type Tone,
} from "./kit"

const ACCENT = "#9ea8da"
const SKIN_P: Tone = ["#f9d6b6", "#e3b08a", "#b98462"]
const WHITE: Tone = ["#ffffff", "#f0eae0", "#cdc2b0"]
const COAT: Tone = ["#4b7ff0", "#2f5dcf", "#1e3f98"]
const DOME =
  "M29 46C29 27 38 17 50 17C62 17 71 27 71 46L71 54C71 64 62 71 50 71C38 71 29 64 29 54Z"
const BX = 77
const BY = 19

const CSS = `
.gav-bramble[data-mode=intro] .gav-bramble-fig{animation:gav-bramble-in .5s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes gav-bramble-in{0%{transform:translateY(46px)}100%{transform:none}}
.gav-bramble-head{transform-origin:50px 74px}
.gav-bramble[data-mode=intro] .gav-bramble-head{animation:gav-bramble-ponder 1.1s .3s ease-in-out both}
.gav-bramble[data-mode=idle] .gav-bramble-head{animation:gav-bramble-tilt 5s ease-in-out infinite}
@keyframes gav-bramble-ponder{0%,100%{transform:none}20%,60%{transform:rotate(5deg)}75%{transform:rotate(-2deg) translateY(-1.5px)}}
@keyframes gav-bramble-tilt{0%,100%{transform:none}50%{transform:rotate(2deg)}}
.gav-bramble[data-mode=intro] .gav-bramble-look{animation:gav-bramble-look 1.1s .3s ease-in-out both}
@keyframes gav-bramble-look{0%,100%{transform:none}20%,60%{transform:translate(1.4px,-1.6px)}}
.gav-bramble-brows{transform-origin:50px 42px}
.gav-bramble[data-mode=intro] .gav-bramble-brows{animation:gav-bramble-brows .6s 1s ease-out both}
@keyframes gav-bramble-brows{0%,100%{transform:none}35%{transform:translateY(-2.6px)}}
.gav-bramble-q{transform-origin:${BX}px ${BY}px}
.gav-bramble[data-mode=intro] .gav-bramble-q{animation:gav-bramble-q .75s .35s ease-in-out both}
@keyframes gav-bramble-q{0%{opacity:0;transform:scale(0) rotate(-30deg)}22%{opacity:1;transform:scale(1.1)}40%{transform:rotate(-12deg)}58%{transform:rotate(10deg)}78%{opacity:1;transform:none}100%{opacity:0;transform:scale(0) rotate(200deg)}}
.gav-bramble-bulb{transform-origin:${BX}px ${BY + 6}px}
.gav-bramble[data-mode=intro] .gav-bramble-bulb{animation:gav-bramble-bulb .9s 1s ease-out both}
@keyframes gav-bramble-bulb{0%{opacity:0;transform:scale(0)}25%{opacity:1;transform:scale(1.2)}40%{transform:scale(1)}75%{opacity:1;transform:translateY(-2px)}100%{opacity:0;transform:translateY(-8px) scale(.9)}}
.gav-bramble-rays{transform-origin:${BX}px ${BY}px}
.gav-bramble[data-mode=intro] .gav-bramble-rays{animation:gav-bramble-rays .9s 1.05s ease-out both}
@keyframes gav-bramble-rays{0%{opacity:0;transform:scale(.5) rotate(0)}30%{opacity:1}100%{opacity:0;transform:scale(1.35) rotate(40deg)}}
.gav-bramble[data-mode=intro] .gav-bramble-flash{animation:gav-bramble-flash .5s 1.05s ease-out both}
.gav-bramble[data-mode=idle] .gav-bramble-flash{animation:gav-bramble-glare 5s 2s ease-in-out infinite}
@keyframes gav-bramble-flash{0%{opacity:0}30%{opacity:.9}100%{opacity:0}}
@keyframes gav-bramble-glare{0%,100%{opacity:0}6%{opacity:.55}12%{opacity:0}}
`

function Tuft({ id }: { id: (n: string) => string }) {
  return (
    <>
      <path
        d="M31 33C24.4 29 16.4 29 9 33.4L16.4 36.6L7 41.6L17 43L10.4 50L20.4 48L17.4 55.4C23.4 54.4 28.4 50 30.6 46Z"
        fill={url(id("white"))}
      />
      <Stroke
        d="M26 38C21 37 16 38 13 40M25 44C21 45 18 47 16 50"
        color={WHITE[2]}
        w={0.8}
        opacity={0.8}
      />
    </>
  )
}

function Glasses() {
  return (
    <>
      {[41, 59].map((x) => (
        <circle
          key={x}
          cx={x}
          cy={49.5}
          r={7.2}
          fill="#fff"
          fillOpacity={0.22}
          stroke="#f2f6fb"
          strokeWidth={1.4}
        />
      ))}
      <Stroke
        d="M48.2 49Q50 47.4 51.8 49M33.8 48.4L29.6 47.4M66.2 48.4L70.4 47.4"
        color="#f2f6fb"
        w={1.2}
      />
      <Stroke
        d="M36.4 46.6L39.6 43.8M54.4 46.6L57.6 43.8"
        color="#fff"
        w={1.1}
        opacity={0.85}
      />
      <g className="gav-folk-fx gav-bramble-flash" fill="#fff">
        <circle cx={41} cy={49.5} r={6.6} />
        <circle cx={59} cy={49.5} r={6.6} />
      </g>
    </>
  )
}

function Bulb() {
  return (
    <>
      <g className="gav-folk-fx gav-bramble-rays">
        <Stroke
          d={[0, 45, 90, 135, 180, 225, 270, 315]
            .map((a) => {
              const s = Math.sin((a * Math.PI) / 180)
              const c = Math.cos((a * Math.PI) / 180)
              return `M${(BX + 9.5 * s).toFixed(1)} ${(BY - 9.5 * c).toFixed(1)}L${(BX + 13.5 * s).toFixed(1)} ${(BY - 13.5 * c).toFixed(1)}`
            })
            .join("")}
          color="#fff6a8"
          w={1.6}
        />
      </g>
      <g className="gav-folk-fx gav-bramble-bulb">
        <circle cx={BX} cy={BY} r={12} fill="#fff59a" opacity={0.45} />
        <path
          d={`M${BX - 6} ${BY}A6 6 0 1 1 ${BX + 6} ${BY}C${BX + 6} ${BY + 3} ${BX + 3} ${BY + 4} ${BX + 2.8} ${BY + 6.6}L${BX - 2.8} ${BY + 6.6}C${BX - 3} ${BY + 4} ${BX - 6} ${BY + 3} ${BX - 6} ${BY}Z`}
          fill="#fff27a"
          stroke="#fff"
          strokeWidth={0.9}
        />
        <Stroke
          d={`M${BX - 1.8} ${BY + 6}V${BY + 2}L${BX - 0.6} ${BY + 0.6}L${BX + 0.6} ${BY + 2}L${BX + 1.8} ${BY + 0.6}V${BY + 6}`}
          color="#e8a317"
          w={0.7}
        />
        <rect
          x={BX - 3}
          y={BY + 6.6}
          width={6}
          height={3.6}
          rx={1}
          fill="#9aa3b5"
        />
        <Stroke
          d={`M${BX - 3} ${BY + 8.2}H${BX + 3}`}
          color="#6c7487"
          w={0.6}
        />
        <circle cx={BX - 2.4} cy={BY - 2.4} r={1.4} fill="#fff" />
      </g>
    </>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  const skin = SKIN_P
  return (
    <Portrait
      cid="bramble"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-bramble-fig"
      back={
        <>
          <Doodle kind="question" x={16} y={70} s={0.9} r={-12} d={0.2} />
          <Doodle kind="swirl" x={86} y={62} d={0.6} />
          <Doodle kind="ticks" x={22} y={18} r={-30} d={1} />
        </>
      }
      front={
        <>
          <g className="gav-folk-fx gav-bramble-q" style={origin(BX, BY)}>
            <g transform={`translate(${BX} ${BY}) scale(1.9)`}>
              <DoodleShape kind="question" color="#fff" />
            </g>
          </g>
          <Bulb />
        </>
      }
    >
      <Grad id={id("white")} tone={WHITE} />
      <Grad id={id("coat")} tone={COAT} />

      {/* Coat with lapels and a red tie peeking under the beard */}
      <path d={SHOULDERS} fill={url(id("coat"))} />
      <path d="M38 78L50 90L62 78L60 106L40 106Z" fill="#f6f1e8" />
      <path d="M47.6 86L52.4 86L53.4 104L50 106L46.6 104Z" fill="#d23c3c" />
      <path d="M36 77L46 84L40 106L28 100Z" fill={COAT[2]} />
      <path d="M64 77L54 84L60 106L72 100Z" fill={COAT[1]} />

      <g className="gav-bramble-head">
        <Tuft id={id} />
        <g transform={MIRROR}>
          <Tuft id={id} />
        </g>
        <Ear x={29.4} y={52} skin={skin} />
        <Ear x={70.6} y={52} skin={skin} flip />
        <Head ids={id} skin={skin} d={DOME}>
          <ellipse
            cx={42}
            cy={24.6}
            rx={6.4}
            ry={2.8}
            transform="rotate(-24 42 24.6)"
            fill="#fff"
            opacity={0.55}
          />
        </Head>
        <Stroke
          d="M44 30C46 29.4 48 29.4 50 30"
          color={skin[2]}
          w={0.9}
          opacity={0.6}
        />

        {/* Bushy brows, little eyes, round glasses */}
        <g className="gav-bramble-brows">
          <path
            d="M33.6 42.6C36.4 38.2 42 37.6 46.4 40.4C42.4 40.2 38 41 33.6 42.6Z"
            fill={url(id("white"))}
            stroke={WHITE[2]}
            strokeWidth={0.5}
          />
          <path
            d="M66.4 42.6C63.6 38.2 58 37.6 53.6 40.4C57.6 40.2 62 41 66.4 42.6Z"
            fill={url(id("white"))}
            stroke={WHITE[2]}
            strokeWidth={0.5}
          />
        </g>
        <g className="gav-bramble-look">
          <Eyes y={49.5} rx={2.1} ry={2.8} />
        </g>
        <Blush y={56.5} dx={13} opacity={0.3} />
        <ellipse cx={50} cy={55.4} rx={4.2} ry={3.4} fill={skin[1]} />
        <ellipse
          cx={48.8}
          cy={54.4}
          rx={1.6}
          ry={1}
          fill="#fff"
          opacity={0.4}
        />
        <Glasses />

        {/* Big beard and moustache */}
        <path
          d="M30.6 55C29.6 66 32.6 77 38 86.4L41 82L44 92L47.6 86L50 95.4L52.4 86L56 92L59 82L62 86.4C67.4 77 70.4 66 69.4 55C66 61.6 60 64.4 50 64.4C40 64.4 34 61.6 30.6 55Z"
          fill={url(id("white"))}
        />
        <Stroke
          d="M36 70C38 75 40 79 42 82M64 70C62 75 60 79 58 82M47 74L48 84M53 74L52 84"
          color={WHITE[2]}
          w={0.8}
          opacity={0.8}
        />
        <path
          d="M47 64.2Q50 65.6 53 64.2"
          fill="none"
          stroke={INK}
          strokeWidth={1}
          strokeLinecap="round"
        />
        <path
          d="M50 59C46 57 40 57.4 35.6 61C37.6 63.6 43 64 46 62.4C47.6 61.6 49 60.8 50 60.8C51 60.8 52.4 61.6 54 62.4C57 64 62.4 63.6 64.4 61C60 57.4 54 57 50 59Z"
          fill={url(id("white"))}
          stroke={WHITE[2]}
          strokeWidth={0.5}
        />
      </g>
    </Portrait>
  )
}

export const BRAMBLE: CharacterDef = {
  id: "bramble",
  name: "Prof. Bramble",
  tagline: "Has a theory about your next move",
  tier: "legend",
  price: 6500,
  earn: { achievement: "wins_25" },
  accent: ACCENT,
  Art,
}
