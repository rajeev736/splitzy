import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV !== "production"
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN

/**
 * Content Security Policy for a client-rendered Firebase app. Scripts allow
 * 'unsafe-inline' because Next.js and next-themes inject inline bootstrap
 * scripts and the pages are statically rendered (no per-request nonce); the
 * high-value protections are the locked-down connect/frame/object/base rules.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://firebasestorage.googleapis.com https://api.dicebear.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://firestore.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "wss://*.firebaseio.com",
    authDomain ? `https://${authDomain}` : "",
    isDev ? "ws://localhost:* http://localhost:*" : "",
  ]
    .filter(Boolean)
    .join(" "),
  `frame-src 'self' https://accounts.google.com${authDomain ? ` https://${authDomain}` : ""}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is used for profile photos; nothing else needs device access
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Google sign-in uses a popup that must be able to report back
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Pin Turbopack to this app (the repo root holds only Firebase config and docs)
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
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
}

export default nextConfig
