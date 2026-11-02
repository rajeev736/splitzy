"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react"

import type { GiftId, LoveNudge } from "@/lib/fun/catalog"
import { GiftArt, HEART_PATH, SPARKLE_PATH } from "./gift-art"
import { MomentArt } from "./moment-art"

type BurstKind = LoveNudge | "wish" | "gift"

/** How long the burst stays up before it closes itself. */
const SHOW_MS = 2600

/** Hand-placed so the drift feels scattered but never clumps. */
const PARTICLES: { x: number; y: number; drift: number; size: number; delay: number; shape: "heart" | "sparkle"; color: string }[] = [
  { x: -96, y: 40, drift: -14, size: 14, delay: 0.15, shape: "heart", color: "#FF7A9A" },
  { x: -58, y: 70, drift: 10, size: 10, delay: 0.55, shape: "sparkle", color: "#FFC94D" },
  { x: -20, y: 86, drift: -8, size: 11, delay: 0.95, shape: "heart", color: "#AE9CF8" },
  { x: 24, y: 80, drift: 12, size: 9, delay: 0.35, shape: "sparkle", color: "#FFC94D" },
  { x: 62, y: 64, drift: -10, size: 15, delay: 0.75, shape: "heart", color: "#F2476F" },
  { x: 100, y: 34, drift: 14, size: 10, delay: 0.25, shape: "heart", color: "#FFB3C6" },
  { x: -118, y: -6, drift: 6, size: 8, delay: 1.05, shape: "sparkle", color: "#AE9CF8" },
  { x: 116, y: -10, drift: -6, size: 9, delay: 1.2, shape: "sparkle", color: "#FF9F80" },
]

function Particle({ p }: { p: (typeof PARTICLES)[number] }) {
  return (
    <motion.svg
      viewBox="-10 -10 20 20"
      width={p.size}
      height={p.size}
      className="absolute top-1/2 left-1/2 overflow-visible"
      style={{ marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
      initial={{ x: p.x, y: p.y, opacity: 0, scale: 0.5 }}
      animate={{ x: p.x + p.drift, y: p.y - 150, opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8] }}
      transition={{ duration: 2, delay: p.delay, ease: "easeOut", times: [0, 0.2, 0.7, 1] }}
    >
      {p.shape === "heart" ? (
        <path d={HEART_PATH} fill={p.color} />
      ) : (
        <path d={SPARKLE_PATH} fill={p.color} transform="scale(1.8)" />
      )}
    </motion.svg>
  )
}

function Burst({
  kind,
  gift,
  title,
  subtitle,
  onDone,
}: {
  kind: BurstKind
  gift?: GiftId
  title: string
  subtitle?: string
  onDone: () => void
}) {
  const reduce = useReducedMotion()
  const present = useIsPresent()
  const fired = useRef(false)

  const finish = () => {
    if (fired.current) return
    fired.current = true
    onDone()
  }
  const finishFromEffect = useEffectEvent(finish)

  useEffect(() => {
    const timer = setTimeout(finishFromEffect, SHOW_MS)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishFromEffect()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  const art =
    kind === "gift" ? (
      <GiftArt gift={gift ?? "rose"} animate className="size-40" />
    ) : (
      <MomentArt kind={kind} animate className="size-40" />
    )

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-background/80 px-6 backdrop-blur-md"
      style={{ pointerEvents: present ? "auto" : "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.28 }}
      onClick={finish}
    >
      <div className="relative grid place-items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute size-64 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(255, 133, 170, 0.28), transparent)" }}
        />
        {!reduce && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {PARTICLES.map((p) => (
              <Particle key={`${p.x}-${p.y}`} p={p} />
            ))}
          </div>
        )}
        <motion.div
          className="relative"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.35, y: 28, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 15, mass: 0.9 }}
        >
          {art}
        </motion.div>
      </div>
      <motion.div
        className="mt-6 max-w-xs text-center"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: reduce ? 0 : 0.18, ease: "easeOut" }}
      >
        <p className="text-xl font-semibold tracking-tight text-balance text-foreground">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-balance text-muted-foreground">{subtitle}</p>}
      </motion.div>
    </motion.div>
  )
}

/**
 * A full-screen moment: the art springs in with a few drifting hearts and
 * sparkles, then it closes itself (or on a tap / Escape) and calls `onDone`.
 */
export function MomentBurst({
  show,
  kind,
  gift,
  title,
  subtitle,
  onDone,
}: {
  show: boolean
  kind: BurstKind
  gift?: GiftId
  title: string
  subtitle?: string
  onDone: () => void
}) {
  return (
    <AnimatePresence>
      {show && <Burst key="moment-burst" kind={kind} gift={gift} title={title} subtitle={subtitle} onDone={onDone} />}
    </AnimatePresence>
  )
}
