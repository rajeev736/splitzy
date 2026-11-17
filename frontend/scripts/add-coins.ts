/**
 * Testing helper: adds coins to one person's wallet, nothing else.
 *
 *   npx tsx scripts/add-coins.ts <uid or email> [amount]
 *
 * Amount defaults to 10,00,000. Run from `frontend/`. It uses the service
 * account in .env.local (FIREBASE_SERVICE_ACCOUNT_KEY), so it writes as an
 * admin and the security rules don't apply — never ship this to the app.
 * The wallet must already exist (open the Games tab once with that account).
 */
import { getAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

import { adminApp } from "../lib/server/firebase-admin"

const DEFAULT_COINS = 1_000_000

async function main() {
  const [who, amountArg] = process.argv.slice(2)
  if (!who) {
    console.error("Usage: npx tsx scripts/add-coins.ts <uid or email> [amount]")
    process.exit(1)
  }
  const amount = amountArg ? Number(amountArg) : DEFAULT_COINS
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000) {
    console.error("Amount must be a whole number between 1 and 10,00,00,000.")
    process.exit(1)
  }

  try {
    process.loadEnvFile(".env.local")
  } catch {
    console.error("Couldn't read .env.local — run this from the frontend/ folder.")
    process.exit(1)
  }
  const app = adminApp()
  if (!app) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY is missing or invalid in .env.local.")
    process.exit(1)
  }

  const uid = who.includes("@") ? (await getAuth(app).getUserByEmail(who)).uid : who
  const wallet = getFirestore(app).doc(`wallets/${uid}`)
  const before = await wallet.get()
  if (!before.exists) {
    console.error(`No wallet for ${uid} yet — open the Games tab once with that account, then run this again.`)
    process.exit(1)
  }

  // Only the balance moves; everything else in the wallet stays as it is
  await wallet.update({ balance: FieldValue.increment(amount) })
  const after = await wallet.get()
  const fmt = (n: unknown) => Number(n ?? 0).toLocaleString("en-IN")
  console.log(`Added ${fmt(amount)} coins to ${uid}: ${fmt(before.get("balance"))} → ${fmt(after.get("balance"))}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
