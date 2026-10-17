"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AuthHeading, AuthLayout } from "../_components/auth-card"
import { SplitBillsVisual, SyncVisual, TrackVisual, UpiVisual } from "./_components/onboarding-visuals"

const STEPS = [
  {
    title: "Split bills",
    highlight: "together",
    description: "Add expenses, split equally or manually, and keep track easily with your friends.",
    Visual: SplitBillsVisual,
  },
  {
    title: "Track and",
    highlight: "manage easily",
    description: "See who owes what, mark payments and never miss a bill again.",
    Visual: TrackVisual,
  },
  {
    title: "Pay with",
    highlight: "any UPI app",
    description: "Open your favourite UPI app, pay your share and get back to JoySplit.",
    Visual: UpiVisual,
  },
  {
    title: "Stay in sync",
    highlight: "with friends",
    description: "Get notified when someone pays, track pending bills and keep your groups organized.",
    Visual: SyncVisual,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(0)

  const isLast = currentStep === STEPS.length - 1
  const current = STEPS[currentStep]

  const handleNext = () => {
    if (!isLast) setCurrentStep(currentStep + 1)
    else router.push("/signup")
  }

  return (
    <AuthLayout
      bare
      topLeft={
        <span className="text-xs font-semibold text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      }
      footer={
        <div className="flex w-full flex-col gap-6 pb-3">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step, idx) => (
              <button
                key={step.highlight}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                aria-current={idx === currentStep ? "step" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  idx === currentStep ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          <Button size="lg" className="h-11 w-full" onClick={handleNext}>
            {isLast ? "Get Started" : "Next"}
            <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
          </Button>
        </div>
      }
      topRight={
        <Button variant="ghost" className="font-bold text-primary" onClick={() => router.push("/signup")}>
          Skip
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <AuthHeading
          title={current.title}
          highlight={current.highlight}
          breakLine={false}
          description={current.description}
          size="lg"
        />

        <div className="flex min-h-[280px] items-center justify-center">
          <current.Visual />
        </div>
      </div>
    </AuthLayout>
  )
}
