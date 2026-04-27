import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendResetEmail,
  checkEmailRegistered,
  signOut,
  describeAuthError,
} from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import sphnLogo from "@assets/image_1777100399723.png";

type Mode = "signin" | "signup" | "reset";

export default function Login() {
  const [, navigate] = useLocation();
  const { loading, user } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [suggestRegister, setSuggestRegister] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/exams");
  }, [loading, user, navigate]);

  function clearMessages() {
    setError(null);
    setInfo(null);
    setSuggestRegister(false);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || (mode !== "reset" && !password)) {
      setError("Please fill in all fields.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
        navigate("/exams");
      } else if (mode === "signup") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          setBusy(false);
          return;
        }
        await signUpWithEmail(email, password, name.trim() || undefined);
        navigate("/complete-profile");
      } else {
        await sendResetEmail(email);
        setInfo("Password reset link sent. Check your email.");
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (
        mode === "signin" &&
        (code === "auth/invalid-credential" ||
          code === "auth/user-not-found" ||
          code === "auth/wrong-password")
      ) {
        const isRegistered = await checkEmailRegistered(email);
        if (!isRegistered) {
          setError("No account found for this email.");
          setSuggestRegister(true);
        } else {
          setError("Incorrect password. Please try again.");
        }
      } else {
        const msg = describeAuthError(err);
        if (msg) setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    clearMessages();
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate("/exams");
    } catch (err) {
      const msg = describeAuthError(err);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f0f4f8] flex flex-col">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[#0b1e4d] via-[#1e3a8a] to-[#0369a1] text-white px-6 pt-12 pb-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 85%, rgba(255,255,255,0.5) 0, transparent 45%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.4) 0, transparent 45%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center p-1.5 mb-4">
            <img src={sphnLogo} alt="SPHN" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold leading-tight mb-1">Sphoorthy Engineering College</h1>
          <p className="text-white/70 text-sm">Online Examination Portal</p>
        </div>
      </div>

      {/* Form card (overlapping) */}
      <div className="flex-1 relative -mt-6">
        <div className="mx-4 bg-white rounded-3xl shadow-xl border border-slate-100 px-5 py-6">

          {/* Tab switcher */}
          {mode !== "reset" && (
            <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
              <button
                type="button"
                onClick={() => { clearMessages(); setMode("signin"); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  mode === "signin" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { clearMessages(); setMode("signup"); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  mode === "signup" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                }`}
              >
                Register
              </button>
            </div>
          )}

          {mode === "reset" && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => { clearMessages(); setMode("signin"); }}
                className="flex items-center gap-1.5 text-sm text-[#0ea5e9] font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Back to sign in
              </button>
              <h2 className="text-lg font-bold text-slate-800 mt-3">Reset Password</h2>
              <p className="text-sm text-slate-500">We'll send a reset link to your email.</p>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className="h-12 rounded-xl text-base"
                  data-testid="input-name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                autoComplete="email"
                required
                className="h-12 rounded-xl text-base"
                data-testid="input-email"
              />
            </div>

            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { clearMessages(); setMode("reset"); }}
                      className="text-xs text-[#0ea5e9] font-medium"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    className="h-12 rounded-xl text-base pr-12"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
                <p className="text-sm text-red-700">{error}</p>
                {suggestRegister && (
                  <button
                    type="button"
                    onClick={() => { clearMessages(); setMode("signup"); }}
                    className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#1e3a8a] text-white text-sm font-semibold"
                  >
                    Register now →
                  </button>
                )}
              </div>
            )}
            {info && (
              <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                {info}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy || loading}
              className="w-full h-13 text-base font-bold rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-md"
              data-testid="button-submit"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2"><Spinner /> Please wait…</span>
              ) : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </Button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="bg-white px-3 text-slate-400 font-medium">or</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogle}
                disabled={busy || loading}
                variant="outline"
                className="w-full h-12 rounded-xl bg-white border-slate-200 text-slate-700 font-semibold text-sm gap-2 shadow-sm"
                data-testid="button-google-signin"
              >
                <GoogleIcon /> Continue with Google
              </Button>
            </>
          )}

          {user && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => signOut()}
                className="text-xs text-slate-400 underline"
              >
                Sign out {user.email}
              </button>
            </div>
          )}

          <p className="mt-5 text-[11px] text-slate-400 text-center leading-relaxed">
            By continuing you agree to follow examination rules and the college's testing policies.
          </p>
        </div>

        <div className="mt-4 pb-6 text-center text-[11px] text-slate-400">
          Version 17.05.21 · &copy; {new Date().getFullYear()} Sphoorthy Engineering College
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l3.01-2.32z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 9 0 9 9 0 0 0 .96 4.97l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
