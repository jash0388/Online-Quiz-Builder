import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Exam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import SphnHeader from "@/components/SphnHeader";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/useProfile";
import { signOut } from "@/lib/firebase";

interface MySubmission {
  id: string;
  exam_title: string | null;
  score: number | null;
  total_marks: number | null;
  time_used_seconds: number | null;
  submitted_at: string | null;
  status: string | null;
}

export default function ExamList() {
  const [, navigate] = useLocation();
  const { loading: authLoading, user, isAdmin } = useAuth();
  const { loading: profileLoading, profile } = useProfile();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myResults, setMyResults] = useState<MySubmission[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

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

  async function loadMyResults() {
    if (!profile?.roll_number) return;
    setResultsLoading(true);
    const { data } = await supabase
      .from("exam_submissions")
      .select("id,exam_title,score,total_marks,time_used_seconds,submitted_at,status")
      .eq("roll_number", profile.roll_number)
      .order("submitted_at", { ascending: false });
    setMyResults((data ?? []) as MySubmission[]);
    setResultsLoading(false);
  }

  function handleToggleResults() {
    if (!showResults && myResults.length === 0) {
      loadMyResults();
    }
    setShowResults((v) => !v);
  }

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  function formatTime(secs: number | null) {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  function getScoreBadge(score: number | null, total: number | null) {
    if (score == null || total == null || total === 0) return { pct: 0, color: "text-slate-500", bg: "bg-slate-50 border-slate-200" };
    const pct = (score / total) * 100;
    if (pct >= 70) return { pct, color: "text-green-700", bg: "bg-green-50 border-green-200" };
    if (pct >= 40) return { pct, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
    return { pct, color: "text-red-700", bg: "bg-red-50 border-red-200" };
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
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 text-sm truncate">{username}</div>
              <div className="text-xs text-slate-400">{profile?.college}</div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/complete-profile")}
              className="text-[11px] text-[#0ea5e9] shrink-0"
            >
              Edit Profile
            </button>
          </div>
        )}

        {/* ── AVAILABLE TESTS ── */}
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
                <div className="mb-3">
                  <div className="font-bold text-slate-800 text-sm leading-snug">{e.title}</div>
                  {e.description && (
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{e.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-full px-3 py-1 border border-slate-200">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {e.duration_minutes} min
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

        {/* ── MY RESULTS SECTION ── */}
        {profile?.is_approved && (
          <div className="mt-8">
            {/* Section header */}
            <button
              type="button"
              onClick={handleToggleResults}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <span className="font-bold text-slate-800 text-base">My Results</span>
                {myResults.length > 0 && (
                  <span className="bg-[#1e3a8a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {myResults.length}
                  </span>
                )}
              </div>
              <div className={`w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center transition-transform ${showResults ? "rotate-180" : ""}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>

            {showResults && (
              <div>
                {resultsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                      </div>
                    ))}
                  </div>
                ) : myResults.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <p className="font-semibold text-slate-700 mb-1">No attempts yet</p>
                    <p className="text-sm text-slate-400">Your test results will appear here after you submit an exam.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myResults.map((r) => {
                      const { pct, color, bg } = getScoreBadge(r.score, r.total_marks);
                      return (
                        <div
                          key={r.id}
                          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
                        >
                          {/* Exam title + date */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 text-sm leading-snug truncate">
                                {r.exam_title ?? "Exam"}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {formatDate(r.submitted_at)}
                              </div>
                            </div>
                            <div className={`shrink-0 border rounded-xl px-3 py-1.5 text-center min-w-[72px] ${bg}`}>
                              <div className={`text-base font-black ${color}`}>
                                {r.score ?? 0}/{r.total_marks ?? 0}
                              </div>
                              <div className={`text-[10px] font-semibold ${color}`}>
                                {pct.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-200">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {formatTime(r.time_used_seconds)}
                            </span>
                            {r.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded-full px-2.5 py-1 border border-green-200">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M5 12l5 5L20 7"/>
                                </svg>
                                Completed
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 capitalize">{r.status}</span>
                            )}
                          </div>

                          {/* Action button */}
                          <button
                            type="button"
                            onClick={() => navigate(`/result/${r.id}`)}
                            className="w-full h-10 rounded-xl border-2 border-[#1e3a8a] text-[#1e3a8a] text-sm font-semibold flex items-center justify-center gap-2 active:bg-[#1e3a8a]/5 transition-colors"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                            View Full Results
                          </button>
                        </div>
                      );
                    })}

                    {/* Refresh button */}
                    <button
                      type="button"
                      onClick={loadMyResults}
                      className="w-full py-2.5 text-xs text-slate-500 flex items-center justify-center gap-1.5"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
                      </svg>
                      Refresh Results
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-800 text-white/60 text-center text-[10px] py-3 mt-6">
        v17.05.21 · Sphoorthy Engineering College
      </footer>
    </div>
  );
}
