import { Suspense } from "react"
import type { Metadata } from "next"

import { AppShell, FullScreenLoader } from "@/components/layout/app-shell"

// Signed-in area: personal data, never indexed
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/** Every dashboard route shares the auth guard + sidebar/bottom-nav chrome. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // AppShell reads the pathname (runtime URL data) — Cache Components needs a Suspense boundary
    <Suspense fallback={<FullScreenLoader />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  )
}
