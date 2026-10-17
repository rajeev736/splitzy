import { getFriendlyAuthErrorMessage } from "@/lib/firebase/errors"

/**
 * Business-rule failure (e.g. "You cannot invite yourself").
 * The message is already user-facing, so it is shown as-is.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AppError"
  }
}

const FIRESTORE_MESSAGES: Record<string, string> = {
  "permission-denied": "You don't have permission to do that.",
  "not-found": "We couldn't find what you were looking for.",
  unavailable: "You appear to be offline. Changes will sync when you reconnect.",
  "deadline-exceeded": "The request took too long. Please try again.",
  "resource-exhausted": "Too many requests. Please wait a moment and try again.",
  unauthenticated: "Your session has expired. Please log in again.",
  "failed-precondition": "The database isn't ready yet. Please try again shortly.",
}

function getCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === "string" ? code : ""
}

/** Firestore codes that will not succeed on retry. */
const NON_RETRYABLE = new Set([
  "permission-denied",
  "not-found",
  "unauthenticated",
  "invalid-argument",
  "failed-precondition",
  "already-exists",
])

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) return false
  const code = getCode(error)
  if (code.startsWith("auth/")) return false
  return !NON_RETRYABLE.has(code)
}

/** Maps any thrown value to a safe, user-facing message. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback
  if (error instanceof AppError) return error.message

  const code = getCode(error)
  if (code.startsWith("auth/")) return getFriendlyAuthErrorMessage(error)
  if (code && FIRESTORE_MESSAGES[code]) return FIRESTORE_MESSAGES[code]

  return fallback
}
