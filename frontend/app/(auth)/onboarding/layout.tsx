import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "How it works",
  description: "See how JoySplit splits group expenses fairly and settles them with one tap on any UPI app.",
  alternates: { canonical: "/onboarding" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
