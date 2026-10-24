import Link from "next/link"

import { cn } from "@/lib/utils"

const ICON_SIZES = { sm: "size-7", md: "size-9", lg: "size-12", xl: "size-16" } as const
const TEXT_SIZES = { sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-4xl" } as const

export function JoySplitLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("size-8", className)}>
      <rect x="24" y="30" width="22" height="50" rx="11" transform="rotate(-18 24 30)" fill="#2563EB" />
      <rect x="60" y="36" width="20" height="44" rx="10" transform="rotate(-18 60 36)" fill="#FBBF24" />
      <circle cx="68" cy="22" r="5" fill="#FBBF24" />
      <path d="M62 14L65 17M74 14L71 17" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

interface JoySplitLogoProps {
  size?: keyof typeof ICON_SIZES
  showText?: boolean
  showTagline?: boolean
  className?: string
  href?: string
}

export function JoySplitLogo({ size = "md", showText = true, showTagline = false, className, href }: JoySplitLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <JoySplitLogoIcon className={ICON_SIZES[size]} />
      {showText && (
        <div className="flex flex-col">
          <span className={cn("leading-tight font-semibold tracking-tight text-foreground", TEXT_SIZES[size])}>
            JoySplit
          </span>
          {showTagline && (
            <span className="-mt-0.5 text-[11px] text-muted-foreground">Split bills. Keep friendships.</span>
          )}
        </div>
      )}
    </div>
  )

  if (!href) return content
  return (
    <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-90">
      {content}
    </Link>
  )
}
