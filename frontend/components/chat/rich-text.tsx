"use client"

import * as React from "react"

import { linkify } from "@/lib/chat"

/** Past this many characters a message folds behind "Read more". */
const FOLD_AT = 700
const FOLDED_LENGTH = 520

/** Message text with tappable links and a "Read more" for long ones. */
export function RichText({
  text,
  trailing,
}: {
  text: string
  /** Inline content after the text (the invisible spacer for the time). */
  trailing?: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const folded = !open && text.length > FOLD_AT
  const shown = folded ? cutAtWord(text, FOLDED_LENGTH) : text
  const parts = React.useMemo(() => linkify(shown), [shown])

  return (
    <>
      {parts.map((p, i) =>
        p.href ? (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="break-all text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {p.text}
          </a>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        )
      )}
      {folded && (
        <>
          {"… "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
          >
            Read more
          </button>
        </>
      )}
      {trailing}
    </>
  )
}

function cutAtWord(text: string, at: number) {
  const cut = text.slice(0, at)
  const space = cut.lastIndexOf(" ")
  return (space > at * 0.8 ? cut.slice(0, space) : cut).trimEnd()
}
