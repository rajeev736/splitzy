"use client"

import * as React from "react"
import QRCode from "qrcode"

import { Skeleton } from "@/components/ui/skeleton"
import { addFriendLink } from "@/lib/joysplit-id"
import { cn } from "@/lib/utils"

/**
 * QR code of your JoySplit ID (as an add-friend link). Always dark on white,
 * whatever the theme, so every scanner can read it.
 */
export function JoySplitQr({ splitzyId, className }: { splitzyId: string; className?: string }) {
  const [svg, setSvg] = React.useState<{ id: string; markup: string } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    QRCode.toString(addFriendLink(splitzyId), {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#09090b", light: "#ffffff" },
    })
      .then((markup) => !cancelled && setSvg({ id: splitzyId, markup }))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [splitzyId])

  return (
    <div
      className={cn("aspect-square w-full max-w-52 rounded-lg border bg-white p-3", className)}
      role="img"
      aria-label={`QR code for JoySplit ID ${splitzyId}`}
    >
      {svg?.id === splitzyId ? (
        <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg.markup }} />
      ) : (
        <Skeleton className="size-full bg-zinc-200" />
      )}
    </div>
  )
}
