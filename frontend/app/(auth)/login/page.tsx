"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { AlertCircleIcon, ArrowRight01Icon, LockPasswordIcon, Mail01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { FullScreenLoader } from "@/components/layout/app-shell"
import { JoySplitLogo } from "@/components/shared/joysplit-logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useGoogleLogin, useLogin } from "@/hooks/mutations"
import { getFriendlyAuthErrorMessage } from "@/lib/firebase/errors"
import { AuthFallback, AuthHeading, AuthLayout } from "../_components/auth-card"
import { AuthInput, PasswordToggle } from "../_components/auth-input"
import { GoogleSignInSection } from "../_components/google-button"
import { useRedirectIfSignedIn } from "../_components/use-redirect-if-signed-in"

const WELCOME_BACK = "Welcome back to JoySplit!"

function errorCode(err: unknown) {
  return (err as { code?: string } | null)?.code
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const login = useLogin({ successMessage: WELCOME_BACK, errorMessage: false })
  const googleLogin = useGoogleLogin({
    successMessage: (data) =>
      (data as { onboardingCompleted: boolean }).onboardingCompleted
        ? WELCOME_BACK
        : "Signed in! Please finish setting up your profile.",
    errorMessage: false,
  })

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [formError, setFormError] = React.useState("")
  const [showSignupOption, setShowSignupOption] = React.useState(false)

  const isLoading = login.isPending || googleLogin.isPending

  // Prefill (and re-sync on navigation) from ?email=
  const emailParam = searchParams.get("email")
  const [syncedEmailParam, setSyncedEmailParam] = React.useState<string | null>(null)
  if (emailParam !== syncedEmailParam) {
    setSyncedEmailParam(emailParam)
    if (emailParam) setEmail(emailParam)
  }

  // Confirmation after account deletion (?deleted=1)
  const accountDeleted = searchParams.get("deleted") === "1"
  React.useEffect(() => {
    if (accountDeleted) toast.success("Your account and its data have been deleted.")
  }, [accountDeleted])

  // Redirects to the saved page (or /home) as soon as a completed profile is signed in
  const isRedirecting = useRedirectIfSignedIn()

  const resetErrors = () => {
    setFormError("")
    setShowSignupOption(false)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    resetErrors()

    if (!email.trim()) {
      setFormError("Please enter your email address")
      return
    }
    if (!password) {
      setFormError("Please enter your password")
      return
    }

    login.mutate(
      { email: email.trim(), password },
      {
        onError: (err) => {
          const code = errorCode(err)
          if (code === "auth/email-not-verified") {
            toast.error("Please verify your email address before logging in.")
            router.push(`/signup?step=verify&email=${encodeURIComponent(email.trim())}`)
            return
          }
          const friendlyMsg = getFriendlyAuthErrorMessage(err)
          setFormError(friendlyMsg)
          if (code === "auth/invalid-credential" || code === "auth/user-not-found" || friendlyMsg.includes("create an account")) {
            setShowSignupOption(true)
          }
          toast.error(friendlyMsg)
        },
      }
    )
  }

  const handleGoogleLogin = () => {
    if (isLoading) return
    resetErrors()
    googleLogin.mutate(undefined, {
      onSuccess: (res) => {
        // Completed profiles are redirected by useRedirectIfSignedIn
        if (!res.onboardingCompleted) router.replace("/signup?step=profile")
      },
      onError: (err) => {
        const friendlyMsg = getFriendlyAuthErrorMessage(err)
        setFormError(friendlyMsg)
        toast.error(friendlyMsg)
      },
    })
  }

  if (isRedirecting) return <FullScreenLoader />


  const signupHref = email.trim() ? `/signup?email=${encodeURIComponent(email.trim())}` : "/signup"

  return (
    <AuthLayout
      onBack={() => router.back()}
      footer={
        <>
          New to JoySplit?{" "}
          <Link href={signupHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <JoySplitLogo size="md" />
        <AuthHeading
          centered
          title="Welcome back"
          description="Login to continue splitting bills with your friends."
        />
      </div>

      <form onSubmit={handleLogin}>
        <FieldGroup className="gap-4">
          <AuthInput
            id="email"
            label="Email address"
            icon={Mail01Icon}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              resetErrors()
            }}
            placeholder="Enter your email"
            required
          />

          <div className="flex flex-col gap-2">
            <AuthInput
              id="password"
              label="Password"
              icon={LockPasswordIcon}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFormError("")
              }}
              placeholder="Enter your password"
              endAddon={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
              required
            />
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {formError && (
            <Alert variant="destructive">
              <HugeiconsIcon icon={AlertCircleIcon} />
              <AlertDescription className="flex flex-col gap-2 text-xs">
                <p>{formError}</p>
                {showSignupOption && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto self-start px-0 font-medium"
                    onClick={() => router.push(`/signup?email=${encodeURIComponent(email.trim())}`)}
                  >
                    Create an account with this email
                    <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="mt-1 h-10 w-full" disabled={isLoading}>
            {login.isPending && <Spinner data-icon="inline-start" />}
            Login
          </Button>

          <GoogleSignInSection onClick={handleGoogleLogin} disabled={isLoading} isPending={googleLogin.isPending} />
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<AuthFallback />}>
      <LoginForm />
    </React.Suspense>
  )
}
