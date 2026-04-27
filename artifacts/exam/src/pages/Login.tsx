import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import SphnHeader from "@/components/SphnHeader";
import { signInWithGoogle, signOut } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

export default function Login() {
  const [, navigate] = useLocation();
  const { loading, user, isAdmin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already signed in, take the user straight to the exam list.
  useEffect(() => {
    if (!loading && user) {
      navigate("/exams");
    }
  }, [loading, user, navigate]);

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate("/exams");
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? "";
      const msg = e instanceof Error ? e.message : String(e);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError(null);
      } else if (code === "auth/unauthorized-domain") {
        setError(
          "This site isn't yet allowed in Firebase. Open Firebase Console → Authentication → Settings → Authorized domains, and add this site's domain.",
        );
      } else {
        setError(msg || "Could not sign in with Google. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#e8eef5] to-[#cbd9ec]">
      <SphnHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0ea5e9] px-6 py-5 text-white">
            <h1 className="font-bold text-xl">Welcome</h1>
            <p className="text-xs text-white/80 mt-0.5">
              Sign in with your Google account to start your exam.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {user && !isAdmin && (
              <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-3 py-2">
                Signed in as <span className="font-semibold">{user.email}</span>.
              </div>
            )}

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={busy || loading}
              className="w-full h-11 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold flex items-center justify-center gap-2 shadow-sm"
              data-testid="button-google-signin"
            >
              <GoogleIcon />
              {busy ? "Signing in…" : "Sign in with Google"}
            </Button>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center pt-1 leading-relaxed">
              Use the Google account provided by your college.
              <br />
              Admins (principals & invigilators) will see the admin panel automatically.
            </p>

            {user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline w-full text-center"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-800 text-white/70 text-center text-[11px] py-2">
        Version 17.05.21 &middot; Sphoorthy Engineering College Online Assessment Portal
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l3.01-2.32z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 9 0 9 9 0 0 0 .96 4.97l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
