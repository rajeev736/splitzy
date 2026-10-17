import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Sign up for JoySplit — split bills with friends to the exact paise and settle up instantly over UPI.",
  alternates: { canonical: "/signup" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
