import type { MetadataRoute } from "next"

import { PUBLIC_ROUTES, SITE } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route === "/" ? "" : route}`,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.6,
  }))
}
