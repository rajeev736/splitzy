# 🚀 JoySplit — Firebase Setup & Multi-User Testing Guide (₹0 Free Tier)

Yeh guide aapko step-by-step batayegi ki **Firebase (Spark Free Plan)** kaise setup karna hai taaki aap **4 real users** ke saath JoySplit ke saare features (User registration, Google login, real-time friend requests, group expense splitting, aur UPI settlements) live test kar sakein.

---

## 📌 Summary: Hum Kya Setup Kar Rahe Hain?

| Feature | Solution | Cost | Limits (Free Tier) |
| :--- | :--- | :--- | :--- |
| **Authentication** | Firebase Auth (Email/Pass + Google) | **₹0** | Unlimited users |
| **Database** | Cloud Firestore (NoSQL Realtime) | **₹0** | 50,000 reads/day, 20,000 writes/day |
| **Realtime Sync** | Firestore `onSnapshot` WebSockets | **₹0** | Included |
| **UPI Payments** | NPCI Deep Links (`upi://pay?pa=...`) | **₹0** | Zero transaction fees |

---

## 🛠️ Step 1: Firebase Project Create Karein (1 Minute)

1. Apne browser me **[https://console.firebase.google.com/](https://console.firebase.google.com/)** open karein.
2. Apne Google Account se login karein.
3. **"Add project"** ya **"Create a project"** button par click karein.
4. Project ka naam daalein: **`joysplit`** (jaise aapne banaya hai).
5. "Enable Google Analytics for this project" ko **Disable** kar sakte hain (testing ke liye zaroorat nahi hai).
6. **"Create project"** par click karein aur 10-15 seconds wait karein. Fir **"Continue"** dabayein.

---

## 🔑 Step 2: Web App Register Karke 6 Keys Nikalein (1 Minute)

1. Project Overview dashboard par aapko platform icons dikhenge (`iOS`, `Android`, `Web </>`, `Unity`).
2. **`</>` (Web)** icon par click karein.
3. App nickname me likhein: **`JoySplit Web`**.
4. *"Also set up Firebase Hosting"* ko uncheck rehne dein.
5. **"Register app"** button par click karein.
6. Screen par aapko `firebaseConfig` object dikhega, jisme ye 6 keys hongi:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD-xxxxxxxxxxxxxxxxxxxx",
  authDomain: "joysplit-xxxxx.firebaseapp.com",
  projectId: "joysplit-xxxxx",
  storageBucket: "joysplit-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxx"
};
```

---

## 🔐 Step 3: Authentication Enable Karein (1 Minute)

1. Firebase console ke left sidebar me **Build** dropdown kholein aur **Authentication** par click karein.
2. **"Get started"** button dabayein.
3. **Sign-in method** tab me jayein:
   - **Email/Password:**
     - Click karein -> **Enable** toggle on karein -> **Save** dabayein.
   - **Google:**
     - Click karein -> **Enable** toggle on karein.
     - **Project public-facing name:** `JoySplit`
     - **Project support email:** Apna email select karein.
     - **Save** dabayein.

---

## 🗄️ Step 4: Firestore Realtime Database Create Karein (1 Minute)

1. Left sidebar me **Build > Firestore Database** par click karein.
2. **"Create database"** button par click karein.
3. **Database location:** Select karein `asia-south1 (Mumbai)` (India ke liye sabse fast speed).
4. **Security rules:** Select karein **"Start in test mode"** (yeh 30 din tak direct access allow karta hai, jisse testing instant shuru ho sake).
5. **"Create"** / **"Done"** par click karein.

> **Note:** Production rules humne already aapke project me [`firestore.rules`](./firestore.rules) file me likh kar rakh di hain. Test mode se aapki 4-user testing turant start ho jayegi!

---

## ⚙️ Step 5: JoySplit Codebase me Keys Configure Karein

Aapke project root directory me [`.env.local`](./.env.local) file already present hai. Usko open karke apni 6 keys paste kar dijiye:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=joysplit-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=joysplit-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=joysplit-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxx
```

> 💡 **Tip:** Agar aap chaho to ye 6 keys seedha chat me mujhe bhej sakte ho, mai khud `.env.local` me daal kar server restart kar dunga!

---

## 🧪 Step 6: 4 Real Users Testing Flow (Kaise Test Karein)

Jab aap keys add kar lenge, tab 4 distinct users ki live real-time testing aise karein:

### Test Setup:
- **User 1 (Admin/Payer):** Chrome normal window me `http://localhost:3001/signup` kholein.
- **User 2 (Friend):** Chrome Incognito window (`Ctrl + Shift + N`) me `http://localhost:3001/signup` kholein.
- **User 3:** Edge browser me kholein.
- **User 4:** Phone browser (same Wi-Fi IP pe `http://<YOUR_PC_IP>:3001`) ya Firefox me kholein.

---

### Step-by-Step Test Procedure:

### 1️⃣ User Registration & JoySplit ID Generation
1. **User 1** Signup karein:
   - Name: `Aman Sharma`
   - Email: `aman@gmail.com`, Password: `password123` (ya "Continue with Google" click karein).
   - Profile complete karein: JoySplit auto-generate karega unique ID jaise `JOY-A1B2C3` aur UPI ID `aman@upi`.
2. **User 2** Signup karein:
   - Name: `Priya Patel`
   - Email: `priya@gmail.com`, Password: `password123`.
   - Priya ka JoySplit ID note karein (e.g. `JOY-X7Y8Z9`).

### 2️⃣ Live Friend Request
1. **User 1 (Aman)** dashboard pe jayein -> Bottom bar / Sidebar se **Friends** -> **Add Friend** (`/friends/add`).
2. Priya ka JoySplit ID daalein: `JOY-X7Y8Z9` -> **Send Friend Request**.
3. **User 2 (Priya) ki screen dekhein:**
   - Bina page refresh kiye Priya ke **Notifications** bell aur **Friends > Requests** tab par red badge aa jayega!
4. Priya **"Accept"** dabayegi.
5. Instant dono ke Friends list me ek dusre ka profile picture, name aur UPI ID add ho jayega.

### 3️⃣ Group Creation & Edit Test
1. Aman **Groups > + New Group** par jayein.
2. Group Name: `Goa Trip 2026`, Icon select karein, Priya ko add karein -> **Create Group**.
3. Group open karein.
4. Name ke bagal me **✏️ Pencil Icon** par click karein:
   - Group name ya category icon change karein -> **Save Changes**.
   - Changes turant live update honge!

### 4️⃣ Real Expense Creation & Split Calculation
1. Aman click karein **Add Expense** (`/expenses/new`):
   - Title: `Dinner at Beach Shack`
   - Amount: `₹2400`
   - Group selector par click karein -> `Goa Trip 2026` choose karein (in-place modal me se).
   - Step 2 me Priya aur Aman select honge.
   - Step 3: Equal split (₹1200 each - exact paise calculation).
   - Submit karein.
2. **Priya ki screen par dekhein:**
   - Real-time notification pop hogi: *"Aman added Dinner at Beach Shack - your share is ₹1200"*.
   - Dashboard par Net Balance show karega: **You owe ₹1200**.

### 5️⃣ UPI Payment & Settlement Verification
1. Priya expense par click karegi -> **"Pay Now"** dabayegi.
2. GPay / PhonePe / Paytm / CRED / BHIM app choose karke direct UPI deep link generate hoga (`upi://pay?pa=aman@upi&pn=Aman Sharma&am=1200.00`).
3. Payment karne ke baad Priya click karegi: **"Mark as Paid"** (optionally note ya reference daal sakti hai).
4. Aman ke phone par alert aayega: *"Priya marked their share as paid"*.
5. Aman **"Confirm Receipt"** dabayega.
6. Both balances auto-update to **₹0 (All settled up! 🎉)** confetti animation ke saath!

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Kya Firebase ka koi bill aayega?
**Ans:** Bilkul nahi. Spark plan 100% free forever hai. Isme credit card bhi enter nahi karna padta.

### Q: Jab 4 se zyada users ya friends add karne hon tab?
**Ans:** Spark plan pe 50,000 document reads aur 20,000 writes per day milte hain. Isme aap aaraam se 200+ active users test kar sakte hain bina 1 paisa diye.

### Q: Agar Google Login me "popup blocked" ya error aaye?
**Ans:** Firebase Console me Authentication -> Settings -> **Authorized domains** me verify karein ki `localhost` listed hai (by default `localhost` already added hota hai).
