"use client"

import type { ReactNode } from "react"
import { cn } from "cn"

import type { LoveNudge } from "@/lib/fun/catalog"
import { ArtLoop, Flame, HEART_PATH, Sparkle, useSvgId } from "./gift-art"

type Art = { id: string; on: boolean }

/** A soft gumdrop body, about 56 wide, centred on 0,0. */
const BODY = "M0-30C17-30 28-16 28 2C28 18 16 27 0 27C-16 27-28 18-28 2C-28-16-17-30 0-30Z"

const INK = "#5B3346"

/**
 * One round little character. `look` shifts the face toward a partner,
 * `eyes` picks happy (curved up) or dreamy (curved down) closed eyes.
 */
function Blob({
  fill,
  look = 0,
  eyes = "happy",
  mouth = "smile",
  children,
}: {
  fill: string
  look?: number
  eyes?: "happy" | "dreamy"
  mouth?: "smile" | "pucker" | "none"
  children?: ReactNode
}) {
  const eye = eyes === "happy" ? "q3.5-4.2 7 0" : "q3.5 3.6 7 0"
  return (
    <g>
      <path d={BODY} fill={fill} />
      <path d="M-17-17C-14-22-9-25-3.5-26" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <g transform={`translate(${look} 0)`}>
        <path
          d={`M-12.5-3.5${eye}M5.5-3.5${eye}`}
          fill="none"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <ellipse cx="-14" cy="5" rx="4.2" ry="2.6" fill="#FF6F92" opacity="0.4" />
        <ellipse cx="14" cy="5" rx="4.2" ry="2.6" fill="#FF6F92" opacity="0.4" />
        {mouth === "smile" && (
          <path d="M-3 4.5q3 3.2 6 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        )}
        {mouth === "pucker" && (
          <path
            d="M1.5 2.2c2.6-1.6 4.4 0.6 2.4 2.2c2 1.6 0.2 3.8-2.4 2.2"
            fill="none"
            stroke={INK}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
      {children}
    </g>
  )
}

function Gradients({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFB7CA" />
        <stop offset="1" stopColor="#FF86A6" />
      </linearGradient>
      <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#D2C4FF" />
        <stop offset="1" stopColor="#A592F7" />
      </linearGradient>
    </defs>
  )
}

const Shadow = ({ rx, cx = 60 }: { rx: number; cx?: number }) => (
  <ellipse cx={cx} cy="104" rx={rx} ry="3.4" fill="#3B1D2A" opacity="0.1" />
)

function Hug({ id, on }: Art) {
  return (
    <>
      <Gradients id={id} />
      <Shadow rx={40} />
      <ArtLoop
        on={on}
        animate={{ scaleX: [1, 0.95, 1.01, 1], scaleY: [1, 1.03, 0.99, 1] }}
        transition={{ duration: 2.4, repeatDelay: 0.4 }}
        origin="50% 100%"
      >
        <g transform="translate(79 78) rotate(-8) scale(0.9)">
          <Blob fill={`url(#${id}v)`} look={-5} />
        </g>
        {/* one hand peeks out from behind, the other arm wraps over the front */}
        <ellipse cx="16.5" cy="84" rx="5.2" ry="6.4" fill="#AE9CF8" transform="rotate(-18 16.5 84)" />
        <g transform="translate(42 78) rotate(8) scale(0.9)">
          <Blob fill={`url(#${id}p)`} look={5} />
        </g>
        <path d="M58 93C66 89 75 88 83 90.5" fill="none" stroke="#FF8DAB" strokeWidth="7.5" strokeLinecap="round" />
      </ArtLoop>
      <ArtLoop
        on={on}
        animate={{ y: [0, -4, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 2.4, repeatDelay: 0.4 }}
      >
        <path d={HEART_PATH} fill="#F2476F" transform="translate(60 30) scale(0.95)" />
      </ArtLoop>
      <Sparkle x={42} y={24} size={0.8} on={on} delay={0.3} />
      <Sparkle x={80} y={30} size={0.6} on={on} delay={1.2} />
    </>
  )
}

function Kiss({ id, on }: Art) {
  return (
    <>
      <Gradients id={id} />
      <Shadow rx={40} />
      <ArtLoop on={on} animate={{ rotate: [0, 3, 0] }} transition={{ duration: 2.6 }} origin="50% 100%">
        <g transform="translate(81 78) rotate(-10) scale(0.94)">
          <Blob fill={`url(#${id}v)`} look={-6} />
        </g>
      </ArtLoop>
      <ArtLoop on={on} animate={{ rotate: [0, -3, 0] }} transition={{ duration: 2.6 }} origin="50% 100%">
        <g transform="translate(40 76) rotate(15)">
          <Blob fill={`url(#${id}p)`} look={7} mouth="pucker" />
        </g>
      </ArtLoop>
      <ArtLoop
        on={on}
        animate={{ scale: [0.4, 1.15, 1, 1], y: [8, -2, -4, -6], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.6, times: [0, 0.25, 0.7, 1], ease: "easeOut" }}
        origin="50% 100%"
      >
        <path d={HEART_PATH} fill="#F2476F" transform="translate(61 30) scale(1.05)" />
        <path d="M54.8 26.4C55.4 24.6 57 23.6 58.6 23.8" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      </ArtLoop>
      <ArtLoop
        on={on}
        animate={{ y: [4, -6], opacity: [0, 1, 0] }}
        transition={{ duration: 2.6, delay: 0.5, ease: "easeOut" }}
      >
        <path d={HEART_PATH} fill="#FF8DAB" transform="translate(44 30) scale(0.5)" />
        <path d={HEART_PATH} fill="#AE9CF8" transform="translate(79 24) scale(0.42)" />
      </ArtLoop>
    </>
  )
}

function Miss({ id, on }: Art) {
  return (
    <>
      <Gradients id={id} />
      <defs>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7A98" />
          <stop offset="1" stopColor="#E8436A" />
        </linearGradient>
      </defs>
      <Shadow rx={26} cx={50} />
      <ArtLoop on={on} animate={{ y: [0, -3, 0] }} transition={{ duration: 3.4 }}>
        <g transform="translate(50 71)">
          <Blob fill={`url(#${id}p)`} eyes="dreamy" mouth="none" />
        </g>
        {/* heart pillow, hugged tight */}
        <g transform="translate(50 90) scale(1.75)">
          <path d={HEART_PATH} fill={`url(#${id}h)`} />
          <path d={HEART_PATH} fill="none" stroke="#FFC2D0" strokeWidth="0.9" strokeDasharray="1.6 1.4" transform="scale(0.78)" />
        </g>
        <ellipse cx="34.5" cy="85" rx="5.4" ry="7.6" fill="#FF8DAB" transform="rotate(-28 34.5 85)" />
        <ellipse cx="65.5" cy="85" rx="5.4" ry="7.6" fill="#FF8DAB" transform="rotate(28 65.5 85)" />
      </ArtLoop>
      {/* a thought of someone */}
      <ArtLoop on={on} animate={{ y: [0, -3, 0], opacity: [0.85, 1, 0.85] }} transition={{ duration: 3.4, delay: 0.6 }}>
        <circle cx="74" cy="46" r="2.6" fill="#E9E2FF" />
        <circle cx="80" cy="38" r="3.8" fill="#E9E2FF" />
        <path
          d="M84 30C80 30 77.5 26.6 79 23C76.5 19.5 79 14.5 83.5 15C85 11 90.5 9.5 94 12.5C97.5 9.5 103.5 11.5 104 16C108.5 16.5 110 22.5 106.5 25C107.5 29 103.5 31.5 100.5 30C98 32.5 92.5 32.5 90.5 30Z"
          fill="#E9E2FF"
        />
        <circle cx="93" cy="22" r="7" fill={`url(#${id}v)`} />
        <path d="M89.2 21.4q1.4-1.6 2.8 0M94 21.4q1.4-1.6 2.8 0" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      </ArtLoop>
    </>
  )
}

const CONFETTI: { x: number; y: number; r: number; c: string; shape: "rect" | "dot" }[] = [
  { x: 20, y: 30, r: 20, c: "#FF7A9A", shape: "rect" },
  { x: 32, y: 16, r: -30, c: "#FFC94D", shape: "dot" },
  { x: 96, y: 18, r: 40, c: "#8C9BFF", shape: "rect" },
  { x: 104, y: 40, r: -15, c: "#5EC9A4", shape: "dot" },
  { x: 16, y: 56, r: 60, c: "#8C9BFF", shape: "dot" },
  { x: 86, y: 8, r: -50, c: "#FF7A9A", shape: "dot" },
  { x: 108, y: 64, r: 25, c: "#FFC94D", shape: "rect" },
  { x: 26, y: 4, r: 10, c: "#5EC9A4", shape: "rect" },
]

function Wish({ id, on }: Art) {
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
      {CONFETTI.map(({ x, y, r, c, shape }, i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ArtLoop
            on={on}
            animate={{ y: [-4, 8], rotate: [r, r + 120], opacity: [0, 1, 0] }}
            transition={{ duration: 2.8, ease: "linear", delay: (i % 4) * 0.6 }}
          >
            {shape === "rect" ? (
              <rect x="-3.2" y="-1.6" width="6.4" height="3.2" rx="1" fill={c} transform={`rotate(${r})`} />
            ) : (
              <circle r="2.2" fill={c} />
            )}
          </ArtLoop>
        </g>
      ))}
      <ellipse cx="60" cy="105" rx="34" ry="3.4" fill="#3B1D2A" opacity="0.1" />
      <ellipse cx="60" cy="101" rx="42" ry="7" fill="#E8D3E0" />
      <ellipse cx="60" cy="99.6" rx="42" ry="6.6" fill="#FFF8FB" />
      {/* bottom tier */}
      <path d="M26 76V94C26 98.5 41 102 60 102C79 102 94 98.5 94 94V76Z" fill={`url(#${id}s)`} />
      <path d="M26 76C26 71.5 41 68 60 68C79 68 94 71.5 94 76C94 80.5 79 84 60 84C41 84 26 80.5 26 76Z" fill="#FFF6EA" />
      <path d="M26 89C29 93 43 95.5 60 95.5C77 95.5 91 93 94 89" fill="none" stroke="#FF9DB4" strokeWidth="2.6" opacity="0.55" />
      <g fill="#FF8DAA">
        {[32, 44, 56, 68, 80, 90].map((x) => (
          <circle key={x} cx={x} cy={x < 60 ? 81 + (60 - x) * 0.06 : 81 + (x - 60) * 0.06} r="2.4" />
        ))}
      </g>
      {/* top tier */}
      <path d="M38 56V74C38 77.5 48 80 60 80C72 80 82 77.5 82 74V56Z" fill={`url(#${id}s)`} />
      <path d="M38 56C38 52.5 48 50 60 50C72 50 82 52.5 82 56V61C82 63 79.5 63.4 78.6 61.6C77.6 59.6 74.4 60 74 62.6C73.4 66.4 68.2 66.4 67.6 62.6C67.2 60.4 63.2 60.6 62.4 63C61.4 66.6 55.8 66.8 55.2 63.2C54.8 60.8 51 60.6 50 62.8C48.8 65.6 44.2 65.4 43.8 62.4C43.4 60.2 40.4 60.2 39.6 62C38.8 63.6 38 63 38 61Z" fill={`url(#${id}f)`} />
      <ellipse cx="60" cy="55.4" rx="19.6" ry="4" fill="#FFC6D4" />
      <path d="M42 66V73" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
      {/* candles */}
      {[
        { x: 48, c: "#8FA2FF", d: 0 },
        { x: 60, c: "#5EC9A4", d: 0.35 },
        { x: 72, c: "#FFB648", d: 0.7 },
      ].map(({ x, c, d }) => (
        <g key={x}>
          <rect x={x - 2.8} y={36} width="5.6" height="19" rx="2" fill={c} />
          <path d={`M${x - 2.8} 42L${x + 2.8} 39M${x - 2.8} 49L${x + 2.8} 46`} stroke="#FFFFFF" strokeWidth="1.6" opacity="0.75" />
          <path d={`M${x} 36V33.5`} stroke="#5A3A2A" strokeWidth="1.2" strokeLinecap="round" />
          <Flame x={x} y={33.5} on={on} delay={d} />
        </g>
      ))}
    </>
  )
}

const ART: Record<LoveNudge | "wish", (p: Art) => ReactNode> = {
  hug: Hug,
  kiss: Kiss,
  miss: Miss,
  wish: Wish,
}

/** An illustrated moment between two people. `animate` adds a soft loop. */
export function MomentArt({
  kind,
  className,
  animate,
}: {
  kind: LoveNudge | "wish"
  className?: string
  animate?: boolean
}) {
  const id = useSvgId()
  const on = !!animate
  const Draw = ART[kind]
  return (
    <svg viewBox="0 0 120 120" className={cn("size-10 shrink-0 overflow-visible", className)} aria-hidden>
      <Draw id={id} on={on} />
    </svg>
  )
}
