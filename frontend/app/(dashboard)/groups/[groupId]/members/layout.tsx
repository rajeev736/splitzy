import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Group members",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
