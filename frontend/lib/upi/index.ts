/**
 * JoySplit UPI payment links (NPCI standard):
 * upi://pay?pa={upiId}&pn={payeeName}&am={rupees}&cu=INR&tn={transactionNote}
 *
 * Android: the standard `upi://pay` link makes the phone show the UPI apps that
 * are installed, and the chosen one opens on its payment screen, prefilled.
 * iPhone has no such chooser, so we offer the big apps by their own links
 * (with the same prefilled query). Computers can't open UPI apps: they get a QR.
 */

export interface UPITransactionParams {
  upiId: string
  payeeName: string
  amountPaise: number
  note?: string
}

/** Most banks cap a single UPI payment at ₹1,00,000. */
export const UPI_MAX_PAYMENT_PAISE = 1_00_000_00

/** A UPI ID (VPA) looks like handle@bank. */
export const isValidUpiId = (upiId: string | undefined | null): upiId is string =>
  !!upiId && /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/.test(upiId.trim())

/** UPI apps reject long or unusual notes: keep it short and plain. */
const cleanNote = (note: string) =>
  note
    .replace(/[^\p{L}\p{N} .,-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50)

/** The prefilled part every UPI link shares. */
function upiQuery({ upiId, payeeName, amountPaise, note = "JoySplit settlement" }: UPITransactionParams): string {
  // The UPI ID comes from the other person's profile: keep only characters a
  // VPA can have, so it can't smuggle extra parameters (e.g. "&am=…&pa=…") into the link
  const pa = upiId.trim().replace(/[^a-zA-Z0-9._\-@]/g, "")
  const pn = encodeURIComponent(payeeName.trim().slice(0, 50) || "JoySplit friend")
  const am = (amountPaise / 100).toFixed(2)
  const tn = encodeURIComponent(cleanNote(note) || "JoySplit settlement")
  return `pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`
}

export function buildUPILink(params: UPITransactionParams, scheme = "upi://pay"): string {
  return `${scheme}?${upiQuery(params)}`
}

export type Platform = "android" | "ios" | "desktop"

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop"
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return "android"
  // iPadOS reports itself as a Mac with touch
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios"
  return "desktop"
}

/** UPI apps an iPhone can open directly, each with its own link (same prefilled query). */
export const IOS_UPI_APPS = [
  { id: "gpay", name: "Google Pay", scheme: "gpay://upi/pay" },
  { id: "phonepe", name: "PhonePe", scheme: "phonepe://pay" },
  { id: "paytm", name: "Paytm", scheme: "paytmmp://pay" },
  { id: "other", name: "Other UPI app", scheme: "upi://pay" },
] as const

/**
 * Opens a UPI app and waits: "returned" once the person comes back to
 * JoySplit from it, "not-opened" if nothing took over the screen within a
 * couple of seconds (no app installed, or a computer).
 */
export function launchUpi(link: string, waitMs = 2500): Promise<"returned" | "not-opened"> {
  return new Promise((resolve) => {
    let left = false
    let settled = false
    const finish = (result: "returned" | "not-opened") => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      resolve(result)
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") left = true
      else if (left) finish("returned")
    }
    const onBlur = () => {
      left = true
    }
    const onFocus = () => {
      if (left && document.visibilityState === "visible") finish("returned")
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    const timer = window.setTimeout(() => {
      if (!left) finish("not-opened")
    }, waitMs)
    window.location.href = link
  })
}
