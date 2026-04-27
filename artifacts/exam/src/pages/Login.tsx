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

  useEffect(() => {
    if (!loading && user) navigate("/exams");
  }, [loading, user, navigate]);

  function clearMessages() {
    setError(null);
    setInfo(null);
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
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
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
      const msg = describeAuthError(err);
      if (msg) setError(msg);
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
    <div className="min-h-screen w-full bg-slate-50 flex">
      {/* Left brand panel — hidden on small screens */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0b1e4d] via-[#1e3a8a] to-[#0ea5e9] text-white">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0, transparent 40%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center p-1.5 shrink-0">
              <img src={sphnLogo} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold">Sphoorthy Engineering College</div>
              <div className="text-xs text-white/70">Online Examination Portal</div>
            </div>
          </div>

          <div className="space-y-5 max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              A secure, modern testing platform built for colleges.
            </h1>
            <p className="text-white/80 text-base leading-relaxed">
              Conduct proctored online assessments at scale. Real-time
              monitoring, auto-evaluation and instant results — trusted by
              institutions across India.
            </p>
            <ul className="space-y-3 text-sm text-white/90 pt-2">
              <FeatureBullet>Tab-switch & focus monitoring with auto-submit</FeatureBullet>
              <FeatureBullet>Automatic scoring & exportable results</FeatureBullet>
              <FeatureBullet>Role-based admin access (principal, invigilator)</FeatureBullet>
              <FeatureBullet>Mobile, tablet and desktop ready</FeatureBullet>
            </ul>
          </div>

          <div className="text-[11px] text-white/60">
            Version 17.05.21 · &copy; {new Date().getFullYear()} Sphoorthy Engineering College
          </div>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex-1 flex flex-col">
        {/* Compact header for mobile */}
        <div className="lg:hidden bg-gradient-to-r from-[#0b1e4d] to-[#1e3a8a] text-white px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white p-1 shrink-0">
            <img src={sphnLogo} alt="" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">Sphoorthy Engineering College</div>
            <div className="text-[11px] text-white/70">Online Examination Portal</div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {mode === "signin" && "Welcome back"}
                {mode === "signup" && "Create your account"}
                {mode === "reset" && "Reset password"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {mode === "signin" && "Sign in to access your tests."}
                {mode === "signup" && "Register with your college email to begin."}
                {mode === "reset" &&
                  "Enter your email — we'll send you a reset link."}
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-700">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    className="h-11"
                    data-testid="input-name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  autoComplete="email"
                  required
                  className="h-11"
                  data-testid="input-email"
                />
              </div>

              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-medium text-slate-700"
                    >
                      Password
                    </Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          clearMessages();
                          setMode("reset");
                        }}
                        className="text-[11px] text-[#0ea5e9] hover:underline font-medium"
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
                      placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      className="h-11 pr-10"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      tabIndex={-1}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              {info && (
                <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  {info}
                </div>
              )}

              <Button
                type="submit"
                disabled={busy || loading}
                className="w-full h-11 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold shadow-sm"
                data-testid="button-submit"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Please wait…
                  </span>
                ) : mode === "signin" ? (
                  "Sign in"
                ) : mode === "signup" ? (
                  "Create account"
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            {mode !== "reset" && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
                    <span className="bg-slate-50 px-3 text-slate-500 font-medium">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy || loading}
                  variant="outline"
                  className="w-full h-11 bg-white border-slate-300 hover:bg-slate-50 text-slate-800 font-medium shadow-sm gap-2"
                  data-testid="button-google-signin"
                >
                  <GoogleIcon /> Continue with Google
                </Button>
              </>
            )}

            <div className="mt-6 text-center text-sm text-slate-600">
              {mode === "signin" && (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setMode("signup");
                    }}
                    className="text-[#0ea5e9] hover:underline font-semibold"
                  >
                    Create one
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setMode("signin");
                    }}
                    className="text-[#0ea5e9] hover:underline font-semibold"
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === "reset" && (
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode("signin");
                  }}
                  className="text-[#0ea5e9] hover:underline font-semibold"
                >
                  ← Back to sign in
                </button>
              )}
            </div>

            {user && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Sign out {user.email}
                </button>
              </div>
            )}

            <p className="mt-8 text-[11px] text-slate-400 text-center leading-relaxed">
              By continuing you agree to follow examination rules and the
              college's testing policies.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
