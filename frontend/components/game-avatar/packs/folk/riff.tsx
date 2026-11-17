import type { CharacterArtProps, CharacterDef } from "../../types"
import {
  Blush,
  Doodle,
  DoodleShape,
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
  TONGUE,
  origin,
  url,
  useIds,
  vars,
  type Tone,
} from "./kit"

const ACCENT = "#36b7c8"
const HAIR: Tone = ["#ffe766", "#fbb42e", "#ec731b"]
const PHONES: Tone = ["#8f80ff", "#6150dc", "#3b2c9e"]
const TEE: Tone = ["#5f8cff", "#3d66e0", "#2746a8"]
const BIRD: Tone = ["#7cc0ff", "#3b8be6", "#215cb0"]
const skin = SKIN.peach

/** Notes that burst out of the headphones: start x/y, flight, spin, colour, delay. */
const NOTES = [
  [22, 46, "-14px", "-34px", "-30deg", "#fff", 0.35],
  [20, 56, "-18px", "-8px", "-50deg", "#fff59d", 0.45],
  [24, 40, "-4px", "-36px", "20deg", "#ffd0f0", 0.55],
  [78, 46, "14px", "-34px", "30deg", "#fff", 0.4],
  [80, 56, "17px", "-10px", "45deg", "#ffd0f0", 0.5],
  [76, 40, "6px", "-38px", "-20deg", "#fff59d", 0.6],
] as const

const CSS = `
.gav-riff[data-mode=intro] .gav-riff-fig{animation:gav-riff-in .45s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes gav-riff-in{0%{transform:translateY(40px) scale(.9)}100%{transform:none}}
.gav-riff-head{transform-origin:50px 76px}
.gav-riff[data-mode=idle] .gav-riff-head{animation:gav-riff-nod .9s ease-in-out infinite alternate}
.gav-riff[data-mode=intro] .gav-riff-head{animation:gav-riff-shake .9s .35s ease-out both}
@keyframes gav-riff-nod{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}
@keyframes gav-riff-shake{0%,100%{transform:none}15%{transform:rotate(-4deg) translateY(-2px)}30%{transform:rotate(3deg)}45%{transform:rotate(-2deg)}60%{transform:rotate(1deg)}}
.gav-riff-mouth{transform-origin:50px 58px}
.gav-riff[data-mode=intro] .gav-riff-mouth{animation:gav-riff-shout .7s .3s cubic-bezier(.3,1.6,.5,1) both}
@keyframes gav-riff-shout{0%{transform:scale(.35,.2)}60%{transform:scale(1.12,1.18)}100%{transform:none}}
.gav-riff-ring{transform-origin:50px 62px}
.gav-riff[data-mode=intro] .gav-riff-ring{animation:gav-riff-ring .9s var(--t) ease-out both}
@keyframes gav-riff-ring{0%{opacity:0;transform:scale(.4)}20%{opacity:.85}100%{opacity:0;transform:scale(1.9)}}
.gav-riff[data-mode=intro] .gav-riff-note{animation:gav-riff-note 1.05s var(--t) cubic-bezier(.2,.7,.4,1) both}
@keyframes gav-riff-note{0%{opacity:0;transform:scale(.2)}18%{opacity:1;transform:scale(1.15)}75%{opacity:1}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(var(--r)) scale(1)}}
.gav-riff[data-mode=idle] .gav-riff-drift{animation:gav-riff-drift 3.4s 1s ease-out infinite}
@keyframes gav-riff-drift{0%{opacity:0;transform:none}15%{opacity:1}60%,100%{opacity:0;transform:translate(-6px,-22px) rotate(-25deg)}}
.gav-riff-bird{transform-origin:25px 32px}
.gav-riff[data-mode=intro] .gav-riff-bird{animation:gav-riff-hop 1.1s .45s ease-in-out both}
.gav-riff[data-mode=idle] .gav-riff-bird{animation:gav-riff-hop-s 3.6s 1.4s ease-in-out infinite}
@keyframes gav-riff-hop{0%,100%{transform:none}10%{transform:scale(1.1,.85)}22%{transform:translate(-2px,-11px) rotate(-12deg)}36%{transform:scale(1.08,.88)}50%{transform:translate(1px,-8px) rotate(10deg)}64%{transform:scale(1.06,.9)}76%{transform:translateY(-3px)}88%{transform:scale(1.03,.96)}}
@keyframes gav-riff-hop-s{0%,20%,100%{transform:none}6%{transform:translateY(-4px) rotate(-6deg)}12%{transform:scale(1.06,.92)}}
.gav-riff-wing{transform-origin:22px 26px}
.gav-riff[data-mode=intro] .gav-riff-wing{animation:gav-riff-flap .14s .55s 6 alternate ease-in-out}
@keyframes gav-riff-flap{to{transform:rotate(-55deg)}}
`

function Bird({ id }: { id: (n: string) => string }) {
  return (
    <g className="gav-riff-bird">
      <Grad id={id("bird")} tone={BIRD} x1={0.3} x2={0.7} />
      <path d="M19 28.5L11.5 30.5L13 26.6Z" fill={BIRD[2]} />
      <ellipse cx={23.5} cy={27.5} rx={6.6} ry={5} fill={url(id("bird"))} />
      <ellipse cx={25.4} cy={29.6} rx={3.6} ry={2.4} fill="#d8ecff" />
      <circle cx={28.4} cy={22.4} r={4.1} fill={url(id("bird"))} />
      <path d="M32 21.4L35.8 22.9L32 24.4Z" fill="#ffad2b" />
      <circle cx={29.7} cy={21.7} r={0.95} fill="#1b1430" />
      <circle cx={30} cy={21.4} r={0.3} fill="#fff" />
      <g className="gav-riff-wing">
        <path
          d="M18.4 26C20.6 22.8 25 23.4 26.4 26.6C24.4 29.4 20.4 29.2 18.4 26Z"
          fill={BIRD[2]}
        />
      </g>
      <Stroke d="M22.6 32V33.4M25.4 32V33.4" color="#ffad2b" w={0.8} />
    </g>
  )
}

function Art({ mode, size }: CharacterArtProps) {
  const id = useIds()
  const cup = (x: number) => (
    <>
      <rect
        x={x}
        y={40}
        width={12.5}
        height={20}
        rx={5.8}
        fill={url(id("phones"))}
      />
      <rect
        x={x + 2.4}
        y={42.6}
        width={3}
        height={8}
        rx={1.5}
        fill="#fff"
        opacity={0.35}
      />
    </>
  )
  return (
    <Portrait
      cid="riff"
      ids={id}
      mode={mode}
      size={size}
      accent={ACCENT}
      css={CSS}
      figureClass="gav-riff-fig"
      back={
        <>
          {[0.35, 0.5, 0.65].map((t) => (
            <circle
              key={t}
              className="gav-folk-fx gav-riff-ring"
              style={vars({ "--t": `${t}s` })}
              cx={50}
              cy={62}
              r={24}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
          <Doodle kind="note" x={84} y={34} s={1.1} r={12} d={0.1} />
          <Doodle kind="hash" x={84} y={64} r={10} d={0.5} />
          <Doodle kind="ticks" x={78} y={78} r={110} s={0.9} d={0.8} />
          <Doodle kind="note" x={14} y={66} s={0.8} r={-14} d={1.1} />
          <g className="gav-folk-fx gav-riff-drift" style={origin(80, 30)}>
            <g transform="translate(80 30)">
              <DoodleShape kind="note" color="#fff59d" />
            </g>
          </g>
        </>
      }
      front={NOTES.map(([x, y, tx, ty, r, c, t]) => (
        <g
          key={`${x}-${y}`}
          className="gav-folk-fx gav-riff-note"
          style={{
            ...origin(x, y),
            ...vars({ "--tx": tx, "--ty": ty, "--r": r, "--t": `${t}s` }),
          }}
        >
          <g transform={`translate(${x} ${y}) scale(1.3)`}>
            <DoodleShape kind="note" color={c} />
          </g>
        </g>
      ))}
    >
      <Grad id={id("hair")} tone={HAIR} x1={0.5} x2={0.5} />
      <Grad id={id("phones")} tone={PHONES} x1={0.2} x2={0.8} />
      <Grad id={id("tee")} tone={TEE} />

      <path d={SHOULDERS} fill={url(id("tee"))} />
      <Neck ids={id} skin={skin} d="M41 60L41 79L50 87L59 79L59 60Z" />
      <Stroke d="M39.5 79L50 88.5L60.5 79" color={TEE[2]} w={2.2} />

      <g className="gav-riff-head">
        <Ear x={28} y={51} skin={skin} />
        <Ear x={72} y={51} skin={skin} flip />
        <Head ids={id} skin={skin}>
          <ellipse
            cx={50}
            cy={37}
            rx={26}
            ry={6}
            fill={skin[2]}
            opacity={0.45}
          />
        </Head>

        {/* Spiky hair */}
        <path
          d="M27 47C24 37 25 27 30 21C28 16 26 12.4 21.6 9.4C29.6 8 35 10.6 38 13.6C38 8 41 3.6 46.4 0.6C46 5.6 48 9.6 51 11.6C53.4 6.6 58.4 3.4 64.4 3.6C62.4 7.6 62.4 10.6 64 13.6C68 11.6 73.4 11.6 78.6 13.6C74.6 16.6 72.4 19.6 72 23C76 28 77 37 73 47C71.5 41 69 37.5 66 35.5L63.5 40.5L59 34.5L54.5 39.5L50 33.5L45.5 38.5L41 33.5L37.5 38.5L34 35.5C31 38.5 29 42 27 47Z"
          fill={url(id("hair"))}
        />
        <Stroke
          d="M40 9.5L43 22M57 7L55 20M33.5 18L38 25"
          color="#fff6b0"
          w={1.2}
          opacity={0.8}
        />
        <Stroke
          d="M62 26C65 28 67 31 68 34"
          color={HAIR[2]}
          w={1}
          opacity={0.6}
        />

        {/* Face: big brows up, shouting */}
        <Stroke
          d="M35 42Q40 38.4 46 40.6M54 40.6Q60 38.4 65 42"
          color="#f2a51d"
          w={3.3}
        />
        <Eyes y={48.5} ry={3.5} />
        <Blush y={56} dx={14} opacity={0.35} />
        <Stroke d="M48.6 53.6Q50 54.8 51.4 53.6" color={skin[2]} w={1.2} />
        <g className="gav-riff-mouth">
          <path
            d="M42.4 57.6C45 56 55 56 57.6 57.6C58.2 64.4 55 69.6 50 69.6C45 69.6 41.8 64.4 42.4 57.6Z"
            fill={MOUTH}
          />
          <path
            d="M44.8 66.6C46.6 64 53.4 64 55.2 66.6C53.6 69 46.4 69 44.8 66.6Z"
            fill={TONGUE}
          />
          <path
            d="M43.2 58.2C47 57.2 53 57.2 56.8 58.2L56.5 60.1C52.6 59.3 47.4 59.3 43.5 60.1Z"
            fill="#fff"
          />
        </g>

        {/* Headphones */}
        <path
          d="M23.5 48C21.5 26 33 15 50 15C67 15 78.5 26 76.5 48"
          fill="none"
          stroke={PHONES[2]}
          strokeWidth={4.6}
          strokeLinecap="round"
        />
        <path
          d="M24 44C23 27 34 17 50 17"
          fill="none"
          stroke={PHONES[0]}
          strokeWidth={1.3}
          strokeLinecap="round"
          opacity={0.8}
        />
        {cup(17.5)}
        {cup(70)}
        <rect x={27.6} y={42.6} width={4} height={15} rx={2} fill={PHONES[2]} />
        <rect x={68.4} y={42.6} width={4} height={15} rx={2} fill={PHONES[2]} />

        <Bird id={id} />
      </g>
    </Portrait>
  )
}

export const RIFF: CharacterDef = {
  id: "riff",
  name: "Riff",
  tagline: "Turns every win up to eleven",
  tier: "legend",
  price: 7500,
  earn: { achievement: "win_streak_3" },
  accent: ACCENT,
  Art,
}
