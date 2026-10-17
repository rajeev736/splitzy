import type { MetadataRoute } from "next"

import { SITE } from "@/lib/site"

/** Private, signed-in areas — never useful in search results. */
const PRIVATE = [
  "/home",
  "/groups",
  "/expenses",
  "/friends",
  "/activity",
  "/history",
  "/notifications",
  "/profile",
  "/settings",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
