import type { CharacterArtProps } from "../../types"
import { Blink, Cheeks, Eye, INK, Pair, Soft, Stage, shoulders, url, useIds } from "./kit"

/* Fun animal heads for the free set. 100×100 box, see kit.tsx. */

export function Fox({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "foxy"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={4.4}
      defs={
        <>
          <Soft id={u("fur")} tones={["#ffb066", "#f47a24", "#c4501a"]} />
          <Soft id={u("cream")} tones={["#ffffff", "#fff4e8", "#efd6bf"]} cy="20%" />
        </>
      }
    >
      <path d={shoulders(80, 36)} fill={url(u("fur"))} />
      <path d="M36 82Q50 106 64 82Q57 79 50 79Q43 79 36 82Z" fill={url(u("cream"))} />
      <Pair>
        <path d="M21 46C15 32 16 18 22 9C31 13 41 21 47 30Z" fill={url(u("fur"))} />
        <path d="M24.5 37C22 29 22 21 24 15.5C29.5 18.5 35 24 38.5 30Z" fill="#5a2a18" />
        <path d="M26 35C24.5 29 24.5 23 26 19C30 21.5 33.5 25.5 36 30Z" fill="#ffe2c8" />
      </Pair>
      <path d="M50 22C68 22 81 32 82 46C83 58 70 70 50 80C30 70 17 58 18 46C19 32 32 22 50 22Z" fill={url(u("fur"))} />
      <path d="M18.5 47C30 50 42 56 50 66C58 56 70 50 81.5 47C80 60 66 72 50 80C34 72 20 60 18.5 47Z" fill={url(u("cream"))} />
      <path d="M44 23.5Q50 31 56 23.5Q53 22 50 22Q47 22 44 23.5Z" fill="#c4501a" opacity={0.55} />
      <Blink cid={cid}>
        <Eye x={37.5} y={47} r={4.6} />
        <Eye x={62.5} y={47} r={4.6} />
      </Blink>
      <Cheeks x={[29, 71]} y={57} />
      <ellipse cx={50} cy={70.5} rx={4.4} ry={3.1} fill={INK} />
      <ellipse cx={48.6} cy={69.6} rx={1.4} ry={0.8} fill="#fff" opacity={0.7} />
      <path d="M45.5 75Q48 77.6 50 75.2Q52 77.6 54.5 75" fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
    </Stage>
  )
}

export function Panda({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "bao"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={5.1}
      defs={
        <>
          <Soft id={u("white")} tones={["#ffffff", "#f5f6fa", "#cfd5e2"]} />
          <Soft id={u("black")} tones={["#5d5a68", "#2d2a36", "#15131b"]} />
        </>
      }
    >
      <path d={shoulders(80, 36)} fill={url(u("black"))} />
      <ellipse cx={50} cy={101} rx={17} ry={17} fill={url(u("white"))} />
      <Pair>
        <circle cx={27} cy={26} r={10.5} fill={url(u("black"))} />
        <circle cx={27.5} cy={26.5} r={5} fill="#4c4858" />
      </Pair>
      <ellipse cx={50} cy={51} rx={31.5} ry={28} fill={url(u("white"))} />
      <ellipse cx={37} cy={50} rx={7.6} ry={10.5} transform="rotate(34 37 50)" fill={url(u("black"))} />
      <ellipse cx={63} cy={50} rx={7.6} ry={10.5} transform="rotate(-34 63 50)" fill={url(u("black"))} />
      <Blink cid={cid}>
        <circle cx={38.5} cy={49} r={3.8} fill="#fff" />
        <circle cx={61.5} cy={49} r={3.8} fill="#fff" />
        <Eye x={38.8} y={49.4} r={2.5} />
        <Eye x={61.8} y={49.4} r={2.5} />
      </Blink>
      <Cheeks x={[29, 71]} y={62} />
      <path d="M45 58.5Q50 56.5 55 58.5Q53.5 63 50 63.5Q46.5 63 45 58.5Z" fill={INK} />
      <path d="M50 63.5V65.5M46 66.2Q48.2 68.6 50 65.5Q51.8 68.6 54 66.2" fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
    </Stage>
  )
}

export function Frog({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "hoppy"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={3.9}
      defs={
        <>
          <Soft id={u("skin")} tones={["#c4f78a", "#5cc93a", "#2f8f2a"]} />
          <Soft id={u("belly")} tones={["#fbffe9", "#e1f7b5", "#b6de7e"]} cy="20%" />
          <Soft id={u("gold")} tones={["#fff3a8", "#ffcc33", "#d99a0b"]} />
        </>
      }
    >
      <path d={shoulders(78, 38)} fill={url(u("skin"))} />
      <ellipse cx={50} cy={102} rx={22} ry={19} fill={url(u("belly"))} />
      <circle cx={31} cy={37} r={14} fill={url(u("skin"))} />
      <circle cx={69} cy={37} r={14} fill={url(u("skin"))} />
      <path d="M13 59C13 44 28 40 50 40C72 40 87 44 87 59C87 74 71 83 50 83C29 83 13 74 13 59Z" fill={url(u("skin"))} />
      <path d="M42 33L40.5 22.5L45.8 26.5L50 19L54.2 26.5L59.5 22.5L58 33Z" fill={url(u("gold"))} stroke="#c98a08" strokeWidth={0.8} strokeLinejoin="round" />
      <circle cx={50} cy={27.5} r={1.6} fill="#ff4d6d" />
      <Blink cid={cid}>
        <circle cx={31} cy={36} r={9.5} fill="#fff" />
        <circle cx={69} cy={36} r={9.5} fill="#fff" />
        <Eye x={32.5} y={37} r={5.6} />
        <Eye x={67.5} y={37} r={5.6} />
      </Blink>
      <g fill="#3a9b30" opacity={0.55}>
        <circle cx={21} cy={56} r={2.6} />
        <circle cx={25} cy={63} r={1.6} />
        <circle cx={79} cy={55} r={2.2} />
        <circle cx={70} cy={73} r={2} />
      </g>
      <circle cx={46} cy={54} r={1.1} fill="#1f5a1c" />
      <circle cx={54} cy={54} r={1.1} fill="#1f5a1c" />
      <Cheeks x={[24, 76]} y={64} rx={5.5} ry={3.4} color="#ff7aa2" opacity={0.6} />
      <path d="M30 61Q50 78 70 61" fill="none" stroke="#1f5a1c" strokeWidth={2.8} strokeLinecap="round" />
    </Stage>
  )
}

export function Penguin({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "waddles"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={4.8}
      defs={
        <>
          <Soft id={u("navy")} tones={["#62739f", "#2e3a5f", "#151c33"]} />
          <Soft id={u("white")} tones={["#ffffff", "#f3f6fb", "#d0d9e8"]} cy="25%" />
          <Soft id={u("beak")} tones={["#ffd98a", "#ffa630", "#e07b12"]} />
          <Soft id={u("scarf")} tones={["#7ee8f2", "#18b3c4", "#0e7f8c"]} />
        </>
      }
    >
      <path d="M50 16C72 16 84 32 84 54C84 72 80 88 88 104H12C20 88 16 72 16 54C16 32 28 16 50 16Z" fill={url(u("navy"))} />
      <ellipse cx={50} cy={104} rx={21} ry={15} fill={url(u("white"))} />
      <ellipse cx={38} cy={25} rx={8} ry={3.5} transform="rotate(-22 38 25)" fill="#fff" opacity={0.18} />
      <path d="M50 37.5C45 28.5 26 29.5 26 48C26 64 38 75.5 50 75.5C62 75.5 74 64 74 48C74 29.5 55 28.5 50 37.5Z" fill={url(u("white"))} />
      <Blink cid={cid}>
        <Eye x={40.5} y={49} r={4} />
        <Eye x={59.5} y={49} r={4} />
      </Blink>
      <Cheeks x={[34, 66]} y={58.5} rx={4.4} ry={2.6} />
      <path d="M44 56Q50 52.6 56 56Q52.4 63.4 50 63.8Q47.6 63.4 44 56Z" fill={url(u("beak"))} />
      <path d="M19 76Q50 89 81 76L82.5 84.5Q50 98 17.5 84.5Z" fill={url(u("scarf"))} />
      <path d="M62 85.5L67 103L78 100.5L73 83Z" fill={url(u("scarf"))} />
      <g stroke="#fff" strokeWidth={2} opacity={0.8}>
        <path d="M64.4 91.5L74.8 89.2" />
        <path d="M65.8 96.6L76.2 94.2" />
      </g>
    </Stage>
  )
}

export function Tiger({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "sheru"
  const STRIPE = "#3a2216"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={4.2}
      defs={
        <>
          <Soft id={u("fur")} tones={["#ffc574", "#ff8a1f", "#cf570b"]} />
          <Soft id={u("cream")} tones={["#ffffff", "#fff6e9", "#f1d9bd"]} cy="20%" />
        </>
      }
    >
      <path d={shoulders(80, 38)} fill={url(u("fur"))} />
      <path d="M37 82Q50 104 63 82Q57 79.5 50 79.5Q43 79.5 37 82Z" fill={url(u("cream"))} />
      <Pair>
        <circle cx={26} cy={27} r={10.5} fill={url(u("fur"))} />
        <circle cx={26.5} cy={27.5} r={5.6} fill="#fff1de" />
      </Pair>
      <path d="M50 20C70 20 83 32 83 50C83 66 70 78 50 78C30 78 17 66 17 50C17 32 30 20 50 20Z" fill={url(u("fur"))} />
      <g fill={STRIPE}>
        <path d="M46 20.6L50 33L54 20.6Q50 20 46 20.6Z" />
        <path d="M37.5 23Q38.5 29 43 31.5Q40.5 26.5 41.5 21.8Z" />
        <path d="M62.5 23Q61.5 29 57 31.5Q59.5 26.5 58.5 21.8Z" />
        <Pair>
          <path d="M17.6 43.5L29 47L17.2 50.5Z" />
          <path d="M18.6 56L28 58L20.4 61.6Z" />
        </Pair>
      </g>
      <path d="M50 53C43.5 53 35 56.5 35 64C35 71.5 43 75 50 72.5C57 75 65 71.5 65 64C65 56.5 56.5 53 50 53Z" fill={url(u("cream"))} />
      <Blink cid={cid}>
        <circle cx={37.5} cy={45.5} r={5.4} fill="#ffd34d" />
        <circle cx={62.5} cy={45.5} r={5.4} fill="#ffd34d" />
        <Eye x={37.8} y={45.8} r={3.6} />
        <Eye x={62.2} y={45.8} r={3.6} />
      </Blink>
      <path d="M45.5 57Q50 55 54.5 57Q52.5 61 50 61.5Q47.5 61 45.5 57Z" fill="#e5577a" />
      <path d="M50 61.5V64M45.5 65Q48 67.6 50 64Q52 67.6 54.5 65" fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
      <g fill={STRIPE} opacity={0.7}>
        <circle cx={41.5} cy={63} r={0.8} />
        <circle cx={43} cy={66.4} r={0.8} />
        <circle cx={58.5} cy={63} r={0.8} />
        <circle cx={57} cy={66.4} r={0.8} />
      </g>
    </Stage>
  )
}

export function Owl({ mode, size }: CharacterArtProps) {
  const u = useIds()
  const cid = "hootie"
  return (
    <Stage
      cid={cid}
      mode={mode}
      size={size}
      blink={5.6}
      defs={
        <>
          <Soft id={u("feather")} tones={["#c0926b", "#8a5a3b", "#5a3822"]} />
          <Soft id={u("disc")} tones={["#fffaf0", "#f6e3c5", "#e3c79d"]} cy="25%" />
          <Soft id={u("belly")} tones={["#f8e4c6", "#e8c79c", "#cfa676"]} cy="20%" />
        </>
      }
    >
      <Pair>
        <path d="M23 36L16 10L39 24Z" fill={url(u("feather"))} />
      </Pair>
      <path d="M50 18C73 18 85 34 85 56C85 80 72 104 50 104C28 104 15 80 15 56C15 34 27 18 50 18Z" fill={url(u("feather"))} />
      <ellipse cx={50} cy={90} rx={21} ry={20} fill={url(u("belly"))} />
      <g fill="none" stroke="#9a6a45" strokeWidth={1.2} strokeLinecap="round" opacity={0.75}>
        <path d="M40 80Q43 83 46 80M54 80Q57 83 60 80M47 87Q50 90 53 87M37 89Q40 92 43 89M57 89Q60 92 63 89" />
      </g>
      <Pair>
        <path d="M16 60C10 74 14 92 26 100C25 86 23 72 16 60Z" fill="#5a3822" opacity={0.75} />
      </Pair>
      <circle cx={35.5} cy={46} r={15.5} fill={url(u("disc"))} />
      <circle cx={64.5} cy={46} r={15.5} fill={url(u("disc"))} />
      <Pair>
        <path d="M23 32Q36 27 47 37" fill="none" stroke="#5a3822" strokeWidth={3} strokeLinecap="round" />
      </Pair>
      <Blink cid={cid}>
        <circle cx={35.5} cy={46.5} r={10} fill="#fff" />
        <circle cx={64.5} cy={46.5} r={10} fill="#fff" />
        <circle cx={36} cy={47} r={7.6} fill="#ffb703" />
        <circle cx={64} cy={47} r={7.6} fill="#ffb703" />
        <Eye x={36} y={47} r={4.6} />
        <Eye x={64} y={47} r={4.6} />
      </Blink>
      <path d="M45.5 55Q50 52.6 54.5 55L50.8 63.2Q50 64 49.2 63.2Z" fill="#ff9a1f" />
    </Stage>
  )
}
