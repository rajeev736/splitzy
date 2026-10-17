"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import NextTopLoader from "nextjs-toploader"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { makeQueryClient } from "@/lib/query/client"
import { RealtimeSync } from "./realtime-sync"
import { SessionProvider } from "./session-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session (never shared across requests)
  const [queryClient] = React.useState(makeQueryClient)

  return (
    <ThemeProvider storageKey="joysplit_theme">
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <TooltipProvider>
            <NextTopLoader color="var(--primary)" height={3} showSpinner={false} shadow={false} />
            <RealtimeSync />
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </SessionProvider>
        {/* Dev-only (tree-shaken in production); hidden on mobile so it never covers the bottom nav */}
        <div className="hidden md:block">
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
