"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"

import { useSession } from "@/components/providers/session-provider"

const REDIRECT_KEY = "joysplit_redirect_to"

/** Page the user was sent away from by the auth guard (consumed once), else /home. */
function consumeRedirectTarget() {
  try {
    const saved = sessionStorage.getItem(REDIRECT_KEY)
    sessionStorage.removeItem(REDIRECT_KEY)
    // Same-site paths only ("//host" or "/\host" would leave the site)
    if (
      saved &&
      saved.startsWith("/") &&
      !saved.startsWith("//") &&
      !saved.startsWith("/\\") &&
      !saved.startsWith("/login") &&
      !saved.startsWith("/signup")
    ) {
      return saved
    }
  } catch {
    /* storage unavailable */
  }
  return "/home"
}

/**
 * Sends fully onboarded users away from auth screens. Covers both visiting
 * /login or /signup while signed in and the moment a login succeeds.
 * Returns true while redirecting so the page can render a loader instead.
 */
export function useRedirectIfSignedIn() {
  const router = useRouter()
  const { user, isLoading } = useSession()
  const shouldRedirect = !isLoading && !!user?.onboardingCompleted

  React.useEffect(() => {
    if (shouldRedirect) router.replace(consumeRedirectTarget())
  }, [shouldRedirect, router])

  return shouldRedirect
}
