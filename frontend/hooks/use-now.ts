"use client"

import * as React from "react"

/*
 * One shared clock for every countdown. Reading the time lives in an external
 * store so prerendering never sees `Date.now()` (the server snapshot is 0) and
 * all timers tick together, once a second, only while someone is counting down.
 */
let nowMs = 0
let timer: number | undefined
const listeners = new Set<() => void>()

function tick() {
  nowMs = Date.now()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (timer === undefined) {
    nowMs = Date.now()
    timer = window.setInterval(tick, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

const noopSubscribe = () => () => {}
const getSnapshot = () => nowMs || (nowMs = Date.now())
const getServerSnapshot = () => 0

/** Current time (ms), re-rendering every second until `until` has passed. */
export function useNow(until: number) {
  const now = React.useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot)
  const ticking = now < until
  return React.useSyncExternalStore(ticking ? subscribe : noopSubscribe, getSnapshot, getServerSnapshot)
}

/** 125_000 → "2:05" */
export const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
