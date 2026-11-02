"use client"

import * as React from "react"
import QRCode from "qrcode"
import { Copy01Icon, QrCodeIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/shared/bottom-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPaise } from "@/lib/money"
import {
  buildUPILink,
  detectPlatform,
  IOS_UPI_APPS,
  isValidUpiId,
  launchUpi,
  UPI_MAX_PAYMENT_PAISE,
  type Platform,
} from "@/lib/upi"
import { cn } from "@/lib/utils"
import { PaymentDoneDialog } from "./payment-done-dialog"

export type PaidVia = "upi" | "cash"

/**
 * Paying someone, the free way: their UPI app does the paying, JoySplit only
 * records it once you say it went through (and they confirm).
 *
 * - Android: straight into the phone's list of UPI apps, prefilled. "Did you
 *   pay?" comes up when you come back; if no app opened, the QR and UPI ID.
 * - iPhone: Google Pay / PhonePe / Paytm buttons, plus the QR and UPI ID.
 * - Computer: a QR to scan with any UPI app on your phone.
 * - Paid in cash: recorded as cash, for them to confirm.
 *
 * Call it at the top of the component; `pay(details)` / `payInCash(details)`
 * start a payment, and `render(isPending)` draws the sheet and dialogs.
 */
export interface UpiPayDetails {
  upiId?: string
  payeeName: string
  amountPaise: number
  note: string
  /** They said it went through: record it (call `done()` on success). */
  onReport: (via: PaidVia) => void
}

export function useUpiPay() {
  const [details, setDetails] = React.useState<UpiPayDetails | null>(null)
  const [sheet, setSheet] = React.useState(false)
  const [asking, setAsking] = React.useState(false)
  const [cash, setCash] = React.useState(false)
  const [platform, setPlatform] = React.useState<Platform>("desktop")

  const open = (link: string) =>
    launchUpi(link).then((result) => {
      if (result === "returned") {
        setSheet(false)
        setAsking(true)
      } else {
        toast.info(
          "No UPI app opened — scan the QR or copy the UPI ID instead."
        )
        setSheet(true)
      }
    })

  const pay = (d: UpiPayDetails) => {
    setDetails(d)
    const valid = isValidUpiId(d.upiId)
    if (d.amountPaise > UPI_MAX_PAYMENT_PAISE) {
      toast.warning(
        "UPI usually allows up to ₹1,00,000 per payment — your app may ask you to pay in parts."
      )
    }
    const p = detectPlatform()
    setPlatform(p)
    // Android goes straight to the phone's own list of UPI apps
    if (valid && p === "android") open(buildUPILink({ ...d, upiId: d.upiId! }))
    else setSheet(true)
  }

  const render = (isPending?: boolean) => {
    if (!details) return null
    const { upiId, payeeName, amountPaise, onReport } = details
    const first = payeeName.split(" ")[0]
    const valid = isValidUpiId(upiId)
    const params = { ...details, upiId: upiId ?? "" }
    return (
      <>
        <BottomSheet
          open={sheet}
          onOpenChange={setSheet}
          title={`Pay ${formatPaise(amountPaise)} to ${first}`}
          description={
            !valid
              ? `${first} hasn't added a UPI ID yet. Pay them another way, then let them know here.`
              : platform === "desktop"
                ? "Scan with any UPI app on your phone — the amount is filled in."
                : "Pick your UPI app — everything is filled in."
          }
          footer={
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSheet(false)
                  setCash(true)
                }}
              >
                Paid in cash
              </Button>
              <Button
                onClick={() => {
                  setSheet(false)
                  setAsking(true)
                }}
              >
                I&apos;ve paid
              </Button>
            </div>
          }
        >
          {valid && (
            <div className="flex flex-col gap-4 pb-3">
              {platform === "ios" && (
                <div className="grid grid-cols-2 gap-2">
                  {IOS_UPI_APPS.map((app) => (
                    <Button
                      key={app.id}
                      variant={app.id === "other" ? "ghost" : "outline"}
                      className="h-11"
                      onClick={() => open(buildUPILink(params, app.scheme))}
                    >
                      {app.name}
                    </Button>
                  ))}
                </div>
              )}
              {platform === "android" && (
                <Button
                  className="h-11"
                  onClick={() => open(buildUPILink(params))}
                >
                  Open UPI app again
                </Button>
              )}
              <UpiQr
                link={buildUPILink(params)}
                collapsed={platform !== "desktop"}
              />
              <CopyUpiId upiId={upiId!} />
            </div>
          )}
        </BottomSheet>

        <PaymentDoneDialog
          open={asking}
          onOpenChange={setAsking}
          amountPaise={amountPaise}
          payeeName={payeeName}
          isPending={isPending}
          onConfirm={() => onReport("upi")}
          onPayAgain={valid ? () => pay(details) : undefined}
          upiId={valid ? upiId : undefined}
        />

        <ConfirmDialog
          open={cash}
          onOpenChange={setCash}
          title={`Paid ${formatPaise(amountPaise)} in cash?`}
          description={`${first} will be asked to confirm they got it.`}
          confirmLabel="Yes, I paid in cash"
          isPending={isPending}
          onConfirm={() => onReport("cash")}
        />
      </>
    )
  }

  return {
    pay,
    payInCash: (d: UpiPayDetails) => {
      setDetails(d)
      setCash(true)
    },
    /** Paid some other way already: straight to "Did you pay?". */
    alreadyPaid: (d: UpiPayDetails) => {
      setDetails(d)
      setAsking(true)
    },
    /** Close the confirm dialogs once the report is saved. */
    done: () => {
      setAsking(false)
      setCash(false)
    },
    render,
  }
}

/** A UPI QR (dark on white for every scanner); hidden behind a button on phones. */
function UpiQr({ link, collapsed }: { link: string; collapsed: boolean }) {
  const [shown, setShown] = React.useState(!collapsed)
  const [svg, setSvg] = React.useState<{ link: string; markup: string } | null>(
    null
  )

  React.useEffect(() => {
    if (!shown) return
    let cancelled = false
    QRCode.toString(link, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#09090b", light: "#ffffff" },
    })
      .then((markup) => !cancelled && setSvg({ link, markup }))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [link, shown])

  if (!shown) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="self-center text-xs"
        onClick={() => setShown(true)}
      >
        <HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" />
        Show QR — scan from another phone
      </Button>
    )
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="aspect-square w-52 rounded-lg border bg-white p-3"
        role="img"
        aria-label="UPI payment QR code"
      >
        {svg?.link === link ? (
          <div
            className="size-full [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: svg.markup }}
          />
        ) : (
          <Skeleton className="size-full bg-zinc-200" />
        )}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Works with any UPI app — amount included
      </p>
    </div>
  )
}

function CopyUpiId({ upiId }: { upiId: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        UPI ID <span className="font-mono text-foreground">{upiId}</span>
      </span>
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "h-7 shrink-0 gap-1 px-2 text-xs",
          copied && "text-success"
        )}
        onClick={() =>
          navigator.clipboard
            ?.writeText(upiId)
            .then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            })
            .catch(() => toast.info(upiId))
        }
      >
        <HugeiconsIcon
          icon={copied ? Tick02Icon : Copy01Icon}
          className="size-3.5"
        />
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}
