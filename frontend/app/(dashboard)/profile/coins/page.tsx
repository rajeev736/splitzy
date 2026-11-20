import { redirect } from "next/navigation"

/** The coin history moved to the Games side; old links land there. */
export default function CoinsPage() {
  redirect("/games/coins")
}
