"use client"

import * as React from "react"

import { auth } from "@/lib/firebase/config"
import { AppError } from "@/lib/errors"
import type { Wallet } from "@/lib/types"

/**
 * The server's part of live games (app/api/live): the dice, and checking a
 * finished game before it counts. Calls carry your Firebase ID token.
 */
async function call<T>(path: string, body: object, opts: { keepalive?: boolean } = {}): Promise<T> {
  const idToken = await auth?.currentUser?.getIdToken()
  if (!idToken) throw new AppError("Sign in again to keep playing")
  const res = await fetch(path, {
    method: "POST",
    keepalive: opts.keepalive,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => null)) as (T & { reason?: string }) | null
  if (!res.ok || !data) throw new AppError(data?.reason ?? "The game server didn't answer — try again")
  return data
}

/** Wakes the dice server up ahead of the first roll (best effort; see warmRoller). */
export const warmDice = () => call<{ ok: true }>("/api/live/roll", { warm: true }).catch(() => undefined)

/** Keeps the dice server awake while a dice game is open: now, then every few minutes. */
export function useWarmDice(on: boolean) {
  React.useEffect(() => {
    if (!on) return
    void warmDice()
    const id = window.setInterval(() => void warmDice(), 4 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [on])
}

/** Rolls your dice on the server (Ludo, Snakes & Ladders); the board updates through the room as usual. */
export const rollOnServer = (code: string, seq: number) => call<{ ok: true; value: number; seq: number }>("/api/live/roll", { code, seq })

export interface SettleResponse {
  ok: true
  record: { winners: string[]; verified: boolean | null; voided: boolean; reason?: string } | null
  /** Your wallet before and after this game was counted (null: already counted, or nothing to count). */
  counted: { before: Wallet; wallet: Wallet } | null
}

/** Asks the server to check and count a finished game (or your forfeit of one being played). */
export const settleOnServer = (code: string, forfeit = false) =>
  call<SettleResponse>("/api/live/settle", { code, forfeit }, { keepalive: forfeit })
