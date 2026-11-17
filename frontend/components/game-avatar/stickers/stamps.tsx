/**
 * Stamps shared by several signature stickers: drawn on / around the target
 * (100-wide viewBoxes, see Impact.stamp). Paths with `data-draw` are drawn in.
 */

/** Three slashes across the face. */
export function ClawMarks({ colour, edge }: { colour: string; edge: string }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path
            data-draw
            pathLength={1}
            d={`M${22 + i * 18} ${14 + i * 4}Q${40 + i * 16} 50 ${30 + i * 20} ${86 - i * 2}`}
            stroke={edge}
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
          <path
            data-draw
            pathLength={1}
            d={`M${22 + i * 18} ${14 + i * 4}Q${40 + i * 16} 50 ${30 + i * 20} ${86 - i * 2}`}
            stroke={colour}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ))}
    </svg>
  )
}

/** A ring of little stars circling a dizzy head. */
export function DizzyStars({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <ellipse cx="50" cy="50" rx="44" ry="16" fill="none" stroke={colour} strokeWidth="2" strokeDasharray="4 6" opacity="0.7" />
      {[0, 72, 144, 216, 288].map((a) => {
        const x = 50 + Math.cos((a * Math.PI) / 180) * 44
        const y = 50 + Math.sin((a * Math.PI) / 180) * 16
        return (
          <path
            key={a}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(0.55) translate(-12 -12)`}
            d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"
            fill={colour}
            stroke="#fff"
            strokeWidth="1.5"
          />
        )
      })}
    </svg>
  )
}

/** Sun rays all round (an idea, a reveal). */
export function Rays({ colour, count = 12 }: { colour: string; count?: number }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d="M47 4h6l-1 22h-4z"
          fill={colour}
          transform={`rotate(${(360 / count) * i} 50 50)`}
          opacity={i % 2 ? 0.6 : 1}
        />
      ))}
    </svg>
  )
}

/** A comic-book burst with a word in it. */
export function ComicBurst({ text, fill, ink, size = 24 }: { text: string; fill: string; ink: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <path
        d="M50 2l9 22 22-12-8 24 25 2-21 14 17 19-25-5 2 25-17-19-12 22-6-24-22 12 9-23L2 52l22-11L8 22l25 5z"
        fill={fill}
        stroke={ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <text
        x="50"
        y={50 + size * 0.36}
        textAnchor="middle"
        fontSize={size}
        fontWeight="900"
        fill={ink}
        fontFamily="system-ui, sans-serif"
        transform="rotate(-8 50 50)"
      >
        {text}
      </text>
    </svg>
  )
}

/** A ring of flame tongues standing round the target. */
export function FlameRing({ outer, inner }: { outer: string; inner: string }) {
  const tongue = "M0 0C-7-6-8-16 0-30C8-16 7-6 0 0Z"
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 30} 50 50) translate(50 18)`}>
          <path d={tongue} fill={outer} transform={`scale(${i % 2 ? 0.8 : 1.05})`} />
          <path d={tongue} fill={inner} transform={`scale(${i % 2 ? 0.45 : 0.6})`} />
        </g>
      ))}
    </svg>
  )
}

/** A soft cloud of smoke. */
export function SmokeCloud({ colour, shade }: { colour: string; shade: string }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      {[
        [30, 58, 24],
        [70, 58, 24],
        [50, 40, 28],
        [50, 66, 26],
        [24, 40, 16],
        [78, 38, 16],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? shade : colour} opacity="0.92" />
      ))}
      <circle cx="40" cy="36" r="9" fill="#fff" opacity="0.35" />
    </svg>
  )
}

/** A five-petal flower around (x, y). */
export function Flower({ x, y, r, petal, centre }: { x: number; y: number; r: number; petal: string; centre: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy={-r * 0.62} rx={r * 0.42} ry={r * 0.62} fill={petal} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.36} fill={centre} />
    </g>
  )
}
