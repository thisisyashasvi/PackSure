import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Official Firebase configuration for project: packsure-cfbbe
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "packsure-cfbbe",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:742950821286:web:8014e1e37cadb669850367",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "packsure-cfbbe.firebasestorage.app",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBQfEdjO6_Ayg4IWsWaRRXE_KK8ipKHiK0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "packsure-cfbbe.firebaseapp.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "742950821286",
}

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

// Initialize Firebase Authentication
export const auth = getAuth(app)

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: "select_account",
})

// Initialize Cloud Firestore Database
export const db = getFirestore(app)

export default app
