import { Backpack01Icon, ChampionIcon, GameController03Icon, UserIcon } from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

/** The Games side's top-level pages: the hub and its bottom-bar tabs. */
export const GAME_ROUTES = {
  hub: "/challenges",
  levels: "/games/levels",
  inventory: "/games/inventory",
  profile: "/games/profile",
} as const

export type GameNavId = keyof typeof GAME_ROUTES

export interface GameNavItem {
  id: GameNavId
  label: string
  href: string
  icon: IconSvgElement
  /** The tile's colours when active: light face, deep base. */
  face: string
  base: string
}

/** Play · Levels · Inventory · Profile, left to right. */
export const GAME_NAV_ITEMS: GameNavItem[] = [
  { id: "hub", label: "Play", href: GAME_ROUTES.hub, icon: GameController03Icon, face: "#4f8ff7", base: "#2f63cf" },
  { id: "levels", label: "Levels", href: GAME_ROUTES.levels, icon: ChampionIcon, face: "#ffcd3c", base: "#d99a0b" },
  { id: "inventory", label: "Inventory", href: GAME_ROUTES.inventory, icon: Backpack01Icon, face: "#8b6cf6", base: "#5e41cc" },
  { id: "profile", label: "Profile", href: GAME_ROUTES.profile, icon: UserIcon, face: "#2fd2a0", base: "#15a07a" },
]

/** The pages that show the Games bottom bar (never inside a room or a game). */
export const isGameNavPage = (pathname: string) => GAME_NAV_ITEMS.some((i) => i.href === pathname)
