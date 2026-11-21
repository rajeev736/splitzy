import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Blush,
  Doodle,
  Eyes,
  Grad,
  Head,
  INK,
  Neck,
  Portrait,
  SHOULDERS,
  SKIN,
  Stroke,
  origin,
  url,
  useIds,
  vars,
  type Tone,
} from "./kit"

const ACCENT = "#8fd14f"
const HAIR: Tone = ["#fff27e", "#ffd43b", "#e3a514"]
const DRESS: Tone = ["#ffbfd0", "#ff8fab", "#de5f80"]
const PETAL: Tone = ["#ffe0ea", "#ff8db3", "#e5508a"]
const skin = SKIN.fair
const FLOWER_X = 67
const FLOWER_Y = 29

/** The petal rain: x, start y, delay, duration, drift, spin, flower or petal, colour. */
const RAIN = [
  [10, -6, 0, 1.25, "6px", "220deg", 0, 0],
  [24, -14, 0.12, 1.3, "-4px", "-260deg", 1, 1],
  [40, -4, 0.05, 1.15, "5px", "300deg", 0, 2],
  [56, -12, 0.2, 1.3, "-6px", "-200deg", 0, 0],
  [72, -6, 0.08, 1.2, "4px", "240deg", 1, 2],
  [88, -10, 0.16, 1.25, "-5px", "-280deg", 0, 1],
  [17, -30, 0.32, 1.3, "5px", "-240deg", 0, 2],
  [48, -26, 0.38, 1.2, "-5px", "260deg", 1, 0],
  [80, -28, 0.3, 1.3, "6px", "-220deg", 0, 0],
  [32, -40, 0.48, 1.15, "-4px", "300deg", 0, 1],
  [64, -38, 0.52, 1.2, "5px", "-300deg", 0, 2],
  [94, -36, 0.44, 1.1, "-6px", "200deg", 1, 1],
  [4, -40, 0.56, 1.1, "6px", "260deg", 0, 0],
] as const
const RAIN_COLOURS = ["#ffd0de", "#ff9fbf", "#fff3f7"]

const CSS = `
.gav-flora[data-mode=intro] .gav-flora-fig{animation:gav-flora-in .6s cubic-bezier(.2,.9,.3,1.15) both}
@keyframes gav-flora-in{0%{opacity:0;transform:translateY(24px)}100%{opacity:1;transform:none}}
.gav-flora[data-mode=intro] .gav-flora-fall{animation:gav-flora-fall var(--l) var(--t) cubic-bezier(.35,.1,.6,1) both}
@keyframes gav-flora-fall{0%{opacity:0;transform:none}12%{opacity:1}82%{opacity:1}100%{opacity:0;transform:translate(var(--dx),135px) rotate(var(--r))}}
.gav-flora[data-mode=intro] .gav-flora-sway{animation:gav-flora-sway .42s ease-in-out infinite alternate}
@keyframes gav-flora-sway{from{transform:translateX(-2.6px)}to{transform:translateX(2.6px)}}
.gav-flora[data-mode=idle] .gav-flora-drift{animation:gav-flora-fall 5.6s var(--t) linear infinite}
.gav-flora[data-mode=idle] .gav-flora-drift .gav-flora-sway{animation:gav-flora-sway 1s ease-in-out infinite alternate}
.gav-flora-bloom{transform-origin:${FLOWER_X}px ${FLOWER_Y}px}
.gav-flora[data-mode=intro] .gav-flora-bloom{animation:gav-flora-bloom .7s .5s cubic-bezier(.3,1.6,.5,1) both}
.gav-flora[data-mode=idle] .gav-flora-bloom{animation:gav-flora-nod 3.4s ease-in-out infinite}
@keyframes gav-flora-bloom{0%{transform:scale(0) rotate(-120deg)}100%{transform:none}}
@keyframes gav-flora-nod{0%,100%{transform:none}50%{transform:rotate(10deg)}}
.gav-flora[data-mode=intro] .gav-flora-o{animation:gav-flora-o 1.05s both}
@keyframes gav-flora-o{0%,85%{opacity:1}100%{opacity:0}}
.gav-flora[data-mode=intro] .gav-flora-smile{animation:gav-flora-smile .35s .95s ease-out both}
@keyframes gav-flora-smile{0%{opacity:0;transform:scaleX(.5)}100%{opacity:1;transform:none}}
.gav-flora-smile{transform-origin:50px 62px}
.gav-flora[data-mode=intro] .gav-flora-look{animation:gav-flora-look 1.1s .1s ease-in-out both}
@keyframes gav-flora-look{0%,100%{transform:none}15%,70%{transform:translateY(-1.6px)}}
.gav-flora[data-mode=intro] .gav-flora-cheek{animation:gav-flora-cheek .5s 1s both}
@keyframes gav-flora-cheek{0%{opacity:.3}100%{opacity:1}}
`

/** A five-petal flower around (0,0). */
function Flower({
  r,
  tone,
  centre = "#c2185b",
}: {
  r: number
  tone: Tone
  centre?: string
}) {
  return (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={0}
          cy={-r * 0.55}
          rx={r * 0.42}
          ry={r * 0.6}
          transform={`rotate(${a})`}
          fill={tone[1]}
          stroke={tone[2]}
          strokeWidth={0.4}
        />
      ))}
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={0}
          cy={-r * 0.62}
          rx={r * 0.16}
          ry={r * 0.3}
          transform={`rotate(${a})`}
          fill={tone[0]}
          opacity={0.7}
        />
      ))}
      <circle r={r * 0.24} fill={centre} />
      <circle r={r * 0.1} cx={r * 0.06} cy={-r * 0.06} fill="#ffe066" />
    </>
  )
}

const PETAL_D = "M0 -2.8C2 -1.6 2 1.6 0 2.8C-2 1.6 -2 -1.6 0 -2.8Z"

function Rain() {
  return (
    <>
      {RAIN.map(([x, y, t, l, dx, r, flower, c]) => (
        <g
          key={`${x}${y}`}
          className="gav-folk-fx gav-flora-fall"
          style={{
            ...origin(x, y),
            ...vars({ "--t": `${t}s`, "--l": `${l}s`, "--dx": dx, "--r": r }),
          }}
        >
          <g className="gav-flora-sway">
            <g transform={`translate(${x} ${y})`}>
              {flower ? (
                <Flower r={4.2} tone={PETAL} />
              ) : (
                <path
                  d={PETAL_D}
                  transform="scale(1.3)"
                  fill={RAIN_COLOURS[c]}
                  stroke="#e5508a"
                  strokeWidth={0.3}
                />
              )}
            </g>
          </g>
        </g>
      ))}
    </>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  return (
    <Portrait
      cid="flora"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-flora-fig"
      back={
        <>
          <Doodle kind="sparkle" x={15} y={26} s={0.8} d={0.1} />
          <Doodle kind="heart" x={86} y={60} r={14} s={0.9} d={0.5} />
          <Doodle kind="sparkle" x={12} y={64} s={0.55} d={0.9} />
          {[
            [26, "0.4s"],
            [76, "3.2s"],
          ].map(([x, t]) => (
            <g
              key={x}
              className="gav-folk-fx gav-flora-drift"
              style={{
                ...origin(+x, -6),
                ...vars({ "--t": t, "--dx": "8px", "--r": "260deg" }),
              }}
            >
              <g className="gav-flora-sway">
                <path
                  d={PETAL_D}
                  transform={`translate(${x} -6) scale(1.2)`}
                  fill="#ffc3d6"
                />
              </g>
            </g>
          ))}
        </>
      }
      front={<Rain />}
    >
      <Grad id={id("hair")} tone={HAIR} x1={0.3} x2={0.7} />
      <Grad id={id("hairv")} tone={HAIR} x1={0.5} x2={0.5} mid={0.55} />
      <Grad id={id("dress")} tone={DRESS} />

      {/* Long hair behind */}
      <path
        d="M22.6 48C20.6 28 33 16 50 16C67 16 79.4 28 77.4 48L79 84C76 92 66 92 63 86L37 86C34 92 24 92 21 84Z"
        fill={url(id("hairv"))}
      />

      {/* Sundress */}
      <path d={SHOULDERS} fill={skin[1]} />
      <path
        d="M10 106C12 93 20 85 30 83C36 87.4 44 89.4 50 89.4C56 89.4 64 87.4 70 83C80 85 88 93 90 106Z"
        fill={url(id("dress"))}
      />
      <Stroke d="M31 83.4L35 77.6M69 83.4L65 77.6" color={DRESS[2]} w={1.8} />
      <Stroke
        d="M30 87.6C40 92.6 60 92.6 70 87.6"
        color="#fff"
        w={1}
        opacity={0.6}
        strokeDasharray="1.6 1.6"
      />
      <Neck ids={id} skin={skin} />

      <Head ids={id} skin={skin}>
        <ellipse cx={50} cy={40} rx={26} ry={6} fill={skin[2]} opacity={0.4} />
      </Head>

      {/* Front locks over the shoulders */}
      <path
        d="M29.4 38C25.4 50 26 66 25 78C24.4 86 27 92 32 93C34.4 84 34.4 70 33.6 58C33.2 50 33 44 32.4 40Z"
        fill={url(id("hair"))}
      />
      <path
        d="M70.6 38C74.6 50 74 66 75 78C75.6 86 73 92 68 93C65.6 84 65.6 70 66.4 58C66.8 50 67 44 67.6 40Z"
        fill={url(id("hair"))}
      />
      <Stroke
        d="M29 60C28.6 70 28.4 80 30 88M71 60C71.4 70 71.6 80 70 88"
        color={HAIR[2]}
        w={0.8}
        opacity={0.6}
      />

      {/* Face */}
      <Stroke
        d="M36.4 44.4Q40 42.6 44 44M56 44Q60 42.6 63.6 44.4"
        color={HAIR[2]}
        w={2.4}
      />
      <g className="gav-flora-look">
        <Eyes y={50.5} rx={2.5} ry={3.4} />
      </g>
      <Stroke d="M36.2 47.6L35 46.4M63.8 47.6L65 46.4" color={INK} w={0.9} />
      <g className="gav-flora-cheek">
        <Blush y={57.5} dx={13.5} color="#ff6f8f" opacity={0.42} />
      </g>
      <g fill="#d08a63" opacity={0.6}>
        <circle cx={35.4} cy={56} r={0.5} />
        <circle cx={37.6} cy={57.2} r={0.5} />
        <circle cx={62.4} cy={57.2} r={0.5} />
        <circle cx={64.6} cy={56} r={0.5} />
      </g>
      <Stroke d="M48.8 55Q50 56 51.2 55" color={skin[2]} w={1.1} />
      <g className="gav-folk-fx gav-flora-o">
        <ellipse cx={50} cy={62.4} rx={1.8} ry={2.2} fill="#9b3d36" />
      </g>
      <g className="gav-flora-smile">
        <path
          d="M43.6 60.6Q50 66.2 56.4 60.6Q50 63.6 43.6 60.6Z"
          fill="#a03d38"
          stroke="#a03d38"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </g>

      {/* Side-swept bangs, parted on the right */}
      <path
        d="M27.4 48C26.4 31 36.4 20 52 20C65 20 73.4 29 72.6 45C70.6 37.4 66.6 31.4 61 28.4C56.4 34.4 46 38.4 32.4 40.4C30.4 42.4 28.6 45 27.4 48Z"
        fill={url(id("hair"))}
      />
      <path
        d="M61.6 28.6C65.6 31.6 69.4 37 71 44C72 38 70.4 32 66.4 28.4Z"
        fill={HAIR[0]}
      />
      <Stroke
        d="M36 28C42 24 50 23 56 24.4M38 34C44 32 50 30 55 27"
        color="#fffbd0"
        w={1.2}
        opacity={0.8}
      />

      {/* The flower in her hair, with a leaf */}
      <path
        d="M60.4 33.6C57.4 35.6 57 39.6 59 41C61.4 39.4 62 36 60.4 33.6Z"
        fill="#4caf50"
      />
      <g className="gav-flora-bloom">
        <g transform={`translate(${FLOWER_X} ${FLOWER_Y}) rotate(12)`}>
          <Flower r={8} tone={PETAL} />
        </g>
      </g>
    </Portrait>
  )
}

export const FLORA: CharacterDef = {
  id: "flora",
  name: "Flora",
  tagline: "Brings a little spring to every game",
  tier: "legend",
  price: 0, // level 30 only: never sold
  earn: { level: 30 },
  accent: ACCENT,
  Art,
}
