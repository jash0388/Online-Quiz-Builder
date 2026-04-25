import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import type { ExamSubmissionRow, ExamQuestion } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import sphnLogo from "@assets/image_1777100399723.png";

export default function Result() {
  const params = useParams<{ submissionId: string }>();
  const [, navigate] = useLocation();
  const [sub, setSub] = useState<ExamSubmissionRow | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("exam_submissions")
        .select("*")
        .eq("id", params.submissionId)
        .single();
      if (!error && data) {
        const submission = data as ExamSubmissionRow;
        setSub(submission);
        if (submission.exam_id) {
          const { data: qs } = await supabase
            .from("exam_questions")
            .select("*")
            .eq("exam_id", submission.exam_id)
            .order("sort_order");
          setQuestions((qs ?? []) as ExamQuestion[]);
        }
      }
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
  const answersObj = (sub.answers ?? {}) as Record<string, string>;
  const attempted = Object.keys(answersObj).filter(
    (k) => k !== "__candidate__" && answersObj[k] != null && answersObj[k] !== "",
  ).length;
  const timeMin = Math.floor((sub.time_used_seconds ?? 0) / 60);
  const timeSec = (sub.time_used_seconds ?? 0) % 60;

  const correctCount = questions.filter(
    (q) => answersObj[q.id] && answersObj[q.id] === q.correct_answer,
  ).length;
  const wrongCount = questions.filter(
    (q) => answersObj[q.id] && answersObj[q.id] !== q.correct_answer,
  ).length;
  const unansweredCount = questions.length - correctCount - wrongCount;

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
            <Stat label="Time Used" value={`${timeMin}m ${timeSec}s`} small />
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

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {questions.length > 0 && (
              <Button
                onClick={() => setShowAnswers((v) => !v)}
                className="bg-primary hover:bg-primary/90"
              >
                {showAnswers ? "Hide Correct Answers" : "View Correct Answers"}
              </Button>
            )}
            <Button
              onClick={() => {
                sessionStorage.removeItem("exam:auth");
                sessionStorage.removeItem("exam:session");
                navigate("/");
              }}
              variant="outline"
            >
              Logout
            </Button>
          </div>
        </Card>

        {showAnswers && questions.length > 0 && (
          <Card className="p-6 mt-4 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold">Answer Review</h2>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
                  Correct: {correctCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                  Wrong: {wrongCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
                  Unanswered: {unansweredCount}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, i) => {
                const userAns = answersObj[q.id] ?? "";
                const isCorrect = userAns && userAns === q.correct_answer;
                const isWrong = userAns && !isCorrect;
                return (
                  <div
                    key={q.id}
                    className={`border rounded-lg p-4 bg-white ${
                      isCorrect
                        ? "border-green-300"
                        : isWrong
                          ? "border-red-300"
                          : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Question {i + 1} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          isCorrect
                            ? "bg-green-100 text-green-700"
                            : isWrong
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isCorrect ? "Correct" : isWrong ? "Wrong" : "Not Answered"}
                      </span>
                    </div>
                    <div className="text-sm mb-3 whitespace-pre-wrap">
                      {q.question}
                    </div>
                    <div className="space-y-1.5">
                      {(q.options ?? []).map((opt, idx) => {
                        const letter = "ABCD"[idx] ?? String(idx + 1);
                        const isOptCorrect = opt === q.correct_answer;
                        const isOptUser = opt === userAns;
                        return (
                          <div
                            key={idx}
                            className={`text-sm px-3 py-2 rounded border flex items-start gap-2 ${
                              isOptCorrect
                                ? "border-green-400 bg-green-50"
                                : isOptUser
                                  ? "border-red-400 bg-red-50"
                                  : "border-border bg-white"
                            }`}
                          >
                            <span className="font-semibold w-5 shrink-0">
                              {letter}.
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isOptCorrect && (
                              <span className="text-[11px] font-semibold text-green-700 shrink-0">
                                Correct Answer
                              </span>
                            )}
                            {isOptUser && !isOptCorrect && (
                              <span className="text-[11px] font-semibold text-red-700 shrink-0">
                                Your Answer
                              </span>
                            )}
                            {isOptUser && isOptCorrect && (
                              <span className="text-[11px] font-semibold text-green-700 shrink-0">
                                Your Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {!userAns && (
                      <div className="mt-2 text-xs text-muted-foreground italic">
                        You did not answer this question.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="mt-4 text-xs text-center text-muted-foreground">
          Submission ID: <span className="font-mono">{sub.id}</span>
        </div>

        <div className="mt-10 mb-6 flex flex-col items-center gap-2">
          <img
            src={sphnLogo}
            alt="Sphoorthy Engineering College"
            className="h-32 w-auto object-contain"
          />
          <div className="text-xs text-muted-foreground text-center">
            Sphoorthy Engineering College &middot; Online Examination Portal
          </div>
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
