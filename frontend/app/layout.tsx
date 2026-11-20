import type { Metadata, Viewport } from "next"
import { Fredoka, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import "@/components/game-ui/game-ui.css"
import { Providers } from "@/components/providers"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
// Only used for IDs (JOY-XXXXXX); not needed for first paint
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false })
// The Games side's chunky, rounded type (components/game-ui); the money screens never wait on it
const fontGame = Fredoka({ subsets: ["latin"], variable: "--font-game", display: "swap", preload: false, weight: ["500", "600", "700"] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  category: "finance",
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: "/",
    locale: "en_IN",
    images: [
      {
        // One small card for every page (WhatsApp skips previews over ~300 KB).
        // Bump ?v= whenever the image changes, so apps fetch it again.
        url: "/og.jpg?v=2",
        width: 1200,
        height: 670,
        type: "image/jpeg",
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: "/og.jpg?v=2", alt: `${SITE.name} — ${SITE.tagline}` }],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F5" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1F1F" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={cn("h-full antialiased", fontMono.variable, inter.variable, fontGame.variable)}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
