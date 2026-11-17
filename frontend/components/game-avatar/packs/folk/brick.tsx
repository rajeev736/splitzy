import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Doodle,
  Ear,
  Eyes,
  Grad,
  Head,
  INK,
  Neck,
  Portrait,
  SHOULDERS,
  Stroke,
  sparkle,
  url,
  useIds,
  vars,
  type Tone,
} from "./kit"

const ACCENT = "#f2604c"
const SKIN_B: Tone = ["#f0b98d", "#cf8d5e", "#a1623a"]
const HAIR: Tone = ["#8a5634", "#5e361d", "#3a1f0f"]
const BANDANA: Tone = ["#62a0ff", "#2f70e2", "#1c4cad"]
const TEE: Tone = ["#8aa85a", "#66843c", "#465f26"]
const SQUARE_HEAD =
  "M27 45C27 30 37 22 50 22C63 22 73 30 73 45L73 55C73 66 63 73 50 73C37 73 27 66 27 55Z"

/** Speed lines around the edge for the punch-in: angle, length. */
const LINES = [0, 30, 62, 95, 125, 150, 205, 235, 265, 298, 330] as const

const CSS = `
.gav-brick-fig{transform-origin:50px 62px}
.gav-brick[data-mode=intro] .gav-brick-fig{animation:gav-brick-slam .75s cubic-bezier(.2,.8,.3,1) both}
@keyframes gav-brick-slam{0%{opacity:0;transform:scale(1.7) translateY(8px)}22%{opacity:1;transform:scale(.93)}34%{transform:scale(1.04)}44%{transform:translateX(-2px)}54%{transform:translateX(2px)}64%{transform:translateX(-1px)}76%,100%{transform:none}}
.gav-brick-burst{transform-origin:50px 46px}
.gav-brick[data-mode=intro] .gav-brick-burst{animation:gav-brick-burst .7s .12s ease-out both}
@keyframes gav-brick-burst{0%{opacity:0;transform:scale(.2) rotate(-20deg)}25%{opacity:1;transform:scale(1.05)}70%{opacity:1}100%{opacity:0;transform:scale(1.25) rotate(8deg)}}
.gav-brick-line{transform-origin:50px 50px}
.gav-brick[data-mode=intro] .gav-brick-line{animation:gav-brick-line .55s var(--t) ease-out both}
@keyframes gav-brick-line{0%{opacity:0;transform:scale(1.25)}30%{opacity:1}100%{opacity:0;transform:scale(.92)}}
.gav-brick-fist{transform-origin:76px 82px}
.gav-brick[data-mode=intro] .gav-brick-fist{animation:gav-brick-fist .6s .7s cubic-bezier(.3,.7,.4,1) both}
@keyframes gav-brick-fist{0%{opacity:0;transform:translate(10px,34px) scale(.45)}35%{opacity:1;transform:translate(-8px,-12px) scale(1.35)}62%{opacity:1;transform:translate(-7px,-10px) scale(1.3)}100%{opacity:0;transform:translate(12px,40px) scale(.6)}}
.gav-brick-pow{transform-origin:68px 64px}
.gav-brick[data-mode=intro] .gav-brick-pow{animation:gav-brick-pow .45s .86s ease-out both}
@keyframes gav-brick-pow{0%{opacity:0;transform:scale(.2)}35%{opacity:1;transform:scale(1.15)}100%{opacity:0;transform:scale(1.4)}}
.gav-brick-tail{transform-origin:76px 38px}
.gav-brick[data-mode=idle] .gav-brick-tail{animation:gav-brick-flutter 1.6s ease-in-out infinite}
.gav-brick[data-mode=intro] .gav-brick-tail{animation:gav-brick-flutter .25s .2s 4 ease-in-out}
@keyframes gav-brick-flutter{0%,100%{transform:none}50%{transform:rotate(-9deg) scaleX(.94)}}
`

/** A jagged comic-book burst. */
const burst = (cx: number, cy: number, r: number, n = 12) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i * Math.PI) / n
    const rr = i % 2 ? r * 0.62 : r
    return `${i ? "L" : "M"}${Math.round((cx + rr * Math.sin(a)) * 10) / 10} ${Math.round((cy - rr * Math.cos(a)) * 10) / 10}`
  }).join("") + "Z"

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  const skin = SKIN_B
  return (
    <Portrait
      cid="brick"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-brick-fig"
      back={
        <>
          <g className="gav-folk-fx gav-brick-burst">
            <path d={burst(50, 46, 46)} fill="#ffd34d" />
            <path d={burst(50, 46, 34, 10)} fill="#fff3b0" />
          </g>
          <Doodle kind="hash" x={16} y={66} r={-6} d={0.2} />
          <Doodle kind="ticks" x={82} y={22} r={20} d={0.6} />
          <Doodle kind="sparkle" x={86} y={66} s={0.7} d={1} />
        </>
      }
      front={
        <>
          {LINES.map((a, i) => (
            <g
              key={a}
              className="gav-folk-fx gav-brick-line"
              style={vars({ "--t": `${0.1 + (i % 3) * 0.06}s` })}
            >
              <path
                d="M50 2V12"
                transform={`rotate(${a} 50 50)`}
                stroke="#fff"
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            </g>
          ))}
          <g className="gav-folk-fx gav-brick-pow">
            <path d={burst(68, 64, 11, 9)} fill="#fff" />
            <path d={sparkle(68, 64, 6)} fill="#ffd34d" />
          </g>
          <g className="gav-folk-fx gav-brick-fist">
            {/* A fist seen knuckles-first, thumb across the front */}
            <g transform="translate(76 80)">
              <rect
                x={-9}
                y={9}
                width={18}
                height={14}
                fill={TEE[1]}
                stroke="#fff8e8"
                strokeWidth={1.2}
              />
              <rect
                x={-13}
                y={-12.4}
                width={26}
                height={24}
                rx={8.6}
                fill="#fff8e8"
              />
              <rect
                x={-11.8}
                y={-9}
                width={23.6}
                height={19.6}
                rx={7}
                fill={skin[1]}
              />
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={-11.8 + i * 5.9}
                  y={-11.2}
                  width={5.9}
                  height={11.6}
                  rx={2.9}
                  fill={skin[0]}
                  stroke={skin[2]}
                  strokeWidth={0.6}
                />
              ))}
              <path
                d="M-11.8 1.6C-6.6 -0.6 2 0.2 6.6 2.4C7 5.6 3 7.4 -1.4 7C-6 6.6 -10.6 5.2 -11.8 1.6Z"
                fill={skin[1]}
                stroke={skin[2]}
                strokeWidth={0.6}
              />
              <Stroke
                d="M-8 -8.6V-6.4M-2.1 -8.6V-6.4M3.8 -8.6V-6.4M9.4 -8.6V-6.4"
                color="#fff"
                w={0.8}
                opacity={0.6}
              />
            </g>
          </g>
        </>
      }
    >
      <Grad id={id("tee")} tone={TEE} />
      <Grad id={id("hair")} tone={HAIR} x1={0.3} x2={0.7} />
      <Grad id={id("band")} tone={BANDANA} x1={0.5} x2={0.5} />

      <path d={SHOULDERS} fill={url(id("tee"))} />
      <Neck ids={id} skin={skin} d="M37 58L37 79C43 85 57 85 63 79L63 58Z" />
      <Stroke d="M36 79C42 86 58 86 64 79" color={TEE[2]} w={2.6} />
      <Stroke
        d="M20 88C24 90 26 95 26 104M80 88C76 90 74 95 74 104"
        color={TEE[2]}
        w={1.1}
        opacity={0.5}
      />

      {/* Quiff, then the head */}
      <path
        d="M28 40C25 26 34 13 49 12C60 11 70 15 74 24C76 30 74 36 72 40Z"
        fill={url(id("hair"))}
      />
      <path
        d="M43 14C45 7.4 52 4.6 58 7.4C55 8.6 53 10.6 52 13Z"
        fill={HAIR[1]}
      />
      <Stroke
        d="M40 16C44 13 50 12 55 13M36 22C40 18 46 17 51 18M58 15C63 16 67 19 69 23"
        color={HAIR[0]}
        w={1}
        opacity={0.7}
      />
      <Ear x={27} y={54} skin={skin} />
      <Ear x={73} y={54} skin={skin} flip />
      <Head ids={id} skin={skin} d={SQUARE_HEAD}>
        <ellipse cx={50} cy={43} rx={26} ry={5} fill={skin[2]} opacity={0.55} />
        <path
          d="M29 58C33 70 43 75 50 75C57 75 67 70 71 58C66 65 58 67.5 50 67.5C42 67.5 34 65 29 58Z"
          fill="#5a3a26"
          opacity={0.2}
        />
      </Head>

      <path
        d="M27 37C26 26 36 18.4 50 18.4C64 18.4 74 26 73 37C62 33.6 38 33.6 27 37Z"
        fill={url(id("hair"))}
      />
      <Stroke
        d="M36 24C41 21.4 47 20.6 52 21M57 21.6C62 22.6 66 25 68.4 28"
        color={HAIR[0]}
        w={1}
        opacity={0.7}
      />

      {/* Bandana with a knot and tails */}
      <path
        d="M26.4 32.6C38 36.2 62 36.2 73.6 32.6L74 41.2C62 44.8 38 44.8 26 41.2Z"
        fill={url(id("band"))}
      />
      <g fill="#fff" opacity={0.75}>
        <circle cx={35} cy={38} r={0.8} />
        <circle cx={44} cy={39.2} r={0.8} />
        <circle cx={54} cy={39.2} r={0.8} />
        <circle cx={63} cy={38.2} r={0.8} />
        <circle cx={39.5} cy={36.6} r={0.5} />
        <circle cx={58.5} cy={36.8} r={0.5} />
      </g>
      <g className="gav-brick-tail">
        <path
          d="M75.4 37.4C79.6 34 85 31.8 89 33.6C86 36.2 82.6 38.6 79.4 40Z"
          fill={BANDANA[1]}
        />
        <path
          d="M75.4 39.4C79.6 41.6 84 45.6 85.4 50C81.4 49.2 78 46.2 74.6 42Z"
          fill={BANDANA[2]}
        />
      </g>
      <path
        d="M71.6 34.6C75.4 32.6 79.4 34.8 78.4 39C77.4 42.2 73.4 42.2 71.6 40.2Z"
        fill={BANDANA[0]}
      />

      {/* Stern face and a stitched scar */}
      <Stroke d="M34 46L45.2 48.8M66 46L54.8 48.8" color="#3a1f0f" w={3.8} />
      <Eyes y={53} rx={2.6} ry={2.9} />
      <Stroke d="M47.4 59.8Q50 61.6 52.6 59.8" color={skin[2]} w={1.3} />
      <Stroke d="M43.6 66Q50 64.2 56.4 66.2" color={INK} w={1.5} />
      <Stroke
        d="M46 68.6Q50 69.6 54 68.6"
        color={skin[2]}
        w={1}
        opacity={0.7}
      />
      <Stroke d="M58.4 59L66.4 54.4" color="#a24f35" w={1.4} />
      <Stroke
        d="M60.2 55.2L61.8 58.8M63.4 53.4L65 57"
        color="#a24f35"
        w={0.9}
      />
    </Portrait>
  )
}

export const BRICK: CharacterDef = {
  id: "brick",
  name: "Brick",
  tagline: "Doesn't talk. Just wins.",
  tier: "premium",
  price: 3000,
  accent: ACCENT,
  Art,
}
