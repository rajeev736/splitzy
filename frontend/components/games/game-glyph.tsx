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

/** A game's picture: its emoji, or the drawn coin for Coin Toss. */
export function GameGlyph({ game, className }: { game: GameId; className?: string }) {
  if (game === "coin_toss") return <CoinSvg className={className} />
  return (
    <span className={className} aria-hidden>
      {GAMES[game].emoji}
    </span>
  )
}
