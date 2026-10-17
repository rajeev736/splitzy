import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to JoySplit to see your groups, balances and pending UPI settlements.",
  alternates: { canonical: "/login" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
