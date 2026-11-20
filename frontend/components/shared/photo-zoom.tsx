"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { useBackToClose } from "@/hooks/use-back-to-close"

const MS = 340
const EASE = "cubic-bezier(.2,.85,.25,1)"

type Phase = "closed" | "from" | "open" | "closing"

/**
 * A photo that grows out of its avatar and back (a shared-element morph):
 * the round thumbnail becomes a big rounded square in the middle of the
 * screen while the page dims behind it; tap, Esc or Back sends it home.
 * Only transform, opacity and the corner radius animate — smooth on phones.
 *
 * `children` is the avatar (it hides while its photo is out, so it's one
 * picture moving, not two).
 */
export function PhotoZoom({
  src,
  alt,
  children,
  className,
  handle,
}: {
  src: string | null | undefined
  alt: string
  children: React.ReactNode
  className?: string
  /** Open it from elsewhere too (e.g. a tap anywhere on the card around the avatar). */
  handle?: React.Ref<{ open: () => void }>
}) {
  const anchor = React.useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = React.useState<Phase>("closed")
  const [from, setFrom] = React.useState<DOMRect | null>(null)
  const timer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  const open = () => {
    if (!src || !anchor.current) return
    setFrom(anchor.current.getBoundingClientRect())
    setPhase("from")
    // Next frames: from the avatar's spot to the middle
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")))
  }
  React.useImperativeHandle(handle, () => ({ open }))
  const close = React.useCallback(() => {
    if (anchor.current) setFrom(anchor.current.getBoundingClientRect())
    setPhase((p) => (p === "closed" ? p : "closing"))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPhase("closed"), MS)
  }, [])

  const shown = phase !== "closed"
  useBackToClose(phase === "open" || phase === "from", close)
  React.useEffect(() => {
    if (!shown) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shown, close])

  // Where the big photo sits: a square, as big as fits
  const vw = typeof window === "undefined" ? 0 : window.innerWidth
  const vh = typeof window === "undefined" ? 0 : window.innerHeight
  const size = Math.min(vw - 32, vh * 0.72, 520)
  const left = (vw - size) / 2
  const top = (vh - size) / 2
  const out = phase === "open"
  // At rest on the avatar: moved and shrunk onto it (the transform does the whole trip)
  const atAvatar = from
    ? `translate(${from.left + from.width / 2 - (left + size / 2)}px, ${from.top + from.height / 2 - (top + size / 2)}px) scale(${from.width / size})`
    : "scale(.2)"

  return (
    <>
      <span
        ref={anchor}
        role={src ? "button" : undefined}
        tabIndex={src ? 0 : undefined}
        aria-label={src ? `${alt}: see the photo` : undefined}
        onClick={(e) => {
          if (!src) return
          e.stopPropagation()
          open()
        }}
        onKeyDown={(e) => {
          if (src && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            open()
          }
        }}
        className={className}
        style={{ visibility: shown ? "hidden" : undefined, cursor: src ? "zoom-in" : undefined }}
      >
        {children}
      </span>
      {shown && src
        ? createPortal(
            // A portal still bubbles React events to the page around the avatar: stop it here,
            // or a tap that closes the photo would reach a tappable parent and open it again
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              className="fixed inset-0 z-[70]"
              onClick={(e) => {
                e.stopPropagation()
                close()
              }}
            >
              <div
                className="absolute inset-0 bg-black/85"
                style={{ opacity: out ? 1 : 0, transition: `opacity ${MS}ms ${EASE}` }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- a profile photo of any origin */}
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="absolute object-cover shadow-2xl select-none motion-reduce:!transition-none"
                style={{
                  left,
                  top,
                  width: size,
                  height: size,
                  transform: out ? "none" : atAvatar,
                  borderRadius: out ? 28 : size / 2,
                  transition: `transform ${MS}ms ${EASE}, border-radius ${MS}ms ${EASE}`,
                  willChange: "transform",
                }}
              />
            </div>,
            document.body
          )
        : null}
    </>
  )
}
