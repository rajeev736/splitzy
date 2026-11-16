"use client"

import * as React from "react"

import {
  CLIFF_FACE,
  LADDER_LIST,
  ladderGeometry,
  pts,
  rhombus,
  RISE,
  SCENE_H,
  SCENE_W,
  SNAKE_LIST,
  snakePath,
  START_SPOT,
  TILE_H,
  TILE_W,
  tileCentre,
  type Pt,
} from "./geometry"

/* ── Palette ─────────────────────────────────────────────────────────── */

const GRASS = "#5cbb48"
const GRASS_EDGE = "#3e8f31"
const STONE = "#9a7b5d"
const STONE_DARK = "#6e533b"
const GOLD = "#f2c94c"
const WOOD = "#c8853f"
const WOOD_DARK = "#7a4a1d"

const SNAKE_SKINS = [
  { body: "#43b047", belly: "#b8ec8a", dark: "#1f6b26" },
  { body: "#f0892b", belly: "#ffd59a", dark: "#8c4a0f" },
  { body: "#9b5de5", belly: "#e2c6ff", dark: "#4c2a86" },
  { body: "#2bb3c0", belly: "#b7f0f5", dark: "#0f5f66" },
  { body: "#e5484d", belly: "#ffc2c4", dark: "#7f1d20" },
]

/* ── Pieces of scenery ───────────────────────────────────────────────── */

/** The blocks in depth order: rows from the summit down, left to right. */
function Tiles() {
  const out: React.ReactNode[] = []
  for (let row = 9; row >= 0; row--) {
    for (let col = 0; col < 10; col++) {
      const n = row * 10 + (row % 2 === 0 ? col : 9 - col) + 1
      const c = tileCentre(n)
      const [top, right, bottom, left] = rhombus(c)
      // Row 0's risers are the cliff itself, dropping into the mist
      const depth = row === 0 ? CLIFF_FACE : RISE
      const last = n === 100
      const front = [left, bottom, { x: bottom.x, y: bottom.y + depth }, { x: left.x, y: left.y + depth }]
      out.push(
        <g key={n}>
          <polygon points={pts(front)} fill={row === 0 ? "url(#s3d-cliff)" : STONE} stroke={STONE_DARK} strokeWidth="0.6" />
          {col === 9 && (
            <polygon
              points={pts([bottom, right, { x: right.x, y: right.y + depth }, { x: bottom.x, y: bottom.y + depth }])}
              fill={row === 0 ? "url(#s3d-cliff-dark)" : STONE_DARK}
            />
          )}
          <polygon
            points={pts([top, right, bottom, left])}
            fill={last ? GOLD : GRASS}
            stroke={last ? "#b8902a" : GRASS_EDGE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* A soft lip of grass hanging over the riser */}
          <polyline
            points={pts([left, bottom, right])}
            fill="none"
            stroke={last ? "#ffe08a" : "#7fd76a"}
            strokeWidth="1.4"
            strokeOpacity="0.8"
          />
          <text x={c.x} y={c.y + 3.6} textAnchor="middle" className="s3d-num" fill={last ? "#5a3e00" : "#ffffff"}>
            {n}
          </text>
        </g>
      )
    }
  }
  return <>{out}</>
}

function Ladder({ foot, top }: { foot: number; top: number }) {
  const g = ladderGeometry(foot, top)
  const rail = (r: { from: Pt; to: Pt }, w: number, stroke: string) => (
    <line x1={r.from.x} y1={r.from.y} x2={r.to.x} y2={r.to.y} stroke={stroke} strokeWidth={w} strokeLinecap="round" />
  )
  return (
    <g data-ladder={foot}>
      {/* Shadow on the cliff */}
      <g opacity="0.22" transform="translate(3 4)">
        {rail(g.rail1, 4, "#000")}
        {rail(g.rail2, 4, "#000")}
      </g>
      {rail(g.rail1, 4.6, WOOD_DARK)}
      {rail(g.rail2, 4.6, WOOD_DARK)}
      {rail(g.rail1, 2.6, WOOD)}
      {rail(g.rail2, 2.6, WOOD)}
      {g.rungs.map((r, i) => (
        <React.Fragment key={i}>
          <line x1={r.from.x} y1={r.from.y} x2={r.to.x} y2={r.to.y} stroke={WOOD_DARK} strokeWidth="3.4" strokeLinecap="round" />
          <line x1={r.from.x} y1={r.from.y} x2={r.to.x} y2={r.to.y} stroke="#e3a65a" strokeWidth="1.6" strokeLinecap="round" />
        </React.Fragment>
      ))}
      {/* Lit up when someone climbs (see the animation) */}
      <line
        data-ladder-glow={foot}
        x1={g.a.x}
        y1={g.a.y}
        x2={g.b.x}
        y2={g.b.y}
        stroke="#e6f9ff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="7 9"
        opacity="0"
      />
    </g>
  )
}

function Snake({ head, tail, skin }: { head: number; tail: number; skin: (typeof SNAKE_SKINS)[number] }) {
  const s = snakePath(head, tail)
  return (
    <g data-snake={head}>
      <path d={s.d} fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="9" strokeLinecap="round" transform="translate(2 3)" />
      <path d={s.d} fill="none" stroke={skin.dark} strokeWidth="9" strokeLinecap="round" />
      <path d={s.d} fill="none" stroke={skin.body} strokeWidth="6" strokeLinecap="round" />
      <path d={s.d} fill="none" stroke={skin.belly} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 7" strokeOpacity="0.9" />
      <path data-snake-glow={head} d={s.d} fill="none" stroke="#d9a2ff" strokeWidth="16" strokeLinecap="round" opacity="0" />
      {/* Head, pointing the way the body leaves the square */}
      <g transform={`translate(${s.head.x} ${s.head.y}) rotate(${s.angle})`}>
        <path d="M -9 0 L -11 -2 L -14 -0.5 L -11 1" fill="none" stroke="#ff3b3b" strokeWidth="1.3" strokeLinecap="round" />
        <ellipse rx="8.5" ry="6" fill={skin.body} stroke={skin.dark} strokeWidth="1.2" />
        <ellipse cx="-3" cy="-2.6" rx="1.8" ry="1.9" fill="#fff" />
        <ellipse cx="-3" cy="2.6" rx="1.8" ry="1.9" fill="#fff" />
        <circle cx="-3.6" cy="-2.6" r="0.9" fill="#111" />
        <circle cx="-3.6" cy="2.6" r="0.9" fill="#111" />
      </g>
    </g>
  )
}

/** A round jungle canopy on a trunk; sways in the breeze. */
function Tree({ x, y, s = 1, tone = 0, delay = 0 }: { x: number; y: number; s?: number; tone?: 0 | 1; delay?: number }) {
  const a = tone === 0 ? "#2f8f3c" : "#3aa548"
  const b = tone === 0 ? "#4cb85a" : "#5fcc6b"
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="2" cy="2" rx="12" ry="4" fill="#000" opacity="0.2" />
      <path d="M -3 0 Q -1 -14 0 -26 Q 1 -14 3 0 Z" fill="#6b4a2b" />
      <g className="s3d-sway" style={{ animationDelay: `${delay}s` }}>
        <circle cx="-9" cy="-26" r="10" fill={a} />
        <circle cx="9" cy="-28" r="11" fill={a} />
        <circle cx="0" cy="-36" r="12" fill={b} />
        <circle cx="-3" cy="-40" r="6" fill="#8be08f" opacity="0.6" />
      </g>
    </g>
  )
}

function Palm({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="4" cy="1" rx="10" ry="3.5" fill="#000" opacity="0.2" />
      <path d="M -2 0 Q 4 -20 10 -40" fill="none" stroke="#8a5a30" strokeWidth="4" strokeLinecap="round" />
      <g className="s3d-sway" style={{ animationDelay: `${delay}s`, transformOrigin: "10px -40px" }}>
        {[-150, -110, -70, -30, 10, 50].map((deg) => (
          <path
            key={deg}
            d="M 0 0 Q 14 -4 26 2 Q 14 2 0 0"
            fill="#3fae4d"
            stroke="#2a7a35"
            strokeWidth="0.6"
            transform={`translate(10 -40) rotate(${deg})`}
          />
        ))}
      </g>
    </g>
  )
}

function Bush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="12" ry="5" fill="#2d7a35" />
      <ellipse cx="-5" cy="-3" rx="7" ry="5" fill="#45a553" />
      <ellipse cx="5" cy="-3" rx="7" ry="5" fill="#3d9a4a" />
      <ellipse cx="0" cy="-6" rx="6" ry="4.5" fill="#62c46e" />
    </g>
  )
}

/** A ribbon of water off a terrace's right-hand edge, down the stepped cliff to a pool. */
function Waterfall({ from, to }: { from: number; to: number }) {
  const t = tileCentre(from)
  const [, right, bottom] = rhombus(t)
  const x = right.x - 9
  const y0 = (right.y + bottom.y) / 2 + 1
  const y1 = tileCentre(to).y + 86
  return (
    <g>
      <rect x={x - 7} y={y0} width="14" height={y1 - y0} fill="url(#s3d-water)" opacity="0.85" />
      {[-3, 1, 4].map((dx, i) => (
        <line
          key={i}
          x1={x + dx}
          y1={y0 + 6}
          x2={x + dx}
          y2={y1 - 4}
          stroke="#fff"
          strokeWidth="1.2"
          strokeOpacity="0.55"
          strokeDasharray="7 11"
          className="s3d-fall"
          style={{ animationDelay: `${i * 0.33}s` }}
        />
      ))}
      <ellipse cx={x} cy={y1} rx="26" ry="9" fill="#2a9ad6" opacity="0.8" />
      <ellipse cx={x} cy={y1} rx="19" ry="6" fill="#5cc3f0" opacity="0.7" className="s3d-shimmer" />
      <ellipse cx={x - 6} cy={y1 - 2} rx="7" ry="2" fill="#fff" opacity="0.6" className="s3d-shimmer" style={{ animationDelay: "0.7s" }} />
      <ellipse cx={x} cy={y1 - 4} rx="24" ry="10" fill="#fff" opacity="0.28" className="s3d-mist" />
    </g>
  )
}

/**
 * A grassy ledge jutting out of the cliff beside a terrace's end square —
 * somewhere for the jungle to grow. `side` -1 = left of a left-end square,
 * +1 = right of a right-end square.
 */
function Ledge({ at, side, children }: { at: number; side: -1 | 1; children?: React.ReactNode }) {
  const t = tileCentre(at)
  const c: Pt = side < 0 ? { x: t.x - TILE_W / 2, y: t.y - TILE_H / 2 } : { x: t.x + TILE_W / 2, y: t.y + TILE_H / 2 }
  const [top, right, bottom, left] = rhombus(c)
  const d = 16
  return (
    <g>
      <polygon points={pts([left, bottom, { x: bottom.x, y: bottom.y + d }, { x: left.x, y: left.y + d }])} fill={STONE} stroke={STONE_DARK} strokeWidth="0.6" />
      <polygon points={pts([bottom, right, { x: right.x, y: right.y + d }, { x: bottom.x, y: bottom.y + d }])} fill={STONE_DARK} />
      <polygon points={pts([top, right, bottom, left])} fill="#4fae40" stroke={GRASS_EDGE} strokeWidth="1" strokeLinejoin="round" />
      <g transform={`translate(${c.x} ${c.y + 2})`}>{children}</g>
    </g>
  )
}

/** The wooden gate on the front edge of square 1; the doors swing in the animation. */
function Gate() {
  const t = tileCentre(1)
  const [, , bottom, left] = rhombus(t)
  // Along the edge from the left corner to the bottom corner: skew so uprights stay upright
  const w = bottom.x - left.x
  return (
    <g data-gate transform={`translate(${left.x} ${left.y}) skewY(26.565)`}>
      {/* Doors first, so the posts and the arch sit in front */}
      <g data-gate-door="l" transform={`translate(${w * 0.14} 0)`}>
        <rect x="0" y="-27" width={w * 0.36} height="27" fill={WOOD} stroke={WOOD_DARK} strokeWidth="1" />
        <line x1="2" y1="-18" x2={w * 0.36 - 2} y2="-18" stroke={WOOD_DARK} strokeWidth="1.2" />
        <line x1="2" y1="-9" x2={w * 0.36 - 2} y2="-9" stroke={WOOD_DARK} strokeWidth="1.2" />
      </g>
      <g data-gate-door="r" transform={`translate(${w * 0.86} 0)`}>
        <rect x={-w * 0.36} y="-27" width={w * 0.36} height="27" fill={WOOD} stroke={WOOD_DARK} strokeWidth="1" />
        <line x1={-w * 0.36 + 2} y1="-18" x2="-2" y2="-18" stroke={WOOD_DARK} strokeWidth="1.2" />
        <line x1={-w * 0.36 + 2} y1="-9" x2="-2" y2="-9" stroke={WOOD_DARK} strokeWidth="1.2" />
      </g>
      <rect x={w * 0.08} y="-34" width="4" height="36" rx="1" fill={WOOD_DARK} />
      <rect x={w * 0.92 - 4} y="-34" width="4" height="36" rx="1" fill={WOOD_DARK} />
      <rect x={w * 0.04} y="-37" width={w * 0.92} height="5" rx="2" fill={WOOD_DARK} />
      <rect x={w * 0.06} y="-36" width={w * 0.88} height="2.4" rx="1" fill={WOOD} />
      <circle cx={w * 0.5} cy="-13" r="2.2" fill="#f2c94c" data-gate-lock />
    </g>
  )
}

/** The flag on the summit. */
function Flag() {
  const t = tileCentre(100)
  return (
    <g transform={`translate(${t.x + 23} ${t.y + 1})`}>
      <line x1="0" y1="0" x2="0" y2="-40" stroke="#5a4634" strokeWidth="2.2" strokeLinecap="round" />
      <g className="s3d-flag" style={{ transformOrigin: "0px -38px" }}>
        <path d="M 0 -40 L 20 -34 L 0 -28 Z" fill="#ff5a5f" />
        <path d="M 0 -40 L 20 -34 L 0 -28 Z" fill="#fff" opacity="0.25" transform="translate(0 0)" />
      </g>
      <circle cx="0" cy="-41" r="2" fill={GOLD} />
    </g>
  )
}

const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({
  x: 30 + ((i * 97) % (SCENE_W - 60)),
  y: 240 + ((i * 193) % (SCENE_H - 420)),
  dur: 4 + (i % 5) * 0.9,
  delay: (i * 0.7) % 4,
}))

const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: 12 + ((i * 61) % (SCENE_W - 24)),
  y: 10 + ((i * 37) % 110),
  r: 0.6 + (i % 3) * 0.4,
}))

/* ── The scene ───────────────────────────────────────────────────────── */

/**
 * Everything that never changes: the sky, the cliff of numbered blocks, the
 * ladders and snakes, the jungle around it and the gate. Memoised so the
 * pieces can move above it without re-rendering a hundred blocks.
 */
export const Scene = React.memo(function Scene() {
  const start = START_SPOT
  const summit = tileCentre(100)
  const t1 = tileCentre(1)
  const rightOf = (n: number, dx: number) => tileCentre(n).x + TILE_W / 2 + dx
  const platform = rhombus({ x: start.x + 4, y: start.y + 2 })
  return (
    <>
      <defs>
        <linearGradient id="s3d-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4d8fe8" />
          <stop offset="0.35" stopColor="#1f4fb3" />
          <stop offset="0.8" stopColor="#0f2a66" />
          <stop offset="1" stopColor="#071a3c" />
        </linearGradient>
        <linearGradient id="s3d-cliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={STONE} />
          <stop offset="0.45" stopColor="#5e4634" />
          <stop offset="1" stopColor="#0b1d40" />
        </linearGradient>
        <linearGradient id="s3d-cliff-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={STONE_DARK} />
          <stop offset="0.45" stopColor="#3f2e22" />
          <stop offset="1" stopColor="#0b1d40" />
        </linearGradient>
        <linearGradient id="s3d-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfeaff" />
          <stop offset="0.5" stopColor="#6fc6f3" />
          <stop offset="1" stopColor="#bfeaff" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="s3d-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s3d-portal" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1a0b3a" />
          <stop offset="0.55" stopColor="#5b2bb8" />
          <stop offset="0.8" stopColor="#c084fc" />
          <stop offset="1" stopColor="#f0abfc" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width={SCENE_W} height={SCENE_H} fill="url(#s3d-sky)" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity="0.8" className="s3d-twinkle" style={{ animationDelay: `${(i % 7) * 0.5}s` }} />
      ))}
      <g className="s3d-cloud" opacity="0.5">
        <ellipse cx="70" cy="120" rx="34" ry="9" fill="#fff" />
        <ellipse cx="88" cy="112" rx="22" ry="10" fill="#fff" />
        <ellipse cx={SCENE_W - 90} cy="190" rx="40" ry="10" fill="#fff" />
        <ellipse cx={SCENE_W - 70} cy="181" rx="24" ry="10" fill="#fff" />
      </g>
      {/* Far ridge behind the summit */}
      <path
        d={`M 0 ${summit.y + 90} Q 60 ${summit.y + 20} 120 ${summit.y + 60} T 240 ${summit.y + 40} T ${SCENE_W} ${summit.y + 80} L ${SCENE_W} ${summit.y + 200} L 0 ${summit.y + 200} Z`}
        fill="#143a7a"
        opacity="0.8"
      />

      {/* Trees behind the terraces (top-right corner of the stair) */}
      <Tree x={rightOf(100, 24)} y={summit.y + 36} s={0.95} tone={1} delay={0.4} />
      <Tree x={rightOf(100, 58)} y={summit.y + 70} s={1.1} delay={1.2} />
      <Palm x={rightOf(91, 54)} y={tileCentre(91).y + 54} s={1} delay={2} />

      {/* The cliff */}
      <Tiles />

      {/* Ladders and snakes over the blocks */}
      {LADDER_LIST.map((l) => (
        <Ladder key={l.foot} foot={l.foot} top={l.top} />
      ))}
      {SNAKE_LIST.map((s, i) => (
        <Snake key={s.head} head={s.head} tail={s.tail} skin={SNAKE_SKINS[i % SNAKE_SKINS.length]} />
      ))}

      <Waterfall from={50} to={10} />

      {/* Ledges of jungle along the cliff's sides */}
      <Ledge at={21} side={-1}>
        <Palm x={2} y={0} s={0.8} delay={0.3} />
      </Ledge>
      <Ledge at={60} side={-1}>
        <Tree x={0} y={0} s={0.8} delay={1.8} />
        <Bush x={14} y={4} s={0.5} />
      </Ledge>
      <Ledge at={81} side={-1}>
        <Tree x={-2} y={0} s={0.75} tone={1} delay={3} />
      </Ledge>
      <Ledge at={70} side={1}>
        <Bush x={-8} y={2} s={0.8} />
        <Palm x={8} y={-2} s={0.75} delay={2.2} />
      </Ledge>
      <Ledge at={91} side={1}>
        <Tree x={0} y={0} s={0.8} delay={0.9} />
      </Ledge>

      {/* Start platform, in front of the gate */}
      <polygon points={pts([platform[3], platform[2], { x: platform[2].x, y: platform[2].y + 40 }, { x: platform[3].x, y: platform[3].y + 40 }])} fill="url(#s3d-cliff)" />
      <polygon points={pts([platform[2], platform[1], { x: platform[1].x, y: platform[1].y + 40 }, { x: platform[2].x, y: platform[2].y + 40 }])} fill="url(#s3d-cliff-dark)" />
      <polygon points={pts(platform)} fill="#8a6a4b" stroke="#5e4634" strokeWidth="1" />
      <ellipse cx={start.x + 4} cy={start.y + 2} rx="16" ry="6" fill="#a4835f" opacity="0.7" />
      <Gate />
      <Palm x={start.x - 4} y={start.y + 44} s={0.95} delay={1.1} />
      <Bush x={start.x + 50} y={start.y + 30} s={1} />
      <Bush x={t1.x + 30} y={t1.y + 62} s={0.75} />

      <Flag />

      {/* Mist at the foot of the cliff */}
      <ellipse cx={SCENE_W / 2} cy={SCENE_H - 30} rx={SCENE_W * 0.7} ry="50" fill="#9fb8e0" opacity="0.25" className="s3d-mist" />

      {FIREFLIES.map((f, i) => (
        <circle
          key={i}
          cx={f.x}
          cy={f.y}
          r="1.6"
          fill="#ffe66d"
          className="s3d-firefly"
          style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
        />
      ))}
    </>
  )
})

export const SCENE_CSS = `
.s3d-num{font:700 10px/1 ui-sans-serif,system-ui,sans-serif;paint-order:stroke;stroke:#1d5a1a;stroke-width:2.2px;stroke-linejoin:round;pointer-events:none;user-select:none}
.s3d-sway{transform-box:fill-box;transform-origin:50% 100%;animation:s3d-sway 4.2s ease-in-out infinite alternate}
@keyframes s3d-sway{from{transform:rotate(-2.4deg)}to{transform:rotate(2.4deg)}}
.s3d-flag{transform-box:fill-box;transform-origin:0% 50%;animation:s3d-flag 1.6s ease-in-out infinite alternate}
@keyframes s3d-flag{from{transform:skewY(-6deg) scaleX(1)}to{transform:skewY(6deg) scaleX(0.92)}}
.s3d-shimmer{animation:s3d-shimmer 2.2s ease-in-out infinite alternate}
@keyframes s3d-shimmer{from{opacity:0.35}to{opacity:0.85}}
.s3d-mist{animation:s3d-mist 6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 50%}
@keyframes s3d-mist{from{transform:scaleX(0.9);opacity:0.18}to{transform:scaleX(1.1);opacity:0.32}}
.s3d-fall{animation:s3d-fall 0.9s linear infinite}
@keyframes s3d-fall{from{stroke-dashoffset:18}to{stroke-dashoffset:0}}
.s3d-cloud{animation:s3d-cloud 40s ease-in-out infinite alternate}
@keyframes s3d-cloud{from{transform:translateX(-14px)}to{transform:translateX(14px)}}
.s3d-twinkle{animation:s3d-twinkle 3s ease-in-out infinite alternate}
@keyframes s3d-twinkle{from{opacity:0.25}to{opacity:0.9}}
.s3d-firefly{animation:s3d-firefly 5s ease-in-out infinite}
@keyframes s3d-firefly{0%{transform:translate(0,0);opacity:0}25%{opacity:0.9}50%{transform:translate(9px,-14px);opacity:0.2}75%{opacity:0.8}100%{transform:translate(-6px,-26px);opacity:0}}
.s3d-idle{animation:s3d-idle 1.9s ease-in-out infinite alternate}
@keyframes s3d-idle{from{transform:translateY(0)}to{transform:translateY(-2.5px)}}
.s3d-you{animation:s3d-you 1.1s ease-in-out infinite alternate}
@keyframes s3d-you{from{transform:translateY(0)}to{transform:translateY(-4px)}}
@media (prefers-reduced-motion: reduce){.s3d-sway,.s3d-flag,.s3d-shimmer,.s3d-mist,.s3d-fall,.s3d-cloud,.s3d-twinkle,.s3d-firefly,.s3d-idle,.s3d-you{animation:none}}
`
