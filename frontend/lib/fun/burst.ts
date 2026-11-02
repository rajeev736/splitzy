"use client"

import * as React from "react"

import { GIFTS, isGiftId, LOVE_NUDGES, NUDGE_LABEL, type GiftId, type LoveNudge } from "@/lib/fun/catalog"
import type { AppNotification, Moment } from "@/lib/types"

/**
 * The full-screen moment animation (hug, kiss, wish, gift), played from
 * anywhere: right after sending, when one arrives while you're in the app, or
 * when you tap one later. FunSync renders it.
 */
export type Burst = {
  kind: LoveNudge | "wish" | "gift"
  gift?: GiftId
  title: string
  subtitle?: string
  /** After it finishes (e.g. open the notification's details). */
  onDone?: () => void
}

let current: Burst | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function playBurst(burst: Burst) {
  current = burst
  emit()
}

export function endBurst() {
  const done = current?.onDone
  current = null
  emit()
  done?.()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useBurst = () =>
  React.useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  )

const isNudge = (t: unknown): t is LoveNudge => (LOVE_NUDGES as readonly string[]).includes(t as string)

/** The animation for a hug / kiss / wish / gift notification, if it is one. */
export function burstFromNotification(n: AppNotification): Burst | null {
  const t = n.data?.momentType
  if (n.type !== "MOMENT" || !t) return null
  if (t === "gift") {
    const gift = n.data?.gift
    return isGiftId(gift) ? { kind: "gift", gift, title: n.title, subtitle: n.message } : null
  }
  if (t === "wish" || isNudge(t)) return { kind: t, title: n.title }
  return null
}

/** The animation for a moment in a friend's activity feed. */
export function burstFromMoment(m: Moment, mine: boolean, friendFirst: string): Burst | null {
  if (m.type === "gift" && isGiftId(m.item)) {
    const name = GIFTS[m.item].name
    return {
      kind: "gift",
      gift: m.item,
      title: mine ? `${name} for ${friendFirst}` : `${friendFirst} sent you ${name.toLowerCase()}`,
      subtitle: m.note ? `"${m.note}"` : undefined,
    }
  }
  if (m.type === "wish") {
    return { kind: "wish", title: mine ? `Your wish to ${friendFirst}` : `${friendFirst} wished you a happy birthday` }
  }
  if (isNudge(m.type)) {
    return {
      kind: m.type,
      title: mine ? `${NUDGE_LABEL[m.type].name} for ${friendFirst}` : `${friendFirst} ${NUDGE_LABEL[m.type].verb}`,
    }
  }
  return null
}
