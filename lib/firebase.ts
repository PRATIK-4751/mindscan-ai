import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase config from environment variables
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazy initialization — only runs when first accessed, not at import time
let _initialized = false;
let _auth: ReturnType<typeof getAuth> | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

function ensureInit() {
  if (_initialized) return;
  _initialized = true;
  if (!firebaseConfig.apiKey) return; // Gracefully skip during SSR/prerender
  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  _auth = getAuth(app);
  _googleProvider = new GoogleAuthProvider();
  _googleProvider.setCustomParameters({ prompt: "select_account" });
}

// Wrapped getters that look like values but initialize lazily
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    ensureInit();
    if (!_auth) throw new Error("Firebase not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY.");
    return Reflect.get(_auth, prop);
  },
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_, prop) {
    ensureInit();
    if (!_googleProvider) throw new Error("Firebase not configured.");
    return Reflect.get(_googleProvider, prop);
  },
});
