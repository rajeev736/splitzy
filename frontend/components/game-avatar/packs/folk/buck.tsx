import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Blush,
  Doodle,
  Ear,
  Eyes,
  Grad,
  Head,
  MOUTH,
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

const ACCENT = "#f6c443"
const HAT: Tone = ["#cf9a69", "#a46c40", "#6c4122"]
const BEARD: Tone = ["#a05c35", "#773f22", "#4c2713"]
const SHIRT: Tone = ["#86b05c", "#62903f", "#416829"]
const skin = SKIN.tan

const CSS = `
.gav-buck[data-mode=intro] .gav-buck-fig{animation:gav-buck-rise .55s cubic-bezier(.2,.9,.3,1.25) both}
@keyframes gav-buck-rise{0%{transform:translateY(48px)}100%{transform:none}}
.gav-buck-hat{transform-origin:46px 38px}
.gav-buck[data-mode=intro] .gav-buck-hat{animation:gav-buck-tip 1.05s .5s ease-in-out both}
@keyframes gav-buck-tip{0%,100%{transform:none}22%,58%{transform:translate(3px,-8px) rotate(-14deg)}80%{transform:translateY(1px)}}
.gav-buck[data-mode=intro] .gav-buck-wink{animation:gav-buck-wink 1.05s .5s both}
@keyframes gav-buck-wink{0%,25%,60%,100%{transform:none}35%,50%{transform:scaleY(.12)}}
.gav-buck-puff{transform-origin:var(--ox) 100px}
.gav-buck[data-mode=intro] .gav-buck-puff{animation:gav-buck-puff .85s var(--t) ease-out both}
@keyframes gav-buck-puff{0%{opacity:0;transform:translate(0,4px) scale(.3)}25%{opacity:.95}100%{opacity:0;transform:translate(var(--dx),-10px) scale(1.25)}}
.gav-buck-straw{transform-origin:58px 64px}
.gav-buck[data-mode=idle] .gav-buck-straw{animation:gav-buck-straw 2.6s ease-in-out infinite}
.gav-buck[data-mode=intro] .gav-buck-straw{animation:gav-buck-straw .5s 1.2s ease-in-out 2}
@keyframes gav-buck-straw{0%,100%{transform:none}50%{transform:rotate(-9deg)}}
`

/** Dust clouds kicked up when he lands, at the bottom corners. */
function Dust() {
  const puffs = [
    [14, 94, 9, "-8px", "0.35s"],
    [26, 98, 6, "-4px", "0.42s"],
    [6, 86, 5, "-6px", "0.5s"],
    [86, 94, 9, "8px", "0.35s"],
    [74, 98, 6, "4px", "0.42s"],
    [94, 86, 5, "6px", "0.5s"],
  ] as const
  return (
    <>
      {puffs.map(([x, y, r, dx, t]) => (
        <g
          key={`${x}-${y}`}
          className="gav-folk-fx gav-buck-puff"
          style={vars({ "--ox": `${x}px`, "--dx": dx, "--t": t })}
        >
          <circle cx={x} cy={y} r={r} fill="#fffaf0" />
          <circle
            cx={x + r * 0.7}
            cy={y - r * 0.5}
            r={r * 0.7}
            fill="#ffffff"
          />
          <circle
            cx={x - r * 0.6}
            cy={y + r * 0.2}
            r={r * 0.6}
            fill="#e7c27a"
          />
        </g>
      ))}
    </>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  return (
    <Portrait
      cid="buck"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-buck-fig"
      back={
        <>
          <Doodle kind="hash" x={84} y={62} r={8} d={0.2} />
          <Doodle kind="sparkle" x={15} y={58} s={0.8} d={0.6} />
          <Doodle kind="plus" x={80} y={18} s={0.8} d={1} />
        </>
      }
      front={<Dust />}
    >
      <Grad id={id("shirt")} tone={SHIRT} />
      <Grad id={id("beard")} tone={BEARD} x1={0.3} x2={0.6} />
      <Grad id={id("hat")} tone={HAT} x1={0.1} x2={0.9} />
      <Grad
        id={id("brim")}
        tone={HAT}
        x1={0.5}
        y1={0}
        x2={0.5}
        y2={1}
        mid={0.4}
      />

      {/* Shirt with an open collar */}
      <path d={SHOULDERS} fill={url(id("shirt"))} />
      <Neck ids={id} skin={skin} d="M40 60L40 78L50 91L60 78L60 60Z" />
      <path d="M38 76L50 91L45 95L34 81Z" fill={SHIRT[0]} />
      <path d="M62 76L50 91L55 95L66 81Z" fill={SHIRT[1]} />
      <path
        d="M24 92C26 98 26 102 25 106"
        stroke={SHIRT[2]}
        strokeWidth={1.2}
        fill="none"
        opacity={0.6}
      />

      <Ear x={28} y={52} skin={skin} />
      <Ear x={72} y={52} skin={skin} flip />
      <Head ids={id} skin={skin}>
        <ellipse
          cx={50}
          cy={41}
          rx={28}
          ry={5.5}
          fill={skin[2]}
          opacity={0.6}
        />
      </Head>

      {/* Beard and moustache */}
      <path
        d="M28 46C28 58 31 70 38 77C42 81 46 82 50 82C54 82 58 81 62 77C69 70 72 58 72 46C70 52 67 56 63 57.5C59 56 54 56 50 57C46 56 41 56 37 57.5C33 56 30 52 28 46Z"
        fill={url(id("beard"))}
      />
      <Stroke
        d="M33 62C34 67 36 71 39 74M67 62C66 67 64 71 61 74M44 73C46 75 48 76 50 76"
        color={BEARD[2]}
        w={0.9}
        opacity={0.6}
      />
      <path
        d="M41.6 63.8C46 66.4 54 66.4 58.4 63.8C57 71 43 71 41.6 63.8Z"
        fill={MOUTH}
      />
      <path
        d="M43.2 64.5C47 66.2 53 66.2 56.8 64.5L56.2 66.2C52.4 67.4 47.6 67.4 43.8 66.2Z"
        fill="#fff"
      />
      <path
        d="M37.5 62.4C40.5 58.2 46 58.4 50 60.4C54 58.4 59.5 58.2 62.5 62.4C58.4 63.4 54 62.8 50 62.2C46 62.8 41.6 63.4 37.5 62.4Z"
        fill={BEARD[1]}
      />
      <Stroke
        d="M41 60.6C44 59.6 47 60 49 61"
        color={BEARD[0]}
        w={0.8}
        opacity={0.8}
      />

      {/* Nose, cheeks, gruff brows and eyes */}
      <ellipse cx={50} cy={54.5} rx={3.6} ry={2.8} fill={skin[1]} />
      <Stroke d="M47.2 55.8Q50 58 52.8 55.8" color={skin[2]} w={1.2} />
      <Blush y={56} dx={14} opacity={0.22} />
      <Stroke
        d="M34.5 44.2L46 46.8M65.5 44.2L54 46.8"
        color={BEARD[2]}
        w={3.6}
      />
      <g className="gav-buck-wink" style={origin(59, 50.5)}>
        <Eyes y={50.5} ry={2.9} />
      </g>

      {/* A straw in the corner of his mouth */}
      <g className="gav-buck-straw">
        <Stroke d="M57 65L71 58.5" color="#e9b740" w={1.3} />
        <ellipse
          cx={72.5}
          cy={57.8}
          rx={2.4}
          ry={1.1}
          transform="rotate(-25 72.5 57.8)"
          fill="#f7d36a"
        />
      </g>

      {/* The hat */}
      <g className="gav-buck-hat">
        <path
          d="M31 34C30 22 33 12 40 9.5C44 8.5 46.5 12.5 50 12.5C53.5 12.5 56 8.5 60 9.5C67 12 70 22 69 34Z"
          fill={url(id("hat"))}
        />
        <Stroke
          d="M50 13.5C49 19 49.4 24 50 28.5"
          color={HAT[2]}
          w={1.1}
          opacity={0.5}
        />
        <path
          d="M35 14C33 19 32.6 24 33 28"
          stroke="#fff"
          strokeOpacity={0.3}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M31 28.5C42 31.5 58 31.5 69 28.5L69 33.8C58 36.5 42 36.5 31 33.8Z"
          fill="#4a2814"
        />
        <path
          d="M4 27C13 33 30 36.4 50 36.4C70 36.4 87 33 96 27C95 35.5 81 42.5 50 42.5C19 42.5 5 35.5 4 27Z"
          fill={url(id("brim"))}
        />
        <Stroke
          d="M9 31C20 36 34 38.4 50 38.4C66 38.4 80 36 91 31"
          color={HAT[0]}
          w={0.9}
          opacity={0.7}
        />
      </g>
    </Portrait>
  )
}

export const BUCK: CharacterDef = {
  id: "buck",
  name: "Buck",
  tagline: "Tips his hat, then takes the pot",
  tier: "premium",
  price: 3000,
  accent: ACCENT,
  Art,
}
