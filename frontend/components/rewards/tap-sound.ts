"use client"

import { playTap, primeUiAudio } from "./ui-sounds"

/**
 * One global listener for the Games side's tap sound. A click plays the short
 * classic tap when what was pressed is a control — a button, link, tab,
 * checkbox, radio, switch or a game button / choice — inside the Games UI
 * (`.gu`), and not inside something marked `data-no-tap-sound` (the game
 * boards, which play their own sounds). The audio is woken on the first
 * press, so even the first tap sounds straight away. Follows the games' sound
 * switch. Returns the uninstaller.
 */

const CONTROL =
  'button, a[href], [role="button"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], .gu-btn, .gu-choice'

export function installTapSound(): () => void {
  if (typeof document === "undefined") return () => undefined

  const onDown = () => primeUiAudio()
  const onClick = (e: MouseEvent) => {
    const t = e.target
    if (!(t instanceof Element)) return
    const control = t.closest(CONTROL)
    if (!control || !control.closest(".gu") || control.closest("[data-no-tap-sound]")) return
    if (control.matches(':disabled, [aria-disabled="true"]')) return
    playTap()
  }

  document.addEventListener("pointerdown", onDown, { capture: true, passive: true })
  document.addEventListener("click", onClick, { capture: true, passive: true })
  return () => {
    document.removeEventListener("pointerdown", onDown, { capture: true })
    document.removeEventListener("click", onClick, { capture: true })
  }
}
