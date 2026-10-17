/** Site-wide constants for metadata, manifest, sitemap and structured data. */
export const SITE = {
  name: "JoySplit",
  tagline: "Split bills. Keep friendships.",
  description:
    "JoySplit is a free expense-splitting app for friends, trips and roommates. Split bills to the exact paise, track who owes what, and settle up instantly over UPI.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  themeColor: "#2563EB",
  backgroundColor: "#F8FAFC",
  keywords: [
    "split bills",
    "expense splitter",
    "split expenses with friends",
    "UPI settle up",
    "group expenses",
    "trip expense tracker",
    "roommate bill split",
    "Splitwise alternative India",
  ],
} as const

/** Routes that are public and worth indexing. Everything else sits behind login. */
export const PUBLIC_ROUTES = ["/", "/login", "/signup", "/onboarding"] as const
