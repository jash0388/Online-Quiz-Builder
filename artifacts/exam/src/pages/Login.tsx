import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SphnHeader from "@/components/SphnHeader";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    sessionStorage.setItem(
      "exam:auth",
      JSON.stringify({
        username: username.trim(),
        loggedInAt: Date.now(),
      }),
    );
    navigate("/exams");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#e8eef5]">
      <SphnHeader
        rightSlot={
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="text-[11px] text-white/80 hover:text-white underline"
          >
            Admin
          </button>
        }
      />

      {/* Candidate banner strip */}
      <div className="bg-slate-700 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] text-white/70 uppercase tracking-wide">
              System Name
            </div>
            <div className="text-yellow-300 font-bold text-2xl leading-tight">
              C001
            </div>
            <div className="text-[11px] text-white/70 mt-1 hidden sm:block">
              Kindly contact the invigilator if there are any discrepancies in
              the displayed details.
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-white/70 uppercase tracking-wide">
              Subject
            </div>
            <div className="text-yellow-300 font-semibold text-base">
              EAPCET Mock Test
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white border border-border rounded shadow-md overflow-hidden"
        >
          <div className="bg-[#f1f5f9] border-b border-border px-5 py-3">
            <h1 className="font-semibold text-slate-800">Login</h1>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Label htmlFor="username" className="text-xs">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                data-testid="input-username"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                data-testid="input-password"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold"
              data-testid="button-signin"
            >
              Sign In
            </Button>

            <p className="text-[11px] text-muted-foreground text-center pt-1">
              Use the username and password provided by the invigilator.
            </p>
          </div>
        </form>
      </main>

      <footer className="bg-slate-800 text-white/70 text-center text-[11px] py-2">
        Version 17.05.21 &middot; Sphoorthy Engineering College Online
        Assessment Portal
      </footer>
    </div>
  );
}
