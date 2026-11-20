"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A crafted gold trophy for the Games side (wins, rewards): a polished cup
 * with handles and a star, on a two-step plinth. Flat gradients and a thin
 * dark outline, so it reads at 16px and still looks rich at 96px. Use it in
 * place of the 🏆 emoji.
 */
export function TrophyIcon({ className, title }: { className?: string; title?: string }) {
  const id = React.useId().replace(/:/g, "")
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-5 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-cup`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f7b521" />
          <stop offset=".35" stopColor="#ffe27a" />
          <stop offset=".6" stopColor="#ffc93a" />
          <stop offset="1" stopColor="#e08a0c" />
        </linearGradient>
        <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a36" />
          <stop offset="1" stopColor="#5e3a1f" />
        </linearGradient>
      </defs>
      {/* Handles */}
      <path
        d="M8.2 7.6H4.6c-.6 0-1 .5-.9 1.1.5 3.4 2.4 5.6 5.4 6.3M23.8 7.6h3.6c.6 0 1 .5.9 1.1-.5 3.4-2.4 5.6-5.4 6.3"
        fill="none"
        stroke="#b8700a"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M8.2 7.6H4.6c-.6 0-1 .5-.9 1.1.5 3.4 2.4 5.6 5.4 6.3M23.8 7.6h3.6c.6 0 1 .5.9 1.1-.5 3.4-2.4 5.6-5.4 6.3"
        fill="none"
        stroke="#ffd34d"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Stem */}
      <path d="M14 18.4h4l.7 4.2h-5.4z" fill={`url(#${id}-cup)`} stroke="#9a5a06" strokeWidth=".8" strokeLinejoin="round" />
      {/* Cup */}
      <path
        d="M7.4 4.6h17.2c.5 0 .9.4.9.9 0 7.6-3.8 12.9-9.5 12.9S6.5 13.1 6.5 5.5c0-.5.4-.9.9-.9z"
        fill={`url(#${id}-cup)`}
        stroke="#9a5a06"
        strokeWidth=".9"
        strokeLinejoin="round"
      />
      {/* Rim */}
      <rect x="6.3" y="3.6" width="19.4" height="2.4" rx="1.2" fill="#ffe9a3" stroke="#9a5a06" strokeWidth=".8" />
      {/* Star */}
      <path
        d="M16 7.6l1.25 2.55 2.8.4-2.03 1.98.48 2.79L16 14l-2.5 1.32.48-2.79-2.03-1.98 2.8-.4z"
        fill="#fff8d6"
        stroke="#c47a06"
        strokeWidth=".6"
        strokeLinejoin="round"
      />
      {/* Shine */}
      <path d="M9.4 7.4c.2 3 1.2 5.4 2.8 6.9" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.1" strokeLinecap="round" />
      {/* Plinth */}
      <rect x="11.2" y="22.2" width="9.6" height="2.6" rx=".8" fill="#ffd34d" stroke="#9a5a06" strokeWidth=".8" />
      <rect x="8.6" y="24.6" width="14.8" height="4.4" rx="1.3" fill={`url(#${id}-base)`} stroke="#4a2c14" strokeWidth=".8" />
      <rect x="13" y="25.9" width="6" height="1.8" rx=".5" fill="#ffd34d" opacity=".9" />
    </svg>
  )
}
