/**
 * The name you go by in games: your game name if you set one (game profile),
 * else your Split display name. Split screens always use `displayName`.
 */
export const gameNameOf = (u: { gameName?: string; displayName: string }) => u.gameName?.trim() || u.displayName

/** Game names: trimmed, 2 to 20 characters (mirrored in firestore.rules, users `gameName`). */
export const GAME_NAME_MIN = 2
export const GAME_NAME_MAX = 20

/** Why `raw` can't be a game name, or null when it can (after trimming). */
export function gameNameError(raw: string): string | null {
  const name = raw.trim()
  if (name.length < GAME_NAME_MIN) return `At least ${GAME_NAME_MIN} characters`
  if (name.length > GAME_NAME_MAX) return `At most ${GAME_NAME_MAX} characters`
  return null
}
