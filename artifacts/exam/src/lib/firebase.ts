import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDo5bUlOIdbcRPCSnwILSEz-NoF1N1wZ28",
  authDomain: "sphntestonline.firebaseapp.com",
  projectId: "sphntestonline",
  storageBucket: "sphntestonline.firebasestorage.app",
  messagingSenderId: "117424873287",
  appId: "1:117424873287:web:a0df90ef59964be523b662",
  measurementId: "G-2N8FSQ5NQ0",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOut() {
  return fbSignOut(auth);
}

export { onAuthStateChanged };
export type { User };
