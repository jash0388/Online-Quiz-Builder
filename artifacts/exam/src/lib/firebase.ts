import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  updateProfile,
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

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName });
    } catch {
      // non-fatal
    }
  }
  return cred;
}

export async function sendResetEmail(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function checkEmailRegistered(email: string): Promise<boolean> {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email.trim());
    return methods.length > 0;
  } catch {
    return true;
  }
}

export async function signOut() {
  return fbSignOut(auth);
}

export function describeAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact your invigilator.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in instead.";
    case "auth/weak-password":
      return "Password is too weak — use at least 6 characters.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/unauthorized-domain":
      return "This site isn't yet allowed in Firebase. In Firebase Console → Authentication → Settings → Authorized domains, add this site's domain and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled yet. In Firebase Console → Authentication → Sign-in method, enable Email/Password and Google for project 'sphntestonline'.";
    case "auth/configuration-not-found":
      return "Firebase Authentication isn't set up on the project yet. Open Firebase Console → Authentication → Get Started, then under Sign-in method enable Email/Password and Google for project 'sphntestonline'. After enabling, refresh this page.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "The Firebase API key is invalid. Verify the apiKey in src/lib/firebase.ts matches the one shown in Firebase Console → Project settings → Web app.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return e instanceof Error ? e.message : "Something went wrong. Please try again.";
  }
}

export { onAuthStateChanged };
export type { User };
