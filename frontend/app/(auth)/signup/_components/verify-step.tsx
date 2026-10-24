"use client"

import * as React from "react"
import { ArrowRight01Icon, MailValidation01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useSendVerificationEmail } from "@/hooks/mutations"
import { getFriendlyAuthErrorMessage } from "@/lib/firebase/errors"
import { cn } from "@/lib/utils"
import { AuthStatusIcon } from "../../_components/auth-card"

const POLL_INTERVAL_MS = 2500

/** Signup step 2: waits for the email link (auto-polls `reloadUser`). */
export function VerifyStep({
  email,
  isEmailVerified,
  resendCooldown,
  onResent,
  onVerified,
  onBackToLogin,
}: {
  email: string
  isEmailVerified: boolean
  resendCooldown: number
  onResent: () => void
  onVerified: () => void
  onBackToLogin: () => void
}) {
  const { reloadUser } = useSession()
  const [isChecking, setIsChecking] = React.useState(false)
  const sendVerification = useSendVerificationEmail({
    successMessage: "A new verification link has been sent to your email.",
    errorMessage: false,
  })

  // Keep the latest callbacks without restarting the poll on every render
  const latest = React.useRef({ reloadUser, onVerified })
  React.useEffect(() => {
    latest.current = { reloadUser, onVerified }
  })

  // Auto-poll for email verification (no manual reload required)
  React.useEffect(() => {
    if (isEmailVerified) return
    let isMounted = true
    const pollInterval = setInterval(async () => {
      try {
        const verified = await latest.current.reloadUser()
        if (verified && isMounted) {
          toast.success("Email verified! Let's set up your profile.")
          latest.current.onVerified()
        }
      } catch {
        // Ignore background polling errors
      }
    }, POLL_INTERVAL_MS)
    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [isEmailVerified])

  const handleCheckVerification = async () => {
    setIsChecking(true)
    try {
      const verified = await reloadUser()
      if (verified) {
        toast.success("Email verified successfully! Setting up your profile...")
        onVerified()
      } else {
        toast.error("Email is not verified yet. Please check your inbox or spam folder.")
      }
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to check verification status.")
    } finally {
      setIsChecking(false)
    }
  }

  const handleResend = () => {
    if (resendCooldown > 0) return
    sendVerification.mutate(undefined, {
      onSuccess: onResent,
      onError: (err) => toast.error(getFriendlyAuthErrorMessage(err)),
    })
  }

  return (
    <>
      <AuthStatusIcon icon={MailValidation01Icon} />
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Verify your email</h2>
        <p className="max-w-xs text-sm text-muted-foreground">We sent a verification link to:</p>
        <p className="max-w-full text-sm font-medium break-all">{email}</p>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Click the link in the email to verify. This page will <strong className="font-medium text-foreground">automatically continue</strong> to
          profile setup once verified.
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <Button size="lg" className="h-10 w-full" onClick={handleCheckVerification} disabled={isChecking}>
          {isChecking && <Spinner data-icon="inline-start" />}
          I have verified my email
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        </Button>

        <Button
          variant="link"
          size="sm"
          className="text-xs font-medium"
          disabled={resendCooldown > 0 || sendVerification.isPending}
          onClick={handleResend}
        >
          <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" className={cn(resendCooldown > 0 && "animate-spin")} />
          {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : "Resend verification email"}
        </Button>

        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onBackToLogin}>
          Back to Login
        </Button>
      </div>
    </>
  )
}
