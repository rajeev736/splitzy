import {
  Home01Icon,
  Invoice01Icon,
  Notification01Icon,
  ReceiptIndianRupeeIcon,
  Settings01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  UserIcon,
  WorkHistoryIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

export interface NavItem {
  label: string
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
  { label: "Direct Splits", href: "/direct-splits", icon: Invoice01Icon },
  { label: "Split Summary", href: "/split-summary", icon: ReceiptIndianRupeeIcon, mobile: true },
  { label: "Friends", href: "/friends", icon: UserCheck01Icon },
  { label: "History", href: "/history", icon: WorkHistoryIcon },
  { label: "Notifications", href: "/notifications", icon: Notification01Icon, showUnread: true },
  { label: "Profile", href: "/profile", icon: UserIcon, mobile: true },
  { label: "Settings", href: "/settings", icon: Settings01Icon },
]

export const isNavActive = (pathname: string, href: string) =>
  pathname === href || (href !== "/home" && pathname.startsWith(href))
