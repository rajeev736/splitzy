import type * as React from "react"

/**
 * Memory Tiles' pictures (lib/live/memory: MEMORY_PICTURES), drawn in a 64×64
 * box: bold, cartoony, a dark outline and a shine, each its own colour and
 * shape so a pair reads at a glance.
 */

const INK = "#3b2a4a"
const line = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: "round", strokeLinecap: "round" } as const

/** A shine spot. */
const Shine = ({ x, y, rx = 3.2, ry = 2, r = -30 }: { x: number; y: number; rx?: number; ry?: number; r?: number }) => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" opacity={0.75} transform={`rotate(${r} ${x} ${y})`} />
)

/** Points of a star polygon. */
function starPoints(cx: number, cy: number, outer: number, inner: number, n = 5) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = (Math.PI * i) / n - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(" ")
}

/** Bottom half-disc from (32 - r, cy) to (32 + r, cy). */
const halfDisc = (cy: number, r: number) => `M${32 - r} ${cy} A${r} ${r} 0 0 0 ${32 + r} ${cy} Z`

const PICTURES: { name: string; art: React.ReactNode }[] = [
  {
    name: "Cherries",
    art: (
      <>
        <path d="M22 40 C24 28 32 16 42 9" fill="none" {...line} stroke="#3d7a22" strokeWidth={3} />
        <path d="M43 40 C40 28 40 18 42 9" fill="none" {...line} stroke="#3d7a22" strokeWidth={3} />
        <path d="M42 9 C48 5 56 9 57 15 C50 18 44 15 42 9Z" fill="#5cc23a" {...line} />
        <circle cx="21" cy="45" r="11" fill="#e8283c" {...line} />
        <circle cx="43" cy="45" r="11" fill="#e8283c" {...line} />
        <Shine x={17} y={41} />
        <Shine x={39} y={41} />
      </>
    ),
  },
  {
    name: "Watermelon",
    art: (
      <>
        <path d={halfDisc(22, 27)} fill="#2fa84f" {...line} />
        <path d={halfDisc(22, 23)} fill="#d8f5b8" />
        <path d={halfDisc(22, 20)} fill="#ff4d6a" />
        <path d="M5 22 H59" fill="none" {...line} />
        {[
          [22, 28],
          [32, 33],
          [42, 28],
          [27, 37],
          [37, 37],
        ].map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={1.6} ry={2.6} fill={INK} />
        ))}
        <Shine x={16} y={27} rx={2.6} ry={1.6} r={40} />
      </>
    ),
  },
  {
    name: "Flame",
    art: (
      <>
        <path
          d="M32 5 C41 17 51 24 49 40 C48 52 40 59 32 59 C24 59 15 52 15 41 C15 31 22 27 25 17 C29 22 30 26 32 29 C35 21 35 13 32 5Z"
          fill="#ff6a1f"
          {...line}
        />
        <path d="M32 31 C38 39 43 43 41 50 C40 55 36 57 32 57 C28 57 23 54 23 49 C23 43 30 40 32 31Z" fill="#ffd23f" />
        <path d="M32 44 C35 48 36 50 35 53 C34 55 30 55 29 53 C28 50 31 48 32 44Z" fill="#fff4c2" />
      </>
    ),
  },
  {
    name: "Star",
    art: (
      <>
        <polygon points={starPoints(32, 34, 27, 12)} fill="#ffc62b" {...line} />
        <polygon points={starPoints(32, 34, 17, 7.5)} fill="#ffe27a" />
        <circle cx="27" cy="34" r="2.2" fill={INK} />
        <circle cx="37" cy="34" r="2.2" fill={INK} />
        <path d="M29 39 Q32 42 35 39" fill="none" {...line} strokeWidth={2} />
      </>
    ),
  },
  {
    name: "Heart",
    art: (
      <>
        <path
          d="M32 56 C13 43 5 33 7 22 C9 12 23 8 32 20 C41 8 55 12 57 22 C59 33 51 43 32 56Z"
          fill="#ff4f8b"
          {...line}
        />
        <Shine x={18} y={21} rx={4.5} ry={2.6} r={-40} />
        <circle cx="22" cy="29" r="1.6" fill="#fff" opacity={0.7} />
      </>
    ),
  },
  {
    name: "Diamond",
    art: (
      <>
        <path d="M17 13 H47 L58 26 L32 57 L6 26Z" fill="#3cc8f6" {...line} />
        <path d="M6 26 H58 M17 13 L24 26 L32 57 L40 26 L47 13 M32 13 L24 26 M32 13 L40 26" fill="none" stroke="#c9f3ff" strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M17 13 L24 26 L6 26Z" fill="#8fe2ff" />
        <path d="M17 13 H47 L58 26 L32 57 L6 26Z" fill="none" {...line} />
      </>
    ),
  },
  {
    name: "Leaf",
    art: (
      <>
        <path d="M9 55 C9 28 26 9 55 9 C55 37 37 55 9 55Z" fill="#3cc35b" {...line} />
        <path d="M13 51 L45 19" fill="none" stroke="#1f8a3c" strokeWidth={2.6} strokeLinecap="round" />
        <path d="M23 41 L23 30 M31 33 L31 22 M23 41 L34 41 M31 33 L42 33" fill="none" stroke="#1f8a3c" strokeWidth={2} strokeLinecap="round" />
        <Shine x={44} y={15} rx={3} ry={1.6} r={-45} />
      </>
    ),
  },
  {
    name: "Sun",
    art: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <polygon key={i} points="32,2 37,13 27,13" fill="#ff9a1f" {...line} strokeWidth={2} transform={`rotate(${i * 45} 32 32)`} />
        ))}
        <circle cx="32" cy="32" r="16" fill="#ffc21f" {...line} />
        <circle cx="26.5" cy="30" r="2" fill={INK} />
        <circle cx="37.5" cy="30" r="2" fill={INK} />
        <path d="M27 36 Q32 41 37 36" fill="none" {...line} strokeWidth={2.2} />
        <circle cx="23" cy="36" r="2.4" fill="#ff7a59" opacity={0.6} />
        <circle cx="41" cy="36" r="2.4" fill="#ff7a59" opacity={0.6} />
      </>
    ),
  },
  {
    name: "Moon",
    art: (
      <>
        <path d="M38 6 A27 27 0 1 0 58 44 A21 21 0 1 1 38 6Z" fill="#5b6cff" {...line} />
        <circle cx="22" cy="24" r="3" fill="#4655d9" />
        <circle cx="18" cy="40" r="4" fill="#4655d9" />
        <circle cx="30" cy="50" r="2.4" fill="#4655d9" />
        <polygon points={starPoints(50, 17, 6, 2.6)} fill="#ffe066" {...line} strokeWidth={1.6} />
        <Shine x={16} y={22} rx={2.4} ry={4} r={20} />
      </>
    ),
  },
  {
    name: "Apple",
    art: (
      <>
        <path d="M32 18 C33 13 35 9 38 6" fill="none" {...line} stroke="#7a4a1f" strokeWidth={3.2} />
        <path d="M34 14 C38 7 47 7 50 10 C46 16 39 17 34 14Z" fill="#3cc35b" {...line} strokeWidth={2} />
        <path
          d="M32 19 C22 12 9 17 9 32 C9 46 19 58 27 58 C29 58 30 57 32 56 C34 57 35 58 37 58 C45 58 55 46 55 32 C55 17 42 12 32 19Z"
          fill="#8bd33a"
          {...line}
        />
        <Shine x={18} y={30} rx={3} ry={5} r={15} />
      </>
    ),
  },
  {
    name: "Grapes",
    art: (
      <>
        <path d="M32 14 C32 10 34 7 37 5" fill="none" {...line} stroke="#5b3a1a" strokeWidth={3} />
        <path d="M33 12 C37 6 46 6 49 9 C45 15 38 16 33 12Z" fill="#5cc23a" {...line} strokeWidth={2} />
        {[
          [21, 20],
          [32, 20],
          [43, 20],
          [21, 31],
          [32, 31],
          [43, 31],
          [26.5, 42],
          [37.5, 42],
          [32, 52],
        ]
          .map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="6.6" fill="#9b4ddb" {...line} strokeWidth={2.2} />
              <circle cx={x - 2.2} cy={y - 2.2} r="1.6" fill="#fff" opacity={0.65} />
            </g>
          ))}
      </>
    ),
  },
  {
    name: "Mushroom",
    art: (
      <>
        <path d="M23 34 H41 L43 52 C43 56 39 58 32 58 C25 58 21 56 21 52Z" fill="#fff1d6" {...line} />
        <path d="M6 34 C6 18 18 7 32 7 C46 7 58 18 58 34 C58 37 55 38 52 38 H12 C9 38 6 37 6 34Z" fill="#ff4a3d" {...line} />
        <circle cx="32" cy="17" r="5" fill="#fff" />
        <circle cx="17" cy="26" r="4" fill="#fff" />
        <circle cx="47" cy="26" r="4" fill="#fff" />
        <circle cx="32" cy="31" r="2.6" fill="#fff" />
        <circle cx="28" cy="45" r="1.8" fill={INK} />
        <circle cx="36" cy="45" r="1.8" fill={INK} />
      </>
    ),
  },
  {
    name: "Crown",
    art: (
      <>
        <path d="M8 20 L20 34 L32 12 L44 34 L56 20 L52 50 H12Z" fill="#ffcf33" {...line} />
        <rect x="11" y="46" width="42" height="9" rx="3" fill="#f2a900" {...line} />
        <circle cx="8" cy="19" r="3.4" fill="#ffcf33" {...line} strokeWidth={2} />
        <circle cx="32" cy="11" r="3.6" fill="#ffcf33" {...line} strokeWidth={2} />
        <circle cx="56" cy="19" r="3.4" fill="#ffcf33" {...line} strokeWidth={2} />
        <circle cx="32" cy="36" r="4.4" fill="#ff3d6e" {...line} strokeWidth={2} />
        <circle cx="20" cy="40" r="3" fill="#3cc8f6" {...line} strokeWidth={1.8} />
        <circle cx="44" cy="40" r="3" fill="#3cc35b" {...line} strokeWidth={1.8} />
      </>
    ),
  },
  {
    name: "Gift",
    art: (
      <>
        <path d="M32 18 C26 8 15 8 16 15 C17 20 26 19 32 18 C38 19 47 20 48 15 C49 8 38 8 32 18Z" fill="#ff5fa2" {...line} strokeWidth={2.2} />
        <rect x="10" y="26" width="44" height="31" rx="4" fill="#17c0a0" {...line} />
        <rect x="7" y="18" width="50" height="11" rx="3.5" fill="#22d6b3" {...line} />
        <rect x="28" y="18" width="8" height="39" fill="#ff5fa2" />
        <path d="M28 18 V57 M36 18 V57" fill="none" {...line} strokeWidth={2} />
        <rect x="7" y="18" width="50" height="11" rx="3.5" fill="none" {...line} />
        <rect x="10" y="26" width="44" height="31" rx="4" fill="none" {...line} />
      </>
    ),
  },
  {
    name: "Balloon",
    art: (
      <>
        <path d="M32 47 C29 52 36 54 32 60" fill="none" {...line} strokeWidth={2} />
        <path d="M32 4 C45 4 53 14 53 25 C53 37 42 46 32 46 C22 46 11 37 11 25 C11 14 19 4 32 4Z" fill="#4aa3ff" {...line} />
        <path d="M28 46 H36 L34 50 H30Z" fill="#2f7fe0" {...line} strokeWidth={2} />
        <Shine x={22} y={16} rx={3.4} ry={6} r={25} />
      </>
    ),
  },
  {
    name: "Cupcake",
    art: (
      <>
        <path d="M14 34 H50 L45 58 H19Z" fill="#c9773a" {...line} />
        <path d="M22 34 L24 58 M32 34 V58 M42 34 L40 58" fill="none" stroke="#9c5424" strokeWidth={2} />
        <path d="M11 35 C8 27 15 20 22 22 C23 14 41 14 42 22 C49 20 56 27 53 35Z" fill="#ff8cc6" {...line} />
        <circle cx="32" cy="12" r="5" fill="#e8283c" {...line} strokeWidth={2} />
        <path d="M32 7 C33 4 35 3 37 3" fill="none" {...line} strokeWidth={1.8} />
        <rect x="20" y="26" width="4" height="2" rx="1" fill="#ffe066" transform="rotate(-25 22 27)" />
        <rect x="38" y="25" width="4" height="2" rx="1" fill="#5be0ff" transform="rotate(30 40 26)" />
        <rect x="29" y="28" width="4" height="2" rx="1" fill="#7dff8a" />
      </>
    ),
  },
  {
    name: "Lemon",
    art: (
      <>
        <path
          d="M8 32 C8 31 9 29 11 28 C14 17 23 11 33 11 C45 11 53 20 54 28 C56 29 57 31 57 33 C57 35 56 36 54 37 C52 46 44 53 33 53 C22 53 13 46 11 37 C9 36 8 34 8 32Z"
          fill="#ffe84a"
          {...line}
        />
        <path d="M40 12 C44 4 53 4 56 7 C52 13 45 14 40 12Z" fill="#5cc23a" {...line} strokeWidth={2} />
        <Shine x={22} y={22} rx={5} ry={2.4} r={-30} />
      </>
    ),
  },
  {
    name: "Flower",
    art: (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} cx="32" cy="16" rx="8" ry="11" fill="#b57cff" {...line} strokeWidth={2.2} transform={`rotate(${i * 60} 32 32)`} />
        ))}
        <circle cx="32" cy="32" r="9.5" fill="#ffd23f" {...line} />
        <circle cx="29" cy="29" r="2.4" fill="#fff" opacity={0.7} />
      </>
    ),
  },
]

export const PICTURE_NAMES = PICTURES.map((p) => p.name)

/** One picture (0–17), filling its box. */
export function MemoryPicture({ pic, className }: { pic: number; className?: string }) {
  const p = PICTURES[pic]
  if (!p) return null
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={p.name}>
      {p.art}
    </svg>
  )
}
