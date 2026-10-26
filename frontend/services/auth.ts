import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth"
import { clearIndexedDbPersistence, deleteField, doc, getDoc, setDoc, terminate, updateDoc } from "firebase/firestore"

import { auth, isFirebaseConfigured } from "@/lib/firebase/config"
import { generateRandomSplitzyId } from "@/lib/firebase/splitzyId"
import type { Group, UserProfile } from "@/lib/types"
import { getDb, nowIso } from "./shared"

/** Default profile for an account that has no `users/{uid}` document yet. */
function buildAutoProfile(fbUser: FirebaseUser, fallbackName: string): UserProfile {
  const emailName = (fbUser.email || "user").split("@")[0]
  return {
    uid: fbUser.uid,
    email: fbUser.email || "",
    displayName: fbUser.displayName || emailName || fallbackName,
    splitzyId: generateRandomSplitzyId(),
    photoURL: fbUser.photoURL || "/assets/avatar_boy.jpg",
    onboardingCompleted: false,
    createdAt: nowIso(),
  }
}

/**
 * Profiles are readable by every signed-in user (friend lookup), so the email
 * address is never stored there — it always comes from the auth account.
 */
export function toStoredProfile(profile: UserProfile): Omit<UserProfile, "email"> {
  const stored: Partial<UserProfile> = { ...profile }
  delete stored.email
  return stored as Omit<UserProfile, "email">
}

/** The stored profile plus the signed-in account's email; strips a legacy stored email. */
async function hydrateProfile(data: UserProfile, fbUser: FirebaseUser): Promise<UserProfile> {
  const firestore = getDb()
  if (firestore && "email" in data) {
    await updateDoc(doc(firestore, "users", fbUser.uid), { email: deleteField() }).catch(() => {})
  }
  return { ...data, email: fbUser.email || "" }
}

/**
 * Reserves the JoySplit ID, then writes the profile (security rules require the
 * ID to be reserved first). Failures are logged, not thrown (matches original).
 */
async function provisionProfile(profile: UserProfile) {
  const firestore = getDb()
  if (!firestore) return
  try {
    await setDoc(doc(firestore, "splitzyIds", profile.splitzyId), {
      uid: profile.uid,
      createdAt: profile.createdAt,
    })
    await setDoc(doc(firestore, "users", profile.uid), toStoredProfile(profile))
  } catch (err) {
    console.warn("Profile provisioning notice:", err)
  }
}

/**
 * Called from the auth-state listener. Loads the profile, waiting briefly for
 * `signup()` to write it, and self-provisions one for brand-new accounts.
 */
export async function loadOrProvisionProfile(fbUser: FirebaseUser): Promise<UserProfile | null> {
  const firestore = getDb()
  if (!firestore) return null

  let snap = await getDoc(doc(firestore, "users", fbUser.uid))
  if (!snap.exists()) {
    // Wait 800ms to allow signup() to write its own newUser document
    await new Promise((resolve) => setTimeout(resolve, 800))
    snap = await getDoc(doc(firestore, "users", fbUser.uid))
  }
  if (snap.exists()) return hydrateProfile(snap.data() as UserProfile, fbUser)

  const autoUser = buildAutoProfile(fbUser, "JoySplit User")
  await provisionProfile(autoUser)
  return autoUser
}

export async function loginWithEmail(email: string, password?: string): Promise<UserProfile> {
  const firestore = getDb()
  if (!isFirebaseConfigured || !auth || !password || !firestore) {
    throw new Error("Firebase authentication is required to sign in.")
  }

  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)

  // If password provider and email is not verified, signal verification requirement
  if (!cred.user.emailVerified) {
    const err = new Error(
      "Please verify your email address before signing in. Check your inbox for the verification link."
    ) as Error & { code: string }
    err.code = "auth/email-not-verified"
    throw err
  }

  const snap = await getDoc(doc(firestore, "users", cred.user.uid))
  if (snap.exists()) return hydrateProfile(snap.data() as UserProfile, cred.user)

  // Self-heal missing user profile doc
  const autoUser = buildAutoProfile(cred.user, "JoySplit User")
  await provisionProfile(autoUser)
  return autoUser
}

export async function signupWithEmail(input: {
  name: string
  email: string
  password?: string
  preferredSplitzyId?: string
}): Promise<UserProfile> {
  const { name, email, password, preferredSplitzyId } = input
  let uid = `usr_${Date.now()}`

  if (isFirebaseConfigured && auth && password) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    uid = cred.user.uid
    // Automatically trigger verification link
    try {
      await sendEmailVerification(cred.user)
    } catch (verErr) {
      console.warn("sendEmailVerification error during signup:", verErr)
    }
  }

  let splitzyId =
    preferredSplitzyId && /^(JOY|SPL)-[A-Z0-9]{6}$/.test(preferredSplitzyId)
      ? preferredSplitzyId
      : generateRandomSplitzyId()

  const newUser: UserProfile = {
    uid,
    email: email.trim(),
    displayName: name.trim(),
    splitzyId,
    photoURL: "/assets/avatar_boy.jpg",
    onboardingCompleted: false,
    createdAt: nowIso(),
  }

  const firestore = getDb()
  if (firestore) {
    // The profile needs an ID reserved by this user: if it's taken (by someone
    // else), try fresh random ones instead of failing the signup
    for (let attempt = 0; attempt < 5; attempt++) {
      const ref = doc(firestore, "splitzyIds", splitzyId)
      try {
        await setDoc(ref, { uid, createdAt: newUser.createdAt })
        break
      } catch (sErr) {
        // Already ours (e.g. a retried signup): keep it
        const existing = await getDoc(ref).catch(() => null)
        if (existing?.data()?.uid === uid) break
        console.warn("JoySplit ID taken, trying another:", sErr)
        splitzyId = generateRandomSplitzyId()
        newUser.splitzyId = splitzyId
      }
    }
    await setDoc(doc(firestore, "users", uid), toStoredProfile(newUser), { merge: true })
  }

  return newUser
}

export async function loginWithGoogle(): Promise<{
  profile: UserProfile | null
  isNewUser: boolean
  onboardingCompleted: boolean
}> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Authentication is not configured or available.")
  }
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  const cred = await signInWithPopup(auth, provider)

  const firestore = getDb()
  if (!firestore) return { profile: null, isNewUser: false, onboardingCompleted: false }

  try {
    const snap = await getDoc(doc(firestore, "users", cred.user.uid))
    if (snap.exists()) {
      const profile = await hydrateProfile(snap.data() as UserProfile, cred.user)
      return { profile, isNewUser: false, onboardingCompleted: !!profile.onboardingCompleted }
    }

    const newUser = buildAutoProfile(cred.user, "Google User")
    await provisionProfile(newUser)
    return { profile: newUser, isNewUser: true, onboardingCompleted: false }
  } catch (err) {
    console.warn("Firestore error during Google login:", err)
    const fallbackUser = buildAutoProfile(cred.user, "Google User")
    return { profile: fallbackUser, isNewUser: true, onboardingCompleted: false }
  }
}

/**
 * Signs out and wipes the on-device Firestore cache so the next person on a
 * shared device can't read this account's data. The Firestore instance is
 * unusable afterwards, so callers must reload the page.
 */
export async function logoutFirebase() {
  if (!isFirebaseConfigured || !auth) return
  try {
    await signOut(auth)
  } catch (e) {
    console.error("Firebase signOut error", e)
  }
  const firestore = getDb()
  if (firestore) {
    try {
      await terminate(firestore)
      await clearIndexedDbPersistence(firestore)
    } catch (e) {
      console.warn("Could not clear offline cache:", e)
    }
  }
}

export async function sendVerificationEmail() {
  if (!auth?.currentUser) {
    throw new Error("No active account found. Please sign up or log in first.")
  }
  await sendEmailVerification(auth.currentUser)
}

/** Reloads the Firebase user; returns the refreshed user (or null when signed out). */
export async function reloadFirebaseUser(): Promise<FirebaseUser | null> {
  if (!auth?.currentUser) return null
  await auth.currentUser.reload()
  return auth.currentUser
}

/**
 * Updates the profile document and propagates name/photo changes into every
 * group's `memberDetails`. Returns the merged profile for the session.
 */
export async function updateProfile(params: {
  user: UserProfile | null
  updates: Partial<UserProfile>
  groups: Group[]
}): Promise<UserProfile> {
  const { user, updates, groups } = params
  const targetUid = user?.uid || auth?.currentUser?.uid
  if (!targetUid) {
    throw new Error("No active user session found. Please log in again.")
  }

  // Keep uid so Firestore rule validation passes; strip undefined values
  // (Firestore rejects undefined). Empty photoURL is stored as "" to clear old photos.
  const firestoreUpdates: Record<string, unknown> = { uid: targetUid }
  for (const [key, val] of Object.entries(updates)) {
    if (key === "uid" || key === "splitzyId") continue
    if (key === "photoURL") firestoreUpdates[key] = val || ""
    else if (val !== undefined) firestoreUpdates[key] = val
  }
  firestoreUpdates.updatedAt = nowIso()

  const firestore = getDb()
  if (firestore) {
    try {
      await updateDoc(doc(firestore, "users", targetUid), firestoreUpdates)
    } catch (updateErr) {
      console.warn("updateDoc failed, falling back to setDoc with merge:", updateErr)
      if (user?.splitzyId) firestoreUpdates.splitzyId = user.splitzyId
      await setDoc(doc(firestore, "users", targetUid), firestoreUpdates, { merge: true })
    }

    // Propagate photo / name change to all active groups memberDetails
    const newPhoto = updates.photoURL !== undefined ? updates.photoURL || "" : undefined
    const newName = updates.displayName
    if (newPhoto !== undefined || newName !== undefined) {
      for (const g of groups) {
        if (!g.members?.includes(targetUid) || !g.memberDetails?.[targetUid]) continue
        try {
          const patch: Record<string, unknown> = {}
          if (newPhoto !== undefined) patch[`memberDetails.${targetUid}.photoURL`] = newPhoto
          if (newName !== undefined) patch[`memberDetails.${targetUid}.name`] = newName
          await updateDoc(doc(firestore, "groups", g.id), patch)
        } catch (err) {
          console.warn(`Could not sync memberDetails in group ${g.id}:`, err)
        }
      }
    }
  }

  const baseUser: UserProfile = user || {
    uid: targetUid,
    email: auth?.currentUser?.email || "",
    displayName: updates.displayName || "User",
    splitzyId: updates.splitzyId || generateRandomSplitzyId(),
    createdAt: nowIso(),
  }

  return {
    ...baseUser,
    ...updates,
    photoURL: updates.photoURL !== undefined ? updates.photoURL || "" : baseUser.photoURL,
    uid: targetUid,
    splitzyId: baseUser.splitzyId, // Guarantee splitzyId is never altered
    updatedAt: firestoreUpdates.updatedAt as string,
  }
}
