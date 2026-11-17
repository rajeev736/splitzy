/**
 * A game's splash screen, shown full-screen for a moment when the game
 * starts while the board loads behind it (components/live/splash/game-splash).
 *
 * An art component fills the whole screen (its parent is `fixed inset-0`),
 * draws the game's title as a big, chunky, glossy logotype over a themed
 * background, and a loading bar near the bottom filled to `progress` (0–1).
 * It must:
 * - look right from a 320×568 phone to a desktop (portrait first: title in
 *   the upper third, bar in the lower third, like a mobile game's splash);
 * - be light: SVG / CSS only, no images to download, no web fonts beyond
 *   what the app already loads — it has to paint instantly;
 * - honour `prefers-reduced-motion` (no idle animation; the bar still fills).
 */
export interface SplashArtProps {
  /** 0 → 1 */
  progress: number
}
