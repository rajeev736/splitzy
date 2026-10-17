import Image from "next/image"

import { cn } from "@/lib/utils"

const SIZES = {
  sm: "size-9 rounded-lg",
  md: "size-12 rounded-xl",
  lg: "size-16 rounded-2xl",
  xl: "size-20 rounded-3xl",
} as const

/** Selectable group cover images (shared by create / edit group). */
export const GROUP_ICONS = [
  { id: "/assets/icon_beach.jpg", label: "Trip" },
  { id: "/assets/icon_food.jpg", label: "Food" },
  { id: "/assets/icon_house.jpg", label: "Home" },
  { id: "/assets/icon_movie.jpg", label: "Movies" },
] as const

export const DEFAULT_GROUP_ICON = "/assets/icon_beach.jpg"

/** Square group / expense cover image with a consistent radius + border. */
export function GroupIcon({
  src,
  alt,
  size = "md",
  className,
}: {
  src?: string | null
  alt: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden border bg-muted", SIZES[size], className)}>
      <Image src={src || DEFAULT_GROUP_ICON} alt={alt} fill sizes="80px" className="object-cover" />
    </div>
  )
}
