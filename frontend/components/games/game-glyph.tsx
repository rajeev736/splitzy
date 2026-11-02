import { GAMES, type GameId } from "@/lib/games"
import { cn } from "@/lib/utils"

/**
 * A gold coin drawn in SVG. The coin emoji (🪙) is too new for many phones,
 * which show an empty box instead. Sized in `em`, so it matches emoji text.
 */
export function CoinSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("inline-block size-[1em] shrink-0", className)} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#d97706" />
      <circle cx="16" cy="16" r="13" fill="#fbbf24" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.7" />
      <path
        d="M12 10.5h8M12 14h8M12 10.5c4.5 0 4.5 7 0 7h-0.5l6.5 5"
        fill="none"
        stroke="#b45309"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A football, flat like the coin, sized in `em`. */
export function BallSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("inline-block size-[1em] shrink-0", className)} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#334155" />
      <circle cx="16" cy="16" r="13.5" fill="#f8fafc" />
      <path d="M16 10.2l5.1 3.7-1.95 6h-6.3l-1.95-6z" fill="#1e293b" />
      <path
        d="M16 10.2V2.6M21.1 13.9l7.2-2.3M19.15 19.9l4.5 6.1M12.85 19.9l-4.5 6.1M10.9 13.9l-7.2-2.3"
        stroke="#1e293b"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Two playing cards fanned out: Higher or Lower. */
export function CardsSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("inline-block size-[1em] shrink-0", className)} aria-hidden>
      <g transform="rotate(-14 16 16)">
        <rect x="5" y="5" width="16" height="22" rx="2.5" fill="#1d4ed8" />
        <rect x="7" y="7" width="12" height="18" rx="1.5" fill="none" stroke="#93c5fd" strokeWidth="1.2" />
        <path d="M13 11l3 5-3 5-3-5z" fill="#93c5fd" />
      </g>
      <g transform="rotate(10 16 16)">
        <rect x="11" y="4.5" width="16" height="22" rx="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <path
          d="M19 21.5s-4.6-2.8-5.8-5.6c-.9-2.1.4-4.4 2.6-4.4 1.3 0 2.2.7 3.2 1.9 1-1.2 1.9-1.9 3.2-1.9 2.2 0 3.5 2.3 2.6 4.4-1.2 2.8-5.8 5.6-5.8 5.6z"
          fill="#dc2626"
        />
        <text x="13.2" y="9.6" fontSize="5" fontWeight="700" fill="#dc2626" fontFamily="ui-sans-serif, system-ui">A</text>
      </g>
    </svg>
  )
}

/** A magnifying glass over a number: Number Hunt. */
export function HuntSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("inline-block size-[1em] shrink-0", className)} aria-hidden>
      <path d="M20.5 20.5l7 7" stroke="#7c2d12" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M20.5 20.5l6.4 6.4" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="13" cy="13" r="10.5" fill="#64748b" />
      <circle cx="13" cy="13" r="8.5" fill="#e0f2fe" />
      <path d="M8.5 10.5a5.5 5.5 0 0 1 4-3.6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <text x="13" y="16.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#0f766e" fontFamily="ui-sans-serif, system-ui">
        42
      </text>
    </svg>
  )
}

/** A game's picture: its emoji, or a drawn glyph (coin, ball, cards, magnifier). */
export function GameGlyph({ game, className }: { game: GameId; className?: string }) {
  if (game === "coin_toss") return <CoinSvg className={className} />
  if (game === "penalty") return <BallSvg className={className} />
  if (game === "hilo") return <CardsSvg className={className} />
  if (game === "number_hunt") return <HuntSvg className={className} />
  return (
    <span className={className} aria-hidden>
      {GAMES[game].emoji}
    </span>
  )
}
