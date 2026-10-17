import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The repo root has its own lockfile (the original app); pin this app's root
  turbopack: { root: import.meta.dirname },
  poweredByHeader: false,
  experimental: {
    // Icon/component barrels: only bundle the modules actually imported
    optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react", "@base-ui/react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
}

export default nextConfig
