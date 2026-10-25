"use client"

import * as React from "react"

/**
 * Phone back button closes the open modal / drawer instead of leaving the page.
 *
 * Opening a modal adds a history entry for the same URL; pressing back pops
 * it and closes the top-most modal. Modals closed any other way (X, overlay,
 * a button) leave their entry behind rather than calling history.back() —
 * that would cancel a navigation started right after closing (e.g. "Split
 * bill" → /expenses/new). Leftover entries are skipped on the next back press,
 * so one press still goes back a page.
 */

const KEY = "__joysplitModal"

type Entry = { id: string; close: () => void }
/** Open modals, oldest first. */
const stack: Entry[] = []
/** URL where a modal closed without back, leaving its entry as the current one. */
let leftoverUrl: string | null = null
let installed = false
let counter = 0

function install() {
  if (installed || typeof window === "undefined") return
  installed = true
  window.addEventListener("popstate", (event) => {
    // Back with a modal open: close the top one, stay on the page
    const top = stack.pop()
    if (top) {
      top.close()
      return
    }
    // Landed on a leftover modal entry (same page): step over it
    if ((event.state as Record<string, unknown> | null)?.[KEY]) {
      leftoverUrl = null
      window.history.back()
      return
    }
    // Just left a leftover entry onto the same page: that press was meant to go back a page
    if (leftoverUrl && leftoverUrl === window.location.href) {
      leftoverUrl = null
      window.history.back()
    }
  })
}

/** The parts of a Base UI dialog-like Root's props this needs. */
interface ModalRootProps {
  open?: boolean
  defaultOpen?: boolean
  // Each Root has its own event-details type; this only passes them through
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOpenChange?: (open: boolean, details: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionsRef?: React.RefObject<any>
}

/**
 * For a Base UI dialog-like Root: tracks whether it's open (controlled or
 * not), closes it on back, and exposes `close` for gestures like swipe-down.
 */
export function useModalRoot<P extends ModalRootProps>(props: P) {
  const { open, defaultOpen, onOpenChange, actionsRef } = props
  const [tracked, setTracked] = React.useState(defaultOpen ?? false)
  const isOpen = open ?? tracked
  const ownActions = React.useRef<{ close: () => void } | null>(null)
  const actions = actionsRef ?? ownActions
  const close = () => actions.current?.close()
  useBackToClose(isOpen, close)

  const rootProps: P = {
    ...props,
    actionsRef: actions,
    onOpenChange: (next: boolean, details: unknown) => {
      setTracked(next)
      onOpenChange?.(next, details)
    },
  }
  return { rootProps, close }
}

export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = React.useRef(close)
  React.useEffect(() => {
    closeRef.current = close
  })

  React.useEffect(() => {
    if (!open || typeof window === "undefined") return
    install()
    const id = `m${++counter}`
    const state = (window.history.state ?? {}) as Record<string, unknown>
    // Reuse a leftover entry for this page instead of piling up new ones
    if (leftoverUrl === window.location.href && state[KEY]) {
      window.history.replaceState({ ...state, [KEY]: id }, "")
    } else {
      window.history.pushState({ ...state, [KEY]: id }, "")
    }
    leftoverUrl = null

    const entry: Entry = { id, close: () => closeRef.current() }
    stack.push(entry)
    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      // Closed some other way while its entry is still current: skip it on the next back
      if ((window.history.state as Record<string, unknown> | null)?.[KEY] === id) {
        leftoverUrl = window.location.href
      }
    }
  }, [open])
}
