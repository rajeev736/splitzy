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

/** A move in a game the server runs (lib/live/hosted): start, play, draw, flip, tick… */
export const actOnServer = (code: string, action: { type: string; seq?: number } & Record<string, unknown>) =>
  call<{ ok: true; seq: number }>("/api/live/act", { code, action })

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

/** What taking the daily reward answers (app/api/games/daily). `claimed: false`: it was already taken today. */
export interface DailyClaim {
  ok: true
  claimed: boolean
  coins: number
  /** The day of the 7-day cycle (1–7) this was. */
  day: number
  /** Days in a row the reward has been taken. */
  run: number
  balance: number
}

/** Takes today's daily reward on the Games side (lib/live/streak's 7-day cycle; the server pays it). */
export async function claimDailyReward(): Promise<DailyClaim> {
  const res = await call<DailyClaim | { ok: false; reason?: string }>("/api/games/daily", {})
  if (!res.ok) throw new AppError(res.reason ?? "Couldn't take today's reward — try again")
  return res
}
