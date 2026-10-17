/**
 * Friendly, user-facing error message mapper for Firebase Authentication and Firestore.
 * Ensures technical exception details, codes, or stack traces are never exposed in the UI.
 */
export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  // Extract Firebase code (e.g., 'auth/invalid-credential')
  const err = error as { code?: string; message?: string } | null;
  const code = err?.code || "";
  const rawMsg = err?.message || "";

  switch (code) {
    case "auth/invalid-credential":
      return "We couldn't sign you in with those details. Check your email and password, or create an account if you're new to JoySplit.";

    case "auth/wrong-password":
      return "The email or password is incorrect. Please check your details and try again.";
    
    case "auth/user-not-found":
      return "We couldn't sign you in with these details. Please check your email or create an account.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/too-many-requests":
      return "Too many unsuccessful attempts. Please wait a few moments before trying again.";

    case "auth/network-request-failed":
      return "Unable to connect. Check your internet connection and try again.";

    case "auth/user-disabled":
      return "This account is currently unavailable. Please contact support if you need help.";

    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please log in instead.";

    case "auth/weak-password":
      return "Password is too weak. Please choose a password with at least 6 characters.";

    case "auth/popup-closed-by-user":
      return "Sign in was cancelled. Please try again.";

    case "auth/popup-blocked":
      return "The sign-in popup was blocked by your browser. Please allow popups for localhost and try again.";

    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled in Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable Google provider with a support email.";

    case "auth/unauthorized-domain":
      return "Current domain (e.g. localhost) is not authorized. Please add it to Firebase Console > Authentication > Settings > Authorized domains.";

    case "auth/cancelled-popup-request":
      return "A sign-in popup is already open. Please complete or close that popup first.";

    case "auth/internal-error":
      return "Firebase authentication error. Please verify your Firebase API keys and project settings.";

    case "auth/email-not-verified":
      return "Please verify your email address before signing in. Check your inbox for the verification link.";

    case "auth/requires-recent-login":
      return "This action requires recent authentication. Please log in again.";

    default:
      // Neutral fallback without leaking internal paths or technical error codes
      if (rawMsg.includes("invalid-credential") || rawMsg.includes("user-not-found")) {
        return "We couldn't sign you in with those details. Check your email and password, or create an account if you're new to JoySplit.";
      }
      if (rawMsg.includes("network") || rawMsg.includes("timeout")) {
        return "Unable to connect. Check your internet connection and try again.";
      }
      return "Something went wrong while signing in. Please check your details and try again.";
  }
}
