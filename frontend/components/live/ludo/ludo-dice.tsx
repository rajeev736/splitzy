"use client"

import * as React from "react"
import gsap from "gsap"

import { cn } from "@/lib/utils"

/** Which of the 9 grid spots carry a pip, per face. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

/**
 * Cube rotation that brings each face to the front. Faces sit like a real
 * dice (opposites add up to 7): 1 front, 6 back, 3 right, 4 left, 2 top, 5 bottom.
 */
const FACE_ANGLE: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
}
/** Where each face sits on the cube. */
const FACE_PLACE: Record<number, string> = {
  1: "rotateY(0deg)",
  6: "rotateY(180deg)",
  3: "rotateY(90deg)",
  4: "rotateY(-90deg)",
  2: "rotateX(90deg)",
  5: "rotateX(-90deg)",
}

const clampFace = (v: number | null | undefined) =>
  v && v >= 1 && v <= 6 ? v : 6

/**
 * A real 3D dice (six faces, CSS 3D) animated with GSAP.
 *
 * - `value`: the face it rests on. Never blank: with nothing rolled yet it shows a 6.
 * - `spin`: change it (e.g. to the state's `seq`) to tumble onto `value`.
 * - `rolling`: tumbles on the spot until the roll arrives (tapped, waiting for the server).
 * - `onRoll` + `glow`: your turn to roll — it glows in your colour and pulses; tap it.
 *
 * Keep one instance mounted across the tap (don't swap wrappers): the tumble
 * lives in this component, and remounting it would cut the animation short.
 */
export function LudoDice({
  value,
  spin,
  rolling = false,
  size = 44,
  dim = false,
  onRoll,
  glow,
  className,
}: {
  value: number | null
  spin: number | null
  rolling?: boolean
  size?: number
  /** Not this player's turn: rest quietly. */
  dim?: boolean
  /** Tap to roll (only while it's your roll). */
  onRoll?: () => void
  /** Glow colour while it's waiting for your tap. */
  glow?: string
  className?: string
}) {
  const face = clampFace(value)
  const cubeRef = React.useRef<HTMLDivElement>(null)
  const hopRef = React.useRef<HTMLDivElement>(null)
  const lastSpin = React.useRef<number | null>(spin)
  const loop = React.useRef<gsap.core.Tween | null>(null)
  const boxRef = React.useRef<HTMLDivElement>(null)

  // Your roll: a gentle pulse inviting the tap
  React.useEffect(() => {
    const box = boxRef.current
    if (!box || !glow) return
    const pulse = gsap.to(box, { scale: 1.12, duration: 0.55, ease: "sine.inOut", yoyo: true, repeat: -1 })
    return () => {
      pulse.kill()
      gsap.to(box, { scale: 1, duration: 0.15 })
    }
  }, [glow])

  // First paint: rest on the face without animating
  React.useLayoutEffect(() => {
    if (!cubeRef.current) return
    gsap.set(cubeRef.current, {
      rotationX: FACE_ANGLE[face].x,
      rotationY: FACE_ANGLE[face].y,
    })
    // Only once: later faces animate below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Waiting for the roll to land: keep tumbling
  React.useEffect(() => {
    const cube = cubeRef.current
    if (!rolling || !cube) return
    loop.current = gsap.to(cube, {
      rotationX: "+=360",
      rotationY: "+=270",
      duration: 0.45,
      ease: "none",
      repeat: -1,
    })
    return () => {
      loop.current?.kill()
      loop.current = null
    }
  }, [rolling])

  // A new roll (or a new resting face): tumble onto it
  React.useEffect(() => {
    const cube = cubeRef.current
    if (!cube) return
    const isRoll = spin !== null && spin !== lastSpin.current
    lastSpin.current = spin
    const target = FACE_ANGLE[face]
    const curX = Number(gsap.getProperty(cube, "rotationX")) || 0
    const curY = Number(gsap.getProperty(cube, "rotationY")) || 0
    // Always end on a whole number of turns past where it is, plus the face angle
    const turnsX = isRoll ? 2 : 0
    const turnsY = isRoll ? 1 : 0
    const endX = Math.ceil((curX - target.x) / 360 + turnsX) * 360 + target.x
    const endY = Math.ceil((curY - target.y) / 360 + turnsY) * 360 + target.y
    loop.current?.kill()
    gsap.to(cube, {
      rotationX: endX,
      rotationY: endY,
      duration: isRoll ? 0.85 : 0.35,
      ease: isRoll ? "power3.out" : "power2.out",
      overwrite: true,
    })
    if (isRoll && hopRef.current) {
      gsap.fromTo(
        hopRef.current,
        { y: -size * 0.45, scale: 1.12 },
        { y: 0, scale: 1, duration: 0.75, ease: "bounce.out", overwrite: true }
      )
    }
  }, [spin, face, size])

  const half = size / 2
  const pip = Math.max(5, Math.round(size * 0.17))
  return (
    <div
      ref={boxRef}
      className={cn(
        "relative shrink-0 transition-[opacity,filter] duration-200",
        dim && "opacity-45",
        onRoll && "cursor-pointer",
        className
      )}
      // Far perspective: at rest the face sits flat and square to you; the depth shows while it tumbles
      style={{
        width: size,
        height: size,
        perspective: size * 16,
        filter: glow ? `drop-shadow(0 0 5px ${glow}) drop-shadow(0 0 10px ${glow})` : "drop-shadow(0 2px 2px rgb(0 0 0 / 0.35))",
      }}
      role={onRoll ? "button" : "img"}
      tabIndex={onRoll ? 0 : undefined}
      aria-label={onRoll ? "Roll the dice" : `Dice shows ${face}`}
      onClick={onRoll}
      onKeyDown={
        onRoll
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onRoll()
              }
            }
          : undefined
      }
    >
      <div
        ref={hopRef}
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
      >
          <div
            ref={cubeRef}
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center"
                style={{
                  transform: `${FACE_PLACE[n]} translateZ(${half}px)`,
                  backfaceVisibility: "hidden",
                  borderRadius: size * 0.2,
                  padding: size * 0.13,
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f1f1f4 55%, #d9d9e0 100%)",
                  boxShadow:
                    "inset 0 0 0 1px rgb(0 0 0 / 0.06), inset -2px -3px 6px rgb(0 0 0 / 0.14), inset 2px 2px 4px rgb(255 255 255 / 0.9)",
                }}
              >
                {Array.from({ length: 9 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      width: n === 1 ? pip * 1.45 : pip,
                      height: n === 1 ? pip * 1.45 : pip,
                      borderRadius: "50%",
                      opacity: PIPS[n].includes(i) ? 1 : 0,
                      background:
                        n === 1
                          ? "radial-gradient(circle at 35% 30%, #ff7a7a, #c81e1e 60%, #7f1010)"
                          : "radial-gradient(circle at 35% 30%, #5b5b66, #1b1b22 65%)",
                      boxShadow: "inset 0 1px 1px rgb(0 0 0 / 0.5)",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
      </div>
    </div>
  )
}
