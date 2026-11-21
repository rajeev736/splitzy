"use client"

import { useMutation } from "@tanstack/react-query"

import { useSession } from "@/components/providers/session-provider"
import { AppError } from "@/lib/errors"
import type { BondId, FrameId, MoodId } from "@/lib/fun/catalog"
import type { StockItem } from "@/lib/fun/stock"
import { chooseTheme, type BoardTheme } from "@/lib/live/themes"
import type { Friendship, Moment } from "@/lib/types"
import * as fun from "@/services/fun"
import * as gameProfile from "@/services/game-profile"

function useUser() {
  const { user } = useSession()
  return () => {
    if (!user) throw new AppError("Please log in first")
    return user
  }
}

export function useSendMoment() {
  const me = useUser()
  return useMutation({
    mutationFn: (v: { friendUid: string; input: fun.MomentInput }) => fun.sendMoment(me(), v.friendUid, v.input),
  })
}

export function useAnswerPlan() {
  const me = useUser()
  return useMutation({
    mutationFn: (v: { plan: Moment; answer: "YES" | "NO" }) => fun.answerPlan(me(), v.plan, v.answer),
  })
}

export function useRequestBond() {
  const me = useUser()
  return useMutation({
    mutationFn: (v: { friendUid: string; bond: BondId }) => fun.requestBond(me(), v.friendUid, v.bond),
    meta: { successMessage: "Request sent" },
  })
}

export function useAcceptBond() {
  const me = useUser()
  return useMutation({ mutationFn: (f: Friendship) => fun.acceptBond(me(), f) })
}

export function useClearBondRequest() {
  return useMutation({ mutationFn: (f: Friendship) => fun.clearBondRequest(f) })
}

export function useEndBond() {
  return useMutation({ mutationFn: (f: Friendship) => fun.endBond(f), meta: { successMessage: "Tag removed" } })
}

export function useBuyFrame() {
  const me = useUser()
  return useMutation({ mutationFn: (frame: FrameId) => fun.buyFrame(me().uid, frame) })
}

/**
 * Buys a board theme and plays on it on this device. The game room's picker
 * and the inventory both buy through this, and both read ownership from the
 * live wallet, so a board bought in one place is never offered in the other.
 */
export function useBuyTheme() {
  const me = useUser()
  return useMutation({
    mutationFn: async (theme: BoardTheme<unknown>) => {
      await fun.buyTheme(me().uid, theme.id)
      chooseTheme(theme.game, theme.id)
    },
  })
}

/** Buys a throwable or a gift ahead, `count` at a time (lib/fun/stock). */
export function useBuyStock() {
  const me = useUser()
  return useMutation({
    mutationFn: (v: { item: StockItem; count: number }) => fun.buyStock(me().uid, v.item, v.count),
  })
}

export function useEquipFrame() {
  const me = useUser()
  return useMutation({
    mutationFn: (v: { frame: FrameId | null; owned: string[] }) => fun.equipFrame(me().uid, v.frame, v.owned),
  })
}

export function useSetMood() {
  const me = useUser()
  return useMutation({ mutationFn: (mood: MoodId | null) => fun.setMood(me().uid, mood) })
}

export function useSaveBirthday() {
  const me = useUser()
  return useMutation({
    mutationFn: (v: { dob: string | null; show: boolean }) => fun.saveBirthday(me().uid, v.dob, v.show),
    meta: { successMessage: "Birthday saved" },
  })
}

/* ── Game profile ─────────────────────────────────────────────────────── */

/**
 * Buys a game character. The profile's picker, the inventory and the result
 * screen all buy through this, reading ownership from the live wallet, so a
 * character is never sold twice.
 */
export function useBuyCharacter() {
  const me = useUser()
  return useMutation({ mutationFn: (id: string) => gameProfile.buyCharacter(me().uid, id) })
}

/** Plays as a character in games (`null`: your photo). */
export function useSetGameAvatar() {
  const me = useUser()
  return useMutation({
    mutationFn: (v: { id: string | null; owned: string[] | undefined }) =>
      gameProfile.setGameAvatar(me().uid, v.id, v.owned),
  })
}

/** Takes an achievement's or a level's reward, and optionally puts it on straight away. */
export function useClaimReward() {
  const me = useUser()
  return useMutation({
    mutationFn: async (v: {
      achievement: string
      kind: "character" | "frame" | "coins"
      id: string
      equip?: boolean
      owned?: string[]
    }) => {
      const uid = me().uid
      await gameProfile.claimReward(uid, v.achievement, { kind: v.kind, id: v.id })
      if (!v.equip || v.kind === "coins") return
      if (v.kind === "character") await gameProfile.setGameAvatar(uid, v.id, [...(v.owned ?? []), v.id])
      else await fun.equipFrame(uid, v.id as FrameId, [...(v.owned ?? []), v.id])
    },
  })
}
