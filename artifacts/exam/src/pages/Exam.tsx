import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { ExamQuestion, ExamSession, QStatus } from "@/lib/types";
import Timer from "@/components/Timer";
import QuestionPalette from "@/components/QuestionPalette";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function letterFor(idx: number) {
  return String.fromCharCode(65 + idx); // A, B, C, D...
}

export default function Exam() {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQId, setCurrentQId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, QStatus>>({});
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const submitGuard = useRef(false);
  const sessionRef = useRef<ExamSession | null>(null);

  // Load session + questions
  useEffect(() => {
    const raw = sessionStorage.getItem("exam:session");
    if (!raw) {
      navigate("/");
      return;
    }
    const s = JSON.parse(raw) as ExamSession;
    setSession(s);
    sessionRef.current = s;

    (async () => {
      const { data } = await supabase
        .from("exam_questions")
        .select("*")
        .eq("exam_id", s.examId)
        .order("sort_order");
      const qs = (data ?? []) as ExamQuestion[];
      // Normalize options - they're stored as text[] in some seeds and string[] in jsonb
      const normalized = qs.map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      }));
      setQuestions(normalized);

      // Restore in-progress state
      const saveKey = `exam:state:${s.examId}:${s.userId}`;
      const saved = localStorage.getItem(saveKey);
      let restored = false;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.answers) setAnswers(parsed.answers);
          if (parsed.statusMap) setStatusMap(parsed.statusMap);
          if (parsed.endsAt) setEndsAt(parsed.endsAt);
          if (parsed.currentQId) setCurrentQId(parsed.currentQId);
          if (parsed.startedAt) setStartedAt(parsed.startedAt);
          if (typeof parsed.violations === "number")
            setViolations(parsed.violations);
          restored = true;
        } catch {
          /* fall through */
        }
      }
      if (!restored) {
        setEndsAt(Date.now() + s.duration * 60 * 1000);
        setStartedAt(Date.now());
        if (normalized.length > 0) {
          setCurrentQId(normalized[0]!.id);
          setStatusMap({ [normalized[0]!.id]: "not-answered" });
        }
      }
    })();
  }, [navigate]);

  // Persist state (debounced to avoid hammering localStorage with every state change)
  useEffect(() => {
    if (!session || !endsAt) return;
    const t = setTimeout(() => {
      localStorage.setItem(
        `exam:state:${session.examId}:${session.userId}`,
        JSON.stringify({
          answers,
          statusMap,
          endsAt,
          currentQId,
          startedAt,
          violations,
        }),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [answers, statusMap, endsAt, currentQId, startedAt, violations, session]);

  // Violation tracking - tab switches & visibility changes
  const handleSubmitRef = useRef<() => void>(() => {});

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden" && sessionRef.current) {
        setViolations((v) => {
          const next = v + 1;
          if (next > sessionRef.current!.maxViolations) {
            // auto-submit
            handleSubmitRef.current();
          } else {
            setShowViolationDialog(true);
          }
          return next;
        });
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Block right-click and copy on the test page
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
    };
  }, []);

  const currentQuestion = useMemo(
    () => questions.find((q) => q.id === currentQId) ?? null,
    [questions, currentQId],
  );

  const currentIndex = useMemo(
    () => (currentQuestion ? questions.findIndex((q) => q.id === currentQuestion.id) : -1),
    [questions, currentQuestion],
  );

  // Subject grouping (Mathematics / Physics / Chemistry style sections).
  // Falls back gracefully when no subjects are set on the questions.
  const subjects = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const q of questions) {
      const s = (q.subject ?? "").trim();
      if (!s) continue;
      if (!seen.has(s)) {
        seen.add(s);
        order.push(s);
      }
    }
    return order;
  }, [questions]);

  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Whichever question is currently active determines which subject tab is highlighted.
  useEffect(() => {
    if (subjects.length === 0) {
      setActiveSubject(null);
      return;
    }
    const subjectOfCurrent = (currentQuestion?.subject ?? "").trim();
    if (subjectOfCurrent && subjects.includes(subjectOfCurrent)) {
      setActiveSubject(subjectOfCurrent);
    } else if (!activeSubject) {
      setActiveSubject(subjects[0]!);
    }
  }, [subjects, currentQuestion, activeSubject]);

  const subjectCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of subjects) map[s] = 0;
    for (const q of questions) {
      const s = (q.subject ?? "").trim();
      if (s && map[s] !== undefined) map[s]!++;
    }
    return map;
  }, [questions, subjects]);

  const visibleQuestions = useMemo(() => {
    if (!activeSubject) return questions;
    return questions.filter((q) => (q.subject ?? "").trim() === activeSubject);
  }, [questions, activeSubject]);

  function switchSubject(subject: string) {
    setActiveSubject(subject);
    const first = questions.find(
      (q) => (q.subject ?? "").trim() === subject,
    );
    if (first) jumpTo(first.id);
  }

  function setSelected(opt: string) {
    if (!currentQuestion) return;
    setAnswers((a) => ({ ...a, [currentQuestion.id]: opt }));
  }

  function markVisited(qId: string) {
    setStatusMap((m) => (m[qId] ? m : { ...m, [qId]: "not-answered" }));
  }

  function jumpTo(qId: string) {
    setCurrentQId(qId);
    markVisited(qId);
  }

  function nextQuestion(): string | null {
    if (!currentQuestion) return null;
    // Advance within the visible (subject-filtered) list when a subject tab is selected,
    // so "Save & Next" stays inside Mathematics/Physics/Chemistry instead of jumping out.
    const scope = visibleQuestions.length > 0 ? visibleQuestions : questions;
    const idx = scope.findIndex((q) => q.id === currentQuestion.id);
    if (idx < 0) return null;
    if (idx < scope.length - 1) return scope[idx + 1]!.id;
    return null;
  }

  function handleSaveAndNext() {
    if (!currentQuestion) return;
    const selected = answers[currentQuestion.id];
    setStatusMap((m) => ({
      ...m,
      [currentQuestion.id]: selected ? "answered" : "not-answered",
    }));
    const next = nextQuestion();
    if (next) jumpTo(next);
  }

  function handleMarkForReview() {
    if (!currentQuestion) return;
    const selected = answers[currentQuestion.id];
    setStatusMap((m) => ({
      ...m,
      [currentQuestion.id]: selected ? "answered-marked" : "marked",
    }));
    const next = nextQuestion();
    if (next) jumpTo(next);
  }

  function handleClearResponse() {
    if (!currentQuestion) return;
    setAnswers((a) => {
      const copy = { ...a };
      delete copy[currentQuestion.id];
      return copy;
    });
    setStatusMap((m) => ({ ...m, [currentQuestion.id]: "not-answered" }));
  }

  const handleSubmit = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || submitGuard.current) return;
    submitGuard.current = true;
    setSubmitting(true);
    try {
      let score = 0;
      let total = 0;
      let attempted = 0;
      let correct = 0;
      for (const q of questions) {
        total += Number(q.marks);
        const ans = answers[q.id];
        if (ans !== undefined && ans !== "") {
          attempted++;
          if (ans === q.correct_answer) {
            score += Number(q.marks);
            correct++;
          }
        }
      }
      const timeUsed = Math.floor((Date.now() - startedAt) / 1000);
      const studentAnswers = {
        __candidate__: s.candidate,
        ...answers,
      };

      const { data, error } = await supabase
        .from("exam_submissions")
        .insert({
          exam_id: s.examId,
          user_id: s.userId,
          student_name: s.candidate.student_name,
          roll_number: s.candidate.roll_number,
          student_phone: s.candidate.student_phone,
          father_name: s.candidate.father_name,
          father_phone: s.candidate.father_phone,
          answers,
          student_answers: studentAnswers,
          score,
          total_marks: total,
          violations,
          time_used_seconds: timeUsed,
          status: "completed",
          submitted_at: new Date().toISOString(),
          exam_title: s.examTitle,
        })
        .select()
        .single();
      if (error) throw error;

      localStorage.removeItem(`exam:state:${s.examId}:${s.userId}`);
      sessionStorage.removeItem("exam:session");
      navigate(`/result/${data.id}`);
      // also surface result statistics for the result page in case fetch is slow
      sessionStorage.setItem(
        "exam:lastResult",
        JSON.stringify({
          score,
          total,
          attempted,
          correct,
          wrong: attempted - correct,
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Submission failed: " + msg);
      submitGuard.current = false;
      setSubmitting(false);
    }
  }, [answers, questions, startedAt, violations, navigate]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Counts for the legend / palette — scoped to the active subject when one is selected,
  // otherwise across all questions.
  const counts = useMemo(() => {
    const c = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 };
    const scope = visibleQuestions;
    for (const q of scope) {
      const s = statusMap[q.id] ?? "not-visited";
      if (s === "answered") c.answered++;
      else if (s === "not-answered") c.notAnswered++;
      else if (s === "marked") c.marked++;
      else if (s === "answered-marked") c.answeredMarked++;
      else c.notVisited++;
    }
    return c;
  }, [visibleQuestions, statusMap]);

  if (!session || !endsAt || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef5]">
        <div className="text-sm text-muted-foreground">
          {questions.length === 0 && session
            ? "No questions found for this test."
            : "Loading test..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#e8eef5]">
      {/* Top bar */}
      <header className="bg-white border-b border-border px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
            OA
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{session.examTitle}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {session.candidate.student_name} · Roll {session.candidate.roll_number}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-muted-foreground">
            Violations:{" "}
            <span className={violations > 0 ? "font-semibold text-red-600" : "font-semibold"}>
              {violations}/{session.maxViolations}
            </span>
          </div>
          <Timer endsAt={endsAt} onExpire={() => handleSubmit()} />
        </div>
      </header>

      {/* Subject sections (Mathematics / Physics / Chemistry) */}
      {subjects.length > 0 && (
        <div className="bg-white border-b border-border px-3 pt-2 flex items-end gap-1 overflow-x-auto">
          {subjects.map((s) => {
            const isActive = activeSubject === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => switchSubject(s)}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${
                  isActive
                    ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                    : "bg-[#f1f5f9] text-slate-700 border-border hover:bg-slate-200"
                }`}
              >
                {s}{" "}
                <span
                  className={`ml-1 text-[11px] ${
                    isActive ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  ({subjectCounts[s] ?? 0})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Question pane */}
        <section className="flex-1 flex flex-col bg-white border-r border-border min-w-0">
          <div className="px-6 py-3 border-b border-border bg-[#f8fafc] flex items-center justify-between">
            <div className="text-sm font-semibold">
              Question No. {currentIndex + 1}{" "}
              <span className="text-muted-foreground font-normal">of {questions.length}</span>
              {activeSubject && (
                <span className="ml-3 text-xs text-muted-foreground font-normal">
                  Section: <span className="text-slate-700 font-medium">{activeSubject}</span>
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Marks: <span className="text-green-700 font-semibold">+{currentQuestion.marks}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="text-base leading-relaxed mb-6 whitespace-pre-wrap">
              {currentQuestion.question}
            </div>
            <div className="space-y-3 max-w-2xl">
              {(currentQuestion.options ?? []).map((opt, idx) => {
                const checked = answers[currentQuestion.id] === opt;
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 px-4 py-3 border rounded cursor-pointer hover-elevate ${
                      checked ? "border-primary bg-accent" : "border-border bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestion.id}`}
                      checked={checked}
                      onChange={() => setSelected(opt)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <span className="font-semibold mr-2">{letterFor(idx)}.</span>
                      {opt}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action bar */}
          <div className="border-t border-border px-4 py-3 bg-[#f8fafc] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleMarkForReview}
                variant="outline"
                className="border-purple-400 text-purple-700 hover:bg-purple-50"
              >
                Mark for Review & Next
              </Button>
              <Button type="button" onClick={handleClearResponse} variant="outline">
                Clear Response
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSaveAndNext}
                className="bg-primary hover:bg-primary/90"
              >
                Save & Next
              </Button>
            </div>
          </div>
        </section>

        {/* Right palette */}
        <aside className="w-[320px] bg-[#f1f5f9] border-l border-border flex flex-col">
          <div className="px-4 py-2 bg-white border-b border-border">
            <div className="text-xs font-semibold mb-2">{session.candidate.student_name}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="legend-chip qp-answered" />
                <span>Answered ({counts.answered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="legend-chip qp-not-answered" />
                <span>Not Answered ({counts.notAnswered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="legend-chip qp-not-visited" />
                <span>Not Visited ({counts.notVisited})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="legend-chip qp-marked" />
                <span>Marked ({counts.marked})</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className="legend-chip qp-answered-marked" />
                <span>
                  Answered & Marked for Review ({counts.answeredMarked})
                  <br />
                  <em className="text-[10px] text-muted-foreground">
                    (will be considered for evaluation)
                  </em>
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 border-b border-border bg-[#1e3a8a] text-white text-xs font-semibold">
            Question Palette
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <QuestionPalette
              questions={visibleQuestions}
              allQuestions={questions}
              currentId={currentQuestion.id}
              statusMap={statusMap}
              onJump={jumpTo}
            />
          </div>

          <div className="p-3 border-t border-border bg-white">
            <Button
              type="button"
              onClick={() => setShowSubmitDialog(true)}
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </aside>
      </main>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <div>Total Questions: {questions.length}</div>
                <div>Answered: {counts.answered + counts.answeredMarked}</div>
                <div>Not Answered: {counts.notAnswered}</div>
                <div>Not Visited: {counts.notVisited}</div>
                <div>Marked for Review: {counts.marked}</div>
                <div className="pt-2">
                  Are you sure you want to submit? You cannot change your
                  answers after submission.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              No, Continue Test
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showViolationDialog} onOpenChange={setShowViolationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Violation Detected</AlertDialogTitle>
            <AlertDialogDescription>
              You have switched away from the test window. This is recorded as
              a violation ({violations}/{session.maxViolations}). If you exceed
              the maximum allowed violations, your test will be auto-submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>I Understand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
