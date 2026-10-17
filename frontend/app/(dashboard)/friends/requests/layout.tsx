import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Friend requests",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
