import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { ExamQuestion, ExamSession, QStatus } from "@/lib/types";
import Timer from "@/components/Timer";
import QuestionPalette from "@/components/QuestionPalette";
import SphnWatermark from "@/components/SphnWatermark";
import { Button } from "@/components/ui/button";
import sphnLogo from "@assets/image_1777100399723.png";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

function letterFor(idx: number) {
  return String.fromCharCode(65 + idx);
}

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
  const indices = Array.from({ length: q.options.length }, (_, i) => i);
  const shuffledIndices = shuffleArray(indices, prng);
  const newOptions = shuffledIndices.map((i) => q.options![i]!);
  const newOptionsTe = q.options_te
    ? shuffledIndices.map((i) => q.options_te![i]!)
    : undefined;
  return { ...q, options: newOptions, options_te: newOptionsTe };
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const submitGuard = useRef(false);
  const sessionRef = useRef<ExamSession | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("exam:session");
    if (!raw) { navigate("/"); return; }
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
      const prng = createPRNG(s.userId);
      let shuffledQs = qs.map((q) => {
        const normalized = {
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
          options_te: Array.isArray(q.options_te) ? q.options_te : undefined,
        };
        return shuffleOptions(normalized as ExamQuestion, prng);
      });

      const groups: Record<string, ExamQuestion[]> = {};
      const subjectOrder: string[] = [];
      shuffledQs.forEach((q) => {
        const sub = q.subject || "General";
        if (!groups[sub]) { groups[sub] = []; subjectOrder.push(sub); }
        groups[sub].push(q);
      });
      subjectOrder.forEach((sub) => { groups[sub] = shuffleArray(groups[sub]!, prng); });
      const finalQs: ExamQuestion[] = [];
      subjectOrder.forEach((sub) => { finalQs.push(...groups[sub]!); });
      setQuestions(finalQs);

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
        } catch { /* fall through */ }
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

  useEffect(() => {
    if (!session || !endsAt) return;
    const t = setTimeout(() => {
      localStorage.setItem(
        `exam:state:${session.examId}:${session.userId}`,
        JSON.stringify({ answers, statusMap, endsAt, currentQId, startedAt }),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [answers, statusMap, endsAt, currentQId, startedAt, session]);

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
    };
  }, []);

  useEffect(() => {
    if (!session || isFinished) return;
    const enterFullscreen = () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        el.requestFullscreen?.().catch(() => {});
      }
    };
    enterFullscreen();
    const onFsChange = () => {
      if (!document.fullscreenElement && !submitGuard.current) {
        setTimeout(enterFullscreen, 300);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => { document.removeEventListener("fullscreenchange", onFsChange); };
  }, [session, isFinished]);

  useEffect(() => {
    if (isFinished && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [isFinished]);

  const currentQuestion = useMemo(
    () => questions.find((q) => q.id === currentQId) ?? null,
    [questions, currentQId],
  );

  const currentIndex = useMemo(
    () => (currentQuestion ? questions.findIndex((q) => q.id === currentQuestion.id) : -1),
    [questions, currentQuestion],
  );

  const subjects = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const q of questions) {
      const s = (q.subject ?? "").trim();
      if (!s) continue;
      if (!seen.has(s)) { seen.add(s); order.push(s); }
    }
    return order;
  }, [questions]);

  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    if (subjects.length === 0) { setActiveSubject(null); return; }
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
    const first = questions.find((q) => (q.subject ?? "").trim() === subject);
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
    setPaletteOpen(false);
  }

  function nextQuestion(): string | null {
    if (!currentQuestion) return null;
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

  const [resultStats, setResultStats] = useState<{
    score: number; total: number; attempted: number;
    correct: number; wrong: number; notAttempted: number;
  } | null>(null);

  const handleSubmit = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || submitGuard.current) return;
    submitGuard.current = true;
    setSubmitting(true);
    try {
      let score = 0, total = 0, attempted = 0, correct = 0;
      for (const q of questions) {
        total += Number(q.marks);
        const ans = answers[q.id];
        if (ans !== undefined && ans !== "") {
          attempted++;
          if (ans === q.correct_answer) { score += Number(q.marks); correct++; }
        }
      }
      const wrong = attempted - correct;
      const notAttempted = questions.length - attempted;
      const timeUsed = Math.floor((Date.now() - startedAt) / 1000);
      const studentAnswers = { __candidate__: s.candidate, ...answers };

      const { error } = await supabase
        .from("exam_submissions")
        .insert({
          exam_id: s.examId, user_id: s.userId,
          student_name: s.candidate.student_name,
          roll_number: s.candidate.roll_number,
          student_phone: s.candidate.student_phone,
          father_name: s.candidate.father_name,
          father_phone: s.candidate.father_phone,
          answers, student_answers: studentAnswers, score,
          total_marks: total, violations: 0,
          time_used_seconds: timeUsed, status: "completed",
          submitted_at: new Date().toISOString(),
          exam_title: s.examTitle,
        })
        .select()
        .single();
      if (error) throw error;

      localStorage.removeItem(`exam:state:${s.examId}:${s.userId}`);
      const stats = { score, total, attempted, correct, wrong, notAttempted };
      setResultStats(stats);
      sessionStorage.setItem("exam:lastResult", JSON.stringify(stats));
      setIsFinished(true);
      setSubmitting(false);
      setShowSubmitDialog(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setShowSubmitDialog(false);
      setTimeout(() => alert("Submission failed: " + msg), 50);
      submitGuard.current = false;
      setSubmitting(false);
    }
  }, [answers, questions, startedAt, navigate]);

  const counts = useMemo(() => {
    const c = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 };
    for (const q of visibleQuestions) {
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
          {questions.length === 0 && session ? "No questions found for this test." : "Loading test..."}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-[#f0f4f8] overflow-hidden">

        {/* ── TOP HEADER ── */}
        <header className="bg-[#1e3a8a] text-white shrink-0 shadow-lg">
          <div className="px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                <img src={sphnLogo} alt="SPHN" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs leading-tight truncate">Sphoorthy Engineering College</div>
                <div className="text-[10px] text-white/70 truncate">
                  {session.candidate.student_name} · {session.candidate.roll_number}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isFinished && <Timer endsAt={endsAt} onExpire={() => handleSubmit()} />}
              {isFinished && (
                <span className="text-xs font-bold text-[#4ade80] bg-[#4ade80]/20 px-2 py-1 rounded-full">
                  ✓ Submitted
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ── SUBJECT TABS ── */}
        {subjects.length > 0 && (
          <div className="bg-white border-b border-slate-200 px-2 pt-2 flex items-end gap-1 overflow-x-auto no-scrollbar shrink-0">
            {subjects.map((s) => {
              const isActive = activeSubject === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => switchSubject(s)}
                  className={`px-3 py-2 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {s} <span className={`ml-1 text-[10px] ${isActive ? "text-white/70" : "text-slate-400"}`}>({subjectCounts[s] ?? 0})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── RESULT BANNER ── */}
        {isFinished && resultStats && (
          <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a8a] text-white px-4 py-3 shrink-0">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">Score</div>
                <div className="font-bold text-white text-sm">{resultStats.score}/{resultStats.total}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#4ade80] uppercase tracking-wider">Correct</div>
                <div className="font-bold text-[#4ade80] text-sm">{resultStats.correct}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#f87171] uppercase tracking-wider">Wrong</div>
                <div className="font-bold text-[#f87171] text-sm">{resultStats.wrong}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── QUESTION NUMBER BAR ── */}
        {!isFinished && (
          <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Q:</div>
            <div className="flex gap-1 py-0.5">
              {visibleQuestions.map((q) => {
                const status = statusMap[q.id] ?? "not-visited";
                const isCurrent = q.id === currentQId;
                const displayIdx = questions.findIndex((x) => x.id === q.id) + 1;
                let bg = "bg-white border-slate-300 text-slate-600";
                if (status === "answered") bg = "bg-[#16a34a] border-[#16a34a] text-white";
                else if (status === "not-answered") bg = "bg-[#ef4444] border-[#ef4444] text-white";
                else if (status === "marked" || status === "answered-marked") bg = "bg-[#7c3aed] border-[#7c3aed] text-white";
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpTo(q.id)}
                    className={`w-7 h-7 shrink-0 rounded text-xs font-bold border transition-all flex items-center justify-center ${bg} ${isCurrent ? "ring-2 ring-[#0ea5e9] ring-offset-1 scale-110 shadow-md" : ""}`}
                  >
                    {displayIdx}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MAIN QUESTION AREA ── */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {/* Question header */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              {isFinished && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                  Review
                </span>
              )}
              Q{currentIndex + 1}
              <span className="text-slate-400 font-normal text-xs">/ {questions.length}</span>
              {activeSubject && (
                <span className="text-xs text-slate-400 font-normal">{activeSubject}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#15803d] bg-green-50 px-2 py-0.5 rounded-full">
                +{currentQuestion.marks} mark{currentQuestion.marks === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Question content */}
          <div className="relative px-4 py-4">
            <SphnWatermark />
            <div className="relative z-10">
              <div className="text-base font-medium leading-relaxed mb-4 whitespace-pre-wrap text-slate-800">
                {currentQuestion.question}
              </div>
              {currentQuestion.question_image && (
                <div className="mb-4">
                  <img
                    src={currentQuestion.question_image}
                    alt="Question diagram"
                    className="max-w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
                  />
                </div>
              )}
              {currentQuestion.question_te && (
                <div className="text-sm leading-relaxed mb-6 whitespace-pre-wrap text-slate-600 border-t border-slate-100 pt-3">
                  {currentQuestion.question_te}
                </div>
              )}
              {!currentQuestion.question_te && <div className="mb-4" />}

              {/* Options */}
              <div className="space-y-3 pb-4">
                {(currentQuestion.options ?? []).map((opt, idx) => {
                  const userSelected = answers[currentQuestion.id] === opt;
                  const isCorrect = currentQuestion.correct_answer === opt;
                  const optTe = currentQuestion.options_te?.[idx];

                  let borderColor = "border-slate-200";
                  let bgColor = "bg-white";
                  let ringColor = "";

                  if (isFinished) {
                    if (isCorrect) {
                      borderColor = "border-green-400";
                      bgColor = "bg-green-50";
                    } else if (userSelected) {
                      borderColor = "border-red-400";
                      bgColor = "bg-red-50";
                    }
                  } else if (userSelected) {
                    borderColor = "border-[#1e3a8a]";
                    bgColor = "bg-[#eff6ff]";
                    ringColor = "ring-2 ring-[#1e3a8a]/20";
                  }

                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 px-4 py-4 border-2 rounded-2xl cursor-pointer transition-all active:scale-[0.98] shadow-sm ${borderColor} ${bgColor} ${ringColor}`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQuestion.id}`}
                        checked={userSelected}
                        onChange={() => !isFinished && setSelected(opt)}
                        disabled={isFinished}
                        className="w-5 h-5 mt-0.5 accent-[#1e3a8a] shrink-0"
                      />
                      <span className="text-sm leading-relaxed flex-1">
                        <span className="font-bold mr-2 text-slate-700">{letterFor(idx)}.</span>
                        <span className="text-slate-800">{opt}</span>
                        {optTe && (
                          <div className="mt-1 text-slate-500 text-xs whitespace-pre-wrap">{optTe}</div>
                        )}
                        {currentQuestion.option_images?.[String(idx)] && (
                          <img
                            src={currentQuestion.option_images[String(idx)]}
                            alt={`Option ${letterFor(idx)}`}
                            className="max-w-full max-h-28 object-contain mt-2 rounded border border-slate-200 bg-white p-1"
                          />
                        )}
                        {isFinished && isCorrect && (
                          <span className="ml-2 text-xs font-bold text-green-700">✓ Correct</span>
                        )}
                        {isFinished && userSelected && !isCorrect && (
                          <span className="ml-2 text-xs font-bold text-red-700">✗ Your choice</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* ── BOTTOM ACTION BAR ── */}
        <div className="bg-white border-t border-slate-200 px-3 py-3 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          {!isFinished ? (
            <div className="flex flex-col gap-2">
              {/* Top row: secondary actions + palette */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleMarkForReview}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl border-2 border-[#c084fc] text-[#7e22ce] bg-[#faf5ff] active:bg-[#f3e8ff] transition-colors"
                >
                  Mark for Review
                </button>
                <button
                  type="button"
                  onClick={handleClearResponse}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl border-2 border-slate-200 text-slate-600 bg-white active:bg-slate-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="py-2.5 px-3 text-xs font-semibold rounded-xl border-2 border-[#0ea5e9] text-[#0ea5e9] bg-white active:bg-[#f0f9ff] transition-colors"
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    Palette
                  </span>
                </button>
              </div>
              {/* Bottom row: Save & Next + Submit */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="flex-1 h-12 text-sm font-bold rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-md"
                >
                  Save & Next →
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={submitting}
                  className="h-12 px-4 text-sm font-bold rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white shadow-md"
                >
                  Submit
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (currentIndex > 0) jumpTo(questions[currentIndex - 1]!.id);
                }}
                variant="outline"
                disabled={currentIndex === 0}
                className="flex-1 h-12 rounded-xl text-sm font-semibold"
              >
                ← Previous
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (currentIndex < questions.length - 1) jumpTo(questions[currentIndex + 1]!.id);
                }}
                className="flex-1 h-12 rounded-xl text-sm font-semibold bg-[#1e3a8a]"
                disabled={currentIndex === questions.length - 1}
              >
                Next →
              </Button>
              <Button
                type="button"
                onClick={() => { sessionStorage.clear(); navigate("/"); }}
                className="h-12 px-4 rounded-xl text-sm font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                Exit
              </Button>
            </div>
          )}
        </div>

        {/* ── QUESTION PALETTE DRAWER ── */}
        <Drawer open={paletteOpen} onOpenChange={setPaletteOpen}>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader className="pb-2">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-base font-bold text-slate-800">Question Palette</DrawerTitle>
                <DrawerClose asChild>
                  <button className="text-slate-400 hover:text-slate-700 p-1 rounded-full">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </DrawerClose>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="legend-chip qp-answered" />Answered ({counts.answered})</span>
                <span className="flex items-center gap-1.5"><span className="legend-chip qp-not-answered" />Not Answered ({counts.notAnswered})</span>
                <span className="flex items-center gap-1.5"><span className="legend-chip qp-not-visited" />Not Visited ({counts.notVisited})</span>
                <span className="flex items-center gap-1.5"><span className="legend-chip qp-marked" />Marked ({counts.marked})</span>
              </div>
              {/* Subject tabs in drawer */}
              {subjects.length > 0 && (
                <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
                  {subjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => switchSubject(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                        activeSubject === s
                          ? "bg-[#1e3a8a] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s} ({subjectCounts[s] ?? 0})
                    </button>
                  ))}
                </div>
              )}
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
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
            {!isFinished && (
              <div className="p-4 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => { setPaletteOpen(false); setShowSubmitDialog(true); }}
                  disabled={submitting}
                  className="w-full h-12 text-sm font-bold rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white"
                >
                  {submitting ? "Submitting..." : "Submit Test"}
                </Button>
              </div>
            )}
          </DrawerContent>
        </Drawer>

        {/* ── SUBMIT DIALOG ── */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent className="mx-4 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Test?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1 text-sm mt-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="text-2xl font-bold text-green-700">{counts.answered + counts.answeredMarked}</div>
                      <div className="text-xs text-green-600">Answered</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <div className="text-2xl font-bold text-red-700">{counts.notAnswered}</div>
                      <div className="text-xs text-red-600">Not Answered</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-2xl font-bold text-slate-700">{counts.notVisited}</div>
                      <div className="text-xs text-slate-500">Not Visited</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3">
                      <div className="text-2xl font-bold text-purple-700">{counts.marked}</div>
                      <div className="text-xs text-purple-600">Marked for Review</div>
                    </div>
                  </div>
                  <p className="pt-2 text-center text-slate-500">You cannot change answers after submission.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
              <AlertDialogCancel disabled={submitting} className="flex-1 h-11 rounded-xl">
                Continue Test
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleSubmit(); }}
                disabled={submitting}
                className="flex-1 h-11 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold"
              >
                {submitting ? "Submitting..." : "Yes, Submit"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
}
