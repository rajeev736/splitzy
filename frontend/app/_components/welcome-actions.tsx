"use client"

import * as React from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useRedirectIfSignedIn } from "@/app/(auth)/_components/use-redirect-if-signed-in"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { Skeleton } from "@/components/ui/skeleton"
import { hasSeenOnboarding } from "@/lib/onboarding"

const noopSubscribe = () => () => {}

/** Session-aware CTAs — the only client-side part of the landing page. */
export function WelcomeActions() {
  const { user, isLoading } = useSession()
  // Signed-in users opening a shared link land in their account, not the welcome screen
  const isRedirecting = useRedirectIfSignedIn()
  // Read on the client only (false during SSR) — no hydration mismatch
  const seenOnboarding = React.useSyncExternalStore(noopSubscribe, hasSeenOnboarding, () => false)

  if (isLoading || isRedirecting) {
    // Reserve the exact space so the page doesn't shift (CLS) when auth resolves
    return (
      <>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </>
    )
  }

  if (user) {
    // Signed in but profile not finished yet
    return (
      <ButtonLink href="/signup?step=profile" size="lg" className="h-12 w-full text-base">
        Complete your profile
        <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
      </ButtonLink>
    )
  }

  return (
    <>
      <ButtonLink href={seenOnboarding ? "/signup" : "/onboarding"} size="lg" className="h-12 w-full text-base">
        Get Started
        <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
      </ButtonLink>
      <ButtonLink href="/login" size="lg" variant="secondary" className="h-12 w-full text-base">
        I already have an account
      </ButtonLink>
    </>
  )
}
