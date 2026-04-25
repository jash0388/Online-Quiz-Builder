import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { ExamQuestion, ExamSession, QStatus } from "@/lib/types";
import Timer from "@/components/Timer";
import QuestionPalette from "@/components/QuestionPalette";
import SphnWatermark from "@/components/SphnWatermark";
import { Button } from "@/components/ui/button";
import sphnLogo from "@assets/image_1777100399723.png";
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

// --- Seeded Shuffle Logic ---
function createPRNG(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }

  return function () {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(array: T[], prng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function shuffleOptions(q: ExamQuestion, prng: () => number): ExamQuestion {
  if (!q.options || q.options.length === 0) return q;

  // Create an array of indices [0, 1, 2, 3]
  const indices = Array.from({ length: q.options.length }, (_, i) => i);
  // Shuffle the indices
  const shuffledIndices = shuffleArray(indices, prng);

  const newOptions = shuffledIndices.map((i) => q.options![i]!);
  const newOptionsTe = q.options_te
    ? shuffledIndices.map((i) => q.options_te![i]!)
    : undefined;

  return {
    ...q,
    options: newOptions,
    options_te: newOptionsTe,
  };
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
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
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
      // Seeded random based on userId
      const prng = createPRNG(s.userId);

      // 1. Shuffle options for every question first
      let shuffledQs = qs.map((q) => {
        const normalized = {
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
          options_te: Array.isArray(q.options_te) ? q.options_te : undefined,
        };
        return shuffleOptions(normalized as ExamQuestion, prng);
      });

      // 2. Group by subject and shuffle within groups
      const groups: Record<string, ExamQuestion[]> = {};
      const subjectOrder: string[] = [];

      shuffledQs.forEach((q) => {
        const sub = q.subject || "General";
        if (!groups[sub]) {
          groups[sub] = [];
          subjectOrder.push(sub);
        }
        groups[sub].push(q);
      });

      // Shuffle within each group
      subjectOrder.forEach((sub) => {
        groups[sub] = shuffleArray(groups[sub]!, prng);
      });

      // Flatten back to single array
      const finalQs: ExamQuestion[] = [];
      subjectOrder.forEach((sub) => {
        finalQs.push(...groups[sub]!);
      });

      setQuestions(finalQs);

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
          restored = true;
        } catch {
          /* fall through */
        }
      }
      if (!restored) {
        setEndsAt(Date.now() + s.duration * 60 * 1000);
        setStartedAt(Date.now());
        if (finalQs.length > 0) {
          setCurrentQId(finalQs[0]!.id);
          setStatusMap({ [finalQs[0]!.id]: "not-answered" });
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
        }),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [answers, statusMap, endsAt, currentQId, startedAt, session]);

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
          violations: 0,
          time_used_seconds: timeUsed,
          status: "completed",
          submitted_at: new Date().toISOString(),
          exam_title: s.examTitle,
        })
        .select()
        .single();
      if (error) throw error;

      localStorage.removeItem(`exam:state:${s.examId}:${s.userId}`);
      // sessionStorage.removeItem("exam:session"); // Keep session so we can still show candidate info
      setIsFinished(true);
      setSubmitting(false);
      
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
  }, [answers, questions, startedAt, navigate]);

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
      {/* College header */}
      <header className="bg-[#1e3a8a] text-white border-b-4 border-[#0ea5e9]">
        <div className="px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shrink-0 shadow overflow-hidden p-0.5">
              <img
                src={sphnLogo}
                alt="Sphoorthy Engineering College"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base leading-tight truncate">
                Sphoorthy Engineering College
              </div>
              <div className="text-[11px] text-white/80 truncate">
                {session.examTitle} · {session.candidate.student_name} ·{" "}
                {session.candidate.roll_number}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isFinished && <Timer endsAt={endsAt} onExpire={() => handleSubmit()} />}
          </div>
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
            <div className="text-sm font-semibold flex items-center gap-2">
              {isFinished && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-amber-200">
                  Review Mode
                </span>
              )}
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

          <div className="relative flex-1 overflow-y-auto px-6 py-5">
            <SphnWatermark />
            <div className="relative z-10">
              <div className="text-base leading-relaxed mb-2 whitespace-pre-wrap">
                {currentQuestion.question}
              </div>
              {currentQuestion.question_te && (
                <div className="text-base leading-relaxed mb-6 whitespace-pre-wrap text-slate-700">
                  {currentQuestion.question_te}
                </div>
              )}
              {!currentQuestion.question_te && <div className="mb-6" />}
              <div className="space-y-3 max-w-2xl">
                {(currentQuestion.options ?? []).map((opt, idx) => {
                  const userSelected = answers[currentQuestion.id] === opt;
                  const isCorrect = currentQuestion.correct_answer === opt;
                  const optTe = currentQuestion.options_te?.[idx];

                  let borderColor = "border-border";
                  let bgColor = "bg-white/85";

                  if (isFinished) {
                    if (isCorrect) {
                      borderColor = "border-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.5)]";
                      bgColor = "bg-green-50/90";
                    } else if (userSelected) {
                      borderColor = "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]";
                      bgColor = "bg-red-50/90";
                    }
                  } else if (userSelected) {
                    borderColor = "border-primary";
                    bgColor = "bg-accent/85";
                  }

                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 px-4 py-3 border rounded cursor-pointer hover-elevate backdrop-blur-[1px] transition-all ${borderColor} ${bgColor}`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQuestion.id}`}
                        checked={userSelected}
                        onChange={() => !isFinished && setSelected(opt)}
                        disabled={isFinished}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <span className="font-semibold mr-2">
                          {letterFor(idx)}.
                        </span>
                        {opt}
                        {isFinished && isCorrect && (
                          <span className="ml-2 text-xs font-bold text-green-700 uppercase tracking-wider">
                            ✓ Correct Answer
                          </span>
                        )}
                        {isFinished && userSelected && !isCorrect && (
                          <span className="ml-2 text-xs font-bold text-red-700 uppercase tracking-wider">
                            ✗ Your Choice
                          </span>
                        )}
                        {optTe && (
                          <span className="block text-slate-700 mt-0.5">
                            {optTe}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="border-t border-border px-4 py-3 bg-[#f8fafc] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {!isFinished ? (
                <>
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
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    const idx = currentIndex;
                    if (idx > 0) jumpTo(questions[idx - 1]!.id);
                  }}
                  variant="outline"
                  disabled={currentIndex === 0}
                >
                  Previous Question
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {!isFinished ? (
                <Button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="bg-primary hover:bg-primary/90"
                >
                  Save & Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    const idx = currentIndex;
                    if (idx < questions.length - 1) jumpTo(questions[idx + 1]!.id);
                  }}
                  className="bg-primary hover:bg-primary/90"
                  disabled={currentIndex === questions.length - 1}
                >
                  Next Question
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Right palette */}
        <aside className="w-[320px] bg-[#f1f5f9] border-l border-border flex flex-col">
          <div className="px-4 py-2 bg-white border-b border-border">
            <div className="text-xs font-semibold mb-2">{session.candidate.student_name}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              {isFinished ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="legend-chip qp-correct" />
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="legend-chip qp-incorrect" />
                    <span>Incorrect</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-100 mt-1">
                    <div className="font-semibold text-slate-700">
                      Score: {JSON.parse(sessionStorage.getItem("exam:lastResult") || "{}").score} / {JSON.parse(sessionStorage.getItem("exam:lastResult") || "{}").total}
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
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
              isFinished={isFinished}
              answers={answers}
            />
          </div>

          <div className="p-3 border-t border-border bg-white">
            {!isFinished ? (
              <Button
                type="button"
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  sessionStorage.clear();
                  navigate("/");
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Logout & Exit
              </Button>
            )}
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
    </div>
  );
}
