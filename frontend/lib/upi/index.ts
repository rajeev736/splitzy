/**
 * JoySplit UPI payment links (NPCI standard):
 * upi://pay?pa={upiId}&pn={payeeName}&am={rupees}&cu=INR&tn={transactionNote}
 *
 * Only the standard `upi://pay` link is used. On Android it makes the phone
 * show the UPI apps that are actually installed, and whichever one the user
 * picks opens on its payment screen with the payee, amount and note filled in.
 * (App-specific schemes like `phonepe://…` aren't documented and don't prefill
 * reliably — that's why PhonePe used to open empty.)
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

/**
 * Opens the payment in the phone's UPI apps. Returns false (nothing opened)
 * when the payee has no usable UPI ID; warns when the amount is over what one
 * UPI payment usually allows.
 */
export function openUpiPayment(params: UPITransactionParams, warn: (message: string) => void): boolean {
  if (!isValidUpiId(params.upiId)) return false
  if (params.amountPaise > UPI_MAX_PAYMENT_PAISE) {
    warn("UPI usually allows up to ₹1,00,000 per payment — your app may ask you to pay in parts.")
  }
  window.location.href = buildUPILink(params)
  return true
}

export function buildUPILink({ upiId, payeeName, amountPaise, note = "JoySplit settlement" }: UPITransactionParams): string {
  // The UPI ID comes from the other person's profile: keep only characters a
  // VPA can have, so it can't smuggle extra parameters (e.g. "&am=…&pa=…") into the link
  const pa = upiId.trim().replace(/[^a-zA-Z0-9._\-@]/g, "")
  const pn = encodeURIComponent(payeeName.trim().slice(0, 50) || "JoySplit friend")
  const am = (amountPaise / 100).toFixed(2)
  const tn = encodeURIComponent(cleanNote(note) || "JoySplit settlement")
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`
}
