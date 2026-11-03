"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

/**
 * A party popper. Outlined in the text colour when off (like an un-liked
 * heart); in full colour, with its streamers out, when on.
 */
export function PartyPopperIcon({ active, className }: { active: boolean; className?: string }) {
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const cone = "M4.2 20.4 8.9 7.6 16.6 15.3Z"

  if (!active) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-5", className)}>
        <path d={cone} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M7.1 12.5l4.6 4.6M5.9 15.9l2.4 2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M12.6 6.4c.4-1.6 1.6-2.4 3.2-2M15.7 9.6c1.5-.5 2.6 0 3.3 1.3M17.6 4.2v.01M20 7.2v.01M14.2 2.8v.01"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5", className)}>
      <defs>
        <linearGradient id={`${id}-cone`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
      <path d={cone} fill={`url(#${id}-cone)`} stroke="#D97706" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M7.1 12.5l4.6 4.6M5.9 15.9l2.4 2.4" stroke="#EC4899" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.6 6.4c.4-1.6 1.6-2.4 3.2-2" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M15.7 9.6c1.5-.5 2.6 0 3.3 1.3" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="17.6" cy="4.2" r="1.05" fill="#EC4899" />
      <circle cx="20" cy="7.2" r="1.05" fill="#3B82F6" />
      <circle cx="14.2" cy="2.8" r="0.95" fill="#F59E0B" />
      <rect x="19.1" y="2.4" width="1.6" height="1.6" rx="0.3" fill="#10B981" transform="rotate(25 19.9 3.2)" />
    </svg>
  )
}

const BITS = [
  { x: 22, y: -26, r: 140, c: "#EC4899" },
  { x: 30, y: -6, r: -90, c: "#3B82F6" },
  { x: 8, y: -32, r: 200, c: "#F59E0B" },
  { x: 28, y: -20, r: -160, c: "#10B981" },
  { x: -6, y: -28, r: 120, c: "#8B5CF6" },
  { x: 34, y: 8, r: 90, c: "#F43F5E" },
  { x: 16, y: -14, r: -60, c: "#FBBF24" },
]

/**
 * "Excited for your birthday" — a like-style toggle. Tapping it on pops a
 * little confetti burst; the count is never shown here (only the birthday
 * person sees it).
 */
export function PopperButton({
  active,
  onToggle,
  disabled,
  className,
}: {
  active: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const [bursts, setBursts] = React.useState<number[]>([])

  const tap = () => {
    if (!active && !reduce) setBursts((b) => [...b, Date.now()])
    onToggle()
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "You're excited — tap to undo" : "Tap if you're excited for their birthday"}
      disabled={disabled}
      onClick={tap}
      className={cn(
        "relative flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors disabled:opacity-60",
        active ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <motion.span
        key={active ? "on" : "off"}
        initial={reduce ? false : { scale: active ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 14 }}
        className="relative flex size-7 items-center justify-center"
      >
        <PartyPopperIcon active={active} className="size-6" />
        <AnimatePresence>
          {bursts.map((b) => (
            <span key={b} className="pointer-events-none absolute inset-0">
              {BITS.map((bit, i) => (
                <motion.span
                  key={i}
                  className="absolute top-1/2 left-1/2 size-1.5 rounded-[2px]"
                  style={{ background: bit.c }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{ x: bit.x, y: bit.y, opacity: 0, rotate: bit.r, scale: 0.7 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  onAnimationComplete={() => i === 0 && setBursts((all) => all.filter((x) => x !== b))}
                />
              ))}
            </span>
          ))}
        </AnimatePresence>
      </motion.span>
      <span className="text-[10px] leading-none font-medium">{active ? "Excited!" : "Excited"}</span>
    </button>
  )
}
