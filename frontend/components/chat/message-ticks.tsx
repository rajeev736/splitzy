import type { MessageStatus } from "@/lib/chat"
import { cn } from "@/lib/utils"

const LABELS: Record<MessageStatus, string> = {
  pending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
}

/**
 * Your message's progress: a clock while sending, one tick on the server, two
 * grey ticks once delivered, two blue ticks once read.
 */
export function MessageTicks({
  status,
  className,
}: {
  status: MessageStatus
  className?: string
}) {
  if (status === "pending")
    return (
      <svg
        viewBox="0 0 16 16"
        role="img"
        aria-label={LABELS.pending}
        className={cn("size-3.5 shrink-0", className)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="8" cy="8" r="5.75" />
        <path d="M8 5v3.25l2 1.25" />
      </svg>
    )
  return (
    <svg
      viewBox="0 0 18 12"
      role="img"
      aria-label={LABELS[status]}
      className={cn(
        "h-3 w-[18px] shrink-0",
        status === "read" && "text-chat-tick",
        className
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {status === "sent" ? (
        <path d="M3.5 6.4 6.6 9.5 13 2.8" />
      ) : (
        <>
          <path d="M1 6.4 4.1 9.5 10.5 2.8" />
          <path d="M7.6 8.9 8.2 9.5 14.6 2.8" />
        </>
      )}
    </svg>
  )
}
