"use client"

import * as React from "react"
import { AlertCircleIcon, LockPasswordIcon, Mail01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useGoogleLogin, useSignup } from "@/hooks/mutations"
import { getFriendlyAuthErrorMessage } from "@/lib/firebase/errors"
import { generateRandomSplitzyId } from "@/lib/firebase/splitzyId"
import { AuthHeading } from "../../_components/auth-card"
import { AuthInput, PasswordToggle } from "../../_components/auth-input"
import { GoogleSignInSection } from "../../_components/google-button"

export interface AccountFormValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

function validate({ fullName, email, password, confirmPassword }: AccountFormValues): string | null {
  if (!fullName.trim()) return "Please enter your full name"
  if (!email.trim() || !email.includes("@")) return "Please enter a valid email address"
  if (password.length < 6) return "Password must be at least 6 characters"
  if (password !== confirmPassword) return "Passwords do not match"
  return null
}

/** Signup step 1: name / email / password, or Google. */
export function AccountStep({
  values,
  onChange,
  onAccountCreated,
  onGoogleProfileIncomplete,
}: {
  values: AccountFormValues
  onChange: (values: AccountFormValues) => void
  onAccountCreated: (info: { splitzyId: string; fullName: string }) => void
  onGoogleProfileIncomplete: () => void
}) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState("")

  const signup = useSignup({
    successMessage: "Account created! A verification link was sent to your email.",
    errorMessage: false,
  })
  const googleLogin = useGoogleLogin({
    successMessage: (data) =>
      (data as { onboardingCompleted: boolean }).onboardingCompleted
        ? "Welcome back to JoySplit!"
        : "Signed in with Google! Let's complete your profile.",
    errorMessage: false,
  })
  const isLoading = signup.isPending || googleLogin.isPending

  const showError = (err: unknown) => {
    const friendly = getFriendlyAuthErrorMessage(err)
    setErrorMsg(friendly)
    toast.error(friendly)
  }

  const update = (field: keyof AccountFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, [field]: e.target.value })
    setErrorMsg("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    const validationError = validate(values)
    if (validationError) {
      setErrorMsg(validationError)
      return
    }

    const generatedId = generateRandomSplitzyId()
    const fullName = values.fullName
    signup.mutate(
      { name: fullName.trim(), email: values.email.trim(), password: values.password, preferredSplitzyId: generatedId },
      {
        onSuccess: () => onAccountCreated({ splitzyId: generatedId, fullName }),
        onError: (err) => {
          console.error("Signup submission error:", err)
          showError(err)
        },
      }
    )
  }

  const handleGoogleSignup = () => {
    if (isLoading) return
    setErrorMsg("")
    googleLogin.mutate(undefined, {
      onSuccess: (res) => {
        // Completed profiles are redirected by useRedirectIfSignedIn on the page
        if (!res.onboardingCompleted) onGoogleProfileIncomplete()
      },
      onError: showError,
    })
  }

  return (
    <>
      <AuthHeading
        title="Create your"
        highlight="account"
        description="Join JoySplit and start splitting bills with your friends."
      />

      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-3.5">
          <AuthInput
            id="fullName"
            label="Full name"
            icon={UserIcon}
            autoComplete="name"
            value={values.fullName}
            onChange={update("fullName")}
            placeholder="e.g. Rajeev Ranjan"
            required
          />
          <AuthInput
            id="email"
            label="Email address"
            icon={Mail01Icon}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={update("email")}
            placeholder="name@example.com"
            required
          />
          <AuthInput
            id="password"
            label="Password"
            icon={LockPasswordIcon}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.password}
            onChange={update("password")}
            placeholder="At least 6 characters"
            endAddon={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
            required
          />
          <AuthInput
            id="confirmPassword"
            label="Confirm password"
            icon={LockPasswordIcon}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={update("confirmPassword")}
            placeholder="Re-enter your password"
            required
          />

          {errorMsg && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
              <HugeiconsIcon icon={AlertCircleIcon} />
              <AlertDescription className="text-xs font-medium">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="mt-2 h-11 w-full" disabled={isLoading}>
            {signup.isPending && <Spinner data-icon="inline-start" />}
            Create account
          </Button>

          <GoogleSignInSection onClick={handleGoogleSignup} disabled={isLoading} isPending={googleLogin.isPending} />
        </FieldGroup>
      </form>
    </>
  )
}
