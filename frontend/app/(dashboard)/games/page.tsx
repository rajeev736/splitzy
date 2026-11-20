import { redirect } from "next/navigation"

/** /games on its own: the Games hub. */
export default function GamesPage() {
  redirect("/challenges")
}
