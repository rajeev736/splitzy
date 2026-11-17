"use client"

import * as React from "react"

/** An element's size, kept up to date (starts from a phone-sized guess). */
export function useBoxSize<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [size, setSize] = React.useState({ w: 390, h: 844 })
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const on = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    on()
    const ro = new ResizeObserver(on)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}
