# Splitzy — Zero-Budget Group Expense Splitting & UPI Tracking

> **"Split bills. Keep friendships."**  
> A clean, responsive group expense-splitting and payment-tracking web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Firebase** (with ₹0 operating budget).

---

## 📸 Design References & UI Fidelity

Splitzy is built to faithfully reproduce all reference screens located in `ui-images/`:
1. **Welcome & Onboarding**: 4-step interactive walkthrough with real UI previews.
2. **Authentication**: Email/Password login, signup with unique race-safe Splitzy ID (`SPL-XXXXXX`), profile setup with avatar selection and UPI ID.
3. **Home Dashboard**: Net Balance card, "You are owed" and "You owe" breakdowns, Quick Actions, Recent Groups, and Recent Activity.
4. **Groups Management**: Group overview, custom 3D group icons (Beach, Food, Home, Movies), member management with admin badges and sharable invite links.
5. **5-Step Expense Wizard**: Basic Info ➔ Select Participants ➔ Split Amount (Equal / Manual) ➔ Review ➔ Celebration with confetti.
6. **UPI Payment Engine**: Peer-to-peer UPI intent links (`upi://pay`), app chooser (Google Pay, PhonePe, Paytm, CRED, BHIM), and trust-based recipient confirmation.
7. **Activity & History**: Filterable activity feed, expense history by status, and payment history with total sent/received stats.
8. **Responsive Layout**: Mobile-first bottom navigation (`360px`–`430px`) and desktop persistent left sidebar with multi-column widgets (`768px`–`1920px`).

---

## ⚡ Financial Precision: Integer Paise Guarantee

- **Zero Floating-Point Drift**: All monetary values are strictly stored and computed as **integer paise** (`1 INR = 100 Paise`).
- **Deterministic Equal Splits**: When dividing an amount that does not split cleanly (e.g., ₹10 / 1000 paise among 3 people), the remainder paise are distributed deterministically (+1 paise to the first $R$ participants). The sum of all shares is **100% mathematically equal to the bill total**.
- **Manual Split Validation**: Strictly rejects any manual split where the sum of member shares differs from the total bill amount.

---

## 📱 UPI Intent & Settlement State Machine

Splitzy creates standard NPCI-compliant UPI deep links:
```
upi://pay?pa={recipientUpiId}&pn={payeeName}&am={rupees}&cu=INR&tn={note}
```

### Payment Lifecycle:
1. `PENDING`: Participant owes their share.
2. `PAYMENT_REPORTED`: Payer clicked "Pay" or reported payment in Splitzy.
3. `PAID`: Intended recipient confirmed receipt in their account.
4. `DISPUTED`: Recipient marked payment as not received.

---

## 🛠️ Tech Stack & ₹0 Cost Strategy

| Layer | Technology | Free-Tier Strategy |
|---|---|---|
| **Frontend Framework** | Next.js 16 (App Router, Turbopack) | Vercel Free Hobby Tier |
| **Language & Styling** | TypeScript (Strict) + Tailwind CSS | Built-in |
| **Icons & Brand** | Lucide React + Custom Scalable SVG Logo | Free / Open Source |
| **Backend & Auth** | Firebase Authentication + Cloud Firestore | Firebase Spark Plan (Free) |
| **Animations** | Canvas Confetti | Client-side Canvas |
| **PWA** | Web App Manifest + Standalone display | Client-side metadata |

---

## 🚀 Getting Started Locally

### 1. Clone & Install Dependencies
```bash
cd splitzy
npm install
```

### 2. Run Financial Invariant Unit Tests
```bash
npx tsx src/lib/money/__tests__/money.test.ts
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if port 3000 is occupied).

### 4. Build for Production
```bash
npm run build
```

---

## 🔐 Firebase Configuration (Optional for Live Cloud Sync)

Splitzy includes **interactive demo persistence out-of-the-box**. To connect to your own Firebase project:

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** ➔ Sign-in method ➔ **Email/Password**.
3. Create a **Cloud Firestore** database.
4. Copy credentials into `.env.local`:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```
5. Deploy Firestore Security Rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 📦 Deployment to Vercel

1. Push code to your GitHub repository.
2. Import project into [Vercel](https://vercel.com/).
3. Add your Firebase environment variables in Vercel Project Settings.
4. Deploy!
