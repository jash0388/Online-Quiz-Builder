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
  const { loading: authLoading, user } = useAuth();
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
          "id,title,description,duration_minutes,max_violations,is_active,created_at",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (err) setError(err.message);
      setExams((data ?? []) as Exam[]);
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
