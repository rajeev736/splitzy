/**
 * The Memory Tiles logo art, in a 48×48 box (components/live/live-game-logo):
 * on a sky-to-violet tile, two chunky game tiles — one face down (a violet
 * back with a star) and one flipped up showing a heart — and a sparkle.
 */
export function MemoryArt({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-mt-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fb4ff" />
          <stop offset="1" stopColor="#7a55f0" />
        </linearGradient>
        <linearGradient id={`${id}-mt-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-mt-back`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cc0ff" />
          <stop offset="1" stopColor="#6d3df0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="11" fill={`url(#${id}-mt-bg)`} />
      {/* Soft clouds */}
      <ellipse cx="9" cy="42" rx="11" ry="5" fill="#fff" opacity="0.28" />
      <ellipse cx="42" cy="44" rx="9" ry="4" fill="#fff" opacity="0.22" />
      <rect width="48" height="48" rx="11" fill={`url(#${id}-mt-shine)`} />

      {/* The face-down tile */}
      <g transform="rotate(-11 16 25)">
        <rect x="5" y="12" width="21" height="25" rx="5" fill="#1e1b4b" opacity="0.25" transform="translate(0 2.5)" />
        <rect x="5" y="12" width="21" height="25" rx="5" fill="#4c2fb8" />
        <rect x="5" y="12" width="21" height="22" rx="5" fill={`url(#${id}-mt-back)`} />
        <rect x="8" y="15" width="15" height="16" rx="3" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" />
        <path d="M15.5 17.6l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff" />
      </g>

      {/* The tile flipped up, with a heart */}
      <g transform="rotate(9 32 25)">
        <rect x="21" y="10" width="22" height="26" rx="5" fill="#1e1b4b" opacity="0.25" transform="translate(0 2.5)" />
        <rect x="21" y="10" width="22" height="26" rx="5" fill="#f2b84b" />
        <rect x="21" y="10" width="22" height="23" rx="5" fill="#fff8e8" />
        <path
          d="M32 29.5c-5.2-3.4-7.4-6.2-6.8-9 .5-2.6 4.1-3.7 6.8-.6 2.7-3.1 6.3-2 6.8.6.6 2.8-1.6 5.6-6.8 9z"
          fill="#ff4f8b"
          stroke="#3b2a4a"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <ellipse cx="28.4" cy="20.6" rx="1.4" ry="0.9" fill="#fff" opacity="0.8" transform="rotate(-35 28.4 20.6)" />
      </g>

      {/* Sparkle */}
      <path d="M41 6.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#fff" />
      <circle cx="44.5" cy="17" r="1.1" fill="#fff" opacity="0.85" />
    </>
  )
}
