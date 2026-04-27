import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Exam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import SphnHeader from "@/components/SphnHeader";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/useProfile";
import { signOut } from "@/lib/firebase";

export default function ExamList() {
  const [, navigate] = useLocation();
  const { loading: authLoading, user, isAdmin } = useAuth();
  const { loading: profileLoading, profile } = useProfile();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const username = profile?.name ?? user?.displayName ?? user?.email ?? null;

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) { navigate("/"); return; }
    if (!profile) { navigate("/complete-profile"); return; }
    (async () => {
      const { data, error: err } = await supabase
        .from("exams")
        .select("id,title,description,duration_minutes,max_violations,is_active,created_at,allowed_colleges")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (err) { setError(err.message); setLoading(false); return; }
      const filtered = (data ?? []).filter((e: any) => {
        if (!e.allowed_colleges || e.allowed_colleges.length === 0) return true;
        return e.allowed_colleges.includes(profile.college);
      });
      setExams(filtered as Exam[]);
      setLoading(false);
    })();
  }, [authLoading, profileLoading, user, profile, navigate]);

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      <SphnHeader
        subtitle="Available Tests"
        rightSlot={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => navigate("/admin")}
              >
                Admin
              </Button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] text-white/80 hover:text-white underline"
              data-testid="button-logout"
            >
              Logout
            </button>
          </div>
        }
      />

      <main className="flex-1 px-4 py-5 max-w-xl w-full mx-auto">
        {/* Welcome card */}
        {username && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {username.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm">{username}</div>
              <div className="text-xs text-slate-400">{profile?.college}</div>
            </div>
          </div>
        )}

        <h1 className="text-lg font-bold text-slate-800 mb-1">Available Tests</h1>
        <p className="text-sm text-slate-500 mb-4">Tap a test to view instructions and begin.</p>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !profile?.is_approved ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Pending Approval</h2>
            <p className="text-sm text-slate-500 mb-5">
              Your account for <span className="font-semibold text-slate-700">{profile?.college}</span> is waiting for admin approval.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl">
              Refresh Status
            </Button>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm text-slate-500">No active tests right now. Check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-sm leading-snug">{e.title}</div>
                    {e.description && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{e.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-full px-3 py-1 border border-slate-200">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {e.duration_minutes} min
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-full px-3 py-1 border border-slate-200">
                    Max {e.max_violations} violations
                  </span>
                </div>
                <Button
                  onClick={() => navigate(`/instructions/${e.id}`)}
                  className="w-full h-11 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold shadow-sm"
                  data-testid={`button-start-${e.id}`}
                >
                  Start Test →
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-slate-800 text-white/60 text-center text-[10px] py-3 mt-4">
        v17.05.21 · Sphoorthy Engineering College
      </footer>
    </div>
  );
}
