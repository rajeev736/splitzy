"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** JoySplit coin: a small embossed gold coin. */
export function CoinIcon({ className }: { className?: string }) {
  const id = React.useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4 shrink-0", className)}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#d98a0b" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd34d" />
          <stop offset="1" stopColor="#f0a30a" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-rim)`} />
      <circle cx="12" cy="12" r="8.4" fill={`url(#${id}-face)`} stroke="#c47a06" strokeOpacity=".35" strokeWidth=".8" />
      <path
        d="M12 7.2l1.42 2.9 3.2.46-2.31 2.25.55 3.18L12 14.5l-2.86 1.5.55-3.18-2.31-2.25 3.2-.46z"
        fill="#fff6d6"
        stroke="#c47a06"
        strokeOpacity=".45"
        strokeWidth=".6"
        strokeLinejoin="round"
      />
      <path d="M5.6 8.2A7.5 7.5 0 0 1 10 4.6" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

const fmt = new Intl.NumberFormat("en-IN")

/** "1,250" with a coin in front. */
export function Coins({ amount, className, iconClassName }: { amount: number; className?: string; iconClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", className)}>
      <CoinIcon className={iconClassName} />
      {fmt.format(amount)}
    </span>
  )
}
