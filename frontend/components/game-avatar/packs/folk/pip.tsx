import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Doodle,
  Eyes,
  Grad,
  Head,
  MIRROR,
  Portrait,
  Stroke,
  origin,
  url,
  useIds,
  vars,
  type Tone,
} from "./kit"

const ACCENT = "#74c6ea"
const FEATHER: Tone = ["#dba26a", "#b5763f", "#7f4e24"]
const BEAK: Tone = ["#bfc5cf", "#8d939f", "#5a5f69"]
const CLOAK: Tone = ["#86629a", "#644477", "#432c52"]
const SCARF: Tone = ["#ffa055", "#f07228", "#c24f13"]
const ROLL: Tone = ["#6aa8ff", "#3b78d8", "#2453a3"]
const BIRD_HEAD =
  "M28 53C27 37 37 25.5 51 25.5C65 25.5 74 37 73 52.5C72 66 63 75 50.5 75C38 75 29 67 28 53Z"
const BODY = "M12 106C14 88 27 77 41 75L60 75C74 77 86 88 88 106Z"

/** Feathers shaken loose on the way in: x, y, delay. */
const FEATHERS = [
  [24, 20, 0.45],
  [40, 8, 0.6],
  [14, 40, 0.75],
] as const

const CSS = `
.gav-pip-fig{transform-origin:50px 100px}
.gav-pip[data-mode=intro] .gav-pip-fig{animation:gav-pip-fly 1.15s ease-out both}
@keyframes gav-pip-fly{0%{transform:translate(-50px,-64px) rotate(-16deg) scale(.8)}62%{transform:translate(0,-4px) rotate(2deg)}74%{transform:scale(1.07,.9)}86%{transform:scale(.98,1.03)}100%{transform:none}}
.gav-pip-wing{transform-origin:33px 78px}
.gav-pip[data-mode=intro] .gav-pip-wings{animation:gav-pip-wings .85s both}
@keyframes gav-pip-wings{0%,78%{opacity:1}100%{opacity:0}}
.gav-pip[data-mode=intro] .gav-pip-wing{animation:gav-pip-flap .16s 6 alternate ease-in-out}
@keyframes gav-pip-flap{from{transform:rotate(18deg)}to{transform:rotate(-32deg)}}
.gav-pip-head{transform-origin:50px 76px}
.gav-pip[data-mode=idle] .gav-pip-head{animation:gav-pip-tilt 4.4s ease-in-out infinite}
.gav-pip[data-mode=intro] .gav-pip-head{animation:gav-pip-tilt 1s 1.05s ease-in-out both}
@keyframes gav-pip-tilt{0%,100%{transform:none}30%,60%{transform:rotate(-5deg)}}
.gav-pip-crest{transform-origin:52px 27px}
.gav-pip[data-mode=idle] .gav-pip-crest{animation:gav-pip-crest 2.4s ease-in-out infinite}
.gav-pip[data-mode=intro] .gav-pip-crest{animation:gav-pip-crest .3s .85s 3 ease-in-out}
@keyframes gav-pip-crest{0%,100%{transform:none}50%{transform:rotate(9deg)}}
.gav-pip[data-mode=intro] .gav-pip-feather{animation:gav-pip-feather 1.2s var(--t) ease-in both}
@keyframes gav-pip-feather{0%{opacity:0;transform:none}15%{opacity:1}35%{transform:translate(5px,14px) rotate(40deg)}60%{transform:translate(-3px,30px) rotate(-20deg)}85%{opacity:1}100%{opacity:0;transform:translate(4px,46px) rotate(30deg)}}
`

function Wing() {
  return (
    <g className="gav-pip-wing">
      <path
        d="M34 80C22 66 9 60 2 62.6C7 65.4 10.6 69 12.6 72.4C8 72.6 4 74.6 2.6 78C9 79 13 80 15.6 82.4C12 83.6 9.6 86 9 89C18 89 28 87 36 84Z"
        fill={FEATHER[1]}
        stroke={FEATHER[2]}
        strokeWidth={0.6}
      />
      <Stroke
        d="M30 79C24 74 17 70 10 68.4M29 82C23 80 16 79 9 79.4"
        color={FEATHER[2]}
        w={0.8}
        opacity={0.8}
      />
    </g>
  )
}

function Bedroll({ id }: { id: (n: string) => string }) {
  return (
    <>
      <path d="M66 50L84 58L84 78L66 70Z" fill={ROLL[2]} />
      <circle cx={77} cy={72} r={11.5} fill={url(id("roll"))} />
      <Stroke
        d="M77 72C78 71 79.4 72 79 73.4C78.4 75.2 75.6 75.4 74.6 73.6C73.4 71.4 75.2 68.4 78 68.6C81.4 68.8 83.2 72 82.4 75.2C81.4 79 77 80.6 73.4 79C69.4 77.2 68 72.4 69.8 68.6C71.6 64.8 76 63.2 80 64.4"
        color={ROLL[2]}
        w={1.2}
      />
      <Stroke
        d="M69 63.4C71 61.6 74 60.6 77 60.6"
        color="#fff"
        w={1.2}
        opacity={0.4}
      />
    </>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  return (
    <Portrait
      cid="pip"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-pip-fig"
      back={
        <>
          <Doodle kind="swirl" x={84} y={24} d={0.2} />
          <Doodle kind="hash" x={14} y={30} r={-10} d={0.6} />
          <Doodle kind="sparkle" x={88} y={50} s={0.6} d={1} />
        </>
      }
      front={FEATHERS.map(([x, y, t]) => (
        <g
          key={x}
          className="gav-folk-fx gav-pip-feather"
          style={{ ...origin(x, y), ...vars({ "--t": `${t}s` }) }}
        >
          <path
            d={`M${x} ${y - 4}C${x + 2.4} ${y - 1} ${x + 2} ${y + 2} ${x} ${y + 4}C${x - 2} ${y + 2} ${x - 2.4} ${y - 1} ${x} ${y - 4}Z`}
            fill={FEATHER[0]}
            stroke="#fff"
            strokeWidth={0.5}
          />
          <Stroke d={`M${x} ${y - 3}V${y + 5.4}`} color={FEATHER[2]} w={0.5} />
        </g>
      ))}
    >
      <Grad id={id("roll")} tone={ROLL} />
      <Grad id={id("cloak")} tone={CLOAK} />
      <Grad id={id("scarf")} tone={SCARF} x1={0.5} x2={0.5} />
      <Grad id={id("beak")} tone={BEAK} x1={0.3} x2={0.7} />

      {/* Flight wings, only seen on the way in */}
      <g className="gav-folk-fx gav-pip-wings">
        <Wing />
        <g transform={MIRROR}>
          <Wing />
        </g>
      </g>

      <Bedroll id={id} />
      <path d={BODY} fill={url(id("cloak"))} />
      <Stroke d="M78 72L42 106" color="#6b4423" w={3.4} />
      <Stroke d="M77 71L41 105" color="#9a6a3c" w={1} />

      <g className="gav-pip-head">
        {/* Scarf knot and its gold bead */}
        <path
          d="M31 71C39 78 61 78 69 71L70.4 78C61 85 39 85 29.6 78Z"
          fill={url(id("scarf"))}
        />
        <path d="M44 80C40 84 36 90 35 95C39 94 43 91 46 86Z" fill={SCARF[2]} />
        <path d="M47 80C49 85 50 91 49 96C53 94 54 89 53 83Z" fill={SCARF[1]} />
        <circle
          cx={47}
          cy={81}
          r={3.4}
          fill="#ffcb3d"
          stroke="#c98a12"
          strokeWidth={0.6}
        />
        <circle cx={46} cy={80} r={1} fill="#fff" opacity={0.8} />

        <g className="gav-pip-crest">
          <path
            d="M46 30C42.6 23 43.6 16.6 48 13C48 18 50 21 52.4 22.4C52 16.6 54.6 11.4 59.6 9.4C57.6 14.4 58.4 18.6 60.6 21.6C61.8 18.6 64.8 16.6 68.4 16.6C65.4 20.6 62 25.4 57.6 30Z"
            fill={FEATHER[1]}
          />
        </g>
        <Head ids={id} skin={FEATHER} d={BIRD_HEAD}>
          <ellipse
            cx={52}
            cy={72}
            rx={17}
            ry={8}
            fill="#f4cf9e"
            opacity={0.55}
          />
        </Head>

        {/* Thick brows, eyes, big beak pointing left */}
        <Stroke
          d="M37 41.4Q42 38.2 47.6 40.6M56.4 40.6Q62 38.2 66.6 41.4"
          color="#3d2410"
          w={3.2}
        />
        <Eyes y={47.5} cx={52} dx={8.6} rx={2.5} ry={3.3} />
        <path
          d="M57 52.6C46 49.4 29 52.4 16 61C28 63.4 45 62.6 58 58.6C59.4 56.4 59 54 57 52.6Z"
          fill={url(id("beak"))}
        />
        <path
          d="M56.6 59C45 62 31 62.8 20 62.4C28 66.6 45 67.4 55.6 63.4Z"
          fill={BEAK[2]}
        />
        <Stroke
          d="M52 54.2C44 53.6 34 55.6 26 58.8"
          color="#fff"
          w={1.1}
          opacity={0.45}
        />
      </g>
    </Portrait>
  )
}

export const PIP: CharacterDef = {
  id: "pip",
  name: "Pip",
  tagline: "Has wandered every board in the land",
  tier: "premium",
  price: 0, // level 12 only: never sold
  earn: { level: 12 },
  accent: ACCENT,
  Art,
}
