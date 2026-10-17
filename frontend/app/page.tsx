import type { Metadata } from "next"
import Image from "next/image"
import { FlashIcon, SecurityCheckIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { JoySplitLogo } from "@/components/shared/joysplit-logo"
import { Badge } from "@/components/ui/badge"
import { SITE } from "@/lib/site"
import heroImage from "@/public/assets/friends_hero.jpg"
import { WelcomeActions } from "./_components/welcome-actions"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

const FEATURES = [
  { icon: FlashIcon, label: "Instant UPI", className: "text-brand-yellow" },
  { icon: SecurityCheckIcon, label: "Exact Paise", className: "text-success" },
  { icon: UserGroupIcon, label: "Free Forever", className: "text-primary" },
]

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  alternateName: SITE.tagline,
  url: SITE.url,
  description: SITE.description,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, Android, iOS",
  inLanguage: "en-IN",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  featureList: [
    "Split expenses equally or by exact amounts",
    "Group and one-to-one expense tracking",
    "Instant settlement via UPI apps",
    "Payment confirmation and reminders",
  ],
}

/** Server-rendered landing page: hero + copy ship in the initial HTML (fast LCP). */
export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-between bg-linear-to-b from-secondary via-background to-background p-6 sm:max-w-xl sm:py-12">
      <script
        type="application/ld+json"
        // Static, trusted object — safe to inline
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
      />

      <header className="flex flex-col items-center pt-4 text-center">
        <JoySplitLogo size="xl" showTagline />
      </header>

      <section className="my-auto flex flex-col items-center py-6">
        <div className="relative mb-6 size-64 overflow-hidden rounded-3xl border-4 border-card shadow-xl sm:size-80">
          <Image
            src={heroImage}
            alt="Friends splitting a bill with JoySplit"
            fill
            preload
            fetchPriority="high"
            placeholder="blur"
            sizes="(min-width: 640px) 320px, 256px"
            className="object-cover"
          />
        </div>

        <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          Split bills. <br />
          <span className="text-primary">Keep friendships.</span>
        </h1>
        <p className="mt-2.5 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
          The zero-budget expense splitting app for friends, trips, and roommates with instant UPI payment handoff.
        </p>

        <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {FEATURES.map((f) => (
            <li key={f.label}>
              <Badge variant="outline" className="h-7 bg-card px-3 font-semibold shadow-xs">
                <HugeiconsIcon icon={f.icon} className={f.className} data-icon="inline-start" />
                {f.label}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Get started" className="flex w-full flex-col gap-3 pb-4">
        <WelcomeActions />
      </nav>
    </main>
  )
}
