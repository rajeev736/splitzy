"use client"

import { useId, type ReactNode } from "react"
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react"
import { cn } from "cn"

import type { GiftId } from "@/lib/fun/catalog"

/* ── Shared drawing bits (also used by moment-art and moment-burst) ──── */

/** A heart about 20 units wide, centred on 0,0. */
export const HEART_PATH =
  "M0 8.5C-6.4 4.4-10 0.6-10-3.3C-10-6.4-7.7-8.6-4.9-8.6C-2.9-8.6-1.1-7.5 0-5.7C1.1-7.5 2.9-8.6 4.9-8.6C7.7-8.6 10-6.4 10-3.3C10 0.6 6.4 4.4 0 8.5Z"

/** A soft four-point sparkle about 10 units wide, centred on 0,0. */
export const SPARKLE_PATH = "M0-5C0.6-1.6 1.6-0.6 5 0C1.6 0.6 0.6 1.6 0 5C-0.6 1.6-1.6 0.6-5 0C-1.6-0.6-0.6-1.6 0-5Z"

/** SVG ids must be unique per instance and safe inside url(#…). */
export function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "")
}

type LoopProps = {
  on: boolean
  animate: TargetAndTransition
  transition?: Transition
  origin?: string
  children: ReactNode
}

/**
 * A group that loops a gentle keyframe animation when `on`, and is a plain
 * `<g>` otherwise, so static art costs nothing.
 */
export function ArtLoop(props: LoopProps) {
  if (!props.on) return <g>{props.children}</g>
  return <LiveLoop {...props} />
}

/**
 * Same markup on server and client; the keyframes only run when the viewer
 * hasn’t asked for reduced motion (so there is no hydration mismatch).
 */
function LiveLoop({ animate, transition, origin = "50% 50%", children }: LoopProps) {
  const reduce = useReducedMotion()
  return (
    <motion.g
      animate={reduce ? undefined : animate}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", ...transition }}
      style={{ transformBox: "fill-box", transformOrigin: origin }}
    >
      {children}
    </motion.g>
  )
}

/** A twinkling sparkle. Static: a small resting star. */
export function Sparkle({
  x,
  y,
  size = 1,
  on,
  delay = 0,
  color = "#FFC94D",
}: {
  x: number
  y: number
  size?: number
  on: boolean
  delay?: number
  color?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <ArtLoop
        on={on}
        animate={{ scale: [0.4, 1, 0.4], opacity: [0, 1, 0], rotate: [0, 45, 90] }}
        transition={{ duration: 2.4, delay, repeatDelay: 0.6 }}
      >
        <path d={SPARKLE_PATH} fill={color} />
      </ArtLoop>
    </g>
  )
}

/** Rising steam wisps above a cup or basket. */
function Steam({ on, paths, color }: { on: boolean; paths: string[]; color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round">
      {paths.map((d, i) => (
        <ArtLoop
          key={d}
          on={on}
          animate={{ y: [3, -5], opacity: [0, 0.9, 0] }}
          transition={{ duration: 2.6, ease: "easeOut", delay: i * 0.85 }}
          origin="50% 100%"
        >
          <path d={d} opacity={on ? 1 : 0.75} />
        </ArtLoop>
      ))}
    </g>
  )
}

const Shadow = ({ rx = 18, cy = 109 }: { rx?: number; cy?: number }) => (
  <ellipse cx="60" cy={cy} rx={rx} ry="3.2" fill="#3B1D2A" opacity="0.1" />
)

type Art = { id: string; on: boolean }

/* ── Gifts ───────────────────────────────────────────────────────────── */

function Rose({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8DA6" />
          <stop offset="1" stopColor="#E33A63" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7EDDA6" />
          <stop offset="1" stopColor="#2F9E69" />
        </linearGradient>
      </defs>
      <Shadow rx={14} />
      <ArtLoop on={on} animate={{ rotate: [-2.5, 2.5, -2.5] }} transition={{ duration: 4.2 }} origin="50% 100%">
        <path d="M60 58C58 74 62.5 92 59.5 108" fill="none" stroke="#2F9E69" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M59.6 88C53 77 41 76 34 81C40 91 52 94 59.6 88Z" fill={`url(#${id}l)`} />
        <path d="M58 87.5C51 84.5 44 82.8 38.5 82.6" fill="none" stroke="#B5F0CD" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        <path d="M60.4 75C66 65 78 63 85 67.5C80 77 68 80.5 60.4 75Z" fill={`url(#${id}l)`} />
        <path d="M62 74.6C68 71 74.5 69 81 68.6" fill="none" stroke="#B5F0CD" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />

        <path d="M35 36C35 22 47 15.5 60 17.5C73 15.5 85 22 85 36C85 52 74 63 60 63C46 63 35 52 35 36Z" fill={`url(#${id}p)`} />
        <ellipse cx="60" cy="30.5" rx="16" ry="9.5" fill="#C42652" />
        <path d="M60 27.5C64.5 26.8 66.5 31 63.2 33.2C59 36 52.5 33 53.6 28.4C54.8 23.4 64.5 22.6 68.6 28" fill="none" stroke="#FF9BB2" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M35 36C36.5 53 47.5 63 60 63C50 57 44.5 46.5 46.5 31.5C41 30.5 37 32.5 35 36Z" fill="#FF7F9C" />
        <path d="M85 36C83.5 53 72.5 63 60 63C70 57 75.5 46.5 73.5 31.5C79 30.5 83 32.5 85 36Z" fill="#EE4E74" />
        <path d="M45 43C49 55.5 71 55.5 75 43C70.5 48 65 50 60 50C55 50 49.5 48 45 43Z" fill="#FF6B8C" />
        <path d="M40.5 29C42 24.5 46 21.2 50.5 20.2" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      </ArtLoop>
      <Sparkle x={90} y={20} size={1.1} on={on} />
      <Sparkle x={28} y={52} size={0.7} on={on} delay={1.2} />
    </>
  )
}

function Coffee({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFB592" />
          <stop offset="0.55" stopColor="#FF9474" />
          <stop offset="1" stopColor="#E9705A" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6EC" />
          <stop offset="1" stopColor="#F3D9C3" />
        </linearGradient>
      </defs>
      <Shadow rx={30} cy={108} />
      <Steam
        on={on}
        color="#F0A88E"
        paths={["M48 44C44 38 52 34 48 26", "M60 42C56 35 64 31 60 22", "M72 44C68 38 76 34 72 26"]}
      />
      <ellipse cx="60" cy="101" rx="36" ry="7" fill="#E7C4A8" />
      <ellipse cx="60" cy="99.5" rx="36" ry="6.5" fill={`url(#${id}s)`} />
      <path d="M84 62C97 60 99 84 82 86.5" fill="none" stroke="#E9705A" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M33 56L37 90C38 96.5 43 100.5 49.5 100.5H70.5C77 100.5 82 96.5 83 90L87 56Z" fill={`url(#${id}c)`} />
      <path d="M41 64L44 88" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <ellipse cx="60" cy="56" rx="27" ry="7.5" fill="#FFF3E6" />
      <ellipse cx="60" cy="56.6" rx="22.5" ry="5.4" fill="#8A5537" />
      <path d="M60 60.2C56.4 58 54.6 56.4 54.6 54.8C54.6 53.6 55.6 52.8 56.8 52.8C58 52.8 59.4 53.6 60 54.8C60.6 53.6 62 52.8 63.2 52.8C64.4 52.8 65.4 53.6 65.4 54.8C65.4 56.4 63.6 58 60 60.2Z" fill="#F2CFA8" />
    </>
  )
}

function IceCream({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F7C27C" />
          <stop offset="1" stopColor="#DE9547" />
        </linearGradient>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB2C4" />
          <stop offset="1" stopColor="#FF86A2" />
        </linearGradient>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF7E8" />
          <stop offset="1" stopColor="#F7DDB2" />
        </linearGradient>
        <clipPath id={`${id}k`}>
          <path d="M41 64H79L62.6 106.4C61.7 108.6 58.3 108.6 57.4 106.4Z" />
        </clipPath>
      </defs>
      <Shadow rx={11} />
      <ArtLoop on={on} animate={{ y: [0, -2.5, 0] }} transition={{ duration: 3.2 }}>
        <path d="M41 64H79L62.6 106.4C61.7 108.6 58.3 108.6 57.4 106.4Z" fill={`url(#${id}w)`} />
        <g clipPath={`url(#${id}k)`} stroke="#C67A34" strokeWidth="1.6" opacity="0.55">
          <path d="M36 66L74 112M48 62L82 104M60 62L86 94M30 76L60 112" />
          <path d="M84 66L46 112M72 62L38 104M60 62L34 94M90 76L60 112" />
        </g>
        <path d="M40 66C38 55 46 46 60 46C74 46 82 55 80 66C79 70 75.5 69 74 71.5C72.5 75 68.5 75 67.5 71.5C66.5 69.5 63 69.5 61.5 72C59.5 75.5 55 75 54 71.5C53 69 50 69.5 48.5 71C46.5 73 43 72.5 42.5 69.5C42 68 40.5 68 40 66Z" fill={`url(#${id}p)`} />
        <path d="M46 56C48 52 52 50 56 49.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
        <path d="M45 45C44 35 51 27 60 27C69 27 76 35 75 45C74.5 48.5 71 47.5 69.5 49.5C67.5 52.5 63.5 51.5 62.5 49C61.5 47 58.5 47 57.5 49C56 51.5 51.5 52 50 49C49 47 45.5 48.5 45 45Z" fill={`url(#${id}v)`} />
        <g strokeWidth="2.2" strokeLinecap="round">
          <path d="M52 36L54.5 34.5" stroke="#FF7A9A" />
          <path d="M63 33.5L65.5 35" stroke="#5EC9A4" />
          <path d="M68 41L69.5 38.8" stroke="#FFB648" />
          <path d="M56 42.5L58.6 42" stroke="#8C9BFF" />
        </g>
        <ArtLoop on={on} animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 2.6 }} origin="50% 100%">
          <path d="M60.5 22C61.5 17 64.5 14 68 13" fill="none" stroke="#7A4A2E" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="60" cy="25" r="5.6" fill="#E8365D" />
          <circle cx="58.2" cy="23.4" r="1.6" fill="#FFFFFF" opacity="0.7" />
        </ArtLoop>
      </ArtLoop>
      <Sparkle x={86} y={36} on={on} delay={0.4} />
    </>
  )
}

const TRUFFLES: { x: number; y: number; kind: "dark" | "milk" | "white" | "pink" }[] = [
  { x: 42, y: 47, kind: "milk" },
  { x: 78, y: 47, kind: "white" },
  { x: 60, y: 59, kind: "dark" },
  { x: 44, y: 70, kind: "pink" },
  { x: 76, y: 70, kind: "dark" },
  { x: 60, y: 82, kind: "milk" },
]

function Chocolate({ id, on }: Art) {
  const heart =
    "M60 98C39 86 18 71 18 50C18 36 28 26 41 26C50 26 56 31 60 37C64 31 70 26 79 26C92 26 102 36 102 50C102 71 81 86 60 98Z"
  return (
    <>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7D99" />
          <stop offset="1" stopColor="#E8436A" />
        </linearGradient>
        <radialGradient id={`${id}d`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#9A6242" />
          <stop offset="1" stopColor="#5A321F" />
        </radialGradient>
        <radialGradient id={`${id}m`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#C8895E" />
          <stop offset="1" stopColor="#8A5636" />
        </radialGradient>
        <radialGradient id={`${id}s`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFC2D2" />
          <stop offset="1" stopColor="#F07898" />
        </radialGradient>
        <radialGradient id={`${id}w`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFF8EC" />
          <stop offset="1" stopColor="#EED6B4" />
        </radialGradient>
      </defs>
      <Shadow rx={26} cy={106} />
      <ArtLoop on={on} animate={{ y: [0, -2, 0] }} transition={{ duration: 3.4 }}>
        <path d={heart} fill="#C22E55" transform="translate(0 5)" />
        <path d={heart} fill={`url(#${id}b)`} />
        <path d={heart} fill="#A8264A" transform="translate(60 61) scale(0.84) translate(-60 -61)" />
        <path d="M28 40C30 34 35 30.5 41 30" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
        {TRUFFLES.map(({ x, y, kind }) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <circle r="9.6" fill="#7E1D3A" opacity="0.55" cy="1.4" />
            <circle
              r="8.4"
              fill={`url(#${id}${kind === "white" ? "w" : kind === "dark" ? "d" : kind === "pink" ? "s" : "m"})`}
            />
            {kind === "pink" && (
              <path d="M-6 -1.5C-3 -4 0 1 3 -2C4.5 -3.4 5.6 -2.6 6.4 -1.6" fill="none" stroke="#FFF4F7" strokeWidth="1.8" strokeLinecap="round" />
            )}
            {kind === "dark" && <path d="M-4 -3.5L4 -3.5" stroke="#B98463" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />}
            {kind === "white" && <circle cx="1.5" cy="-1" r="1.6" fill="#E8B04A" />}
            <ellipse cx="-3" cy="-3.6" rx="2.6" ry="1.6" fill="#FFFFFF" opacity="0.35" />
          </g>
        ))}
      </ArtLoop>
      <Sparkle x={94} y={24} on={on} delay={0.3} />
      <Sparkle x={22} y={78} size={0.7} on={on} delay={1.4} />
    </>
  )
}

const MOMOS = [
  { x: 60, y: 62, s: 0.86 },
  { x: 43, y: 70, s: 1 },
  { x: 77, y: 70, s: 1 },
]

function Momos({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2CF95" />
          <stop offset="1" stopColor="#D9A563" />
        </linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFBF3" />
          <stop offset="1" stopColor="#F2DDBF" />
        </linearGradient>
      </defs>
      <Shadow rx={34} cy={107} />
      <Steam on={on} color="#E9B98F" paths={["M46 40C42 34 50 30 46 22", "M74 40C70 34 78 30 74 22"]} />
      <ellipse cx="60" cy="72" rx="38" ry="10" fill="#C08A4C" />
      <ellipse cx="60" cy="72.6" rx="33" ry="7.4" fill="#A26D37" />
      {MOMOS.map(({ x, y, s }) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-15 1C-15-9-7-17 0-19C7-17 15-9 15 1C15 5.5-15 5.5-15 1Z" fill={`url(#${id}m)`} />
          <path d="M0-18.5C-1-11-5-5-9-1M0-18.5C0-11 0-6 0-1M0-18.5C1-11 5-5 9-1" fill="none" stroke="#DCC09B" strokeWidth="1.6" strokeLinecap="round" />
          <circle cy="-18.5" r="2.4" fill="#F2DDBF" />
          <ellipse cx="-8" cy="-7" rx="2.4" ry="3.4" fill="#FFFFFF" opacity="0.8" />
        </g>
      ))}
      <path d="M22 72L26 96C27.5 102.5 39 106 60 106C81 106 92.5 102.5 94 96L98 72C96 79 80 83 60 83C40 83 24 79 22 72Z" fill={`url(#${id}b)`} />
      <path d="M24.2 85.5C30 90 44 92.5 60 92.5C76 92.5 90 90 95.8 85.5" fill="none" stroke="#B9844A" strokeWidth="2" opacity="0.7" />
      <path d="M28 76.5L31 96" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.4" />
      <Sparkle x={94} y={50} size={0.8} on={on} delay={0.8} />
    </>
  )
}

/** The candle flame, used on the gift cake and the birthday wish. */
export function Flame({ x, y, on, delay = 0 }: { x: number; y: number; on: boolean; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ArtLoop on={on} animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.9, 1.08, 0.9] }} transition={{ duration: 1.6, delay }}>
        <circle r="6.5" cy="-5" fill="#FFD36B" opacity="0.28" />
      </ArtLoop>
      <ArtLoop
        on={on}
        animate={{ scaleY: [1, 1.14, 0.94, 1], scaleX: [1, 0.92, 1.04, 1], rotate: [0, -4, 3, 0] }}
        transition={{ duration: 1.3, delay }}
        origin="50% 100%"
      >
        <path d="M0 0C-3.6 0-5-2.6-4.2-5.4C-3.4-8.2-0.6-9.6 0-13C0.6-9.6 3.4-8.2 4.2-5.4C5-2.6 3.6 0 0 0Z" fill="#FFB23E" />
        <path d="M0-1.2C-1.8-1.2-2.4-2.6-2-4C-1.6-5.4-0.3-6.2 0-8C0.3-6.2 1.6-5.4 2-4C2.4-2.6 1.8-1.2 0-1.2Z" fill="#FFF0B5" />
      </ArtLoop>
    </g>
  )
}

function Cake({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFF1DC" />
          <stop offset="1" stopColor="#F4D3A8" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB6C8" />
          <stop offset="1" stopColor="#FF8DAA" />
        </linearGradient>
      </defs>
      <Shadow rx={34} cy={106} />
      <ellipse cx="60" cy="100" rx="40" ry="7.5" fill="#E8D3E0" />
      <ellipse cx="60" cy="98.6" rx="40" ry="7" fill="#FFF8FB" />
      <path d="M28 66V92C28 97 42 101 60 101C78 101 92 97 92 92V66Z" fill={`url(#${id}s)`} />
      <path d="M28 80C28 85 42 89 60 89C78 89 92 85 92 80" fill="none" stroke="#FF9DB4" strokeWidth="3" opacity="0.6" />
      <path d="M28 66C28 61 42 57 60 57C78 57 92 61 92 66V71C92 73 89.5 73.6 88.5 72C87.5 70 84.5 70.5 84 73C83.4 77 78 77 77.4 73C77 70.6 73 71 71.2 73.4C69 76.4 64 75.6 63.4 72.8C63 71 58.6 71 57.8 73.8C56.8 77.6 51 78 50 74C49.4 71.6 45.6 71.2 44.4 73.4C43 76 38.4 75.6 38 72.6C37.6 70.4 34.4 70.4 33 72.4C31.6 74.4 28 74 28 71Z" fill={`url(#${id}f)`} />
      <ellipse cx="60" cy="64.6" rx="28" ry="5.6" fill="#FFC6D4" />
      <path d="M33 79V89" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
      <circle cx="41" cy="63" r="3.6" fill="#E8365D" />
      <circle cx="79" cy="63" r="3.6" fill="#E8365D" />
      <circle cx="40" cy="61.9" r="1.1" fill="#FFFFFF" opacity="0.7" />
      <circle cx="78" cy="61.9" r="1.1" fill="#FFFFFF" opacity="0.7" />
      <rect x="56.6" y="38" width="6.8" height="25" rx="2.4" fill="#8FA2FF" />
      <path d="M56.6 44L63.4 40.4M56.6 51L63.4 47.4M56.6 58L63.4 54.4" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />
      <path d="M60 38V35" stroke="#5A3A2A" strokeWidth="1.4" strokeLinecap="round" />
      <Flame x={60} y={35} on={on} />
      <Sparkle x={90} y={34} size={0.9} on={on} delay={0.5} />
      <Sparkle x={28} y={44} size={0.7} on={on} delay={1.5} />
    </>
  )
}

function Teddy({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3AE78" />
          <stop offset="1" stopColor="#C18550" />
        </linearGradient>
      </defs>
      <Shadow rx={28} cy={108} />
      <ArtLoop on={on} animate={{ rotate: [-2.5, 2.5, -2.5] }} transition={{ duration: 3.8 }} origin="50% 100%">
        {/* body, legs, arms */}
        <ellipse cx="60" cy="84" rx="23" ry="21" fill={`url(#${id}t)`} />
        <ellipse cx="60" cy="88" rx="14" ry="13" fill="#F6DCBC" />
        <ellipse cx="42" cy="101" rx="10.5" ry="7.5" fill="#C18550" />
        <ellipse cx="78" cy="101" rx="10.5" ry="7.5" fill="#C18550" />
        <ellipse cx="41" cy="101.5" rx="5" ry="4" fill="#F6DCBC" />
        <ellipse cx="79" cy="101.5" rx="5" ry="4" fill="#F6DCBC" />
        {/* heart held to the belly */}
        <ArtLoop on={on} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.4, repeatDelay: 0.6 }}>
          <path d={HEART_PATH} fill="#F2476F" transform="translate(60 85) scale(1.05)" />
          <path d="M53.4 81.8C54 80 55.6 79 57.2 79.2" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
        </ArtLoop>
        <ellipse cx="46" cy="84" rx="7" ry="10" fill="#CF9460" transform="rotate(-38 46 84)" />
        <ellipse cx="74" cy="84" rx="7" ry="10" fill="#C18550" transform="rotate(38 74 84)" />
        {/* head */}
        <circle cx="40" cy="30" r="9.5" fill="#D59C66" />
        <circle cx="80" cy="30" r="9.5" fill="#C99059" />
        <circle cx="40" cy="30" r="5" fill="#F6DCBC" />
        <circle cx="80" cy="30" r="5" fill="#F6DCBC" />
        <circle cx="60" cy="46" r="23" fill={`url(#${id}t)`} />
        <ellipse cx="60" cy="54" rx="10.5" ry="8" fill="#F6DCBC" />
        <path d="M57 50.2H63C63 52.2 61.6 53.4 60 53.4C58.4 53.4 57 52.2 57 50.2Z" fill="#4A2C1C" />
        <path d="M60 53.4V55.4M60 55.4C58.8 57 56.8 57 56 56M60 55.4C61.2 57 63.2 57 64 56" fill="none" stroke="#4A2C1C" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="51" cy="43.5" r="2.5" fill="#4A2C1C" />
        <circle cx="69" cy="43.5" r="2.5" fill="#4A2C1C" />
        <circle cx="51.8" cy="42.6" r="0.8" fill="#FFFFFF" />
        <circle cx="69.8" cy="42.6" r="0.8" fill="#FFFFFF" />
        <ellipse cx="45" cy="52" rx="3.6" ry="2.2" fill="#FF8FA3" opacity="0.55" />
        <ellipse cx="75" cy="52" rx="3.6" ry="2.2" fill="#FF8FA3" opacity="0.55" />
        <path d="M45 34C47 29.5 51 27 55.5 26.4" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />
        {/* bow tie */}
        <path d="M60 68.5L50.5 63.5C49 62.8 47.8 63.8 47.8 65.4V71.6C47.8 73.2 49 74.2 50.5 73.5ZM60 68.5L69.5 63.5C71 62.8 72.2 63.8 72.2 65.4V71.6C72.2 73.2 71 74.2 69.5 73.5Z" fill="#FF7A9A" />
        <circle cx="60" cy="68.5" r="3.2" fill="#F2476F" />
      </ArtLoop>
      <Sparkle x={92} y={24} on={on} delay={0.6} />
    </>
  )
}

function Bouquet({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFD3DE" />
          <stop offset="1" stopColor="#FFAEC3" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7EDDA6" />
          <stop offset="1" stopColor="#2F9E69" />
        </linearGradient>
      </defs>
      <Shadow rx={12} />
      <ArtLoop on={on} animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 4.4 }} origin="50% 100%">
        {/* back wrap */}
        <path d="M22 44L60 108L98 44C88 52 74 56 60 56C46 56 32 52 22 44Z" fill="#F38BA6" />
        {/* leaves */}
        <path d="M30 52C22 44 20 34 24 28C32 32 36 42 34 52Z" fill={`url(#${id}l)`} />
        <path d="M90 52C98 44 100 34 96 28C88 32 84 42 86 52Z" fill={`url(#${id}l)`} />
        <path d="M60 24C55 16 56 8 60 4C64 8 65 16 60 24Z" fill={`url(#${id}l)`} />
        {/* blooms */}
        <g transform="translate(42 40)">
          <circle r="13" fill="#FF9F80" />
          <path d="M-7-3C-5-8 3-8 5-4C7 0 2 4-1 2C-4 0-1-4 2-2" fill="none" stroke="#FFD0BD" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(78 40)">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cy="-7" rx="5.4" ry="7.4" fill="#FFF6EC" transform={`rotate(${r})`} />
          ))}
          <circle r="4.6" fill="#FFC94D" />
        </g>
        <g transform="translate(60 30)">
          <circle r="14.5" fill="#F2476F" />
          <path d="M-8-3C-6-9 4-9 6-4C8 1 2 5-1.5 2.5C-5 0-1.5-4.5 2.5-2.5" fill="none" stroke="#FF9BB2" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-10-6C-9-9-7-11-4.5-12" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </g>
        {/* front wrap */}
        <path d="M27 54C37 61 48 64 60 64C72 64 83 61 93 54L64 104.5C62.2 107.8 57.8 107.8 56 104.5Z" fill={`url(#${id}w)`} />
        <path d="M37 62L55 96" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
        {/* ribbon */}
        <path d="M60 86C53 80 45 80 45.5 85.5C46 91 54 90 60 86ZM60 86C67 80 75 80 74.5 85.5C74 91 66 90 60 86Z" fill="#E8365D" />
        <path d="M58.5 87L54 99M61.5 87L66 99" stroke="#E8365D" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="86" r="3.2" fill="#C42652" />
      </ArtLoop>
      <Sparkle x={98} y={14} on={on} delay={0.2} />
      <Sparkle x={18} y={18} size={0.7} on={on} delay={1.3} />
    </>
  )
}

function Chai({ id, on }: Art) {
  const glass = "M38 46L44.6 99.5C45 103 47.6 105.5 51 105.5H69C72.4 105.5 75 103 75.4 99.5L82 46Z"
  return (
    <>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E3AE7C" />
          <stop offset="0.5" stopColor="#D1915B" />
          <stop offset="1" stopColor="#B87444" />
        </linearGradient>
        <clipPath id={`${id}k`}>
          <path d={glass} />
        </clipPath>
      </defs>
      <Shadow rx={20} cy={108} />
      <Steam on={on} color="#E9B98F" paths={["M51 38C47 32 55 28 51 20", "M69 38C65 32 73 28 69 20"]} />
      {/* glass */}
      <ellipse cx="60" cy="46" rx="22" ry="4.6" fill="#FBEFE3" />
      <path d={glass} fill="#FBEFE3" stroke="#EAD3BE" strokeWidth="1.2" />
      <g clipPath={`url(#${id}k)`}>
        <rect x="30" y="55" width="60" height="44" fill={`url(#${id}t)`} />
        <rect x="30" y="94" width="60" height="14" fill="#F4E4D4" />
        <ellipse cx="60" cy="55" rx="21" ry="4.4" fill="#EEC59A" />
        <ellipse cx="57" cy="54.6" rx="11" ry="2" fill="#F8DCBB" />
        {/* ribs */}
        <g strokeWidth="2.2" strokeLinecap="round">
          {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
            <path
              key={k}
              d={`M${60 + k * 6.6} 49L${60 + k * 4.2} 103`}
              stroke={k % 2 === 0 ? "#FFFFFF" : "#9A5E36"}
              opacity={k % 2 === 0 ? 0.32 : 0.16}
            />
          ))}
        </g>
      </g>
      <path d="M44.5 52L49.5 97" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="60" cy="46" rx="22" ry="4.6" fill="none" stroke="#F1D9C2" strokeWidth="2.4" />
      <path d="M40.5 45C46 42.6 52 41.6 58 41.5" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <path d="M45 100.5C49 102.6 71 102.6 75 100.5" fill="none" stroke="#E2C7AE" strokeWidth="1.6" strokeLinecap="round" />
      <Sparkle x={92} y={56} size={0.8} on={on} delay={0.7} />
    </>
  )
}

const PETALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (i * 360) / 13)

function Sunflower({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="1" stopColor="#FFB72E" />
        </linearGradient>
        <radialGradient id={`${id}c`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#9A6242" />
          <stop offset="1" stopColor="#5A321F" />
        </radialGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7EDDA6" />
          <stop offset="1" stopColor="#2F9E69" />
        </linearGradient>
      </defs>
      <Shadow rx={14} />
      <ArtLoop on={on} animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 4 }} origin="50% 100%">
        <path d="M60 60C62.5 76 57.5 92 60.5 108" fill="none" stroke="#2F9E69" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M60.2 86C67 74 80 72 87 77C81 88 68.5 91 60.2 86Z" fill={`url(#${id}l)`} />
        <path d="M62 85.4C68.5 81.5 75.5 79.2 83 78.6" fill="none" stroke="#B5F0CD" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        <path d="M59.4 97C53 88 42 87 35.5 91.5C41 100 52 102.5 59.4 97Z" fill={`url(#${id}l)`} />
        <g transform="translate(60 38)">
          {PETALS.map((r) => (
            <ellipse key={`b${r}`} cy="-17" rx="5.4" ry="10" fill="#F2A23A" transform={`rotate(${r + 360 / 26})`} />
          ))}
          {PETALS.map((r) => (
            <ellipse key={`f${r}`} cy="-18" rx="5" ry="10" fill={`url(#${id}p)`} transform={`rotate(${r})`} />
          ))}
          <circle r="12.5" fill={`url(#${id}c)`} />
          <g fill="#B98463" opacity="0.75">
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <circle key={r} cy="-7" r="1.3" transform={`rotate(${r})`} />
            ))}
            {[30, 150, 270].map((r) => (
              <circle key={r} cy="-3.4" r="1.1" transform={`rotate(${r})`} />
            ))}
          </g>
          <path d="M-8-4C-6.8-7.4-4-9.4-0.8-9.8" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
        </g>
      </ArtLoop>
      <Sparkle x={96} y={16} on={on} delay={0.3} />
      <Sparkle x={22} y={64} size={0.7} on={on} delay={1.3} />
    </>
  )
}

function Kiss({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}u`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7E9C" />
          <stop offset="1" stopColor="#E8365D" />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2476F" />
          <stop offset="1" stopColor="#D02A54" />
        </linearGradient>
      </defs>
      <g transform="rotate(-12 60 66)">
        {/* upper lip */}
        <path
          d="M26 66C32 57 41 47 50 47C54.5 47 57.5 49.6 60 52.4C62.5 49.6 65.5 47 70 47C79 47 88 57 94 66C86 63.2 76 62.4 67 64.2C64 64.8 62 65 60 65C58 65 56 64.8 53 64.2C44 62.4 34 63.2 26 66Z"
          fill={`url(#${id}u)`}
        />
        {/* lower lip */}
        <path
          d="M26 66.4C34 67.8 45 68.6 53 68.2C56 68 58.4 68.5 60 68.5C61.6 68.5 64 68 67 68.2C75 68.6 86 67.8 94 66.4C88 79 75 87 60 87C45 87 32 79 26 66.4Z"
          fill={`url(#${id}d)`}
        />
        {/* print creases */}
        <g fill="none" stroke="#B5214A" strokeWidth="1.4" strokeLinecap="round" opacity="0.45">
          <path d="M44 53.5L45.5 60M52 51L52.6 58M68 51L67.4 58M76 53.5L74.5 60" />
          <path d="M42 72L43.5 79M51 73L51.6 82M60 73V83M69 73L68.4 82M78 72L76.5 79" />
        </g>
        <path d="M40 74C45 79 52 81.4 58 81.6" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
        <path d="M37 56C40 52.4 44 50 48 49.4" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        <circle cx="72" cy="77" r="1.6" fill="#FFFFFF" opacity="0.6" />
      </g>
      <g transform="translate(90 32)">
        <ArtLoop on={on} animate={{ scale: [1, 1.3, 1], y: [0, -3, 0] }} transition={{ duration: 1.6, repeatDelay: 0.8 }}>
          <path d={HEART_PATH} fill="#FF5C82" transform="scale(0.85)" />
          <path d="M-5.6-3.4C-5.2-5-4-6-2.6-6" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
        </ArtLoop>
      </g>
      <g transform="translate(74 18)">
        <ArtLoop on={on} animate={{ scale: [1, 1.3, 1], y: [0, -3, 0] }} transition={{ duration: 1.6, delay: 0.5, repeatDelay: 0.8 }}>
          <path d={HEART_PATH} fill="#FF9BB2" transform="scale(0.55)" />
        </ArtLoop>
      </g>
      <Sparkle x={24} y={42} size={0.8} on={on} delay={1} />
    </>
  )
}

function Balloon({ id, on }: Art) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}b`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#FF9DB4" />
          <stop offset="0.55" stopColor="#F2476F" />
          <stop offset="1" stopColor="#C42652" />
        </radialGradient>
      </defs>
      <Shadow rx={10} />
      <ArtLoop on={on} animate={{ y: [0, -4, 0], rotate: [-2, 2, -2] }} transition={{ duration: 3.6 }} origin="50% 100%">
        <path
          d="M60 75C61 80 56 83 59 88C62 93 66 91 64 96C62 101 56 99 57 104C57.6 106.4 59.6 107.6 61 108"
          fill="none"
          stroke="#D58FA6"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d={HEART_PATH} fill={`url(#${id}b)`} transform="translate(60 40) scale(3.3)" />
        <path d="M57 72.4C58.6 70.4 61.4 70.4 63 72.4L61.4 75.4H58.6Z" fill="#C42652" />
        <path d="M34 34C35 26 41 20.6 48 20.4" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" opacity="0.6" />
        <circle cx="35.5" cy="41" r="2" fill="#FFFFFF" opacity="0.55" />
      </ArtLoop>
      <Sparkle x={96} y={20} on={on} delay={0.4} />
      <Sparkle x={22} y={70} size={0.7} on={on} delay={1.5} />
    </>
  )
}

const PEPPERONI = [
  { x: 47, y: 47, r: 6.2 },
  { x: 72, y: 49, r: 6.6 },
  { x: 60, y: 69, r: 5.8 },
]

function Pizza({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}c`} x1="29" y1="32" x2="91" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE38A" />
          <stop offset="1" stopColor="#FFB938" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2B86E" />
          <stop offset="1" stopColor="#D58A3E" />
        </linearGradient>
      </defs>
      <Shadow rx={12} />
      <ArtLoop on={on} animate={{ y: [0, -2.5, 0], rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 3.4 }}>
        {/* cheese */}
        <path d="M29 36C44 30.5 76 30.5 91 36L62.6 102C61.6 104.4 58.4 104.4 57.4 102Z" fill={`url(#${id}c)`} />
        {/* drips */}
        <path d="M33.3 46C32.2 51 31.6 57 31.8 60.4C32 63.6 35.8 63.6 36 60.4C36.1 58.4 36.4 56 36.7 54Z" fill={`url(#${id}c)`} />
        <ArtLoop on={on} animate={{ scaleY: [1, 1.18, 1] }} transition={{ duration: 2.4 }} origin="50% 0%">
          <path d="M85 50C86.2 56 87 63 86.6 67.6C86.2 71.4 81.6 71.4 81.4 67.6C81.2 64 81.6 59 82.4 56Z" fill={`url(#${id}c)`} />
        </ArtLoop>
        <path d="M35 42C41 39.6 47 38.6 53 38.2" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
        <path d="M37 47L52 83" fill="none" stroke="#FFF4C9" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        {/* toppings */}
        {PEPPERONI.map(({ x, y, r }) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <circle r={r} cy="1" fill="#B8323F" opacity="0.35" />
            <circle r={r} fill="#E0484F" />
            <circle cx="-2" cy="-1.6" r="1.1" fill="#B8323F" />
            <circle cx="2" cy="1.6" r="0.9" fill="#B8323F" />
            <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.35} ry={r * 0.22} fill="#FFFFFF" opacity="0.4" />
          </g>
        ))}
        <g fill="none" strokeLinecap="round" strokeWidth="2.4">
          <path d="M58 52.5C60 51 62.4 51 64 52.5" stroke="#4CB46F" />
          <path d="M66 82C67.5 80.6 69.6 80.6 70.6 82" stroke="#4CB46F" />
          <path d="M49 62C50.4 60.6 52.6 60.6 53.6 62" stroke="#4CB46F" />
        </g>
        <circle cx="74" cy="64" r="2.4" fill="none" stroke="#5A3A2A" strokeWidth="1.8" />
        <circle cx="56" cy="87" r="2" fill="none" stroke="#5A3A2A" strokeWidth="1.6" />
        {/* crust */}
        <path d="M24 34C40 22 80 22 96 34C97.6 38.6 94.8 42.4 90.4 41C76 34.6 44 34.6 29.6 41C25.2 42.4 22.4 38.6 24 34Z" fill={`url(#${id}r)`} />
        <path d="M31 31.4C42 27 52 25.8 60 25.8" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <g fill="#B8732F" opacity="0.6">
          <circle cx="44" cy="31.6" r="1" />
          <circle cx="66" cy="29.6" r="1" />
          <circle cx="80" cy="32.4" r="1" />
        </g>
      </ArtLoop>
      <Sparkle x={98} y={60} size={0.8} on={on} delay={0.9} />
    </>
  )
}

function Diamond({ id, on }: Art) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE9A3" />
          <stop offset="0.5" stopColor="#F2BE4E" />
          <stop offset="1" stopColor="#C98A2E" />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4FBFF" />
          <stop offset="1" stopColor="#A9DCF7" />
        </linearGradient>
      </defs>
      <Shadow rx={24} cy={108} />
      {/* band */}
      <path
        d="M60 60C74.4 60 86 70.6 86 83.4C86 96.2 74.4 106 60 106C45.6 106 34 96.2 34 83.4C34 70.6 45.6 60 60 60ZM60 66C48.6 66 40 73.6 40 83C40 92.4 48.6 100 60 100C71.4 100 80 92.4 80 83C80 73.6 71.4 66 60 66Z"
        fill={`url(#${id}g)`}
        fillRule="evenodd"
      />
      <path d="M41.6 76.6C44.6 70.6 51.6 66.4 60 66" fill="none" stroke="#B57A26" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <path d="M38.4 92C42 99 50 103.4 59 103.6" fill="none" stroke="#FFF2C6" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      {/* setting */}
      <path d="M50 55H70L66 64.4C65.4 65.6 64.2 66.4 62.8 66.4H57.2C55.8 66.4 54.6 65.6 54 64.4Z" fill={`url(#${id}g)`} />
      <path d="M52 55.6L55.6 63" stroke="#FFF2C6" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      {/* stone */}
      <ArtLoop on={on} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.4 }} origin="50% 100%">
        <path d="M41 33L49 23H71L79 33L60 58Z" fill={`url(#${id}d)`} />
        <path d="M41 33H79L60 58Z" fill="#BFE6FB" />
        <path d="M41 33L53 33L60 58Z" fill="#DDF3FF" />
        <path d="M67 33H79L60 58Z" fill="#8FCDF0" />
        <path d="M49 23L53 33H41Z" fill="#E9F7FF" />
        <path d="M71 23L67 33H79Z" fill="#A9DCF7" />
        <path d="M53 33L60 23L67 33Z" fill="#FFFFFF" opacity="0.7" />
        <g fill="none" stroke="#7BBDE3" strokeWidth="0.9" strokeLinejoin="round" opacity="0.7">
          <path d="M41 33L49 23H71L79 33L60 58Z" />
          <path d="M41 33H79M53 33L60 58M67 33L60 58M49 23L53 33L60 23L67 33L71 23" />
        </g>
        <path d="M47 28.4L50.4 24.6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </ArtLoop>
      {/* prongs */}
      <circle cx="44.6" cy="38" r="1.9" fill="#E3A53E" />
      <circle cx="75.4" cy="38" r="1.9" fill="#D9982F" />
      <Sparkle x={82} y={20} size={1.2} on={on} />
      <Sparkle x={36} y={18} size={0.8} on={on} delay={0.8} color="#9BD8FF" />
      <Sparkle x={92} y={46} size={0.6} on={on} delay={1.6} color="#9BD8FF" />
      <Sparkle x={27} y={54} size={0.7} on={on} delay={1.2} />
    </>
  )
}

const ART: Record<GiftId, (p: Art) => ReactNode> = {
  rose: Rose,
  coffee: Coffee,
  icecream: IceCream,
  chocolate: Chocolate,
  momos: Momos,
  cake: Cake,
  teddy: Teddy,
  bouquet: Bouquet,
  chai: Chai,
  sunflower: Sunflower,
  kiss: Kiss,
  balloon: Balloon,
  pizza: Pizza,
  diamond: Diamond,
}

/** An illustrated gift. `animate` adds a soft idle loop (skipped for reduced motion). */
export function GiftArt({ gift, className, animate }: { gift: GiftId; className?: string; animate?: boolean }) {
  const id = useSvgId()
  const on = !!animate
  const Draw = ART[gift]
  return (
    <svg viewBox="0 0 120 120" className={cn("size-10 shrink-0 overflow-visible", className)} aria-hidden>
      <Draw id={id} on={on} />
    </svg>
  )
}
