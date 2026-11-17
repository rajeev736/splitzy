import type * as React from "react"

import { seeded } from "./shared"

/** A jagged band of lightning across 0–1000 × 0–100, thick in places with spikes. */
function boltPath(seed: number) {
  const rnd = seeded(seed)
  const n = 34
  const top: string[] = []
  const bottom: string[] = []
  let drift = 0
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 1000
    drift = drift * 0.55 + (rnd() - 0.5) * 22
    const mid = 50 + drift
    // Mostly a thin crackle; now and then a fat flash or a spike
    let up = 1.5 + rnd() * 4
    let down = 1.5 + rnd() * 4
    if (rnd() < 0.22) up += 10 + rnd() * 22
    if (rnd() < 0.18) down += 8 + rnd() * 16
    // Fade the ends out
    const edge = Math.min(1, Math.min(i, n - i) / 3)
    top.push(`${x.toFixed(1)},${(mid - up * edge).toFixed(1)}`)
    bottom.unshift(`${x.toFixed(1)},${(mid + down * edge).toFixed(1)}`)
  }
  return `M${top.join("L")}L${bottom.join("L")}Z`
}

const PATH_A = boltPath(7)
const PATH_B = boltPath(31)

/**
 * The white lightning crackle across the screen (VS screens): two shapes that
 * flicker in turn, glowing, revealed from the middle outwards.
 */
export function Bolt({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden className={className} style={style}>
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="pi-bolt size-full overflow-visible">
        <path d={PATH_A} fill="#fff" className="pi-bolt-a" />
        <path d={PATH_B} fill="#fff" className="pi-bolt-b" />
        <path d="M0 50 L1000 50" stroke="#fff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
