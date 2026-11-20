/**
 * The Color Clash logo art, in a 48×48 box (components/live/live-game-logo):
 * three chunky cards fanned on a warm tile — red, yellow and blue — with a
 * four-colour burst on the front one.
 */
export function ColorClashArt({ id }: { id: string }) {
  const card = (fill: string, rot: number, x: number) => (
    <g transform={`rotate(${rot} 24 38)`}>
      <rect x={x - 7.5} y="10.5" width="15" height="22" rx="3.2" fill="#000" opacity="0.18" transform="translate(0 1.4)" />
      <rect x={x - 7.5} y="10.5" width="15" height="22" rx="3.2" fill="#fff" />
      <rect x={x - 6} y="12" width="12" height="19" rx="2.2" fill={fill} />
      <circle cx={x} cy="21.5" r="4.6" fill="#fff" opacity="0.92" />
    </g>
  )
  return (
    <>
      <defs>
        <linearGradient id={`${id}-cc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#c2185b" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="11" fill={`url(#${id}-cc)`} />
      <rect width="48" height="48" rx="11" fill={`url(#${id}-shine)`} />
      {card("#2a7cf0", -24, 17)}
      {card("#ffc21a", 22, 31)}
      {/* The front card: dark, with the four-colour burst */}
      <g>
        <rect x="16.5" y="13.5" width="15" height="22" rx="3.2" fill="#000" opacity="0.2" transform="translate(0 1.6)" />
        <rect x="16.5" y="13.5" width="15" height="22" rx="3.2" fill="#fff" />
        <rect x="18" y="15" width="12" height="19" rx="2.2" fill="#1c1a2e" />
        <g transform="translate(24 24.5) rotate(-15)">
          <path d="M0 0 L0 -5.5 A5.5 5.5 0 0 1 5.5 0 Z" fill="#ef3b3b" />
          <path d="M0 0 L5.5 0 A5.5 5.5 0 0 1 0 5.5 Z" fill="#ffc21a" />
          <path d="M0 0 L0 5.5 A5.5 5.5 0 0 1 -5.5 0 Z" fill="#2fb24c" />
          <path d="M0 0 L-5.5 0 A5.5 5.5 0 0 1 0 -5.5 Z" fill="#2a7cf0" />
          <circle r="5.5" fill="none" stroke="#fff" strokeWidth="1" />
          <circle r="1.5" fill="#fff" />
        </g>
      </g>
    </>
  )
}
