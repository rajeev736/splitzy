import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Game profile",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
