import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Big, chunky, glossy game type: a thick rim with a 3D bottom edge behind, and
 * a face that is white on top and tinted below (the hard gloss line of a
 * mobile game's logotype). `rim` and `tint` take any CSS colour; `size` any
 * CSS length (a number is px). Needs GLOSS_CSS (./styles) on the page.
 */
export function GlossyText({
  children,
  size,
  rim,
  tint,
  top = "#ffffff",
  className,
  style,
}: {
  children: React.ReactNode
  size: number | string
  rim: string
  tint: string
  top?: string
  className?: string
  style?: React.CSSProperties
}) {
  const vars = { fontSize: size, "--pi-rim": rim, "--pi-tint": tint, "--pi-top": top, ...style } as React.CSSProperties
  return (
    <span className={cn("pi-gloss", className)} style={vars}>
      <span aria-hidden className="pi-gloss-back">
        {children}
      </span>
      <span className="pi-gloss-face">{children}</span>
    </span>
  )
}
