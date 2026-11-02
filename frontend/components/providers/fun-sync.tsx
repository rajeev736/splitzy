"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { MomentBurst } from "@/components/fun/moment-burst"
import { WelcomeTour } from "@/components/fun/welcome-tour"
import { useSession } from "@/components/providers/session-provider"
import { useBadges, useFriendships, useMyPlayed, useWallet } from "@/hooks/use-fun"
import { FRAME_IDS, FRAMES } from "@/lib/fun/catalog"
import { useChallenges, useExpenseHistory, useFriends, useNotifications } from "@/hooks/queries"
import { isBirthdayToday } from "@/lib/fun/birthday"
import { burstFromNotification, endBurst, playBurst, useBurst } from "@/lib/fun/burst"
import { systemNotificationPermission } from "@/lib/system-notifications"
import { GAMES } from "@/lib/games"
import { formatPaise, payeeOf } from "@/lib/money"
import { collectStake, stakePayout } from "@/services/challenges"
import {
  awardEarnedBadges,
  ensureWallet,
  milestoneProgress,
  notifyBadgeUnlocked,
  notifyFrameUnlocked,
  recordPlayedGames,
} from "@/services/fun"

const seenKey = "joysplit_moments_seen"

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey) ?? "[]") as string[]
  } catch {
    return []
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(seenKey, JSON.stringify([id, ...readSeen()].slice(0, 100)))
  } catch {}
}

/**
 * The fun layer's background work: a wallet with starting coins, badges as
 * they're earned, friends' birthday reminders, and a little celebration when
 * a hug, kiss or gift arrives while you're in the app (later ones play when
 * you tap them).
 */
export function FunSync() {
  const router = useRouter()
  const { user } = useSession()
  const uid = user?.uid
  const expenses = useExpenseHistory()
  const challenges = useChallenges()
  const friends = useFriends()
  const notifications = useNotifications()
  const friendships = useFriendships()
  const loveBonds = friendships.data.filter((f) => f.status === "ACTIVE" && f.bond?.type === "love").length
  const badges = useBadges(uid, loveBonds)

  // Starting coins the first time
  React.useEffect(() => {
    if (uid) ensureWallet(uid).catch((e) => console.warn("Wallet:", e))
  }, [uid])

  // Badges earned (Swift Payer, Game Champ) and not recorded yet
  const badgeIds = badges?.ids
  React.useEffect(() => {
    if (!uid || !badgeIds || expenses.isPending || challenges.isPending) return
    const t = window.setTimeout(() => {
      awardEarnedBadges(uid, badgeIds, expenses.data, challenges.data).catch(() => {})
    }, 1500)
    return () => window.clearTimeout(t)
  }, [uid, badgeIds, expenses.data, expenses.isPending, challenges.data, challenges.isPending])

  // A badge unlocked (or a new tier) lands in your notifications; tapping it opens your badges.
  // Tiers already seen on this device are remembered, so nothing is announced twice.
  React.useEffect(() => {
    if (!user || !badges || friendships.isPending) return
    const key = `joysplit_badge_tiers_${user.uid}`
    let seen: Record<string, number> | null = null
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? "null") as Record<string, number> | null
    } catch {}
    const now = Object.fromEntries(badges.summary.map((b) => [b.id, b.tier]))
    if (seen) {
      for (const b of badges.summary) {
        if (b.tier > (seen[b.id] ?? 0)) notifyBadgeUnlocked(user, b.id, b.tier)
      }
    }
    // First time on this device: just remember where things stand
    try {
      localStorage.setItem(key, JSON.stringify({ ...seen, ...now }))
    } catch {}
  }, [user, badges, friendships.isPending])

  // Every finished game counts once towards "games played" (milestone frames)
  const wallet = useWallet()
  const played = useMyPlayed()
  const hasWallet = !!wallet
  React.useEffect(() => {
    if (!uid || !played || !hasWallet || challenges.isPending) return
    const t = window.setTimeout(() => recordPlayedGames(uid, played, challenges.data).catch(() => {}), 2000)
    return () => window.clearTimeout(t)
  }, [uid, played, hasWallet, challenges.data, challenges.isPending])

  // A milestone frame reached: tell them once, so they can claim it
  React.useEffect(() => {
    if (!user || !wallet) return
    for (const id of FRAME_IDS) {
      if (!FRAMES[id].milestone) continue
      const p = milestoneProgress(wallet, id)
      if (!p?.done || p.owned) continue
      const key = `joysplit_frame_unlocked_${user.uid}_${id}`
      try {
        if (localStorage.getItem(key)) continue
        localStorage.setItem(key, "1")
      } catch {
        continue
      }
      notifyFrameUnlocked(user, id)
    }
  }, [user, wallet])

  // Coins won (or refunded) from staked games go into the wallet by themselves
  const collecting = React.useRef(new Set<string>())
  React.useEffect(() => {
    if (!user) return
    for (const c of challenges.data) {
      if (collecting.current.has(c.id) || stakePayout(c, user.uid) <= 0) continue
      collecting.current.add(c.id)
      collectStake(user, c)
        .then((amount) => {
          if (amount > 0 && c.status === "DONE") toast.success(`+${amount} coins`, { description: `From your ${GAMES[c.game]?.name ?? "game"}` })
        })
        .catch((e) => {
          console.warn("Collect stake:", e)
          collecting.current.delete(c.id)
        })
    }
  }, [user, challenges.data])

  // A payment someone reported to you hours ago and you haven't answered: ask again
  // when you open the app (once a day per payment), so nothing hangs unconfirmed
  React.useEffect(() => {
    if (!uid || expenses.isPending) return
    const waiting = new Map<string, { name: string; paise: number; at: string; settlementId?: string }>()
    for (const e of expenses.data) {
      if (e.deletedAt) continue
      for (const s of e.shares ?? []) {
        if (s.status !== "PAYMENT_REPORTED" || !s.reportedAt || payeeOf(e, s.userId) !== uid) continue
        const w = waiting.get(s.userId) ?? { name: s.userName, paise: 0, at: s.reportedAt, settlementId: s.settlementId }
        w.paise += s.amountPaise
        if (s.reportedAt < w.at) w.at = s.reportedAt
        waiting.set(s.userId, w)
      }
    }
    const stamp = new Date().toISOString().slice(0, 10)
    for (const [debtorId, w] of waiting) {
      if (Date.now() - new Date(w.at).getTime() < 2 * 60 * 60 * 1000) continue
      const key = `joysplit_confirm_nudge_${stamp}_${w.settlementId ?? debtorId}`
      try {
        if (localStorage.getItem(key)) continue
        localStorage.setItem(key, "1")
      } catch {
        continue
      }
      const first = (w.name || "Someone").split(" ")[0]
      toast(`Did you get ${formatPaise(w.paise)} from ${first}?`, {
        description: "They're waiting for you to confirm. Check your UPI app or bank SMS.",
        duration: 10000,
        action: { label: "Review", onClick: () => router.push(`/friends/${debtorId}`) },
      })
    }
  }, [uid, expenses.data, expenses.isPending, router])

  // Friends' birthdays: a reminder once a day each
  React.useEffect(() => {
    if (!uid) return
    const today = new Date()
    const stamp = today.toISOString().slice(0, 10)
    for (const f of friends.data) {
      if (!isBirthdayToday(f.birthday, today)) continue
      const key = `joysplit_bday_${stamp}_${f.uid}`
      try {
        if (localStorage.getItem(key)) continue
        localStorage.setItem(key, "1")
      } catch {
        continue
      }
      const first = f.displayName.split(" ")[0]
      toast(`It's ${first}'s birthday today`, {
        description: "Send a wish from their profile.",
        action: { label: "Wish", onClick: () => router.push(`/friends/${f.uid}`) },
      })
      if (systemNotificationPermission() === "granted") {
        navigator.serviceWorker.ready
          .then((r) =>
            r.showNotification(`It's ${first}'s birthday today`, {
              body: "Open JoySplit to send a wish.",
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: key,
              data: { url: `/friends/${f.uid}` },
            })
          )
          .catch(() => {})
      }
    }
  }, [uid, friends.data, router])

  // A hug, kiss, wish or gift that arrives while you're in the app plays right away.
  // Ones that came while you were away don't: they play when you tap them.
  const burst = useBurst()
  const activeSince = React.useRef(0)
  React.useEffect(() => {
    if (!activeSince.current) activeSince.current = Date.now()
    if (burst || document.visibilityState !== "visible") return
    const seen = new Set(readSeen())
    const fresh = notifications.data.find(
      (n) =>
        !n.read &&
        !seen.has(n.id) &&
        new Date(n.createdAt).getTime() >= activeSince.current - 15_000 &&
        burstFromNotification(n)
    )
    if (!fresh) return
    const t = window.setTimeout(() => {
      markSeen(fresh.id)
      const next = burstFromNotification(fresh)
      if (next) playBurst(next)
    }, 400)
    return () => window.clearTimeout(t)
  }, [notifications.data, burst])

  return (
    <>
      {/* First time: the feature tour, then the welcome coins and frame */}
      {/* Reads the URL, so it stays out of prerendering */}
      <React.Suspense fallback={null}>
        <WelcomeTour />
      </React.Suspense>
      {/* One overlay for every hug / kiss / wish / gift animation in the app */}
      <MomentBurst
        show={!!burst}
        kind={burst?.kind ?? "hug"}
        gift={burst?.gift}
        title={burst?.title ?? ""}
        subtitle={burst?.subtitle}
        onDone={endBurst}
      />
    </>
  )
}
