const SEEN_KEY = "joysplit_onboarding_seen"

/**
 * Onboarding rules:
 * - Signed in + profile complete → never sees onboarding (sent to /home)
 * - Signed in + profile incomplete → sent to finish the profile step
 * - Signed out, first visit on this device → "Get Started" opens the walkthrough
 * - Signed out, walkthrough already seen or signed in here before → straight to signup
 */
export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1"
  } catch {
    return false
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1")
  } catch {
    /* storage unavailable */
  }
}
