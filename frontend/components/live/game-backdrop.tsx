/**
 * A board game's own colours over the whole screen, behind everything (the
 * top bar and dock float on it): the game *is* the screen, not a card on the
 * sky. Pinned to the viewport, so scrolling never repaints it.
 */
export function GameBackdrop({ background }: { background: string }) {
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background }} />
}

/** The seats-board-status column of a board game, without a card around it. */
export const TABLE_CLASS = "p-0.5 text-white sm:p-1"
