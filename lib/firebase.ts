import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase public config — these are safe to commit (protected by
// Firebase security rules + authorized domains in the Firebase console).
const firebaseConfig = {
  apiKey:            "AIzaSyC0dNXTO8aMg-mJX58M0JeVlDP9vujQ75A",
  authDomain:        "mindscan-7ee0a.firebaseapp.com",
  projectId:         "mindscan-7ee0a",
  storageBucket:     "mindscan-7ee0a.firebasestorage.app",
  messagingSenderId: "495232559938",
  appId:             "1:495232559938:web:429bef4a67968b82eaf6db",
  measurementId:     "G-SRTWTTSRP9",
};

// Prevent re-initialization during hot-reload in dev
const app  = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { auth, googleProvider };
