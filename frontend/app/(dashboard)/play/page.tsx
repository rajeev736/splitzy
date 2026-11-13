import { redirect } from "next/navigation"

/** /play on its own: the Games tab, where rooms are created and joined. */
export default function PlayIndexPage() {
  redirect("/challenges?tab=live")
}
