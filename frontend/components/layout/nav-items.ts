import {
  Analytics01Icon,
  GameController03Icon,
  Home01Icon,
  Notification01Icon,
  ReceiptIndianRupeeIcon,
  Settings01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

export interface NavItem {
  label: string
  mobileLabel?: string
  href: string
  icon: IconSvgElement
  /** Shown in the mobile bottom nav. */
  mobile?: boolean
  /** Shows the unread-notifications badge. */
  showUnread?: boolean
}

/** Single source of truth for the sidebar and the mobile bottom nav. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: Home01Icon, mobile: true },
  { label: "Groups", href: "/groups", icon: UserGroupIcon, mobile: true },
  { label: "Split Summary", mobileLabel: "Splits", href: "/split-summary", icon: ReceiptIndianRupeeIcon, mobile: true },
  { label: "Insights", href: "/insights", icon: Analytics01Icon },
  { label: "Friends", href: "/friends", icon: UserCheck01Icon, mobile: true },
  { label: "Games", href: "/challenges", icon: GameController03Icon, mobile: true },
  { label: "Notifications", href: "/notifications", icon: Notification01Icon, showUnread: true },
  { label: "Profile", href: "/profile", icon: UserIcon, mobile: true },
  { label: "Settings", href: "/settings", icon: Settings01Icon },
]

/** The pages the mobile bottom nav switches between. */
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((i) => i.mobile)

/**
 * The bottom nav belongs to the top-level tabs only: on anything deeper (a
 * group, add expense, history, settings…) it hides and the page's back button leads.
 */
export const isBottomNavPage = (pathname: string) => MOBILE_NAV_ITEMS.some((i) => i.href === pathname)

export const isNavActive = (pathname: string, href: string) =>
  pathname === href || (href !== "/home" && pathname.startsWith(href))
