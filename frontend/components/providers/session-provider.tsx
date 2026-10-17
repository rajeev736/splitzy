"use client"

import * as React from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"
import { useQueryClient } from "@tanstack/react-query"

import { auth, db, isFirebaseConfigured } from "@/lib/firebase/config"
import type { UserProfile } from "@/lib/types"
import * as authService from "@/services/auth"

export type AuthState =
  | "initializing"
  | "signedOut"
  | "emailVerificationRequired"
  | "authenticatedProfileIncomplete"
  | "authenticatedProfileComplete"
  | "profileLoadError"

/** Plain snapshot of the Firebase user (re-created on reload so React re-renders). */
export type SessionAccount = Pick<
  FirebaseUser,
  "uid" | "email" | "emailVerified" | "displayName" | "photoURL" | "providerData"
>

const toAccount = (u: FirebaseUser): SessionAccount => ({
  uid: u.uid,
  email: u.email,
  emailVerified: u.emailVerified,
  displayName: u.displayName,
  photoURL: u.photoURL,
  providerData: [...u.providerData],
})

const USER_STORAGE_KEY = "joysplit_user_profile"
const LEGACY_KEYS = [
  "joysplit_friends_list",
  "joysplit_groups_list",
  "joysplit_expenses_list",
  "joysplit_notifications_list",
  "joysplit_friend_requests",
]

interface SessionContextValue {
  user: UserProfile | null
  fbUser: SessionAccount | null
  isLoading: boolean
  authState: AuthState
  isEmailVerified: boolean
  /** Replace the in-memory + persisted profile (used after profile updates). */
  setProfile: (u: UserProfile | null) => void
  login: (email: string, password?: string) => Promise<void>
  signup: (name: string, email: string, password?: string, preferredSplitzyId?: string) => Promise<void>
  loginWithGoogle: () => Promise<{ isNewUser: boolean; onboardingCompleted: boolean }>
  logout: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
  reloadUser: () => Promise<boolean>
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [fbUser, setFbUser] = React.useState<SessionAccount | null>(null)
  const [profileLoadError, setProfileLoadError] = React.useState<string | null>(null)
  // Without Firebase there is no auth state to wait for
  const [isLoading, setIsLoading] = React.useState(() => isFirebaseConfigured && !!auth)

  const setProfile = React.useCallback((u: UserProfile | null) => {
    setUser(u)
    try {
      if (u) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u))
      else localStorage.removeItem(USER_STORAGE_KEY)
    } catch {
      /* storage unavailable */
    }
  }, [])

  /** Wipe the session and every cached query (prevents cross-account leaks). */
  const clearSession = React.useCallback(() => {
    setFbUser(null)
    setProfile(null)
    queryClient.clear()
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* storage unavailable */
    }
  }, [queryClient, setProfile])

  // Wipe legacy mock / stale local storage data once on boot. The profile
  // itself always comes from Firestore via the auth listener below.
  React.useEffect(() => {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
      const stored = localStorage.getItem(USER_STORAGE_KEY)
      const parsed = stored ? (JSON.parse(stored) as UserProfile) : null
      if (parsed?.uid === "usr_rajeev_demo" || parsed?.splitzyId === "JOY-9B2K4L") {
        localStorage.removeItem(USER_STORAGE_KEY)
      }
    } catch (e) {
      console.warn("Storage cleanup notice:", e)
    }
  }, [])

  // Firebase Auth state listener
  React.useEffect(() => {
    if (!isFirebaseConfigured || !auth) return

    return onAuthStateChanged(auth, async (current) => {
      setProfileLoadError(null)

      if (current) {
        setFbUser(toAccount(current))
        try {
          const profile = await authService.loadOrProvisionProfile(current)
          if (profile) setProfile(profile)
        } catch (err) {
          console.error("Firestore user fetch error:", err)
          setProfileLoadError(err instanceof Error ? err.message : "Failed to load profile")
        }
      } else {
        clearSession()
      }
      setIsLoading(false)
    })
  }, [clearSession, setProfile])

  // Profile real-time sync
  React.useEffect(() => {
    if (!isFirebaseConfigured || !db || !user?.uid) return
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) return
        const data = snap.data() as UserProfile
        setUser((prev) => (prev ? { ...prev, ...data } : data))
      },
      (err) => console.warn("Profile sync notice:", err?.message || err)
    )
  }, [user?.uid])

  const authState: AuthState = (() => {
    if (isLoading) return "initializing"
    if (!fbUser) return "signedOut"
    if (profileLoadError) return "profileLoadError"
    const isPasswordUser = fbUser.providerData?.some((p) => p.providerId === "password")
    if (isPasswordUser && !fbUser.emailVerified) return "emailVerificationRequired"
    if (!user || !user.onboardingCompleted) return "authenticatedProfileIncomplete"
    return "authenticatedProfileComplete"
  })()

  /** Mirrors the original: auth actions toggle the global loading flag. */
  const withLoading = React.useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    try {
      return await fn()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value = React.useMemo<SessionContextValue>(
    () => ({
      user,
      fbUser,
      isLoading,
      authState,
      isEmailVerified:
        !fbUser ||
        !!fbUser.emailVerified ||
        !!fbUser.providerData?.some((p) => p.providerId === "google.com"),
      setProfile,
      login: (email, password) =>
        withLoading(async () => setProfile(await authService.loginWithEmail(email, password))),
      signup: (name, email, password, preferredSplitzyId) =>
        withLoading(async () =>
          setProfile(await authService.signupWithEmail({ name, email, password, preferredSplitzyId }))
        ),
      loginWithGoogle: () =>
        withLoading(async () => {
          const { profile, isNewUser, onboardingCompleted } = await authService.loginWithGoogle()
          if (profile) setProfile(profile)
          return { isNewUser, onboardingCompleted }
        }),
      logout: async () => {
        await authService.logoutFirebase()
        clearSession()
        // Firestore was terminated to wipe its offline cache — start fresh
        if (isFirebaseConfigured) window.location.replace("/login")
      },
      sendVerificationEmail: authService.sendVerificationEmail,
      reloadUser: async () => {
        const refreshed = await authService.reloadFirebaseUser()
        if (!refreshed) return false
        setFbUser(toAccount(refreshed))
        return !!refreshed.emailVerified
      },
    }),
    [user, fbUser, isLoading, authState, setProfile, withLoading, clearSession]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = React.useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within a SessionProvider")
  return ctx
}
