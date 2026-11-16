import Image from "next/image"

import { cn } from "@/lib/utils"

const SIZES = {
  sm: "size-9 rounded-md",
  md: "size-12 rounded-md",
  lg: "size-16 rounded-lg",
  xl: "size-20 rounded-lg",
} as const

/** Illustrated group icons (public/group-icons, original art in one style). */
export const GROUP_ILLUSTRATIONS = [
  { id: "/group-icons/friends.svg", label: "Friends" },
  { id: "/group-icons/beach.svg", label: "Beach" },
  { id: "/group-icons/travel.svg", label: "Travel" },
  { id: "/group-icons/road-trip.svg", label: "Road trip" },
  { id: "/group-icons/trek.svg", label: "Trek" },
  { id: "/group-icons/home.svg", label: "Home" },
  { id: "/group-icons/family.svg", label: "Family" },
  { id: "/group-icons/party.svg", label: "Party" },
  { id: "/group-icons/food.svg", label: "Food" },
  { id: "/group-icons/cafe.svg", label: "Café" },
  { id: "/group-icons/movies.svg", label: "Movies" },
  { id: "/group-icons/gaming.svg", label: "Gaming" },
  { id: "/group-icons/sports.svg", label: "Sports" },
  { id: "/group-icons/office.svg", label: "Office" },
  { id: "/group-icons/college.svg", label: "College" },
  { id: "/group-icons/wedding.svg", label: "Wedding" },
] as const

/** Selectable group cover photos (shared by create / edit group). */
export const GROUP_ICONS = [
  { id: "/assets/icon_beach.jpg", label: "Trip" },
  { id: "/assets/icon_food.jpg", label: "Food" },
  { id: "/assets/icon_house.jpg", label: "Home" },
  { id: "/assets/icon_movie.jpg", label: "Movies" },
] as const

/** Fallback when a group has no (usable) icon. */
export const DEFAULT_GROUP_ICON = "/assets/icon_beach.jpg"

/** What new groups start with. */
export const NEW_GROUP_ICON = GROUP_ILLUSTRATIONS[0].id

/** An icon the user uploaded (a small data URL stored on the group). */
export const isUploadedGroupIcon = (src?: string | null) =>
  !!src && src.startsWith("data:image/")

/**
 * A src next/image can render: a local path or an uploaded picture. Anything
 * else (old emoji ids, foreign URLs) falls back to the default.
 */
export function groupIconSrc(src?: string | null) {
  if (!src) return DEFAULT_GROUP_ICON
  if (isUploadedGroupIcon(src)) return src
  if (src.startsWith("/") && !src.startsWith("//")) return src
  return DEFAULT_GROUP_ICON
}

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
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border bg-muted",
        SIZES[size],
        className
      )}
    >
      <Image
        src={groupIconSrc(src)}
        alt={alt}
        fill
        sizes="128px"
        className="object-cover"
      />
    </div>
  )
}
