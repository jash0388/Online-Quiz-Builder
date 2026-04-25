import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import type { ExamSubmissionRow } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Result() {
  const params = useParams<{ submissionId: string }>();
  const [, navigate] = useLocation();
  const [sub, setSub] = useState<ExamSubmissionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("exam_submissions")
        .select("*")
        .eq("id", params.submissionId)
        .single();
      if (!error && data) setSub(data as ExamSubmissionRow);
      setLoading(false);
    })();
  }, [params.submissionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef5]">
        <div className="text-sm text-muted-foreground">Loading result...</div>
      </div>
    );
  }
  if (!sub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef5]">
        <div className="text-sm">Submission not found.</div>
      </div>
    );
  }

  const total = sub.total_marks ?? 0;
  const score = sub.score ?? 0;
  const percentage = total > 0 ? Math.max(0, (score / total) * 100) : 0;
  const answersObj = sub.answers ?? {};
  const attempted = Object.keys(answersObj).filter(
    (k) => k !== "__candidate__" && answersObj[k] != null && answersObj[k] !== "",
  ).length;
  const timeMin = Math.floor((sub.time_used_seconds ?? 0) / 60);
  const timeSec = (sub.time_used_seconds ?? 0) % 60;

  return (
    <div className="min-h-screen flex flex-col bg-[#e8eef5]">
      <header className="bg-white border-b border-border px-6 py-3">
        <div className="font-semibold">Test Submitted Successfully</div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6">
        <Card className="p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold mb-1">
              Thank you, {sub.student_name ?? "Candidate"}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Your responses have been recorded for{" "}
              <span className="font-medium">{sub.exam_title ?? "this test"}</span>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Stat label="Score" value={`${score} / ${total}`} accent="primary" />
            <Stat label="Percentage" value={`${percentage.toFixed(2)}%`} />
            <Stat label="Attempted" value={String(attempted)} />
            <Stat
              label="Violations"
              value={String(sub.violations ?? 0)}
              accent={sub.violations && sub.violations > 0 ? "red" : undefined}
            />
            <Stat
              label="Time Used"
              value={`${timeMin}m ${timeSec}s`}
              small
            />
            <Stat
              label="Submitted At"
              value={
                sub.submitted_at
                  ? new Date(sub.submitted_at).toLocaleString()
                  : "—"
              }
              small
            />
          </div>

          <div className="flex justify-center">
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Tests
            </Button>
          </div>
        </Card>

        <div className="mt-4 text-xs text-center text-muted-foreground">
          Submission ID: <span className="font-mono">{sub.id}</span>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: "primary" | "green" | "red";
  small?: boolean;
}) {
  const color =
    accent === "primary"
      ? "text-primary"
      : accent === "green"
        ? "text-green-700"
        : accent === "red"
          ? "text-red-700"
          : "text-foreground";
  return (
    <div className="border border-border rounded p-4 bg-white">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-semibold ${color} ${small ? "text-sm" : "text-lg"}`}>
        {value}
      </div>
    </div>
  );
}
