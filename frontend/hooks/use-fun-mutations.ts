"use client"

import { useMutation } from "@tanstack/react-query"

import { useSession } from "@/components/providers/session-provider"
import { AppError } from "@/lib/errors"
import type { BondId, FrameId, MoodId } from "@/lib/fun/catalog"
import { chooseTheme, type BoardTheme } from "@/lib/live/themes"
import type { Friendship, Moment } from "@/lib/types"
import * as fun from "@/services/fun"

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
