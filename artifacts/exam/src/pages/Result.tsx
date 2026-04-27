import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import type { ExamSubmissionRow, ExamQuestion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import sphnLogo from "@assets/image_1777100399723.png";
import { signOut } from "@/lib/firebase";

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
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-sm text-slate-500">Loading result...</div>
      </div>
    );
  }
  if (!sub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-sm text-slate-500">Submission not found.</div>
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

  const correctCount = questions.filter((q) => answersObj[q.id] && answersObj[q.id] === q.correct_answer).length;
  const wrongCount = questions.filter((q) => answersObj[q.id] && answersObj[q.id] !== q.correct_answer).length;
  const unansweredCount = questions.length - correctCount - wrongCount;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a8a] text-white px-4 py-5 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-white flex items-center justify-center p-1 mb-3 shadow-md">
          <img src={sphnLogo} alt="" className="w-full h-full object-contain" />
        </div>
        <div className="text-base font-bold">Test Submitted!</div>
        <div className="text-sm text-white/70 mt-0.5">
          {sub.exam_title ?? "Examination"} · {sub.student_name ?? "Candidate"}
        </div>
      </div>

      <main className="flex-1 px-4 py-5 max-w-xl w-full mx-auto">
        {/* Score card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4 text-center">
          <div className="text-5xl font-black text-[#1e3a8a] mb-1">
            {score}<span className="text-2xl text-slate-400 font-medium">/{total}</span>
          </div>
          <div className="text-sm text-slate-500 mb-4">
            {percentage.toFixed(1)}% · {timeMin}m {timeSec}s
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-green-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-green-700">{correctCount}</div>
              <div className="text-xs text-green-600 font-medium">Correct</div>
            </div>
            <div className="bg-red-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-red-700">{wrongCount}</div>
              <div className="text-xs text-red-600 font-medium">Wrong</div>
            </div>
            <div className="bg-slate-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-slate-600">{unansweredCount}</div>
              <div className="text-xs text-slate-500 font-medium">Skipped</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#1e3a8a] to-[#0ea5e9] rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex flex-col gap-2">
            {questions.length > 0 && (
              <Button
                onClick={() => setShowAnswers((v) => !v)}
                variant="outline"
                className="w-full h-11 rounded-xl font-semibold"
              >
                {showAnswers ? "Hide Answer Review" : "View Answer Review"}
              </Button>
            )}
            <Button
              onClick={async () => {
                sessionStorage.removeItem("exam:session");
                await signOut();
                navigate("/");
              }}
              className="w-full h-11 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold"
            >
              Logout & Exit
            </Button>
          </div>
        </div>

        {/* Meta info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 mb-4">
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <div className="text-slate-400">Student</div>
            <div className="text-slate-700 font-medium text-right">{sub.student_name}</div>
            <div className="text-slate-400">Roll No.</div>
            <div className="text-slate-700 font-medium text-right">{sub.roll_number}</div>
            <div className="text-slate-400">Attempted</div>
            <div className="text-slate-700 font-medium text-right">{attempted} / {questions.length}</div>
            <div className="text-slate-400">Submitted At</div>
            <div className="text-slate-700 font-medium text-right text-[11px]">
              {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "—"}
            </div>
          </div>
        </div>

        {/* Answer review */}
        {showAnswers && questions.length > 0 && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-slate-800">Answer Review</h2>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" />{correctCount} correct</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" />{wrongCount} wrong</span>
              </div>
            </div>
            {questions.map((q, i) => {
              const userAns = answersObj[q.id] ?? "";
              const isCorrect = userAns && userAns === q.correct_answer;
              const isWrong = userAns && !isCorrect;
              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm ${
                    isCorrect ? "border-green-300" : isWrong ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Q{i + 1} · {q.marks} mark{q.marks === 1 ? "" : "s"}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCorrect ? "bg-green-100 text-green-700" : isWrong ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {isCorrect ? "✓ Correct" : isWrong ? "✗ Wrong" : "Skipped"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-800 mb-3 whitespace-pre-wrap leading-relaxed">{q.question}</div>
                  <div className="space-y-1.5">
                    {(q.options ?? []).map((opt, idx) => {
                      const letter = "ABCD"[idx] ?? String(idx + 1);
                      const isOptCorrect = opt === q.correct_answer;
                      const isOptUser = opt === userAns;
                      return (
                        <div
                          key={idx}
                          className={`text-sm px-3 py-2.5 rounded-xl border flex items-center gap-2 ${
                            isOptCorrect ? "border-green-400 bg-green-50" :
                            isOptUser ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <span className="font-bold text-slate-500 w-5 shrink-0">{letter}.</span>
                          <span className="flex-1 text-slate-700">{opt}</span>
                          {isOptCorrect && <span className="text-[10px] font-bold text-green-700 shrink-0">✓ Correct</span>}
                          {isOptUser && !isOptCorrect && <span className="text-[10px] font-bold text-red-700 shrink-0">Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                  {!userAns && <div className="mt-2 text-xs text-slate-400 italic">Not answered.</div>}
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[10px] text-center text-slate-400 pb-4">
          Submission ID: <span className="font-mono">{sub.id}</span>
        </div>
      </main>
    </div>
  );
}
