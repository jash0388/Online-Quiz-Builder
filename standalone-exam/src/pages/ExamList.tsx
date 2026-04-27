import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Exam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    if (!user) {
      navigate("/");
      return;
    }
    if (!profile) {
      navigate("/complete-profile");
      return;
    }
    (async () => {
      const { data, error: err } = await supabase
        .from("exams")
        .select(
          "id,title,description,duration_minutes,max_violations,is_active,created_at,allowed_colleges",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      
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
    <div className="min-h-screen flex flex-col bg-[#e8eef5]">
      <SphnHeader
        subtitle="Available Tests"
        rightSlot={
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => navigate("/admin")}
              >
                Admin Panel
              </Button>
            )}
            {username && (
              <span className="text-xs text-white/80 hidden sm:inline">
                {username}
              </span>
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

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <h1 className="text-xl font-semibold mb-1">Available Tests</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a test from the list below to view instructions and begin.
        </p>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading tests...</div>
        ) : !profile?.is_approved ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Waiting for Approval</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Your account for <span className="font-semibold text-slate-700">{profile?.college}</span> is pending approval. 
              Once an admin approves your profile, you will see your available tests here.
            </p>
            <div className="pt-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Status
              </Button>
            </div>
          </Card>
        ) : exams.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No active tests available right now. Please check back later.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {exams.map((e) => (
              <Card
                key={e.id}
                className="p-4 flex items-start justify-between gap-4 hover-elevate"
              >
                <div className="min-w-0">
                  <div className="font-semibold mb-1">{e.title}</div>
                  {e.description && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {e.description}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Duration: {e.duration_minutes} min</span>
                    <span>Max violations: {e.max_violations}</span>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/instructions/${e.id}`)}
                  className="bg-[#0ea5e9] hover:bg-[#0284c7] shrink-0"
                  data-testid={`button-start-${e.id}`}
                >
                  Start Test
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-slate-800 text-white/70 text-center text-[11px] py-2">
        Version 17.05.21 &middot; Sphoorthy Engineering College Online
        Assessment Portal
      </footer>
    </div>
  );
}
