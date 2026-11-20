import type * as React from "react"

import type { LiveGameId } from "@/lib/live/types"

/**
 * Themed lobby scenes for the multi-player games, drawn as a handful of flat
 * vector layers so they paint fast on any phone: a wall (CSS gradient), a
 * strip of decorations along the top, props standing at the left and right
 * edges, and a floor. Layers are anchored to the edges, so the same scene
 * works on a tall phone and a wide desktop. Purely decorative, and static:
 * no animation, no filters, so the lobby stays smooth on mid-range phones.
 *
 * - Ludo: a festive games room — bunting, fairy lights, a board rug, dice
 * - Snakes & Ladders: a jungle clearing — vines, leaves, a ladder, a snake
 *   (Snakes 3D adds the stone temple tower from its board in the distance)
 * - Sudoku Race: a puzzle study — lamp, bookshelf, a grid on the wall
 * - Scribble: an art studio — drawings on a line, easel, paint pots
 */
export function LobbyBackdrop({ game }: { game: LiveGameId }) {
  switch (game) {
    case "ludo":
      return <LudoRoom />
    case "snakes":
      return <Jungle />
    case "snakes3d":
      return <Jungle temple />
    case "sudoku":
      return <Study />
    case "scribble":
      return <Studio />
    default:
      return <LudoRoom />
  }
}

/** Layer helpers: every scene is the same four layers. */
function Scene({
  wall,
  top,
  left,
  right,
  floor,
  extra,
}: {
  wall: string
  /** The top strip; tiled side by side on wide screens — one-off pieces only in the `main` (middle) tile. */
  top: (main: boolean) => React.ReactNode
  left: React.ReactNode
  right: React.ReactNode
  floor: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: wall }}
    >
      {extra}
      {/* Floor: the lower third, stretched to the width */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[34%] w-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
      >
        {floor}
      </svg>
      {/* Top strip: a fixed-shape tile, repeated either side on wide screens */}
      <div className="absolute inset-x-0 top-0 flex h-[clamp(120px,24%,200px)] justify-center overflow-hidden">
        {[false, true, false].map((main, i) => (
          <svg
            key={i}
            className="aspect-[5/2] h-full shrink-0"
            viewBox="0 0 400 160"
          >
            {top(main)}
          </svg>
        ))}
      </div>
      {/* Props at the edges, standing on the floor */}
      <svg
        className="absolute bottom-[8%] left-0 h-[46%] max-w-[34%]"
        viewBox="0 0 140 300"
        preserveAspectRatio="xMinYMax meet"
      >
        {left}
      </svg>
      <svg
        className="absolute right-0 bottom-[8%] h-[46%] max-w-[34%]"
        viewBox="0 0 140 300"
        preserveAspectRatio="xMaxYMax meet"
      >
        {right}
      </svg>
      {/* A soft dark middle, so the seats read well over any of it */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 48% at 50% 52%, rgba(10,4,24,.32), transparent 75%)",
        }}
      />
    </div>
  )
}

/* ── Ludo: a festive games room ──────────────────────────────────────── */

const LUDO_FLAGS = ["#e8473b", "#2fa84f", "#f5c518", "#2f7cf6"]

function LudoRoom() {
  return (
    <Scene
      wall="radial-gradient(ellipse 70% 45% at 50% 38%, #b2367e 0%, transparent 70%), linear-gradient(180deg, #4a1466 0%, #6b1d6e 45%, #3a0f45 100%)"
      top={(main) => (
        <>
          {/* Two strings of bunting */}
          {[0, 1].map((row) => {
            const y = row ? 54 : 20
            const sag = row ? 22 : 18
            return (
              <g key={row}>
                <path
                  d={`M-10 ${y} Q200 ${y + sag * 2} 410 ${y}`}
                  stroke="#f3d9a4"
                  strokeWidth="1.4"
                  fill="none"
                  opacity=".8"
                />
                {Array.from({ length: 13 }, (_, i) => {
                  const x = -4 + i * 33 + (row ? 16 : 0)
                  const t = (x + 10) / 420
                  const yy =
                    (1 - t) * (1 - t) * y +
                    2 * (1 - t) * t * (y + sag * 2) +
                    t * t * y
                  return (
                    <path
                      key={i}
                      d={`M${x - 10} ${yy} L${x + 10} ${yy} L${x} ${yy + 20} Z`}
                      fill={LUDO_FLAGS[(i + row) % 4]}
                      opacity={row ? 0.8 : 0.95}
                    />
                  )
                })}
              </g>
            )
          })}
          {/* Paper lanterns at the corners */}
          {main &&
            [22, 378].map((x, i) => (
              <g key={x}>
                <line
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="112"
                  stroke="#f3d9a4"
                  strokeWidth="1.2"
                />
                <circle cx={x} cy="132" r="26" fill="#ffb347" opacity=".2" />
                <rect
                  x={x - 11}
                  y="112"
                  width="22"
                  height="5"
                  rx="2"
                  fill="#c98a2b"
                />
                <path
                  d={`M${x - 10} 117 Q${x - 17} 132 ${x - 10} 147 L${x + 10} 147 Q${x + 17} 132 ${x + 10} 117 Z`}
                  fill={i ? "#ff8c3a" : "#e8473b"}
                />
                <path
                  d={`M${x - 4} 117 Q${x - 7} 132 ${x - 4} 147 M${x + 4} 117 Q${x + 7} 132 ${x + 4} 147`}
                  stroke="#ffd07a"
                  strokeWidth="1.2"
                  fill="none"
                />
                <rect
                  x={x - 10}
                  y="147"
                  width="20"
                  height="4"
                  rx="2"
                  fill="#c98a2b"
                />
              </g>
            ))}
          {/* Fairy lights */}
          {Array.from({ length: 14 }, (_, i) => (
            <circle
              key={i}
              opacity={[1, 0.45, 0.8, 0.3, 0.65][i % 5]}
              cx={14 + i * 28}
              cy={96 + Math.sin(i * 0.9) * 6}
              r="2.6"
              fill="#ffe7a3"
            />
          ))}
        </>
      )}
      left={
        <>
          {/* Board-game boxes, a big dice and a token */}
          <rect x="6" y="196" width="110" height="34" rx="4" fill="#2f7cf6" />
          <rect x="6" y="196" width="110" height="8" rx="3" fill="#5c9cff" />
          <rect x="14" y="166" width="96" height="30" rx="4" fill="#e8473b" />
          <rect x="14" y="166" width="96" height="7" rx="3" fill="#ff7a6e" />
          <rect x="22" y="140" width="80" height="26" rx="4" fill="#f5c518" />
          <rect x="22" y="140" width="80" height="6" rx="3" fill="#ffe27a" />
          <g transform="translate(18 236)">
            <rect width="58" height="58" rx="12" fill="#fff8ee" />
            <rect
              width="58"
              height="58"
              rx="12"
              fill="none"
              stroke="#e8d6c0"
              strokeWidth="3"
            />
            {[
              [16, 16],
              [42, 16],
              [29, 29],
              [16, 42],
              [42, 42],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="5.4" fill="#d6283a" />
            ))}
          </g>
          <g transform="translate(96 244)">
            <ellipse cx="16" cy="50" rx="18" ry="5" fill="#000" opacity=".25" />
            <path d="M4 48 Q16 20 28 48 Z" fill="#2fa84f" />
            <circle cx="16" cy="18" r="11" fill="#2fa84f" />
            <circle cx="12" cy="14" r="3.5" fill="#fff" opacity=".5" />
          </g>
        </>
      }
      right={
        <>
          {/* A stack of tokens with a dice */}
          <g transform="translate(40 230)">
            <rect
              width="48"
              height="48"
              rx="10"
              fill="#fff8ee"
              transform="rotate(-12 24 24)"
            />
            {[
              [14, 14],
              [34, 34],
              [24, 24],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="4.6"
                fill="#1d2a52"
                transform="rotate(-12 24 24)"
              />
            ))}
          </g>
          {["#e8473b", "#f5c518", "#2f7cf6"].map((c, i) => (
            <g
              key={c}
              transform={`translate(${92 + i * 14} ${250 + (i % 2) * 8})`}
            >
              <path d="M2 40 Q12 16 22 40 Z" fill={c} />
              <circle cx="12" cy="14" r="9" fill={c} />
              <circle cx="9" cy="11" r="3" fill="#fff" opacity=".45" />
            </g>
          ))}
        </>
      }
      floor={
        <>
          <rect width="400" height="200" fill="#2a0c33" />
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={i}
              x1={i * 50}
              y1="0"
              x2={i * 50 - 60 + i * 15}
              y2="200"
              stroke="#3b1446"
              strokeWidth="2"
            />
          ))}
          {/* The board rug, in perspective */}
          <g opacity=".9">
            <path d="M200 30 L330 110 L200 190 L70 110 Z" fill="#fdf3e1" />
            <path d="M200 30 L265 70 L200 110 L135 70 Z" fill="#2fa84f" />
            <path d="M265 70 L330 110 L265 150 L200 110 Z" fill="#f5c518" />
            <path d="M200 110 L265 150 L200 190 L135 150 Z" fill="#2f7cf6" />
            <path d="M135 70 L200 110 L135 150 L70 110 Z" fill="#e8473b" />
            <path d="M200 92 L230 110 L200 128 L170 110 Z" fill="#fff" />
          </g>
        </>
      }
    />
  )
}

/* ── Snakes & Ladders: a jungle clearing ─────────────────────────────── */

const LEAF = "M0 0 C14 -10 34 -8 46 0 C34 8 14 10 0 0 Z"

function Jungle({ temple = false }: { temple?: boolean }) {
  return (
    <Scene
      wall="radial-gradient(ellipse 55% 40% at 50% 30%, rgba(190,255,170,.28), transparent 70%), linear-gradient(180deg, #0f5a45 0%, #0b4637 50%, #062a21 100%)"
      extra={
        <>
          {/* Light rays through the canopy */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(220,255,200,.18) 34%, transparent 40%, transparent 52%, rgba(220,255,200,.14) 56%, transparent 62%)",
            }}
          />
          {temple && (
            <svg
              className="absolute bottom-[30%] left-1/2 h-[34%] -translate-x-1/2 opacity-45"
              viewBox="0 0 200 220"
              aria-hidden
            >
              {/* The stone tower of the 3D board, far away in the mist */}
              {[0, 1, 2, 3, 4].map((i) => (
                <rect
                  key={i}
                  x={30 + i * 14}
                  y={180 - i * 40}
                  width={140 - i * 28}
                  height="40"
                  fill={i % 2 ? "#3f6b55" : "#4c7a62"}
                />
              ))}
              <rect
                x="88"
                y="190"
                width="24"
                height="30"
                rx="12"
                fill="#21402f"
              />
            </svg>
          )}
          {/* Fireflies */}
          {[
            [12, 38],
            [86, 30],
            [24, 62],
            [74, 58],
            [50, 22],
            [92, 70],
            [8, 74],
          ].map(([x, y], i) => (
            <span
              key={i}
              className="absolute size-1.5 rounded-full bg-[#eaff8a] shadow-[0_0_8px_3px_rgba(234,255,138,.6)]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                opacity: [0.9, 0.5, 0.75][i % 3],
              }}
            />
          ))}
        </>
      }
      top={(main) => (
        <>
          {/* Canopy and hanging vines */}
          <path
            d="M0 0 H400 V26 Q360 46 320 30 Q280 52 240 32 Q200 50 160 30 Q120 54 80 32 Q40 48 0 30 Z"
            fill="#0a3a2c"
          />
          {[30, 120, 250, 350].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x} 20 Q${x + (i % 2 ? 14 : -14)} ${70 + i * 8} ${x} ${120 + i * 6}`}
                stroke="#2e8a4c"
                strokeWidth="3"
                fill="none"
              />
              {[0, 1, 2, 3].map((k) => (
                <path
                  key={k}
                  d={LEAF}
                  fill={k % 2 ? "#3fae5c" : "#2e8a4c"}
                  transform={`translate(${x} ${40 + k * 22}) rotate(${k % 2 ? 30 : 150}) scale(.42)`}
                />
              ))}
            </g>
          ))}
          {/* A snake draped on a vine */}
          {main && (
            <>
              <path
                d="M170 18 Q190 60 210 40 Q230 20 246 54 Q256 76 240 92"
                stroke="#f2b512"
                strokeWidth="9"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M170 18 Q190 60 210 40 Q230 20 246 54 Q256 76 240 92"
                stroke="#7a4f00"
                strokeWidth="9"
                strokeDasharray="3 9"
                fill="none"
                opacity=".45"
              />
              <ellipse cx="238" cy="96" rx="9" ry="7" fill="#f2b512" />
              <circle cx="235" cy="94" r="1.6" fill="#1b1b1b" />
              <circle cx="242" cy="94" r="1.6" fill="#1b1b1b" />
              <path
                d="M238 103 L238 110 M238 110 L235 113 M238 110 L241 113"
                stroke="#e8473b"
                strokeWidth="1.4"
              />
            </>
          )}
        </>
      )}
      left={
        <>
          {/* Big leaves */}
          {[
            [10, 300, -60, 1.9, "#1f7a43"],
            [0, 250, -35, 1.6, "#2e9a52"],
            [20, 290, -80, 1.4, "#3fae5c"],
            [-6, 200, -20, 1.3, "#1f7a43"],
          ].map(([x, y, r, s, c], i) => (
            <path
              key={i}
              d="M0 0 C20 -30 70 -40 110 0 C70 30 20 26 0 0 Z"
              fill={c as string}
              transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
            />
          ))}
          <path
            d="M0 0 C20 -30 70 -40 110 0"
            stroke="#0e4d2a"
            strokeWidth="1.5"
            fill="none"
            transform="translate(10 300) rotate(-60) scale(1.9)"
          />
        </>
      }
      right={
        <>
          {/* A bamboo ladder leaning in, with leaves */}
          <g transform="rotate(14 100 300)">
            <rect x="62" y="40" width="9" height="262" rx="4" fill="#d9a441" />
            <rect x="112" y="40" width="9" height="262" rx="4" fill="#d9a441" />
            {Array.from({ length: 8 }, (_, i) => (
              <rect
                key={i}
                x="66"
                y={64 + i * 30}
                width="52"
                height="7"
                rx="3"
                fill="#c48a2c"
              />
            ))}
          </g>
          {[
            [140, 296, -120, 1.6, "#2e9a52"],
            [140, 250, -150, 1.3, "#1f7a43"],
          ].map(([x, y, r, s, c], i) => (
            <path
              key={i}
              d="M0 0 C20 -30 70 -40 110 0 C70 30 20 26 0 0 Z"
              fill={c as string}
              transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
            />
          ))}
        </>
      }
      floor={
        <>
          <path
            d="M0 40 Q60 20 120 38 Q200 10 280 36 Q340 18 400 34 V200 H0 Z"
            fill="#0b3b25"
          />
          <path
            d="M0 80 Q80 60 160 82 Q260 56 400 80 V200 H0 Z"
            fill="#0e4a2d"
          />
          {/* Stepping stones */}
          {[
            [200, 120, 46],
            [150, 160, 40],
            [258, 162, 42],
          ].map(([cx, cy, rx], i) => (
            <g key={i}>
              <ellipse
                cx={cx}
                cy={cy + 4}
                rx={rx}
                ry={rx * 0.3}
                fill="#06281a"
              />
              <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.3} fill="#5d7f6b" />
              <ellipse
                cx={cx - rx * 0.2}
                cy={cy - 3}
                rx={rx * 0.5}
                ry={rx * 0.12}
                fill="#7ea08a"
              />
            </g>
          ))}
          {Array.from({ length: 22 }, (_, i) => (
            <path
              key={i}
              d={`M${i * 19} 200 L${i * 19 + 4} ${170 - (i % 3) * 10} L${i * 19 + 8} 200`}
              fill="#1f7a43"
            />
          ))}
        </>
      }
    />
  )
}

/* ── Sudoku Race: a puzzle study ─────────────────────────────────────── */

const BOOKS = [
  "#e8473b",
  "#f2b512",
  "#2f7cf6",
  "#55b82a",
  "#d23ba6",
  "#f97316",
  "#0ea5a4",
  "#8b5cf6",
]

function Study() {
  return (
    <Scene
      wall="radial-gradient(ellipse 50% 40% at 50% 26%, rgba(255,214,140,.32), transparent 70%), linear-gradient(180deg, #232c63 0%, #1a2150 55%, #10153a 100%)"
      extra={
        <>
          {/* Faint squared paper on the wall */}
          <div
            className="absolute inset-0 opacity-[.07]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Digits floating about */}
          {[
            ["7", 10, 34],
            ["3", 84, 30],
            ["9", 20, 66],
            ["1", 78, 64],
            ["5", 46, 24],
            ["8", 90, 48],
          ].map(([d, x, y], i) => (
            <span
              key={i}
              className="lb-font absolute text-2xl font-black text-white/15"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
            >
              {d}
            </span>
          ))}
        </>
      }
      top={(main) => (
        <>
          {/* A pendant lamp with its warm cone of light; the wall pieces repeat */}
          {main && (
            <>
              <line
                x1="200"
                y1="0"
                x2="200"
                y2="40"
                stroke="#c9b48a"
                strokeWidth="2"
              />
              <path
                d="M120 160 L176 66 L224 66 L280 160 Z"
                fill="#ffd27a"
                opacity=".12"
              />
              <path d="M172 66 Q200 30 228 66 Z" fill="#f2b512" />
              <rect
                x="170"
                y="64"
                width="60"
                height="6"
                rx="3"
                fill="#c98a2b"
              />
              <ellipse cx="200" cy="72" rx="12" ry="5" fill="#fff4cc" />
            </>
          )}
          {/* A framed puzzle on the wall */}
          <g transform="translate(300 54)">
            <rect
              width="72"
              height="72"
              rx="4"
              fill="#f6efe0"
              stroke="#8a6a3f"
              strokeWidth="4"
            />
            {[1, 2].map((k) => (
              <g key={k}>
                <line
                  x1={k * 24}
                  y1="0"
                  x2={k * 24}
                  y2="72"
                  stroke="#1a2150"
                  strokeWidth="1.6"
                />
                <line
                  x1="0"
                  y1={k * 24}
                  x2="72"
                  y2={k * 24}
                  stroke="#1a2150"
                  strokeWidth="1.6"
                />
              </g>
            ))}
            {[
              ["5", 0, 0],
              ["3", 1, 1],
              ["7", 2, 0],
              ["9", 0, 2],
              ["1", 2, 2],
            ].map(([d, c, r]) => (
              <text
                key={`${c}${r}`}
                x={Number(c) * 24 + 12}
                y={Number(r) * 24 + 17}
                textAnchor="middle"
                fontSize="14"
                fontWeight="800"
                fill="#1a2150"
              >
                {d}
              </text>
            ))}
          </g>
          <g transform="translate(28 60)">
            <rect
              width="60"
              height="44"
              rx="3"
              fill="#0f3d2e"
              stroke="#8a6a3f"
              strokeWidth="4"
            />
            <text
              x="30"
              y="28"
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="#e8f5e9"
              opacity=".85"
            >
              1·2·3
            </text>
          </g>
        </>
      )}
      left={
        <>
          {/* A bookshelf */}
          <rect x="0" y="60" width="118" height="240" fill="#5a3b22" />
          <rect x="6" y="66" width="106" height="228" fill="#3e2816" />
          {[0, 1, 2].map((shelf) => (
            <g key={shelf}>
              <rect
                x="6"
                y={136 + shelf * 76}
                width="106"
                height="6"
                fill="#5a3b22"
              />
              {Array.from({ length: 7 }, (_, i) => {
                const h = 46 + ((i * 7 + shelf * 3) % 4) * 6
                return (
                  <rect
                    key={i}
                    x={10 + i * 14}
                    y={136 + shelf * 76 - h}
                    width="12"
                    height={h}
                    rx="1.5"
                    fill={BOOKS[(i + shelf * 3) % BOOKS.length]}
                    opacity=".9"
                  />
                )
              })}
            </g>
          ))}
        </>
      }
      right={
        <>
          {/* A plant, and a stack of puzzle books with a pencil */}
          <path d="M70 230 L110 230 L104 290 L76 290 Z" fill="#c2603b" />
          {[
            [-70, "#3fae5c"],
            [-110, "#2e8a4c"],
            [-40, "#2e8a4c"],
            [-140, "#3fae5c"],
          ].map(([r, c], i) => (
            <path
              key={i}
              d="M0 0 C10 -16 34 -20 56 0 C34 14 10 12 0 0 Z"
              fill={c as string}
              transform={`translate(90 232) rotate(${r})`}
            />
          ))}
          <rect x="16" y="258" width="58" height="12" rx="2" fill="#2f7cf6" />
          <rect x="20" y="270" width="54" height="12" rx="2" fill="#f2b512" />
          <rect x="14" y="282" width="62" height="12" rx="2" fill="#e8473b" />
          <g transform="translate(18 250) rotate(-8)">
            <rect width="54" height="6" rx="2" fill="#ffcf3a" />
            <path d="M54 0 L64 3 L54 6 Z" fill="#f2d2a4" />
          </g>
        </>
      }
      floor={
        <>
          <rect width="400" height="200" fill="#2a1b12" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect
              key={i}
              x="0"
              y={i * 26}
              width="400"
              height="2"
              fill="#3a2618"
            />
          ))}
          {/* A rug with a grid */}
          <path d="M60 60 L340 60 L380 190 L20 190 Z" fill="#7a2f4a" />
          <path
            d="M80 72 L320 72 L354 180 L46 180 Z"
            fill="none"
            stroke="#f2b512"
            strokeWidth="3"
            opacity=".7"
          />
          {[1, 2].map((k) => (
            <g key={k} stroke="#f2b512" strokeWidth="2" opacity=".45">
              <line x1={80 + k * 80} y1="72" x2={46 + k * 102.7} y2="180" />
              <line
                x1={80 - k * 11.3}
                y1={72 + k * 36}
                x2={320 + k * 11.3}
                y2={72 + k * 36}
              />
            </g>
          ))}
        </>
      }
    />
  )
}

/* ── Scribble: an art studio ─────────────────────────────────────────── */

const PAINT = ["#ff5a5f", "#ffb400", "#3ec1d3", "#7bd148", "#a66cff", "#ff7ac6"]

function Studio() {
  return (
    <Scene
      wall="radial-gradient(ellipse 55% 40% at 50% 34%, rgba(255,190,160,.25), transparent 70%), linear-gradient(180deg, #1d5a6e 0%, #174a5c 55%, #0e3341 100%)"
      extra={
        <>
          {/* Paint splats on the wall */}
          {[
            [8, 30, 0, 46],
            [80, 26, 1, 38],
            [18, 58, 2, 30],
            [88, 56, 3, 34],
            [50, 18, 4, 26],
          ].map(([x, y, c, s], i) => (
            <svg
              key={i}
              className="absolute opacity-60"
              style={{ left: `${x}%`, top: `${y}%`, width: s, height: s }}
              viewBox="0 0 40 40"
            >
              <path
                d="M20 4 C26 4 26 12 32 10 C38 12 34 20 36 24 C38 32 28 30 26 36 C20 40 16 32 10 34 C4 32 8 24 4 20 C2 12 12 14 14 8 C16 4 18 4 20 4 Z"
                fill={PAINT[c]}
              />
              <circle cx="38" cy="6" r="2" fill={PAINT[c]} />
              <circle cx="4" cy="36" r="2.4" fill={PAINT[c]} />
            </svg>
          ))}
        </>
      }
      top={() => (
        <>
          {/* Drawings pegged on a line (low enough to keep clear of the title) */}
          <g transform="translate(0 34)">
            <path
              d="M-10 26 Q200 66 410 26"
              stroke="#f4e7d1"
              strokeWidth="1.6"
              fill="none"
            />
            {[
              [36, -6, 0],
              [118, 4, 1],
              [200, -3, 2],
              [282, 5, 3],
              [362, -5, 4],
            ].map(([x, r, k]) => {
              const t = (x + 10) / 420
              const y = 26 + 2 * (1 - t) * t * 40
              return (
                <g key={x} transform={`translate(${x} ${y}) rotate(${r})`}>
                  <rect
                    x="-24"
                    y="2"
                    width="48"
                    height="56"
                    rx="2"
                    fill="#fffaf0"
                  />
                  <rect
                    x="-4"
                    y="-4"
                    width="8"
                    height="12"
                    rx="1.5"
                    fill="#c98a2b"
                  />
                  {k === 0 && (
                    <circle
                      cx="0"
                      cy="26"
                      r="12"
                      fill="none"
                      stroke={PAINT[0]}
                      strokeWidth="4"
                    />
                  )}
                  {k === 1 && (
                    <path
                      d="M-14 46 L0 14 L14 46 Z"
                      fill="none"
                      stroke={PAINT[2]}
                      strokeWidth="4"
                      strokeLinejoin="round"
                    />
                  )}
                  {k === 2 && (
                    <>
                      <circle cx="0" cy="22" r="9" fill={PAINT[1]} />
                      <path
                        d="M-16 50 Q0 30 16 50"
                        stroke={PAINT[3]}
                        strokeWidth="4"
                        fill="none"
                      />
                    </>
                  )}
                  {k === 3 && (
                    <path
                      d="M-14 40 Q-4 10 6 30 Q12 44 16 16"
                      stroke={PAINT[4]}
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                  {k === 4 && (
                    <path
                      d="M0 14 L4 26 L16 26 L6 34 L10 46 L0 38 L-10 46 L-6 34 L-16 26 L-4 26 Z"
                      fill={PAINT[5]}
                    />
                  )}
                </g>
              )
            })}
          </g>
        </>
      )}
      left={
        <>
          {/* An easel with a canvas */}
          <path
            d="M30 300 L64 90 M110 300 L76 90 M70 90 L70 300"
            stroke="#a8692e"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <rect x="14" y="96" width="112" height="96" rx="3" fill="#fffaf0" />
          <rect
            x="14"
            y="96"
            width="112"
            height="96"
            rx="3"
            fill="none"
            stroke="#d8c7a8"
            strokeWidth="3"
          />
          <path
            d="M28 170 Q50 110 72 150 Q90 182 112 116"
            stroke="#ff5a5f"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="96" cy="128" r="12" fill="#ffb400" />
          <rect x="10" y="192" width="120" height="8" rx="3" fill="#a8692e" />
        </>
      }
      right={
        <>
          {/* Paint pots, a jar of brushes, a palette */}
          <rect
            x="70"
            y="200"
            width="44"
            height="58"
            rx="6"
            fill="#d7f0f4"
            opacity=".85"
          />
          {[
            [76, -14, "#ff5a5f"],
            [88, -4, "#ffb400"],
            [100, 10, "#3ec1d3"],
          ].map(([x, r, c], i) => (
            <g key={i} transform={`translate(${x} 206) rotate(${r})`}>
              <rect
                x="-2"
                y="-70"
                width="5"
                height="76"
                rx="2"
                fill="#a8692e"
              />
              <path d="M-4 -70 Q0 -90 4 -70 Z" fill={c as string} />
            </g>
          ))}
          {PAINT.slice(0, 3).map((c, i) => (
            <g key={c} transform={`translate(${14 + i * 40} 262)`}>
              <rect width="32" height="30" rx="5" fill="#eee" />
              <rect width="32" height="10" rx="4" fill={c} />
              <path d={`M6 10 Q8 20 10 10`} fill={c} />
            </g>
          ))}
          <g transform="translate(4 222) rotate(-14)">
            <path
              d="M0 18 C0 0 50 -6 60 12 C66 24 50 22 46 30 C40 40 0 36 0 18 Z"
              fill="#e6b980"
            />
            {PAINT.slice(0, 4).map((c, i) => (
              <circle
                key={c}
                cx={12 + i * 11}
                cy={14 + (i % 2) * 6}
                r="4.4"
                fill={c}
              />
            ))}
          </g>
        </>
      }
      floor={
        <>
          <rect width="400" height="200" fill="#5a3a24" />
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={i}
              x1={i * 44}
              y1="0"
              x2={i * 44 - 40 + i * 9}
              y2="200"
              stroke="#6b4630"
              strokeWidth="2"
            />
          ))}
          {/* Drips and splats on the floorboards */}
          {[
            [70, 60, 0, 22],
            [300, 80, 2, 26],
            [190, 150, 1, 18],
            [120, 170, 4, 14],
            [330, 160, 3, 16],
          ].map(([x, y, c, r], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx={r}
              ry={r * 0.4}
              fill={PAINT[c]}
              opacity=".75"
            />
          ))}
        </>
      }
    />
  )
}
