"use client"

import * as React from "react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge, validLevel } from "@/components/game-avatar/level-badge"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { Gloss } from "./lobby-styles"
import { useBoxSize } from "./use-box-size"

/** A jagged band of lightning across 0–1000 × 0–100: a thin crackle with spikes now and then. */
function boltPath(seed: number) {
  let a = seed >>> 0
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const n = 34
  const top: string[] = []
  const bottom: string[] = []
  let drift = 0
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 1000
    drift = drift * 0.55 + (rnd() - 0.5) * 22
    const mid = 50 + drift
    let up = 1.5 + rnd() * 4
    let down = 1.5 + rnd() * 4
    if (rnd() < 0.22) up += 10 + rnd() * 22
    if (rnd() < 0.18) down += 8 + rnd() * 16
    const edge = Math.min(1, Math.min(i, n - i) / 3)
    top.push(`${x.toFixed(1)},${(mid - up * edge).toFixed(1)}`)
    bottom.unshift(`${x.toFixed(1)},${(mid + down * edge).toFixed(1)}`)
  }
  return `M${top.join("L")}L${bottom.join("L")}Z`
}
const BOLT_A = boltPath(11)
const BOLT_B = boltPath(47)

/** The two halves, as in the VS intro (components/live/intro): seat 0 red on the left, seat 1 blue on the right. */
const SIDES = [
  {
    clip: "polygon(0 0, 57% 0, 43% 100%, 0 100%)",
    bg: "linear-gradient(118deg, #d81e3a 0%, #f2423f 38%, #ff7a52 72%, #ffb070 100%)",
    rim: "#9f1239",
    tint: "#ffd2c4",
    ring: "#ff9a7a",
    q: "radial-gradient(circle at 50% 35%, #ff8f6b, #ef3b3b)",
  },
  {
    clip: "polygon(57% 0, 100% 0, 100% 100%, 43% 100%)",
    bg: "linear-gradient(118deg, #8fe3ff 0%, #4cb8ff 30%, #2f86f6 64%, #1d55d6 100%)",
    rim: "#1e3a8a",
    tint: "#cfe7ff",
    ring: "#9fd8ff",
    q: "radial-gradient(circle at 50% 35%, #7cc8ff, #2f7cf6)",
  },
] as const

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

const shortName = (name: string) => {
  const full = name.trim() || "Player"
  const short = full.length > 12 ? full.split(/\s+/)[0] : full
  return short.length > 12 ? `${short.slice(0, 11)}…` : short
}

/**
 * Two-player lobby, a fighting game's matchmaking screen: a diagonal red /
 * blue split with a lightning crackle across. While a seat is open its side
 * shows a pulsing "?" ("Finding opponent…"); once both are in, a VS slams in
 * between and the countdown runs. Same geometry as the VS intro that plays
 * when the game starts (seat 0 red left, seat 1 blue right, characters at
 * 47% height), so the lobby flows straight into it.
 */
export function DuelScene({
  seats,
  meId,
  hostId,
  canKick,
  onKick,
  onInvite,
  children,
}: {
  /** Seat 0 and seat 1 (null = open). */
  seats: [RoomPlayer | null, RoomPlayer | null]
  meId: string
  hostId: string
  canKick: boolean
  onKick: (p: RoomPlayer) => void
  onInvite: () => void
  /** The action area at the bottom (countdown / invite). */
  children?: React.ReactNode
}) {
  const [ref, { w: W, h: H }] = useBoxSize<HTMLDivElement>()
  const found = !!seats[0] && !!seats[1]
  const size = Math.round(clamp(Math.min(W * 0.27, H * 0.24), 72, 190))
  const spread = Math.min(W * 0.28, 400)
  const cy = H * 0.47
  const vs = Math.round(clamp(Math.min(W * 0.2, H * 0.19), 52, 170))
  const boltH = clamp(size * 0.95, 70, 180)
  const nameFs = Math.round(clamp(size * 0.2, 16, 34))
  const titleFs = Math.round(clamp(Math.min(W * 0.075, H * 0.06), 22, 54))

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#150a2e]">
      {SIDES.map((s, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute inset-0"
          style={{ clipPath: s.clip, background: s.bg }}
        />
      ))}
      {/* A warm glow where the halves meet, and light streaks drifting across */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 40% 55% at 50% 55%, rgba(255,214,150,.35), transparent 70%)",
        }}
      />
      {[
        [0.16, 0.12, 0.3],
        [0.72, 0.08, 0.9],
        [0.84, 0.16, 0.15],
        [0.28, 0.06, 1.2],
      ].map(([y, w, d], i) => (
        <span
          key={i}
          aria-hidden
          className={cn("lb-dash", i % 2 && "lb-dash-r")}
          style={{
            top: `${y * 100}%`,
            left: `${20 + i * 18}%`,
            width: `${w * 100}%`,
            opacity: 0.55,
            animationDelay: `${-d}s`,
          }}
        />
      ))}

      <div
        className="absolute inset-x-0 flex items-center justify-center gap-3 px-4"
        style={{ top: Math.max(H * 0.1, 64) }}
        aria-live="polite"
      >
        <span
          aria-hidden
          className="h-[3px] w-[14vw] max-w-56 rounded-full bg-gradient-to-l from-white/90 to-transparent"
        />
        <Gloss
          key={found ? "found" : "finding"}
          size={titleFs}
          rim="#7a1fa2"
          tint="#ffd4f4"
          className="lb-pop"
        >
          {found ? "Opponent found!" : "Finding opponent…"}
        </Gloss>
        <span
          aria-hidden
          className="h-[3px] w-[14vw] max-w-56 rounded-full bg-gradient-to-r from-white/90 to-transparent"
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0"
        style={{ top: cy - boltH / 2, height: boltH }}
      >
        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          className="lb-bolt size-full overflow-visible"
        >
          <path d={BOLT_A} fill="#fff" className="lb-bolt-a" />
          <path d={BOLT_B} fill="#fff" className="lb-bolt-b" />
          <path
            d="M0 50 L1000 50"
            stroke="#fff"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {seats.map((p, i) => {
        const side = SIDES[i]
        const x = W / 2 + (i === 0 ? -spread : spread)
        return (
          <div
            key={p?.uid ?? `open${i}`}
            className="absolute"
            style={{ left: x - size / 2, top: cy - size / 2, width: size }}
          >
            {p ? (
              <>
                <span
                  aria-hidden
                  className="absolute rounded-full"
                  style={{
                    inset: -size * 0.16,
                    boxShadow:
                      "inset 0 0 0 2px rgba(255,255,255,.55), 0 0 0 1px rgba(255,255,255,.12)",
                  }}
                />
                <div
                  className="lb-pop relative flex items-center justify-center rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: `radial-gradient(circle at 50% 35%, #fff6d8, ${side.ring})`,
                    boxShadow: "0 0 0 4px #fff, 0 10px 24px rgba(20,6,50,.35)",
                  }}
                >
                  <GameAvatar
                    character={p.avatar}
                    frame={p.frame}
                    photo={p.photo}
                    name={p.name}
                    size={size}
                    mode="idle"
                  />
                  {validLevel(p.level) && (
                    <span className="absolute -top-1 -left-1 flex">
                      <LevelBadge level={validLevel(p.level)!} size={Math.round(size * 0.3)} />
                    </span>
                  )}
                  {canKick && p.uid !== meId && (
                    <button
                      type="button"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => onKick(p)}
                      className="lb-glass absolute -top-1 -right-1 flex size-8 items-center justify-center rounded-full"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                    </button>
                  )}
                </div>
                <div
                  className="lb-fade-up absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
                  style={{
                    top: size + size * 0.28,
                    width: Math.min(W * 0.46, 320),
                  }}
                >
                  <Gloss size={nameFs} rim={side.rim} tint={side.tint}>
                    {shortName(p.name)}
                  </Gloss>
                  <span className="flex gap-1">
                    {p.uid === meId && <Tag>YOU</Tag>}
                    {p.uid === hostId && <Tag>HOST</Tag>}
                    {!p.online && <Tag>OFFLINE</Tag>}
                  </span>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onInvite}
                  aria-label="Invite an opponent"
                  className="relative flex items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                  style={{ width: size, height: size }}
                >
                  <span
                    aria-hidden
                    className="lb-ping"
                    style={{ inset: -size * 0.16 }}
                  />
                  <span
                    aria-hidden
                    className="lb-ping"
                    style={{ inset: -size * 0.16, animationDelay: "-.9s" }}
                  />
                  <span
                    className="lb-breathe flex size-full items-center justify-center rounded-full"
                    style={{
                      background: side.q,
                      boxShadow:
                        "0 0 0 4px #fff, 0 10px 24px rgba(20,6,50,.35)",
                    }}
                  >
                    <Gloss size={size * 0.52} rim={side.rim} tint="#ffe8c7">
                      ?
                    </Gloss>
                  </span>
                </button>
                <div
                  className="absolute left-1/2 flex -translate-x-1/2 justify-center"
                  style={{
                    top: size + size * 0.32,
                    width: Math.min(W * 0.46, 320),
                  }}
                >
                  <span
                    className="lb-font rounded-md px-4 py-1.5 text-sm font-extrabold text-white"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${side.rim}cc 20%, ${side.rim}cc 80%, transparent)`,
                    }}
                  >
                    Waiting…
                  </span>
                </div>
              </>
            )}
          </div>
        )
      })}

      {found && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: cy }}
        >
          <Gloss
            size={vs}
            rim="#ffffff"
            tint="#e02cb0"
            top="#ffa6ea"
            className="lb-slam tracking-[-0.04em]"
          >
            VS
          </Gloss>
        </div>
      )}

      {children}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="lb-font rounded-full bg-[rgba(15,6,40,.35)] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.12em] text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.55)]">
      {children}
    </span>
  )
}
