import { db } from "./config";
import { doc, getDoc, runTransaction } from "firebase/firestore";

/**
 * Generates a random JoySplit ID matching format JOY-XXXXXX
 * Characters used exclude easily confused characters (O, 0, I, 1)
 */
export function generateRandomJoySplitId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `JOY-${code}`;
}

export const generateRandomSplitzyId = generateRandomJoySplitId;

/**
 * Atomically reserve a unique JoySplit ID in Firestore
 */
export async function claimUniqueJoySplitId(
  uid: string,
  preferredId?: string
): Promise<string> {
  if (!db) {
    // Offline/fallback mode
    return preferredId || generateRandomJoySplitId();
  }

  const firestore = db;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const candidate = (attempts === 1 && preferredId) ? preferredId.toUpperCase() : generateRandomJoySplitId();
    const idDocRef = doc(firestore, "splitzyIds", candidate);

    try {
      const claimed = await runTransaction(firestore, async (transaction) => {
        const idDoc = await transaction.get(idDocRef);
        if (idDoc.exists()) {
          const owner = idDoc.data()?.uid;
          if (owner === uid) {
            return candidate; // Already owned by this user
          }
          return null; // Taken
        }
        transaction.set(idDocRef, {
          uid,
          createdAt: new Date().toISOString(),
        });
        return candidate;
      });

      if (claimed) {
        return claimed;
      }
    } catch (e) {
      console.error("Error claiming JoySplit ID attempt", attempts, e);
    }
  }

  // Fallback
  return generateRandomJoySplitId();
}

export const claimUniqueSplitzyId = claimUniqueJoySplitId;
