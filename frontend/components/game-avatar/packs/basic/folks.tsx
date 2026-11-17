import type { CharacterArtProps } from "../../types"
import { Blink, Cheeks, Eye, INK, Pair, Soft, Stage, shoulders, twinkle, url, useIds } from "./kit"

/* Friendly people (and a couple of space folk) for the free set. 100×100 box, see kit.tsx. */

const HAIR = "#1d1418"
const SAFFRON = "#ff9933"
const INDIA_GREEN = "#138808"
const GOLD = "#ffc94a"

export function Robot({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "bolt"
  const GLOW = "#5cf2ff"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={4.5}
      defs={
        <>
          <Soft id={u("steel")} tones={["#ffffff", "#dfe6f0", "#97a5bb"]} />
          <Soft id={u("bulb")} tones={["#fff6b8", "#ffd43b", "#e0a800"]} />
        </>
      }
    >
      <rect x={42} y={68} width={16} height={12} fill="#8d9bb1" />
      <path d={shoulders(80, 36)} fill={url(u("steel"))} />
      <rect x={37} y={86} width={26} height={14} rx={3.5} fill="#1d2638" />
      <circle cx={43.5} cy={93} r={2.2} fill="#ffd43b" />
      <circle cx={50} cy={93} r={2.2} fill={GLOW} />
      <circle cx={56.5} cy={93} r={2.2} fill="#7cf29a" />
      <path d="M50 21V10" stroke="#8d9bb1" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={50} cy={8.5} r={4.4} fill={url(u("bulb"))} />
      <Pair>
        <rect x={11.5} y={35} width={9} height={20} rx={3.5} fill="#a9b5c8" />
      </Pair>
      <rect x={17} y={19} width={66} height={52} rx={15} fill={url(u("steel"))} />
      <g fill="#a9b5c8">
        <circle cx={23} cy={25} r={1.5} />
        <circle cx={77} cy={25} r={1.5} />
        <circle cx={23} cy={65} r={1.5} />
        <circle cx={77} cy={65} r={1.5} />
      </g>
      <rect x={25} y={28} width={50} height={34} rx={10} fill="#1d2638" />
      <path d="M29.5 35Q31 31 36.5 31" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={0.3} />
      <Blink cid={cid}>
        <circle cx={38} cy={43} r={5.4} fill={GLOW} />
        <circle cx={62} cy={43} r={5.4} fill={GLOW} />
        <circle cx={36.4} cy={41.2} r={1.7} fill="#fff" />
        <circle cx={60.4} cy={41.2} r={1.7} fill="#fff" />
      </Blink>
      <Cheeks x={[31.5, 68.5]} y={52.5} rx={3.4} ry={2} color="#ff7aa2" opacity={0.75} />
      <path d="M42 52Q50 58.5 58 52" fill="none" stroke={GLOW} strokeWidth={2.4} strokeLinecap="round" />
    </Stage>
  )
}

export function Alien({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "blip"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={4.9}
      defs={
        <>
          <Soft id={u("skin")} tones={["#d2ffa6", "#7be05a", "#3a9f37"]} />
          <Soft id={u("suit")} tones={["#ffffff", "#e6ebf4", "#aeb9cc"]} />
          <Soft id={u("bulb")} tones={["#ffd0e6", "#ff7ab6", "#d9488a"]} />
        </>
      }
    >
      <rect x={44} y={70} width={12} height={14} fill="#4fb945" />
      <path d={shoulders(83, 32)} fill={url(u("suit"))} />
      <path d="M33 85Q50 95 67 85" fill="none" stroke="#ffd43b" strokeWidth={4} strokeLinecap="round" />
      <circle cx={62} cy={97} r={4} fill="#ff9f43" />
      <ellipse cx={62} cy={97} rx={7} ry={2} transform="rotate(-18 62 97)" fill="none" stroke="#6c63ff" strokeWidth={1.2} />
      <Pair>
        <path d="M38 21Q32 13 28.5 9" fill="none" stroke="#3a9f37" strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={27.5} cy={8} r={4.2} fill={url(u("bulb"))} />
      </Pair>
      <path d="M50 14C73 14 85 29 85 45C85 63 67 79 50 81C33 79 15 63 15 45C15 29 27 14 50 14Z" fill={url(u("skin"))} />
      <g fill="#b9f78f" opacity={0.85}>
        <circle cx={35} cy={25} r={2.6} />
        <circle cx={61} cy={21} r={1.8} />
        <circle cx={70} cy={30} r={1.3} />
      </g>
      <Blink cid={cid}>
        <ellipse cx={36.5} cy={49} rx={8.6} ry={10.4} transform="rotate(-14 36.5 49)" fill={INK} />
        <ellipse cx={63.5} cy={49} rx={8.6} ry={10.4} transform="rotate(14 63.5 49)" fill={INK} />
        <circle cx={33.6} cy={44.6} r={3.2} fill="#fff" />
        <circle cx={60.6} cy={44.6} r={3.2} fill="#fff" />
        <circle cx={39.6} cy={53.6} r={1.3} fill="#fff" opacity={0.8} />
        <circle cx={66.6} cy={53.6} r={1.3} fill="#fff" opacity={0.8} />
      </Blink>
      <Cheeks x={[27, 73]} y={61} rx={4.4} ry={2.6} />
      <path d="M44.5 66Q50 70.5 55.5 66" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </Stage>
  )
}

export function Astronaut({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "astro"
  const VISOR = "M26 49C26 36 36 28 50 28C64 28 74 36 74 49C74 62 64 71 50 71C36 71 26 62 26 49Z"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={4.7}
      backdrop={
        <g fill="#fff">
          <path d={twinkle(18, 22, 3.4)} />
          <path d={twinkle(85, 30, 2.4)} opacity={0.85} />
          <path d={twinkle(13, 64, 2)} opacity={0.75} />
          <circle cx={80} cy={14} r={1} opacity={0.8} />
          <circle cx={88} cy={56} r={0.9} opacity={0.7} />
        </g>
      }
      defs={
        <>
          <Soft id={u("suit")} tones={["#ffffff", "#eef2f8", "#b8c4d6"]} />
          <Soft id={u("skin")} tones={["#e6a877", "#c68642", "#97602f"]} />
          <radialGradient id={u("glass")} cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#3a5a8c" />
            <stop offset="1" stopColor="#14213d" />
          </radialGradient>
          <clipPath id={u("visor")}>
            <path d={VISOR} />
          </clipPath>
        </>
      }
    >
      <path d={shoulders(80, 40)} fill={url(u("suit"))} />
      <rect x={38} y={86} width={20} height={12} rx={3} fill="#d3dbe8" />
      <circle cx={43} cy={92} r={1.9} fill="#ff6b6b" />
      <circle cx={48} cy={92} r={1.9} fill="#ffd43b" />
      <circle cx={53} cy={92} r={1.9} fill="#3b82f6" />
      <g transform="rotate(-6 70 88)">
        <rect x={64.5} y={84} width={11} height={2.6} fill={SAFFRON} />
        <rect x={64.5} y={86.6} width={11} height={2.6} fill="#fff" />
        <rect x={64.5} y={89.2} width={11} height={2.6} fill={INDIA_GREEN} />
        <circle cx={70} cy={87.9} r={0.9} fill="#1a3a8a" />
        <rect x={64.5} y={84} width={11} height={7.8} fill="none" stroke="#9aa8bd" strokeWidth={0.5} />
      </g>
      <Pair>
        <circle cx={16.5} cy={48} r={4.6} fill="#ff9f43" />
      </Pair>
      <circle cx={50} cy={46} r={33} fill={url(u("suit"))} />
      <path d={VISOR} fill={url(u("glass"))} />
      <g clipPath={url(u("visor"))}>
        <path d="M33 56C33 38 41 32 50 32C59 32 67 38 67 56Z" fill={HAIR} />
        <ellipse cx={50} cy={56} rx={15} ry={16} fill={url(u("skin"))} />
        <path d="M34 51C34 39 42 34 50 34C58 34 66 39 66 51C62 45 58 43 54 44C52 41 48 41 46 44C42 43 37 46 34 51Z" fill={HAIR} />
        <Blink cid={cid}>
          <Eye x={44} y={56} r={2.8} />
          <Eye x={56} y={56} r={2.8} />
        </Blink>
        <Cheeks x={[40, 60]} y={61} rx={3} ry={1.8} opacity={0.4} />
        <path d="M45.5 62.5Q50 67 54.5 62.5" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      </g>
      <path d="M31 43Q35 33 47 30.5" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.55} />
      <path d="M65 33Q69 36 71 41" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={0.35} />
      <path d={VISOR} fill="none" stroke="#9aa8bd" strokeWidth={2.4} />
    </Stage>
  )
}

export function CricketFan({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "sixer"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={4.3}
      defs={
        <>
          <Soft id={u("skin")} tones={["#dca274", "#a86b42", "#7a472a"]} />
          <Soft id={u("blue")} tones={["#6aaeff", "#1e6fe0", "#1246a0"]} />
          <Soft id={u("brim")} tones={["#ffc27a", "#ff9933", "#d9700f"]} />
        </>
      }
    >
      <path d={shoulders(82, 40)} fill={url(u("blue"))} />
      <path d="M40.5 81.5L50 92L59.5 81.5Z" fill={url(u("skin"))} />
      <path d="M40 81L50 92L60 81" fill="none" stroke={SAFFRON} strokeWidth={3} strokeLinejoin="round" />
      <Pair>
        <circle cx={26.5} cy={57} r={5} fill={url(u("skin"))} />
      </Pair>
      <ellipse cx={50} cy={54} rx={24} ry={26} fill={url(u("skin"))} />
      <Pair>
        <path d="M26.2 46C25.4 52 26 56 28 58.5L31 47Z" fill={HAIR} />
      </Pair>
      <path d="M25 46C25 26 36 16 50 16C64 16 75 26 75 46Z" fill={url(u("blue"))} />
      <path d="M50 17V45M37 20Q33 30 33 45M63 20Q67 30 67 45" fill="none" stroke="#1246a0" strokeWidth={0.8} opacity={0.6} />
      <circle cx={50} cy={17} r={2.4} fill="#1246a0" />
      <circle cx={50} cy={33} r={5.6} fill={SAFFRON} />
      <text x={50} y={36.2} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#fff" fontFamily="system-ui, sans-serif">
        6
      </text>
      <path d="M20.5 46Q50 39 79.5 46Q82 51 76 52.6Q50 47 24 52.6Q18 51 20.5 46Z" fill={url(u("brim"))} />
      <g fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round">
        <path d="M36.5 56Q40.5 52.8 45 55.2" />
        <path d="M55 55.2Q59.5 52.8 63.5 56" />
      </g>
      <Blink cid={cid}>
        <Eye x={41} y={60.5} r={3.3} />
        <Eye x={59} y={60.5} r={3.3} />
      </Blink>
      <g transform="rotate(-10 34 67)">
        <rect x={29.5} y={63.4} width={9} height={2.3} rx={0.6} fill={SAFFRON} />
        <rect x={29.5} y={65.7} width={9} height={2.3} rx={0.6} fill="#fff" />
        <rect x={29.5} y={68} width={9} height={2.3} rx={0.6} fill={INDIA_GREEN} />
      </g>
      <ellipse cx={66} cy={67} rx={4} ry={2.4} fill="#ff6b8b" opacity={0.35} />
      <path d="M48.4 64.6Q50 66.4 51.6 64.6" fill="none" stroke="#6b3a20" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M41 69.5Q50 70.5 59 69.5Q57.5 79.5 50 79.5Q42.5 79.5 41 69.5Z" fill="#7a1f2b" />
      <path d="M42.3 70.2Q50 71.2 57.7 70.2L57.2 72.6Q50 73.6 42.8 72.6Z" fill="#fff" />
      <ellipse cx={50} cy={77} rx={4.2} ry={2} fill="#ff7a8a" />
    </Stage>
  )
}

const RANGOLI = ["#ffd43b", "#ff922b", "#ffffff", "#20c997"]

export function RangoliGirl({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "rangoli"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={5.3}
      backdrop={
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx={50} cy={8.5} rx={4.6} ry={7.4} fill={RANGOLI[i % 4]} transform={`rotate(${i * 30} 50 44)`} />
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={50} cy={4} r={1.5} fill="#fff" transform={`rotate(${i * 30 + 15} 50 44)`} />
          ))}
        </g>
      }
      defs={
        <>
          <Soft id={u("skin")} tones={["#e3a97d", "#b5754c", "#87502f"]} />
          <Soft id={u("hair")} tones={["#4c3139", "#24161b", "#110a0c"]} />
          <Soft id={u("kurta")} tones={["#5ee8c2", "#12b886", "#0a845f"]} />
        </>
      }
    >
      <path d="M25 52C23 30 34 19 50 19C66 19 77 30 75 52C76 62 74 70 70 75H30C26 70 24 62 25 52Z" fill={url(u("hair"))} />
      <rect x={44} y={70} width={12} height={12} fill="#9c6340" />
      <path d={shoulders(82, 38)} fill={url(u("kurta"))} />
      <path d="M38.5 82Q50 95 61.5 82Q56 79.5 50 79.5Q44 79.5 38.5 82Z" fill={url(u("skin"))} />
      <path d="M38 82Q50 95.5 62 82" fill="none" stroke={GOLD} strokeWidth={2.6} strokeLinecap="round" />
      <g fill={GOLD}>
        <circle cx={34} cy={88} r={1.1} />
        <circle cx={66} cy={88} r={1.1} />
        <circle cx={50} cy={99} r={1.3} />
      </g>
      <g fill={url(u("hair"))}>
        <ellipse cx={29} cy={70} rx={5} ry={4.6} />
        <ellipse cx={28} cy={78} rx={5} ry={4.6} />
        <ellipse cx={27.5} cy={86} rx={4.8} ry={4.4} />
        <ellipse cx={27.5} cy={93.5} rx={4.4} ry={4} />
      </g>
      <g fill="#fff">
        <circle cx={33.4} cy={67} r={1.5} />
        <circle cx={33} cy={75} r={1.5} />
        <circle cx={32.4} cy={83} r={1.5} />
        <circle cx={32} cy={91} r={1.4} />
      </g>
      <Pair>
        <circle cx={29.5} cy={54} r={3.6} fill={url(u("skin"))} />
        <circle cx={29.5} cy={59.6} r={1.4} fill={GOLD} />
        <path d="M26 65.2Q29.5 59.4 33 65.2Z" fill={GOLD} />
        <circle cx={29.5} cy={66.6} r={0.9} fill={GOLD} />
      </Pair>
      <ellipse cx={50} cy={50} rx={21} ry={24} fill={url(u("skin"))} />
      <path d="M50 25.5C37 25.5 28 34 28.5 50C32 41 40 34 50 32.5C60 34 68 41 71.5 50C72 34 63 25.5 50 25.5Z" fill={url(u("hair"))} />
      <circle cx={70} cy={34.5} r={4.4} fill="#ff922b" />
      <circle cx={70} cy={34.5} r={2} fill="#ffd43b" />
      <circle cx={50} cy={40.5} r={2.2} fill="#e5383b" />
      <circle cx={49.4} cy={39.9} r={0.6} fill="#fff" opacity={0.7} />
      <g fill="none" stroke={HAIR} strokeWidth={1.4} strokeLinecap="round">
        <path d="M38.5 45Q42.5 43 46 44.8" />
        <path d="M54 44.8Q57.5 43 61.5 45" />
      </g>
      <Blink cid={cid}>
        <Eye x={42.5} y={51} r={3} />
        <Eye x={57.5} y={51} r={3} />
        <path d="M39.8 49.8L37.6 48.6M60.2 49.8L62.4 48.6" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
      </Blink>
      <Cheeks x={[38, 62]} y={58} rx={4} ry={2.4} />
      <path d="M48.8 56Q50.4 57.6 51.4 56.4" fill="none" stroke="#87502f" strokeWidth={1.1} strokeLinecap="round" />
      <circle cx={52.4} cy={57} r={0.9} fill={GOLD} />
      <path d="M45 61.5Q50 65.5 55 61.5" fill="none" stroke="#8a2a3a" strokeWidth={1.6} strokeLinecap="round" />
    </Stage>
  )
}

export function ChaiUncle({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "chai-uncle"
  const GREY = "#d6d6de"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={5.8}
      defs={
        <>
          <Soft id={u("skin")} tones={["#d6a072", "#a0663e", "#714223"]} />
          <Soft id={u("vest")} tones={["#bd8a60", "#8c5a3c", "#5c3822"]} />
          <Soft id={u("kurta")} tones={["#ffffff", "#f6eedd", "#d9c9a8"]} />
        </>
      }
    >
      <rect x={43} y={68} width={14} height={14} fill="#83502f" />
      <path d={shoulders(80, 40)} fill={url(u("vest"))} />
      <path d="M39 80.5L50 101L61 80.5Q55.5 79 50 79Q44.5 79 39 80.5Z" fill={url(u("kurta"))} />
      <path d="M43.5 80.5Q50 84.5 56.5 80.5" fill="none" stroke="#d9c9a8" strokeWidth={1.6} />
      <circle cx={50} cy={88} r={0.9} fill="#b49b72" />
      <circle cx={50} cy={93} r={0.9} fill="#b49b72" />
      <Pair>
        <circle cx={27} cy={50} r={5.5} fill={url(u("skin"))} />
      </Pair>
      <ellipse cx={50} cy={47} rx={23} ry={26} fill={url(u("skin"))} />
      <ellipse cx={41} cy={28.5} rx={7.5} ry={3.4} transform="rotate(-18 41 28.5)" fill="#fff" opacity={0.28} />
      <Pair>
        <path d="M24.5 49C21.5 42 23.5 33.5 30.5 29.5C29 36 30 42 32.5 47.5Z" fill={GREY} />
      </Pair>
      <Pair>
        <path d="M34.5 40.5Q40.5 36.8 46 39.8" fill="none" stroke={GREY} strokeWidth={2.8} strokeLinecap="round" />
      </Pair>
      <Blink cid={cid}>
        <Eye x={41} y={48.5} r={2.5} />
        <Eye x={59} y={48.5} r={2.5} />
      </Blink>
      <g fill="#fff" fillOpacity={0.16} stroke="#3a2a20" strokeWidth={1.8}>
        <circle cx={41} cy={48} r={6.8} />
        <circle cx={59} cy={48} r={6.8} />
      </g>
      <path d="M47.8 47.4Q50 45.8 52.2 47.4M34.2 46.8L28 46M65.8 46.8L72 46" fill="none" stroke="#3a2a20" strokeWidth={1.6} strokeLinecap="round" />
      <Cheeks x={[33, 67]} y={58.5} rx={4} ry={2.4} opacity={0.35} />
      <ellipse cx={50} cy={56.5} rx={3.8} ry={3.2} fill="#7b4527" opacity={0.45} />
      <path d="M45.5 68Q50 71.5 54.5 68" fill="none" stroke="#5a2a20" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M34.5 65C37.5 58.5 45 58 50 61C55 58 62.5 58.5 65.5 65C62 63 58 64.5 55 65.6C53 66.2 51 64.6 50 63.6C49 64.6 47 66.2 45 65.6C42 64.5 38 63 34.5 65Z" fill="#2c2523" />
      <path d="M40 61.5Q44 60 47.5 62" fill="none" stroke="#8d8790" strokeWidth={0.9} strokeLinecap="round" />
      <g fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.8}>
        <path d="M68 72Q65.5 68 68 64.5Q70.5 61 68 57.5" />
        <path d="M74 72Q71.8 68.5 74 65.5" />
      </g>
      <path d="M63.5 75H79L77.6 93H64.9Z" fill="#fff" fillOpacity={0.45} stroke="#fff" strokeOpacity={0.9} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M64 80.5H78.5L77.6 93H64.9Z" fill="#b8743f" />
      <path d="M64 80.6H78.5" stroke="#ecc58f" strokeWidth={1.4} />
      <path d="M67.5 82V92M71.2 82V92.4M75 82V92" stroke="#fff" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={71} cy={95} rx={9.5} ry={5.2} fill={url(u("skin"))} />
      <path d="M64.5 93.5Q71 96 77.5 93.5" fill="none" stroke="#714223" strokeWidth={0.8} opacity={0.6} />
    </Stage>
  )
}
