"use client"

import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { Skeleton } from "@/components/ui/skeleton"

/** Session-aware CTAs — the only client-side part of the landing page. */
export function WelcomeActions() {
  const { user, isLoading } = useSession()

  if (isLoading) {
    // Reserve the exact space so the page doesn't shift (CLS) when auth resolves
    return (
      <>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </>
    )
  }

  if (user) {
    return (
      <>
        <ButtonLink href="/home" size="lg" className="h-12 w-full text-base">
          Go to Dashboard ({user.displayName})
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        </ButtonLink>
        <Link
          href="/onboarding"
          className="flex h-12 items-center justify-center text-xs font-semibold text-primary hover:underline"
        >
          View Onboarding Walkthrough
        </Link>
      </>
    )
  }

  return (
    <>
      <ButtonLink href="/onboarding" size="lg" className="h-12 w-full text-base">
        Get Started
        <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
      </ButtonLink>
      <ButtonLink href="/login" size="lg" variant="secondary" className="h-12 w-full text-base">
        I already have an account
      </ButtonLink>
    </>
  )
}
