import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Doodle,
  Eyes,
  Grad,
  Head,
  INK,
  MIRROR,
  Portrait,
  SHOULDERS,
  Stroke,
  sparkle,
  url,
  useIds,
  type Tone,
} from "./kit"

const ACCENT = "#f7812b"
const FUR: Tone = ["#fffdf7", "#efe7da", "#c9b9a2"]
const COAT: Tone = ["#8d6be0", "#6744c2", "#432391"]
const GOLD: Tone = ["#ffe58a", "#f0b93a", "#b9821c"]
const PINK = "#ff9ea6"

/** Cat head with fluffy cheek tufts. */
const CAT_HEAD =
  "M24 50C24 34 35 25 50 25C65 25 76 34 76 50C76.6 52.6 80 54.6 83.4 55.6C80 57.6 77.6 58.6 76.6 60C78.6 61.8 80.4 63.6 81.4 65.8C77.6 66 74.6 66 72.4 66C67.4 72 59.4 75 50 75C40.6 75 32.6 72 27.6 66C25.4 66 22.4 66 18.6 65.8C19.6 63.6 21.4 61.8 23.4 60C22.4 58.6 20 57.6 16.6 55.6C20 54.6 23.4 52.6 24 50Z"

const CSS = `
.gav-pemberton[data-mode=intro] .gav-pemberton-fig{animation:gav-pemberton-in .55s cubic-bezier(.2,.8,.3,1.15) both}
@keyframes gav-pemberton-in{0%{transform:translate(52px,6px) rotate(14deg)}100%{transform:none}}
.gav-pemberton-mono{transform-origin:60px 51px}
.gav-pemberton[data-mode=intro] .gav-pemberton-mono{animation:gav-pemberton-drop .55s .45s cubic-bezier(.3,1.4,.5,1) both}
@keyframes gav-pemberton-drop{0%{opacity:0;transform:translateY(-46px) rotate(-30deg)}30%{opacity:1}100%{transform:none}}
.gav-pemberton-brow{transform-origin:60px 42px}
.gav-pemberton[data-mode=intro] .gav-pemberton-brow{animation:gav-pemberton-brow .5s .85s ease-out both}
@keyframes gav-pemberton-brow{0%{transform:translateY(3px) rotate(8deg)}60%{transform:translateY(-1.5px)}100%{transform:none}}
.gav-pemberton[data-mode=intro] .gav-pemberton-shine{animation:gav-pemberton-shine .5s 1s ease-in-out both}
.gav-pemberton[data-mode=idle] .gav-pemberton-shine{animation:gav-pemberton-shine 4.5s 1.5s ease-in-out infinite}
@keyframes gav-pemberton-shine{0%{opacity:0;transform:translateX(-14px)}10%{opacity:.95}30%,100%{opacity:0;transform:translateX(14px)}}
.gav-pemberton-glint{transform-origin:65.5px 45.5px}
.gav-pemberton[data-mode=intro] .gav-pemberton-glint{animation:gav-pemberton-glint .7s 1.15s ease-out both}
.gav-pemberton[data-mode=idle] .gav-pemberton-glint{animation:gav-pemberton-glint-s 4.5s 1.6s ease-out infinite}
@keyframes gav-pemberton-glint{0%{opacity:0;transform:scale(0) rotate(-60deg)}35%{opacity:1;transform:scale(1.25) rotate(0)}100%{opacity:0;transform:scale(.4) rotate(40deg)}}
@keyframes gav-pemberton-glint-s{0%{opacity:0;transform:scale(0)}6%{opacity:1;transform:scale(.8)}16%,100%{opacity:0;transform:scale(0) rotate(40deg)}}
.gav-pemberton-ear{transform-origin:70px 32px}
.gav-pemberton[data-mode=idle] .gav-pemberton-ear{animation:gav-pemberton-flick 5s 2s infinite}
@keyframes gav-pemberton-flick{0%,6%,100%{transform:none}2%{transform:rotate(12deg)}4%{transform:rotate(-3deg)}}
.gav-pemberton-ray{transform-origin:65.5px 45.5px}
.gav-pemberton[data-mode=intro] .gav-pemberton-ray{animation:gav-pemberton-ray .55s 1.2s ease-out both}
@keyframes gav-pemberton-ray{0%{opacity:0;transform:scale(.4)}30%{opacity:1}100%{opacity:0;transform:scale(1.5)}}
`

function CatEar({ id }: { id: (n: string) => string }) {
  return (
    <>
      <path
        d="M27 42C25 30 25 18 28.4 9.6C35.4 13.4 41.4 20.6 45 28Z"
        fill={url(id("fur"))}
      />
      <path
        d="M30.2 35.6C29.2 28 29.6 22 31.2 16.6C35 19.6 38 23.8 40.2 28Z"
        fill={PINK}
      />
      <Stroke d="M30 33L33 31M30.4 29L33.4 28" color="#fff" w={0.8} />
    </>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  return (
    <Portrait
      cid="pemberton"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-pemberton-fig"
      back={
        <>
          <Doodle kind="sparkle" x={16} y={30} s={0.8} d={0.2} />
          <Doodle kind="swirl" x={86} y={70} d={0.6} />
          <Doodle kind="plus" x={84} y={22} s={0.7} d={1} />
        </>
      }
      front={
        <>
          <g className="gav-folk-fx gav-pemberton-ray">
            <Stroke
              d="M65.5 36V33M74.5 45.5H77.5M71.9 39.1L74 37M71.9 51.9L74 54"
              color="#fff"
              w={1.4}
            />
          </g>
          <g className="gav-folk-fx gav-pemberton-glint">
            <path d={sparkle(65.5, 45.5, 6.5)} fill="#fff" />
            <circle cx={65.5} cy={45.5} r={1.6} fill="#fffbe0" />
          </g>
        </>
      }
    >
      <Grad id={id("fur")} tone={FUR} x1={0.2} x2={0.8} />
      <Grad id={id("coat")} tone={COAT} />
      <Grad id={id("gold")} tone={GOLD} />

      {/* Coat, shirt, popped collar and a bow tie */}
      <path d={SHOULDERS} fill={url(id("coat"))} />
      <path d="M40 74L60 74L57 106L43 106Z" fill="#fffaf2" />
      <path d="M36 74L44 76L50 100L40 106L31 92Z" fill={COAT[2]} />
      <path d="M64 74L56 76L50 100L60 106L69 92Z" fill={COAT[1]} />
      <path d="M26 82C27 72 33 66 40 66L45 80L34 92Z" fill={COAT[0]} />
      <path d="M74 82C73 72 67 66 60 66L55 80L66 92Z" fill={COAT[1]} />
      <path d="M41.5 74.5L49 78L41.5 82Z" fill="#d9324a" />
      <path d="M58.5 74.5L51 78L58.5 82Z" fill="#b8243a" />
      <circle cx={50} cy={78} r={2.2} fill="#e8455c" />
      <circle cx={50} cy={88} r={1.1} fill={GOLD[1]} />
      <circle cx={50} cy={95} r={1.1} fill={GOLD[1]} />

      {/* Ears and head */}
      <CatEar id={id} />
      <g className="gav-pemberton-ear">
        <g transform={MIRROR}>
          <CatEar id={id} />
        </g>
      </g>
      <Head ids={id} skin={FUR} d={CAT_HEAD} />
      <Stroke
        d="M46 29.5L47 34.5M50 28.5V35M54 29.5L53 34.5"
        color={FUR[2]}
        w={1.3}
      />
      <Stroke
        d="M20.5 56.4L24.5 57M21 64.6L25 63.6M79.5 56.4L75.5 57M79 64.6L75 63.6"
        color={FUR[2]}
        w={0.8}
      />

      {/* Muzzle, nose, mouth, whiskers */}
      <ellipse cx={45.6} cy={61.2} rx={5} ry={3.7} fill="#fff" />
      <ellipse cx={54.4} cy={61.2} rx={5} ry={3.7} fill="#fff" />
      <path
        d="M47.4 57.6C48.4 56.9 51.6 56.9 52.6 57.6C52.6 58.8 51 60.2 50 60.2C49 60.2 47.4 58.8 47.4 57.6Z"
        fill={PINK}
        stroke="#e07a86"
        strokeWidth={0.5}
      />
      <Stroke
        d="M50 60.2V61.4M46.6 61.2Q48.3 63.4 50 61.4Q51.7 63.4 53.4 61.2"
        color={INK}
        w={1}
      />
      <Stroke
        d="M29.5 59.2L39.5 60.2M30 63.4L39.6 62.4M70.5 59.2L60.5 60.2M70 63.4L60.4 62.4"
        color="#b6a58c"
        w={0.7}
      />

      {/* Eyes, one raised posh brow */}
      <Eyes y={51} dx={10} rx={2.8} ry={3.6} />
      <Stroke d="M35.6 45.4Q40 44 44 45.4" color={FUR[2]} w={1.6} />
      <g className="gav-pemberton-brow">
        <Stroke d="M55.6 42.2Q60 39.8 64.6 41.4" color={FUR[2]} w={1.6} />
      </g>

      {/* The monocle on its chain */}
      <g className="gav-pemberton-mono">
        <Stroke
          d="M65.6 55.6C70.6 61 72.4 69 69 80"
          color={GOLD[2]}
          w={0.9}
          strokeDasharray="1.4 0.9"
        />
        <clipPath id={id("glass")}>
          <circle cx={60} cy={51} r={6.8} />
        </clipPath>
        <circle cx={60} cy={51} r={6.8} fill="#cdeeff" fillOpacity={0.35} />
        <g clipPath={url(id("glass"))}>
          <path
            d="M53 46.5L58.5 43.5"
            stroke="#fff"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.8}
          />
          <g className="gav-folk-fx gav-pemberton-shine">
            <path d="M57 42L61 42L56 60L52 60Z" fill="#fff" />
          </g>
        </g>
        <circle
          cx={60}
          cy={51}
          r={6.8}
          fill="none"
          stroke={url(id("gold"))}
          strokeWidth={1.7}
        />
      </g>
    </Portrait>
  )
}

export const PEMBERTON: CharacterDef = {
  id: "pemberton",
  name: "Sir Pemberton",
  tagline: "A gentleman never misses a move",
  tier: "legend",
  price: 8500,
  earn: { level: 22 },
  accent: ACCENT,
  Art,
}
