// @ts-nocheck
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

export const getEnv = (name: string): string => {
  switch (name) {
    case "FIREBASE_API_KEY":
      return process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_VITE_FIREBASE_API_KEY || "";
    case "FIREBASE_AUTH_DOMAIN":
      return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_VITE_FIREBASE_AUTH_DOMAIN || "";
    case "FIREBASE_PROJECT_ID":
      return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_VITE_FIREBASE_PROJECT_ID || "";
    case "FIREBASE_STORAGE_BUCKET":
      return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_VITE_FIREBASE_STORAGE_BUCKET || "";
    case "FIREBASE_MESSAGING_SENDER_ID":
      return process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_VITE_FIREBASE_MESSAGING_SENDER_ID || "";
    case "FIREBASE_APP_ID":
      return process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_VITE_FIREBASE_APP_ID || "";
    case "FIREBASE_MEASUREMENT_ID":
      return process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_VITE_FIREBASE_MEASUREMENT_ID || "";
    case "ALLOWED_EMAIL":
      return process.env.NEXT_PUBLIC_ALLOWED_EMAIL || process.env.NEXT_PUBLIC_VITE_ALLOWED_EMAIL || "";
    case "GEMINI_API_KEY":
      // Paid service secrets cannot be shipped in a NEXT_PUBLIC browser bundle.
      // Weather uses its deterministic fallback; journal rewrite stays unavailable
      // until an authenticated server gateway is configured.
      return "";
    case "RECAPTCHA_ENTERPRISE_SITE_KEY":
      return process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY || process.env.NEXT_PUBLIC_VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || "";
    default:
      return "";
  }
};

const rawApiKey = getEnv("FIREBASE_API_KEY");
/** False when the build has no Firebase settings: sign-in can't work, so the UI says so. */
export const firebaseConfigured = Boolean(rawApiKey && getEnv("FIREBASE_PROJECT_ID"));
const firebaseConfig = {
  apiKey: rawApiKey || "AIzaSyMockKeyForTestEnvironment0000000000",
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN") || "seneca-system.firebaseapp.com",
  projectId: getEnv("FIREBASE_PROJECT_ID") || "seneca-system",
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET") || "seneca-system.appspot.com",
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID") || "000000000000",
  appId: getEnv("FIREBASE_APP_ID") || "1:000000000000:web:000000000000",
  measurementId: getEnv("FIREBASE_MEASUREMENT_ID") || "",
};

// Initialize Firebase App (idempotent)
let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

// App Check (Browser only)
if (typeof window !== "undefined") {
  const appCheckSiteKey = getEnv("RECAPTCHA_ENTERPRISE_SITE_KEY");
  if (appCheckSiteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn("[Firebase] AppCheck initialization skipped or failed:", e);
    }
  }
}

// Firestore with offline persistence
let db: Firestore;
if (typeof window !== "undefined") {
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = getFirestore(app);
  }
} else {
  // SSR fallback
  db = getFirestore(app);
}

let storage: FirebaseStorage;
try {
  storage = getStorage(app);
} catch {
  storage = {} as any;
}

let auth: Auth;
try {
  auth = getAuth(app);
} catch {
  auth = {} as any;
}

export { app, db, storage, auth };
