import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Blush,
  Doodle,
  Eyes,
  Grad,
  Head,
  MOUTH,
  Neck,
  Portrait,
  SHOULDERS,
  SKIN,
  Stroke,
  TONGUE,
  origin,
  sparkle,
  url,
  useIds,
  vars,
  type Tone,
} from "./kit"

const ACCENT = "#ff7eb0"
const HAIR: Tone = ["#7aa0ff", "#3d64ea", "#2140ae"]
const COAT: Tone = ["#ffffff", "#eef2f8", "#c3cddc"]
const LIQUID: Tone = ["#c2ffd8", "#52e394", "#1fa45f"]
const skin = SKIN.fair
const FLASK =
  "M26.4 73L26.4 80.6L18.2 93.6C16.8 96 18.4 99 21.2 99L38.8 99C41.6 99 43.2 96 41.8 93.6L33.6 80.6L33.6 73Z"
/** Where the flask's mouth is: the bubbles pop out of here. */
const MX = 30
const MY = 72

/** Sparkles bursting from the flask: flight, size, colour, delay. */
const BURST = [
  ["-22px", "-30px", 4.6, "#fff", 1.05],
  ["-4px", "-44px", 5.2, "#fff59d", 1.1],
  ["16px", "-36px", 4, "#fff", 1.12],
  ["-26px", "-6px", 3.4, "#c2ffd8", 1.15],
  ["24px", "-12px", 3.6, "#fff59d", 1.2],
  ["6px", "-22px", 3, "#fff", 1.25],
] as const

const CSS = `
.gav-nova[data-mode=intro] .gav-nova-fig{animation:gav-nova-in .5s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes gav-nova-in{0%{transform:translateY(42px)}100%{transform:none}}
.gav-nova-flask{transform-origin:30px 99px}
.gav-nova[data-mode=intro] .gav-nova-flask{animation:gav-nova-shake .55s .45s ease-in-out both}
@keyframes gav-nova-shake{0%,100%{transform:none}15%{transform:rotate(-7deg)}30%{transform:rotate(6deg)}45%{transform:rotate(-5deg)}60%{transform:rotate(4deg)}80%{transform:translateY(-2px) scale(1.04)}}
.gav-nova[data-mode=intro] .gav-nova-bub{animation:gav-nova-bub .5s var(--t) ease-in both}
.gav-nova[data-mode=idle] .gav-nova-bub{animation:gav-nova-bub 1.8s var(--t) ease-in infinite}
@keyframes gav-nova-bub{0%{opacity:0;transform:none}20%{opacity:.95}85%{opacity:.95}100%{opacity:0;transform:translateY(-9px)}}
.gav-nova-puff{transform-origin:${MX}px ${MY - 2}px}
.gav-nova[data-mode=intro] .gav-nova-puff{animation:gav-nova-puff .75s 1s ease-out both}
@keyframes gav-nova-puff{0%{opacity:0;transform:scale(.2)}25%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:translateY(-14px) scale(1.5)}}
.gav-nova[data-mode=intro] .gav-nova-spark{animation:gav-nova-spark .7s var(--t) cubic-bezier(.2,.8,.4,1) both}
@keyframes gav-nova-spark{0%{opacity:0;transform:scale(.2)}20%{opacity:1}70%{opacity:1}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(90deg) scale(1)}}
.gav-nova-mouth{transform-origin:50px 60px}
.gav-nova[data-mode=intro] .gav-nova-mouth{animation:gav-nova-grin .4s 1.05s cubic-bezier(.3,1.6,.5,1) both}
@keyframes gav-nova-grin{0%{transform:scale(.5,.3)}100%{transform:none}}
.gav-nova[data-mode=intro] .gav-nova-glint{animation:gav-nova-glint .45s 1.25s ease-out both}
.gav-nova[data-mode=idle] .gav-nova-glint{animation:gav-nova-glint-s 5s 2.5s infinite}
@keyframes gav-nova-glint{0%{opacity:0;transform:translateX(-6px)}40%{opacity:1}100%{opacity:0;transform:translateX(6px)}}
@keyframes gav-nova-glint-s{0%{opacity:0;transform:translateX(-6px)}5%{opacity:1}10%,100%{opacity:0;transform:translateX(6px)}}
`

function Glasses({ id }: { id: (n: string) => string }) {
  return (
    <>
      <clipPath id={id("lenses")}>
        <circle cx={41} cy={50} r={6.6} />
        <circle cx={59} cy={50} r={6.6} />
      </clipPath>
      {[41, 59].map((x) => (
        <circle
          key={x}
          cx={x}
          cy={50}
          r={6.8}
          fill="#fff"
          fillOpacity={0.25}
          stroke="#f4f7fc"
          strokeWidth={1.4}
        />
      ))}
      <g clipPath={url(id("lenses"))}>
        <Stroke
          d="M35.6 47.4L39 44.2M53.6 47.4L57 44.2"
          color="#fff"
          w={1.2}
          opacity={0.85}
        />
        <g className="gav-folk-fx gav-nova-glint">
          <path
            d="M38 40L42 40L38 60L34 60ZM56 40L60 40L56 60L52 60Z"
            fill="#fff"
          />
        </g>
      </g>
      <Stroke
        d="M47.8 49.4Q50 47.8 52.2 49.4M34.2 49L30 48M65.8 49L70 48"
        color="#f4f7fc"
        w={1.2}
      />
    </>
  )
}

function Flask({ id }: { id: (n: string) => string }) {
  return (
    <g className="gav-nova-flask">
      <clipPath id={id("flask")}>
        <path d={FLASK} />
      </clipPath>
      <path d={FLASK} fill="#e8fbff" fillOpacity={0.6} />
      <g clipPath={url(id("flask"))}>
        <path d="M10 88.6Q30 86.4 50 88.6V104H10Z" fill={url(id("liquid"))} />
        {[
          [26, 96, 1.2, 0],
          [31, 94, 0.9, 0.5],
          [34.6, 97, 1, 1],
          [28.6, 92, 0.7, 1.3],
        ].map(([x, y, r, t]) => (
          <circle
            key={x}
            className="gav-folk-fx gav-nova-bub"
            style={vars({ "--t": `${t * 0.4}s` })}
            cx={x}
            cy={y}
            r={r}
            fill="#fff"
          />
        ))}
        <path
          d="M21 95L27 84"
          stroke="#fff"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.7}
        />
      </g>
      <path d={FLASK} fill="none" stroke="#fff" strokeWidth={0.9} />
      <rect
        x={25}
        y={71}
        width={10}
        height={3}
        rx={1.4}
        fill="#d8e9f4"
        stroke="#fff"
        strokeWidth={0.6}
      />
      {/* Fingers holding it */}
      <path
        d="M14 100C14 94 18 92 21.4 94L27 98.4L24 104L12 104Z"
        fill={skin[1]}
      />
      <path
        d="M38.4 92.6C42 90.8 45.6 92.8 45 96.4L42 104L35 104L37 96Z"
        fill={skin[1]}
      />
      <Stroke
        d="M39.6 96.4L43.6 95.4M38.8 99.6L43 98.8"
        color={skin[2]}
        w={0.8}
      />
    </g>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  return (
    <Portrait
      cid="nova"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-nova-fig"
      back={
        <>
          <Doodle kind="hash" x={80} y={18} r={10} d={0.1} />
          <Doodle kind="hash" x={16} y={34} s={0.7} r={-8} d={0.5} />
          <Doodle kind="ticks" x={85} y={40} r={60} d={0.8} />
          <Doodle kind="graph" x={84} y={76} d={1.1} />
        </>
      }
      front={
        <>
          <g className="gav-folk-fx gav-nova-puff">
            <circle cx={MX} cy={MY - 4} r={5} fill="#c2ffd8" />
            <circle cx={MX - 4.4} cy={MY - 1} r={3.6} fill="#e4ffee" />
            <circle cx={MX + 4.4} cy={MY - 1.6} r={3.8} fill="#a6f5c4" />
          </g>
          {[
            [MX - 1, MY - 2, 0.15],
            [MX + 1.4, MY - 4, 0.35],
            [MX - 0.6, MY - 3, 0.6],
          ].map(([x, y, t]) => (
            <circle
              key={t}
              className="gav-folk-fx gav-nova-bub"
              style={vars({ "--t": `${0.45 + t}s` })}
              cx={x}
              cy={y}
              r={1.6}
              fill="#e4ffee"
              stroke="#fff"
              strokeWidth={0.4}
            />
          ))}
          {BURST.map(([tx, ty, r, c, t]) => (
            <g
              key={tx}
              className="gav-folk-fx gav-nova-spark"
              style={{
                ...origin(MX, MY - 4),
                ...vars({ "--tx": tx, "--ty": ty, "--t": `${t}s` }),
              }}
            >
              <path d={sparkle(MX, MY - 4, r)} fill={c} />
            </g>
          ))}
        </>
      }
    >
      <Grad id={id("hair")} tone={HAIR} x1={0.3} x2={0.7} />
      <Grad id={id("coat")} tone={COAT} />
      <Grad id={id("liquid")} tone={LIQUID} x1={0.5} x2={0.5} />

      {/* Bob behind the head */}
      <path
        d="M24 50C21 30 33 17 50 17C67 17 79 30 76 50L77.4 70C74 74 68 73.4 66 70L66 60L34 60L34 70C32 73.4 26 74 22.6 70Z"
        fill={HAIR[2]}
      />

      {/* Lab coat over a teal shirt */}
      <path d={SHOULDERS} fill={url(id("coat"))} />
      <path d="M40 77L50 96L60 77Z" fill="#2ab3a6" />
      <Neck ids={id} skin={skin} d="M41 60L41 78L50 88L59 78L59 60Z" />
      <path d="M38 76L50 90L44 92L35 82Z" fill="#3fd0c2" />
      <path d="M62 76L50 90L56 92L65 82Z" fill="#2ab3a6" />
      <path
        d="M34 78L42 82L46 106L30 104Z"
        fill={COAT[1]}
        stroke={COAT[2]}
        strokeWidth={0.7}
      />
      <path
        d="M66 78L58 82L54 106L70 104Z"
        fill={COAT[2]}
        stroke={COAT[2]}
        strokeWidth={0.7}
      />
      <rect
        x={60}
        y={92}
        width={8}
        height={2.2}
        rx={1}
        fill="#ffb02e"
        transform="rotate(-8 64 93)"
      />

      <Head ids={id} skin={skin}>
        <ellipse
          cx={50}
          cy={42}
          rx={26}
          ry={5.5}
          fill={skin[2]}
          opacity={0.45}
        />
      </Head>

      {/* Face */}
      <Stroke d="M55.6 43Q59.6 41 63.6 42.6" color={HAIR[2]} w={2.3} />
      <Eyes y={50} rx={2.3} ry={3} />
      <Blush y={57.5} dx={14} opacity={0.38} />
      <Stroke d="M48.8 55Q50 56 51.2 55" color={skin[2]} w={1.1} />
      <g className="gav-nova-mouth">
        <path
          d="M43.4 59.4C46 61 54 61 56.6 59.4C56 64.8 53 67.2 50 67.2C47 67.2 44 64.8 43.4 59.4Z"
          fill={MOUTH}
        />
        <path
          d="M45.6 64.8C47.4 63.2 52.6 63.2 54.4 64.8C53 66.6 47 66.6 45.6 64.8Z"
          fill={TONGUE}
        />
        <path
          d="M44.2 59.8C47.6 61 52.4 61 55.8 59.8L55.5 61.4C52 62.4 48 62.4 44.5 61.4Z"
          fill="#fff"
        />
      </g>
      <Glasses id={id} />

      {/* Swooping bangs and the right-hand lock */}
      <path
        d="M26.6 56C23.6 35 34 20 52 20C66 20 75 30 73.2 48C71.2 40.4 67.4 34.4 62 31.4C57 40.4 46 44 33.6 44.4C31.6 47.6 30.2 52 30.6 58.6C28.6 58.4 27.4 57.4 26.6 56Z"
        fill={url(id("hair"))}
      />
      <path
        d="M73.2 45C74.4 55 73.4 63.6 70.4 70.4L66.4 70.4C68.4 62.4 68.4 54 67.2 46Z"
        fill={HAIR[1]}
      />
      <Stroke
        d="M36 30C42 25 52 23.4 58 24.6M33 38C40 36 48 33 54 28"
        color="#c6d6ff"
        w={1.2}
        opacity={0.75}
      />

      <Flask id={id} />
    </Portrait>
  )
}

export const NOVA: CharacterDef = {
  id: "nova",
  name: "Nova",
  tagline: "Every move is an experiment",
  tier: "premium",
  price: 4000,
  accent: ACCENT,
  Art,
}
