"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"

import { FullScreenLoader } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { useLogout } from "@/hooks/mutations"
import { generateRandomSplitzyId } from "@/lib/firebase/splitzyId"
import { AuthFallback, AuthLayout } from "../_components/auth-card"
import { useRedirectIfSignedIn } from "../_components/use-redirect-if-signed-in"
import { AccountStep, type AccountFormValues } from "./_components/account-step"
import { DEFAULT_AVATAR, ProfileStep } from "./_components/profile-step"
import { VerifyStep } from "./_components/verify-step"

type SignupStep = "account" | "verify" | "profile"

const EMPTY_ACCOUNT: AccountFormValues = { fullName: "", email: "", password: "", confirmPassword: "" }

function stepFromParam(param: string | null): SignupStep | null {
  return param === "verify" || param === "profile" ? param : null
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, fbUser, isEmailVerified } = useSession()
  const logout = useLogout({ successMessage: undefined })
  const isRedirecting = useRedirectIfSignedIn()

  const [step, setStep] = React.useState<SignupStep>("account")
  const [account, setAccount] = React.useState<AccountFormValues>(EMPTY_ACCOUNT)
  const [resendCooldown, setResendCooldown] = React.useState(0)

  // Profile setup fields — initialised with a clean random ID
  const [splitzyId, setSplitzyId] = React.useState<string>(() => generateRandomSplitzyId())
  const [upiId, setUpiId] = React.useState("")
  const [selectedAvatar, setSelectedAvatar] = React.useState(DEFAULT_AVATAR)

  // Tracks which signed-in user's profile values have been seeded into (or edited in) the form
  const [seededFor, setSeededFor] = React.useState<{
    uid: string | null
    nameSeeded: boolean
    upiSeeded: boolean
  }>({
    uid: null,
    nameSeeded: false,
    upiSeeded: false,
  })

  const setFullName = React.useCallback((fullName: string) => {
    setAccount((a) => ({ ...a, fullName }))
  }, [])

  const handleFullNameChange = React.useCallback(
    (fullName: string) => {
      setSeededFor((s) => (s.nameSeeded ? s : { ...s, nameSeeded: true }))
      setFullName(fullName)
    },
    [setFullName]
  )

  const handleUpiIdChange = React.useCallback((val: string) => {
    setSeededFor((s) => (s.upiSeeded ? s : { ...s, upiSeeded: true }))
    setUpiId(val)
  }, [])

  // Read URL query params (?email=, ?step=verify|profile) whenever they change
  const emailParam = searchParams.get("email")
  const stepParam = stepFromParam(searchParams.get("step"))
  const paramsKey = `${emailParam ?? ""}|${stepParam ?? ""}`
  const [syncedParamsKey, setSyncedParamsKey] = React.useState<string | null>(null)
  if (paramsKey !== syncedParamsKey) {
    setSyncedParamsKey(paramsKey)
    if (emailParam && !account.email) setAccount((a) => ({ ...a, email: emailParam }))
    if (stepParam) setStep(stepParam)
  }

  // Synchronise the step + profile fields with the auth / onboarding state
  const [syncedPhotoURL, setSyncedPhotoURL] = React.useState<string | null>(null)
  if (user && !user.onboardingCompleted) {
    const isPasswordAccount = fbUser?.providerData?.some((p) => p.providerId === "password")
    // Registered with password and not verified → stay on the verification step
    const nextStep: SignupStep =
      isPasswordAccount && !isEmailVerified ? "verify" : isEmailVerified || step === "profile" ? "profile" : step
    if (nextStep !== step) setStep(nextStep)

    // Seed name / UPI once per user (a new user resets the flags)
    const isNewUser = seededFor.uid !== user.uid
    const nameSeeded = isNewUser ? false : seededFor.nameSeeded
    const upiSeeded = isNewUser ? false : seededFor.upiSeeded
    const seedName = Boolean(user.displayName) && !nameSeeded
    const seedUpi = Boolean(user.upiId) && !upiSeeded
    if (isNewUser || seedName || seedUpi) {
      setSeededFor({ uid: user.uid, nameSeeded: nameSeeded || seedName, upiSeeded: upiSeeded || seedUpi })
      if (seedName && !account.fullName) setAccount((a) => ({ ...a, fullName: user.displayName }))
      if (seedUpi && user.upiId && !upiId) setUpiId(user.upiId)
    }
    if (user.splitzyId && user.splitzyId !== splitzyId) setSplitzyId(user.splitzyId)
    if (user.photoURL && user.photoURL !== syncedPhotoURL) {
      setSyncedPhotoURL(user.photoURL)
      setSelectedAvatar(user.photoURL)
    }
  }

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (isRedirecting) return <FullScreenLoader />

  const handleBack = () => {
    if (step === "profile") {
      if (user) router.push("/home")
      else setStep("account")
    } else if (step === "verify") {
      setStep("account")
    } else {
      router.back()
    }
  }

  return (
    <AuthLayout
      onBack={handleBack}
      className={step === "verify" ? "items-center py-4 text-center" : undefined}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Login
          </Link>
        </>
      }
    >
      {step === "account" && (
        <AccountStep
          values={account}
          onChange={setAccount}
          onAccountCreated={({ splitzyId: generatedId, fullName }) => {
            setSplitzyId(generatedId)
            setUpiId(`${fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`)
            setStep("verify")
            setResendCooldown(60)
          }}
          onGoogleProfileIncomplete={() => setStep("profile")}
        />
      )}

      {step === "verify" && (
        <VerifyStep
          email={account.email || fbUser?.email || "your email"}
          resendCooldown={resendCooldown}
          onResent={() => setResendCooldown(60)}
          onVerified={() => setStep("profile")}
          isEmailVerified={isEmailVerified}
          onBackToLogin={() => logout.mutate(undefined, { onSuccess: () => router.push("/login") })}
        />
      )}

      {step === "profile" && (
        <ProfileStep
          fullName={account.fullName}
          onFullNameChange={handleFullNameChange}
          splitzyId={splitzyId}
          upiId={upiId}
          onUpiIdChange={handleUpiIdChange}
          selectedAvatar={selectedAvatar}
          onAvatarChange={setSelectedAvatar}
        />
      )}
    </AuthLayout>
  )
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<AuthFallback />}>
      <SignupForm />
    </React.Suspense>
  )
}
