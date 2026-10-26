/**
 * JoySplit UPI Intent and Deep Link Engine
 * Constructs standard UPI URIs according to NPCI specifications:
 * upi://pay?pa={upiId}&pn={payeeName}&am={rupees}&cu=INR&tn={transactionNote}
 */

export interface UPITransactionParams {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  note?: string;
  app?: "gpay" | "phonepe" | "paytm" | "cred" | "bhim" | "default";
}

export function buildUPILink({
  upiId,
  payeeName,
  amountPaise,
  note = "JoySplit Expense",
  app = "default",
}: UPITransactionParams): string {
  // The UPI ID comes from the other person's profile: keep only characters a
  // VPA can have, so it can't smuggle extra parameters (e.g. "&am=…&pa=…") into the link
  const cleanUPI = upiId.trim().replace(/[^a-zA-Z0-9._\-@]/g, "");
  const cleanName = encodeURIComponent(payeeName.trim());
  const amountRupees = (amountPaise / 100).toFixed(2);
  const cleanNote = encodeURIComponent(note.trim());

  const query = `pa=${cleanUPI}&pn=${cleanName}&am=${amountRupees}&cu=INR&tn=${cleanNote}`;

  switch (app) {
    case "phonepe":
      return `phonepe://upi/pay?${query}`;
    case "paytm":
      return `paytmmp://pay?${query}`;
    case "gpay":
      return `gpay://upi/pay?${query}`;
    case "bhim":
      return `bhim://upi/pay?${query}`;
    case "cred":
      return `cred://upi/pay?${query}`;
    default:
      return `upi://pay?${query}`;
  }
}

/** Official brand logos live in /public/brands (128px tiles generated from each brand's artwork). */
export const SUPPORTED_UPI_APPS = [
  {
    id: "gpay",
    name: "Google Pay",
    color: "bg-white text-gray-800 border-gray-200",
    iconBg: "bg-blue-50 text-blue-600",
    logoPath: "/brands/gpay.png",
    badge: "Popular",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    logoPath: "/brands/phonepe.png",
    color: "bg-purple-50 text-purple-900 border-purple-200",
    iconBg: "bg-purple-600 text-white",
    badge: "Fastest",
  },
  {
    id: "paytm",
    name: "Paytm",
    logoPath: "/brands/paytm.png",
    color: "bg-sky-50 text-sky-900 border-sky-200",
    iconBg: "bg-sky-500 text-white",
    badge: "Instant",
  },
  {
    id: "cred",
    name: "CRED UPI",
    logoPath: "/brands/cred.png",
    color: "bg-gray-900 text-white border-gray-700",
    iconBg: "bg-black text-white",
    badge: "Rewards",
  },
  {
    id: "bhim",
    name: "BHIM",
    logoPath: "/brands/bhim.png",
    color: "bg-emerald-50 text-emerald-900 border-emerald-200",
    iconBg: "bg-emerald-600 text-white",
    badge: "Official",
  },
  {
    id: "default",
    name: "Other UPI app",
    logoPath: "/brands/upi.png",
    color: "bg-slate-100 text-slate-800 border-slate-300",
    iconBg: "bg-blue-600 text-white",
    badge: "Any App",
  },
];
