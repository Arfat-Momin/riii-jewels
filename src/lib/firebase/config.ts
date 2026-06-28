import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ── Customer app (main website) ──────────────────────────────────────────────
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Used by main website / customers only

// ── Admin app (separate instance = separate auth session) ────────────────────
// Using a named second instance ensures admin login/logout is fully isolated
// from the customer session. Admins use @admin.riii.com emails.
const adminApp = getApps().find(a => a.name === "admin")
  ?? initializeApp(firebaseConfig, "admin");
const adminAuth = getAuth(adminApp); // Used by admin panel only

// isMock: true when Firebase env vars are not configured (development fallback)
export const isMock = !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

export { app, db, auth, adminAuth };

