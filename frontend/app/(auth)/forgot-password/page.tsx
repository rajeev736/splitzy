"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import { CheckmarkCircle02Icon, Mail01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { AuthHeading, AuthLayout, AuthStatusIcon } from "../_components/auth-card"
import { AuthInput } from "../_components/auth-input"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    timer.current = setTimeout(() => {
      setIsLoading(false)
      setSent(true)
      toast.success("Password reset instructions sent!")
    }, 600)
  }

  return (
    <AuthLayout
      onBack={() => router.back()}
      className={sent ? "items-center py-4 text-center" : undefined}
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to Login
          </Link>
        </>
      }
    >
      {sent ? (
        <>
          <AuthStatusIcon icon={CheckmarkCircle02Icon} tone="success" />
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">
              We have sent password recovery instructions to <strong className="font-medium break-all text-foreground">{email}</strong>.
            </p>
          </div>
          <Button size="lg" className="h-10 w-full" onClick={() => router.push("/login")}>
            Back to Login
          </Button>
        </>
      ) : (
        <>
          <AuthHeading
            title="Reset your password"
            description="Enter your registered email address and we will send you a reset link."
          />
          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              <AuthInput
                id="email"
                label="Email address"
                icon={Mail01Icon}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <Button type="submit" size="lg" className="h-10 w-full" disabled={isLoading}>
                {isLoading && <Spinner data-icon="inline-start" />}
                Send Reset Link
              </Button>
            </FieldGroup>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
