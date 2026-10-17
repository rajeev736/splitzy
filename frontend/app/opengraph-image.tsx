import { ImageResponse } from "next/og"

import { SITE } from "@/lib/site"

export const alt = `${SITE.name} — ${SITE.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Social share card (Open Graph + Twitter), rendered at build time. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 55%, #FEF3C7 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <svg width="132" height="132" viewBox="22 8 72 72">
            <rect x="24" y="30" width="22" height="50" rx="11" transform="rotate(-18 24 30)" fill="#2563EB" />
            <rect x="60" y="36" width="20" height="44" rx="10" transform="rotate(-18 60 36)" fill="#FBBF24" />
            <circle cx="68" cy="22" r="5" fill="#FBBF24" />
            <path d="M62 14L65 17M74 14L71 17" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 96, fontWeight: 800, color: "#0F172A", letterSpacing: "-3px" }}>{SITE.name}</div>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 60, fontWeight: 800, color: "#0F172A" }}>
          Split bills.&nbsp;<span style={{ color: "#2563EB" }}>Keep friendships.</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#64748B", maxWidth: 900 }}>
          Exact-paise splits for trips, flats and dinners — settle up instantly with UPI.
        </div>
      </div>
    ),
    size
  )
}
