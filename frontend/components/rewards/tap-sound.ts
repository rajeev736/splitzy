"use client"

import { isGamesSideShowing } from "@/components/game-ui/games-side"
import { playUiSound, primeUiAudio, type UiSound } from "./ui-sounds"

/**
 * One global listener for the Games side's UI sounds. A click on a control —
 * a button, link, tab, checkbox, radio, switch or a game button / choice —
 * plays the cue that fits what it does (./ui-sounds `UiSound`): close, leave,
 * back, a tab, moving to another screen, a toggle, or the plain tap.
 *
 * It sounds inside the Games UI (`.gu`) and, while a games screen is up, in
 * anything layered over it too (sheets, dialogs and toasts render outside the
 * page). Never inside `data-no-tap-sound` (the game boards play their own).
 * A control can pick its cue with `data-sound="close|leave|back|nav|tab|toggle|buy|tap"`.
 * The audio is woken on the first press, so even the first tap sounds straight
 * away. Follows the games' sound switch. Returns the uninstaller.
 */

const CONTROL =
  'button, a[href], [role="button"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], [role="option"], .gu-btn, .gu-choice'

const SOUNDS: UiSound[] = ["tap", "tab", "nav", "back", "close", "toggle", "leave", "buy"]

/** Which cue a control gets, from what it is and what it says. */
function soundFor(control: Element): UiSound {
  const picked = control.getAttribute("data-sound")
  if (picked && (SOUNDS as string[]).includes(picked)) return picked as UiSound
  const label = `${control.getAttribute("aria-label") ?? ""} ${control.getAttribute("title") ?? ""} ${(control.textContent ?? "").slice(0, 40)}`
    .trim()
    .toLowerCase()
  if (/\b(leave|exit|quit|forfeit|give up)\b/.test(label)) return "leave"
  if (control.matches('[data-slot="sheet-close"], [data-slot="dialog-close"]') || /^(close|cancel|dismiss|not now|later|no thanks)\b/.test(label))
    return "close"
  if (/^(back|go back)\b/.test(label)) return "back"
  if (control.matches('[role="tab"]')) return "tab"
  if (control.matches('[role="checkbox"], [role="radio"], [role="switch"], [role="option"]') || control.matches('[aria-pressed]'))
    return "toggle"
  // A link to another screen (the bottom bar, cards that open a page)
  if (control.matches("a[href]")) return "nav"
  return "tap"
}

export function installTapSound(): () => void {
  if (typeof document === "undefined") return () => undefined

  const onDown = () => primeUiAudio()
  const onClick = (e: MouseEvent) => {
    const t = e.target
    if (!(t instanceof Element)) return
    const control = t.closest(CONTROL)
    if (!control || control.closest("[data-no-tap-sound]")) return
    // In the games UI, or layered over a games screen (a sheet, a dialog, a toast)
    if (!control.closest(".gu, .gu-toaster") && !isGamesSideShowing()) return
    if (control.matches(':disabled, [aria-disabled="true"]')) return
    playUiSound(soundFor(control))
  }

  document.addEventListener("pointerdown", onDown, { capture: true, passive: true })
  document.addEventListener("click", onClick, { capture: true, passive: true })
  return () => {
    document.removeEventListener("pointerdown", onDown, { capture: true })
    document.removeEventListener("click", onClick, { capture: true })
  }
}
