import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Blush,
  Doodle,
  Ear,
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
  sparkle,
  url,
  useIds,
  vars,
  type Tone,
} from "./kit"

const ACCENT = "#5ccfa6"
const HAIR: Tone = ["#f7a457", "#de6c2a", "#a8481a"]
const TOP: Tone = ["#a68bff", "#7d5ae8", "#5533b5"]
const TIE = "#ffd45c"
const skin = SKIN.fair

const CSS = `
.gav-mimi[data-mode=intro] .gav-mimi-fig{animation:gav-mimi-in .55s cubic-bezier(.2,.9,.3,1.35) both}
@keyframes gav-mimi-in{0%{transform:translateY(55px)}100%{transform:none}}
.gav-mimi-ear{transform-origin:var(--o)}
.gav-mimi[data-mode=intro] .gav-mimi-ear{animation:gav-mimi-ear .5s .4s cubic-bezier(.3,1.8,.5,1) both}
@keyframes gav-mimi-ear{0%{transform:scaleY(0)}100%{transform:none}}
.gav-mimi[data-mode=idle] .gav-mimi-ear-r{animation:gav-mimi-twitch 3.8s 1.2s infinite}
@keyframes gav-mimi-twitch{0%,8%,100%{transform:none}3%{transform:rotate(14deg)}5%{transform:rotate(-4deg)}}
.gav-mimi-tail{transform-origin:25px 39px}
.gav-mimi[data-mode=intro] .gav-mimi-tail{animation:gav-mimi-wag .9s .45s ease-out both}
.gav-mimi[data-mode=idle] .gav-mimi-tail{animation:gav-mimi-sway 2.8s ease-in-out infinite}
@keyframes gav-mimi-wag{0%,100%{transform:none}15%{transform:rotate(-24deg)}35%{transform:rotate(16deg)}55%{transform:rotate(-9deg)}75%{transform:rotate(4deg)}}
@keyframes gav-mimi-sway{0%,100%{transform:none}50%{transform:rotate(-5deg)}}
.gav-mimi[data-mode=intro] .gav-folk-eye-r{animation:gav-mimi-wink .5s 1s ease-in-out both}
@keyframes gav-mimi-wink{0%,100%{transform:none}30%,70%{transform:scaleY(.1)}}
.gav-mimi-star{transform-origin:72px 42px}
.gav-mimi[data-mode=intro] .gav-mimi-star{animation:gav-mimi-star .6s 1.05s ease-out both}
@keyframes gav-mimi-star{0%{opacity:0;transform:scale(0) rotate(-90deg)}40%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(.6) rotate(45deg) translate(4px,-4px)}}
`

function Pigtail({ id }: { id: (n: string) => string }) {
  return (
    <g className="gav-mimi-tail">
      <path
        d="M27 35.5C20 28.5 11 26.5 4 30.5L11.5 34.5L1.5 38.5L11.5 41L4 47L13.5 46L9.5 52.5C17.5 51.5 23.5 46.5 27 42Z"
        fill={url(id("hair"))}
      />
      <Stroke
        d="M23 37C18 35 13 35 9 36.5M22 41C18 42 15 44 12.5 47"
        color={HAIR[2]}
        w={0.9}
        opacity={0.6}
      />
      <rect x={22.4} y={34} width={5.4} height={9} rx={2.6} fill={TIE} />
      <rect
        x={23.4}
        y={35.2}
        width={1.5}
        height={4}
        rx={0.75}
        fill="#fff"
        opacity={0.6}
      />
    </g>
  )
}

function CatEar({ id, side }: { id: (n: string) => string; side: "l" | "r" }) {
  return (
    <g
      className={`gav-mimi-ear gav-mimi-ear-${side}`}
      style={vars({ "--o": side === "l" ? "38px 25px" : "62px 25px" })}
    >
      <g transform={side === "r" ? MIRROR : undefined}>
        <path
          d="M30 29L31 11C35.4 12.4 41.4 17.6 45 24Z"
          fill={url(id("hair"))}
        />
        <path
          d="M33 24.6L33.6 16.4C36.2 17.8 38.8 20.2 40.6 23.2Z"
          fill="#ffa7b5"
        />
      </g>
    </g>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  return (
    <Portrait
      cid="mimi"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-mimi-fig"
      back={
        <>
          <Doodle kind="swirl" x={20} y={20} d={0.1} />
          <Doodle kind="hash" x={15} y={72} r={-8} d={0.5} />
          <Doodle kind="sparkle" x={86} y={66} s={0.8} d={0.9} />
          <Doodle kind="sparkle" x={82} y={22} s={0.5} d={1.3} />
        </>
      }
      front={
        <g className="gav-folk-fx gav-mimi-star">
          <path d={sparkle(72, 42, 6)} fill="#fff" />
          <path d={sparkle(77.5, 36.5, 2.4)} fill="#fff7a8" />
        </g>
      }
    >
      <Grad id={id("hair")} tone={HAIR} x1={0.3} x2={0.7} />
      <Grad id={id("top")} tone={TOP} />

      {/* Hair behind the head and the two pigtails */}
      <path
        d="M25 50C22 31 33 19 50 19C67 19 78 31 75 50L76.5 65C73.5 68.5 69 67 69 62L31 62C31 67 26.5 68.5 23.5 65Z"
        fill={HAIR[2]}
      />
      <Pigtail id={id} />
      <g transform={MIRROR}>
        <Pigtail id={id} />
      </g>
      <CatEar id={id} side="l" />
      <CatEar id={id} side="r" />

      <path d={SHOULDERS} fill={url(id("top"))} />
      <path
        d="M30 82C33 90 33 98 32 106M70 82C67 90 67 98 68 106"
        stroke={TOP[0]}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      <Neck
        ids={id}
        skin={skin}
        d="M41 60L41 78C41 84 45 88 50 88C55 88 59 84 59 78L59 60Z"
      />

      <Ear x={28} y={52} skin={skin} />
      <Ear x={72} y={52} skin={skin} flip />
      <Head ids={id} skin={skin}>
        <ellipse cx={50} cy={42} rx={26} ry={5} fill={skin[2]} opacity={0.45} />
      </Head>

      {/* Face: cheeky grin, one brow up */}
      <Stroke
        d="M36 44.2Q40 42.4 44.4 44M55.6 42.6Q60 40.2 64.4 42"
        color={HAIR[2]}
        w={2.8}
      />
      <Eyes y={50.5} />
      <Blush y={57.5} dx={13.5} opacity={0.4} />
      <Stroke d="M48.8 55Q50 56 51.2 55" color={skin[2]} w={1.1} />
      <path
        d="M44.4 60.2C47 61.4 53 61.4 55.6 60.2C55.2 65 52.6 67.4 50 67.4C47.4 67.4 44.8 65 44.4 60.2Z"
        fill={MOUTH}
      />
      <path
        d="M46.4 65C48 63.6 52 63.6 53.6 65C52.4 66.8 47.6 66.8 46.4 65Z"
        fill={TONGUE}
      />
      <path
        d="M45.2 60.6C48 61.4 52 61.4 54.8 60.6L54.6 61.8C51.8 62.4 48.2 62.4 45.4 61.8Z"
        fill="#fff"
      />

      {/* Blunt bangs with a shine band */}
      <path
        d="M27.6 48C26.4 31 37 21 50 21C63 21 73.6 31 72.4 48L69.6 47.6C69.4 43.6 68.4 40.6 66.4 38.2C62.4 41.2 58 41.2 55 39C52 41.4 48 41.4 45 39C42 41.2 37.6 41.2 33.6 38.2C31.6 40.6 30.6 43.6 30.4 47.6Z"
        fill={url(id("hair"))}
      />
      <Stroke
        d="M35.5 27.5C41 24.4 58 24.4 64.5 27.5"
        color="#ffd7a8"
        w={1.8}
        opacity={0.75}
      />
      <Stroke
        d="M41 31.5L40 37M50 30.5V37.5M59 31.5L60 37"
        color={HAIR[2]}
        w={0.9}
        opacity={0.55}
      />
    </Portrait>
  )
}

export const MIMI: CharacterDef = {
  id: "mimi",
  name: "Mimi",
  tagline: "Cute ears, sharper claws",
  tier: "premium",
  price: 2500,
  earn: { level: 7 },
  accent: ACCENT,
  Art,
}
