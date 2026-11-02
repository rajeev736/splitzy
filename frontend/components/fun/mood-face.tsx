"use client"

import { useId, type ReactNode } from "react"
import { cn } from "cn"

import type { MoodId } from "@/lib/fun/catalog"

const INK = "#4A2B36"

const TONES: Record<MoodId, [light: string, deep: string]> = {
  happy: ["#FFE07F", "#FFC24A"],
  chill: ["#A3EBCD", "#5ACB9F"],
  busy: ["#FFBBA0", "#FF9370"],
  hungry: ["#FFCF94", "#FFA758"],
  sleepy: ["#D9CEFF", "#AE9DF4"],
  sad: ["#CBD7EB", "#9AAED0"],
  party: ["#FFBAD3", "#FF85AE"],
  focused: ["#A8C8FF", "#6E99F0"],
}

const line = { fill: "none", stroke: INK, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const

const Blush = () => (
  <g fill="#FF5C86" opacity="0.3">
    <ellipse cx="13.5" cy="32" rx="3" ry="1.8" />
    <ellipse cx="34.5" cy="32" rx="3" ry="1.8" />
  </g>
)

const HappyEyes = () => <path d="M16 27.5q2.5-3.4 5 0M27 27.5q2.5-3.4 5 0" {...line} />
const DotEyes = ({ y = 27 }: { y?: number }) => (
  <g fill={INK}>
    <circle cx="18.5" cy={y} r="2" />
    <circle cx="29.5" cy={y} r="2" />
  </g>
)
const OpenSmile = () => (
  <>
    <path d="M20.2 32h7.6c0 2.8-1.7 4.6-3.8 4.6s-3.8-1.8-3.8-4.6Z" fill={INK} />
    <path d="M21.8 35.6c1.3-0.9 3.1-0.9 4.4 0c-0.6 0.6-1.3 1-2.2 1s-1.6-0.4-2.2-1Z" fill="#FF7A98" />
  </>
)

const FACES: Record<MoodId, ReactNode> = {
  happy: (
    <>
      <HappyEyes />
      <OpenSmile />
      <Blush />
    </>
  ),
  chill: (
    <>
      <path d="M12.8 23.5h9.2v2.4a4.6 4.6 0 0 1-9.2 0ZM26 23.5h9.2v2.4a4.6 4.6 0 0 1-9.2 0Z" fill="#2E2836" />
      <path d="M22 24.3h4M12.8 23.6h-1.6M35.2 23.6h1.6" stroke="#2E2836" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 25.4l2-1.2M28.2 25.4l2-1.2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M20.5 33.4q3.8 2.4 7.5-0.8" {...line} />
      <Blush />
    </>
  ),
  busy: (
    <>
      <path d="M15.8 22.6l4.8 1M32.2 22.6l-4.8 1" {...line} strokeWidth={2} />
      <DotEyes />
      <path d="M21 34.2h6" {...line} />
      <path d="M38.5 10c1.9 2.8 3 4.5 3 5.9a3 3 0 0 1-6 0c0-1.4 1.1-3.1 3-5.9Z" fill="#7CC8FF" />
    </>
  ),
  hungry: (
    <>
      <HappyEyes />
      <path d="M18.5 32q5.5 3.6 11 0" {...line} />
      <path d="M24.4 33.7c0 3 1.2 4.9 3 4.9s3-1.9 3-4.9c-2 0.7-4 0.7-6 0Z" fill="#FF6F92" />
      <Blush />
    </>
  ),
  sleepy: (
    <>
      <path d="M16 27q2.5 2.6 5 0M27 27q2.5 2.6 5 0" {...line} />
      <ellipse cx="24" cy="33.6" rx="1.6" ry="2" fill={INK} />
      <path d="M33.5 7h4.6l-4.6 4.6h4.6M40.4 2.6h2.8l-2.8 2.8h2.8" fill="none" stroke="#7B66D9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Blush />
    </>
  ),
  sad: (
    <>
      <path d="M15.8 23.6l4.4-1.3M32.2 23.6l-4.4-1.3" {...line} strokeWidth={2} />
      <DotEyes y={27.6} />
      <path d="M20.6 35q3.4-2.6 6.8 0" {...line} />
    </>
  ),
  party: (
    <>
      <HappyEyes />
      <OpenSmile />
      <Blush />
      <g transform="rotate(16 31 11)">
        <path d="M24.5 12.5h13L31 0Z" fill="#8C9BFF" />
        <path d="M26.6 8.3h8.8M28.7 4.1h4.6" stroke="#FFE27A" strokeWidth="1.8" />
        <circle cx="31" cy="0.5" r="2.3" fill="#FFC94D" />
      </g>
      <circle cx="9" cy="12" r="1.5" fill="#5EC9A4" />
      <rect x="4.5" y="19" width="3.2" height="1.6" rx="0.6" fill="#FFC94D" transform="rotate(-30 6 20)" />
    </>
  ),
  focused: (
    <>
      <path d="M15.6 22.2l5.2 0.9M32.4 22.2l-5.2 0.9" {...line} strokeWidth={2} />
      <g fill={INK}>
        <circle cx="18.5" cy="27" r="2.4" />
        <circle cx="29.5" cy="27" r="2.4" />
      </g>
      <g fill="#FFFFFF">
        <circle cx="19.3" cy="26.2" r="0.8" />
        <circle cx="30.3" cy="26.2" r="0.8" />
      </g>
      <path d="M21 33.2q3 2 6 0" {...line} />
    </>
  ),
}

/** A small, flat illustrated face for a mood. */
export function MoodFace({ mood, className }: { mood: MoodId; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const [light, deep] = TONES[mood]
  return (
    <svg viewBox="0 0 48 48" className={cn("size-5 shrink-0 overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}f`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="26" r="19.5" fill={`url(#${id}f)`} />
      {FACES[mood]}
    </svg>
  )
}
