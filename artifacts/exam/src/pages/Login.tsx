import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Exam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Login() {
  const [, navigate] = useLocation();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#e8eef5]">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-white font-bold">
            OA
          </div>
          <div>
            <div className="font-semibold text-base leading-tight">
              Online Assessment
            </div>
            <div className="text-xs text-muted-foreground">
              Select a test to begin
            </div>
          </div>
        </div>
        <a
          href="admin"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Admin
        </a>
      </header>

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
                  className="bg-primary hover:bg-primary/90 shrink-0"
                >
                  Start Test
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-border py-2 text-center text-xs text-muted-foreground">
        Version 1.0 &middot; Online Assessment Platform
      </footer>
    </div>
  );
}
