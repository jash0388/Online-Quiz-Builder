import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Exam, ExamQuestion, ExamSubmissionRow } from "@/lib/types";
import eapcetQuestions from "@/data/eapcet-2025-shift2.json";
import shift1Data from "@/data/eapcet-shift1.json";
import { useAuth } from "@/lib/useAuth";
import { signInWithGoogle, signOut } from "@/lib/firebase";
import ImagePicker from "@/components/ImagePicker";

interface AdminRow {
  email: string;
  is_super: boolean;
  college: string | null;
  created_at?: string | null;
  added_by?: string | null;
}

export default function Admin() {
  const { loading, user, isAdmin, isSuperAdmin, admin } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef5] p-6">
        <div className="text-sm text-muted-foreground">Checking access…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef5] p-6">
        <Card className="p-8 w-full max-w-sm shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold">Admin Sign In</h1>
          <p className="text-xs text-muted-foreground">
            Sign in with your Google account. Only approved admin emails can access this panel.
          </p>
          <Button onClick={() => signInWithGoogle()} className="w-full bg-primary hover:bg-primary/90">
            Sign in with Google
          </Button>
          <Button variant="ghost" className="w-full text-xs" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef5] p-6">
        <Card className="p-8 w-full max-w-sm shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold">Not Authorized</h1>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">{user.email}</span> is not an admin.
            Ask a super-admin to grant access, then sign in again.
          </p>
          <Button variant="outline" className="w-full" onClick={async () => { await signOut(); }}>
            Sign out
          </Button>
          <Button variant="ghost" className="w-full text-xs" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return <AdminPanel currentAdmin={admin!} isSuperAdmin={isSuperAdmin} userEmail={user.email ?? ""} />;
}

function AdminPanel({
  currentAdmin,
  isSuperAdmin,
  userEmail,
}: {
  currentAdmin: { email: string; is_super: boolean; college: string | null };
  isSuperAdmin: boolean;
  userEmail: string;
}) {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"questions" | "submissions" | "admins" | "students">("questions");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [subs, setSubs] = useState<ExamSubmissionRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // New exam form
  const [newTitle, setNewTitle] = useState("");
  const [newColleges, setNewColleges] = useState<string[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newMaxViol, setNewMaxViol] = useState(5);

  // New question form
  const [qBody, setQBody] = useState("");
  const [qA, setQA] = useState("");
  const [qB, setQB] = useState("");
  const [qC, setQC] = useState("");
  const [qD, setQD] = useState("");
  const [qCorrect, setQCorrect] = useState("A");
  const [qMarks, setQMarks] = useState(1);
  const [qSubject, setQSubject] = useState<string>("");
  const [qImage, setQImage] = useState<string | null>(null);
  const [qImgA, setQImgA] = useState<string | null>(null);
  const [qImgB, setQImgB] = useState<string | null>(null);
  const [qImgC, setQImgC] = useState<string | null>(null);
  const [qImgD, setQImgD] = useState<string | null>(null);

  async function loadExams() {
    const { data } = await supabase
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false });
    setExams((data ?? []) as Exam[]);
  }
  async function loadQuestions(examId: string) {
    const { data } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("sort_order");
    setQuestions((data ?? []) as ExamQuestion[]);
  }
  async function loadSubmissions(examId: string) {
    let query = supabase
      .from("exam_submissions")
      .select("*")
      .eq("exam_id", examId);

    // Filter by college if not a super admin
    if (!isSuperAdmin && currentAdmin.college) {
      query = query.eq("college", currentAdmin.college);
    }

    const { data } = await query.order("submitted_at", { ascending: false });
    setSubs((data ?? []) as ExamSubmissionRow[]);
  }
  async function loadStudents() {
    let query = supabase.from("student_profiles").select("*");
    if (!isSuperAdmin && currentAdmin.college) {
      query = query.eq("college", currentAdmin.college);
    }
    const { data } = await query.order("name");
    setStudents(data ?? []);
  }

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    loadQuestions(selectedExam);
    loadSubmissions(selectedExam);
    // Real-time subscription for new submissions
    const channel = supabase
      .channel(`exam_subs_${selectedExam}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "exam_submissions",
          filter: `exam_id=eq.${selectedExam}`,
        },
        (payload) => {
          const newSub = payload.new as ExamSubmissionRow;
          setSubs((prev) => [newSub, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedExam]);

  // Load students whenever the Students tab is opened (independent of exam selection)
  useEffect(() => {
    if (tab === "students") loadStudents();
  }, [tab]);

  async function createExam() {
    if (!newTitle) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("exams")
      .insert({
        title: newTitle,
        description: newDesc || null,
        duration_minutes: newDuration,
        max_violations: newMaxViol,
        is_active: true,
        allowed_colleges: newColleges.length > 0 ? newColleges : null,
      })
      .select()
      .single();
    setBusy(false);
    if (error) return alert(error.message);
    setNewTitle("");
    setNewColleges([]);
    setNewDesc("");
    setNewDuration(30);
    setNewMaxViol(5);
    await loadExams();
    if (data) setSelectedExam(data.id);
  }

  async function toggleActive(exam: Exam) {
    const { error } = await supabase
      .from("exams")
      .update({ is_active: !exam.is_active })
      .eq("id", exam.id);
    if (error) alert(error.message);
    loadExams();
  }

  async function createQuestion() {
    if (!selectedExam || !qBody) return;
    const opts = [qA, qB, qC, qD].filter((o) => o.trim().length > 0);
    if (opts.length < 2) {
      alert("At least 2 options required.");
      return;
    }
    const correctIndex = "ABCD".indexOf(qCorrect);
    const correctText = opts[correctIndex];
    if (!correctText) {
      alert("Correct option must have text.");
      return;
    }
    setBusy(true);
    const payload: Record<string, unknown> = {
      exam_id: selectedExam,
      question: qBody,
      question_type: "mcq",
      options: opts,
      correct_answer: correctText,
      marks: qMarks,
      sort_order: questions.length + 1,
    };
    if (qSubject) payload.subject = qSubject;
    if (qImage) payload.question_image = qImage;
    const optionImageInputs = [qImgA, qImgB, qImgC, qImgD];
    const optionImages: Record<string, string> = {};
    let writeIdx = 0;
    for (let srcIdx = 0; srcIdx < 4; srcIdx++) {
      const text = [qA, qB, qC, qD][srcIdx];
      if (text.trim().length === 0) continue;
      const img = optionImageInputs[srcIdx];
      if (img) optionImages[String(writeIdx)] = img;
      writeIdx++;
    }
    if (Object.keys(optionImages).length > 0) {
      payload.option_images = optionImages;
    }
    const { error } = await supabase.from("exam_questions").insert(payload);
    setBusy(false);
    if (error) return alert(error.message);
    setQBody("");
    setQA("");
    setQB("");
    setQC("");
    setQD("");
    setQImage(null);
    setQImgA(null);
    setQImgB(null);
    setQImgC(null);
    setQImgD(null);
    loadQuestions(selectedExam);
  }

  async function importEapcet2025() {
    if (!confirm(
      "This will create a new exam 'TG EAPCET Engineering — 03 May 2025 Shift 2' and seed 160 questions (Mathematics 80, Physics 40, Chemistry 40). Continue?",
    )) return;
    setBusy(true);
    try {
      const examTitle = "TG EAPCET Engineering — 03 May 2025 Shift 2";
      const { data: existing } = await supabase
        .from("exams")
        .select("id, title")
        .eq("title", examTitle)
        .maybeSingle();
      let examId: string;
      if (existing?.id) {
        examId = existing.id as string;
      } else {
        const { data: created, error: createErr } = await supabase
          .from("exams")
          .insert({
            title: examTitle,
            description:
              "Telangana EAPCET 2025 Engineering stream — official Shift 2, 03 May 2025. 160 MCQs across Mathematics (80), Physics (40) and Chemistry (40). Each correct answer: +1, no negative marking.",
            duration_minutes: 180,
            is_active: true,
          })
          .select("id")
          .single();
        if (createErr || !created) {
          throw new Error(createErr?.message ?? "Failed to create exam");
        }
        examId = created.id as string;
      }
      const { count: existingCount } = await supabase
        .from("exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", examId);
      if ((existingCount ?? 0) > 0) {
        if (!confirm(
          `This exam already has ${existingCount} questions. Skip seeding?`,
        )) {
          // user wants to proceed anyway → fall through and add more
        } else {
          setSelectedExam(examId);
          await loadExams();
          await loadQuestions(examId);
          alert("Exam already seeded. Selected it for you.");
          return;
        }
      }
      const rows = (eapcetQuestions as Array<{
        id: number;
        subject: string;
        question: string;
        options: string[];
        answer: number;
      }>).map((q, i) => ({
        exam_id: examId,
        question: q.question,
        question_type: "mcq",
        options: q.options,
        correct_answer: q.options[q.answer],
        marks: 1,
        sort_order: i + 1,
        subject: q.subject,
      }));
      // Insert in chunks of 50 to stay well under any payload limits
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase.from("exam_questions").insert(chunk);
        if (error) {
          if (/subject/i.test(error.message) && /column/i.test(error.message)) {
            throw new Error(
              "Your database is missing the 'subject' column. Open Supabase → SQL Editor and run:\n\n" +
                "ALTER TABLE exam_questions ADD COLUMN subject TEXT;\n\nThen click Import again.",
            );
          }
          throw new Error(error.message);
        }
      }
      setSelectedExam(examId);
      await loadExams();
      await loadQuestions(examId);
      alert(`Imported ${rows.length} questions into "${examTitle}".`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Import failed:\n\n" + msg);
    } finally {
      setBusy(false);
    }
  }

  async function importShift1() {
    if (!confirm(
      "This will create 'TG EAPCET MOCK TEST - 2' and seed the 02 May 2025 Shift 1 paper (160 questions). Continue?",
    )) return;
    setBusy(true);
    try {
      const examTitle = "TG EAPCET MOCK TEST - 2";
      const { data: existing } = await supabase
        .from("exams")
        .select("id, title")
        .eq("title", examTitle)
        .maybeSingle();
      let examId: string;
      if (existing?.id) {
        examId = existing.id as string;
      } else {
        const { data: created, error: createErr } = await supabase
          .from("exams")
          .insert({
            title: examTitle,
            description:
              "Telangana EAPCET 2025 Engineering stream — official Shift 1, 02 May 2025. 160 MCQs across Mathematics (80), Physics (40) and Chemistry (40). Each correct answer: +1, no negative marking.",
            duration_minutes: 180,
            is_active: true,
          })
          .select("id")
          .single();
        if (createErr || !created) {
          throw new Error(createErr?.message ?? "Failed to create exam");
        }
        examId = created.id as string;
      }
      const { count: existingCount } = await supabase
        .from("exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", examId);
      if ((existingCount ?? 0) > 0) {
        if (!confirm(`This exam already has ${existingCount} questions. Skip seeding?`)) {
          // fall through
        } else {
          setSelectedExam(examId);
          await loadExams();
          await loadQuestions(examId);
          alert("Exam already seeded. Selected it for you.");
          return;
        }
      }
      const rows = shift1Data.questions.map((q, i) => {
        const optionTexts = q.options.map(o => o.text);
        const optionTextsTe = q.options.map(o => o.text_te);
        const correctOpt = q.options.find(o => o.key === q.answer);
        return {
          exam_id: examId,
          question: q.question,
          question_te: q.question_te,
          question_type: "mcq",
          options: optionTexts,
          options_te: optionTextsTe,
          correct_answer: correctOpt ? correctOpt.text : optionTexts[0],
          marks: 1,
          sort_order: i + 1,
          subject: q.subject,
          question_image: (q as any).question_image ?? null,
          option_images: (q as any).option_images ?? null,
        };
      });
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase.from("exam_questions").insert(chunk);
        if (error) throw new Error(error.message);
      }
      setSelectedExam(examId);
      await loadExams();
      await loadQuestions(examId);
      alert(`Imported ${rows.length} questions into "${examTitle}".`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Import failed:\n\n" + msg);
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("exam_questions").delete().eq("id", id);
    if (selectedExam) loadQuestions(selectedExam);
  }

  function csvEscape(v: unknown): string {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function downloadCSV() {
    if (!selectedExam) return;
    const exam = exams.find((e) => e.id === selectedExam);
    if (subs.length === 0) {
      alert("No submissions to download for this exam.");
      return;
    }

    const baseHeaders = [
      "Submission ID",
      "Student Name",
      "Roll Number",
      "Student Phone",
      "Father Name",
      "Father Phone",
      "College",
      "Score",
      "Total Marks",
      "Percentage",
      "Attempted",
      "Violations",
      "Time Used (sec)",
      "Status",
      "Submitted At",
    ];

    const qHeaders: string[] = [];
    questions.forEach((_, i) => {
      qHeaders.push(`Q${i + 1} Answer`);
      qHeaders.push(`Q${i + 1} Correct`);
    });

    const headers = [...baseHeaders, ...qHeaders];
    const rows: string[] = [headers.map(csvEscape).join(",")];

    for (const s of subs) {
      const candidate =
        (s.student_answers as Record<string, unknown> | null)?.__candidate__ as
          | Record<string, string>
          | undefined;
      const answersObj = (s.answers ?? {}) as Record<string, string>;
      const total = s.total_marks ?? 0;
      const score = s.score ?? 0;
      const pct = total > 0 ? ((score / total) * 100).toFixed(2) : "0";
      const attempted = Object.keys(answersObj).filter(
        (k) =>
          k !== "__candidate__" &&
          answersObj[k] != null &&
          String(answersObj[k]) !== "",
      ).length;

      const row: unknown[] = [
        s.id,
        s.student_name ?? "",
        s.roll_number ?? "",
        s.student_phone ?? "",
        s.father_name ?? "",
        s.father_phone ?? "",
        candidate?.college ?? "",
        score,
        total,
        pct,
        attempted,
        s.violations ?? 0,
        s.time_used_seconds ?? 0,
        s.status ?? "",
        s.submitted_at ?? "",
      ];

      questions.forEach((q) => {
        const ans = answersObj[q.id] ?? "";
        row.push(ans);
        row.push(q.correct_answer ?? "");
      });

      rows.push(row.map(csvEscape).join(","));
    }

    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (exam?.title ?? "submissions")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .toLowerCase();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `${safeTitle}_submissions_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function deleteSubmission(id: string) {
    if (!confirm("Delete this submission? This cannot be undone.")) return;
    const { error } = await supabase
      .from("exam_submissions")
      .delete()
      .eq("id", id);
    if (error) return alert(error.message);
    if (selectedExam) loadSubmissions(selectedExam);
  }

  async function deleteAllSubmissions() {
    if (!selectedExam) return;
    const exam = exams.find((e) => e.id === selectedExam);
    if (subs.length === 0) {
      alert("No submissions to delete.");
      return;
    }
    if (
      !confirm(
        `Delete ALL ${subs.length} submission(s) for "${exam?.title ?? "this exam"}"? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase
      .from("exam_submissions")
      .delete()
      .eq("exam_id", selectedExam);
    setBusy(false);
    if (error) return alert(error.message);
    loadSubmissions(selectedExam);
  }

  async function approveStudent(uid: string) {
    setBusy(true);
    const { error } = await supabase
      .from("student_profiles")
      .update({ is_approved: true })
      .eq("uid", uid);
    setBusy(false);
    if (error) return alert(error.message);
    loadStudents();
  }

  async function deleteStudent(uid: string) {
    if (!confirm("Delete this student profile?")) return;
    setBusy(true);
    const { error } = await supabase
      .from("student_profiles")
      .delete()
      .eq("uid", uid);
    setBusy(false);
    if (error) return alert(error.message);
    loadStudents();
  }

  return (
    <div className="min-h-screen bg-[#e8eef5]">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold">Online Assessment · Admin</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {userEmail}
            {isSuperAdmin && (
              <span className="ml-2 inline-flex items-center bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                SUPER ADMIN
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/")}
            className="h-8 text-xs gap-1.5"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z" />
            </svg>
            Home
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => { await signOut(); navigate("/"); }}
            className="h-8 text-xs"
          >
            Sign out
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6">
        {/* Exam list */}
        <div className="col-span-12 md:col-span-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Exams</h2>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {exams.map((e) => (
                <div
                  key={e.id}
                  className={`px-3 py-2 rounded text-sm border ${
                    selectedExam === e.id
                      ? "border-primary bg-accent"
                      : "border-border bg-white"
                  }`}
                >
                  <button
                    onClick={() => setSelectedExam(e.id)}
                    className="text-left w-full"
                  >
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.duration_minutes} min · {e.max_violations} violations
                    </div>
                  </button>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Switch
                      checked={e.is_active}
                      onCheckedChange={() => toggleActive(e)}
                    />
                    <span>{e.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              ))}
              {exams.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">
                  No exams yet.
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-semibold">Create Exam</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-9"
                />
                <div className="flex-1">
                  <Select
                    onValueChange={(val) => {
                      if (val === "all") setNewColleges([]);
                      else if (!newColleges.includes(val)) setNewColleges([...newColleges, val]);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Restrict to Colleges (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Visible to All Colleges</SelectItem>
                      <SelectItem value="Sphoorthy Engineering College">Sphoorthy Engineering College</SelectItem>
                      <SelectItem value="AVN Inter College">AVN Inter College</SelectItem>
                    </SelectContent>
                  </Select>
                  {newColleges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {newColleges.map(c => (
                        <span key={c} className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-primary/20">
                          {c}
                          <button onClick={() => setNewColleges(newColleges.filter(x => x !== c))} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Textarea
                rows={2}
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Duration (min)</Label>
                  <Input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Max Violations</Label>
                  <Input
                    type="number"
                    value={newMaxViol}
                    onChange={(e) => setNewMaxViol(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button
                disabled={busy}
                onClick={createExam}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Create Exam
              </Button>
            </div>
          </Card>

          <Card className="p-4 mt-4 border-dashed">
            <div className="text-xs font-semibold mb-2">Quick Import</div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Seed the official TG EAPCET 2025 (Engineering, 03 May Shift 2)
              paper — 160 questions across Mathematics, Physics and Chemistry.
            </p>
            <Button
              disabled={busy}
              onClick={importEapcet2025}
              variant="outline"
              className="w-full"
            >
              Import TG EAPCET 03-May-2025 Shift 2
            </Button>
            <div className="border-t mt-3 pt-3">
              <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                <span className="font-semibold text-slate-700">NEW:</span> TG EAPCET Mock Test 2 — 02 May 2025 Shift 1 paper.
              </p>
              <Button
                disabled={busy}
                onClick={importShift1}
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/5"
              >
                Import TG EAPCET MOCK TEST - 2
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              First-time setup: in Supabase SQL Editor run{" "}
              <code className="bg-slate-100 px-1 rounded">
                ALTER TABLE exam_questions ADD COLUMN subject TEXT;
              </code>
            </p>
          </Card>
        </div>

        {/* Right column */}
        <div className="col-span-12 md:col-span-8 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={tab === "questions" ? "default" : "outline"}
              onClick={() => setTab("questions")}
              size="sm"
              disabled={!selectedExam}
            >
              Questions{selectedExam ? ` (${questions.length})` : ""}
            </Button>
            <Button
              variant={tab === "submissions" ? "default" : "outline"}
              onClick={() => setTab("submissions")}
              size="sm"
              disabled={!selectedExam}
            >
              Submissions{selectedExam ? ` (${subs.length})` : ""}
            </Button>
            <Button
              variant={tab === "students" ? "default" : "outline"}
              onClick={() => setTab("students")}
              size="sm"
            >
              Students{students.length > 0 ? ` (${students.length})` : ""}
            </Button>
            {isSuperAdmin && (
              <Button
                variant={tab === "admins" ? "default" : "outline"}
                onClick={() => setTab("admins")}
                size="sm"
              >
                Manage Admins
              </Button>
            )}
          </div>

          {tab === "admins" && isSuperAdmin && (
            <AdminsManager currentUserEmail={userEmail} />
          )}

          {tab !== "admins" && !selectedExam && (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Select an exam to manage questions and view submissions.
            </Card>
          )}

          {selectedExam && tab !== "admins" && (
            <>

              {tab === "questions" && (
                <>
                  {/* Add Question */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Add Question</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Question</Label>
                        <Textarea
                          rows={3}
                          value={qBody}
                          onChange={(e) => setQBody(e.target.value)}
                        />
                        <div className="mt-2">
                          <ImagePicker
                            label="Add question image"
                            value={qImage}
                            onChange={setQImage}
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Optional — diagrams, equations, figures (auto-resized).
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>A</Label>
                          <Input value={qA} onChange={(e) => setQA(e.target.value)} />
                          <ImagePicker
                            label="image"
                            value={qImgA}
                            onChange={setQImgA}
                            small
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>B</Label>
                          <Input value={qB} onChange={(e) => setQB(e.target.value)} />
                          <ImagePicker
                            label="image"
                            value={qImgB}
                            onChange={setQImgB}
                            small
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>C</Label>
                          <Input value={qC} onChange={(e) => setQC(e.target.value)} />
                          <ImagePicker
                            label="image"
                            value={qImgC}
                            onChange={setQImgC}
                            small
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>D</Label>
                          <Input value={qD} onChange={(e) => setQD(e.target.value)} />
                          <ImagePicker
                            label="image"
                            value={qImgD}
                            onChange={setQImgD}
                            small
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label>Correct Option</Label>
                          <Select value={qCorrect} onValueChange={setQCorrect}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="D">D</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Marks</Label>
                          <Input
                            type="number"
                            step="0.25"
                            value={qMarks}
                            onChange={(e) => setQMarks(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Subject (optional)</Label>
                          <Select
                            value={qSubject || "none"}
                            onValueChange={(v) =>
                              setQSubject(v === "none" ? "" : v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="Mathematics">
                                Mathematics
                              </SelectItem>
                              <SelectItem value="Physics">Physics</SelectItem>
                              <SelectItem value="Chemistry">
                                Chemistry
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        disabled={busy || !qBody}
                        onClick={createQuestion}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Add Question
                      </Button>
                    </div>
                  </Card>

                  {/* Questions list */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">
                      Questions ({questions.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {questions.map((q, i) => (
                        <div
                          key={q.id}
                          className="border border-border rounded p-3 bg-white text-sm flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">
                              Q{i + 1} · Correct:{" "}
                              <span className="font-semibold text-green-700">
                                {q.correct_answer}
                              </span>{" "}
                              · +{q.marks}
                            </div>
                            <div>{q.question}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteQuestion(q.id)}
                            className="text-destructive border-destructive/30 shrink-0"
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                      {questions.length === 0 && (
                        <div className="text-xs text-muted-foreground">
                          No questions yet.
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {tab === "submissions" && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h3 className="font-semibold">
                      Submissions ({subs.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={downloadCSV}
                        disabled={subs.length === 0}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Download CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={deleteAllSubmissions}
                        disabled={busy || subs.length === 0}
                        className="text-destructive border-destructive/30"
                      >
                        Delete All
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">Student</th>
                          <th className="py-2 pr-3">Roll</th>
                          <th className="py-2 pr-3">Score</th>
                          <th className="py-2 pr-3">Violations</th>
                          <th className="py-2 pr-3">Time</th>
                          <th className="py-2 pr-3">Submitted</th>
                          <th className="py-2 pr-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {subs.map((s) => (
                          <tr key={s.id} className="border-b hover:bg-accent/30">
                            <td className="py-2 pr-3">{s.student_name ?? "—"}</td>
                            <td className="py-2 pr-3">{s.roll_number ?? "—"}</td>
                            <td className="py-2 pr-3 font-semibold">
                              {s.score ?? 0} / {s.total_marks ?? 0}
                            </td>
                            <td
                              className={`py-2 pr-3 ${s.violations && s.violations > 0 ? "text-red-700" : ""}`}
                            >
                              {s.violations ?? 0}
                            </td>
                            <td className="py-2 pr-3">
                              {Math.floor((s.time_used_seconds ?? 0) / 60)}m{" "}
                              {(s.time_used_seconds ?? 0) % 60}s
                            </td>
                            <td className="py-2 pr-3 text-xs text-muted-foreground">
                              {s.submitted_at
                                ? new Date(s.submitted_at).toLocaleString()
                                : "—"}
                            </td>
                            <td className="py-2 pr-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSubmission(s.id)}
                                className="text-destructive border-destructive/30 h-7 text-xs"
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {subs.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-xs text-muted-foreground">
                              No submissions yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {tab === "students" && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Manage Students</h3>
                    <p className="text-xs text-muted-foreground">
                      {!isSuperAdmin && currentAdmin.college ? `Showing students for ${currentAdmin.college}` : "Showing all students"}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">Name</th>
                          <th className="py-2 pr-3">Roll Number</th>
                          <th className="py-2 pr-3">Email</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.uid} className="border-b hover:bg-accent/30">
                            <td className="py-3 pr-3 font-medium">{s.name}</td>
                            <td className="py-3 pr-3">{s.roll_number}</td>
                            <td className="py-3 pr-3 text-xs text-muted-foreground">{s.email}</td>
                            <td className="py-3 pr-3">
                              {s.is_approved ? (
                                <span className="inline-flex items-center bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                {!s.is_approved && (
                                  <Button
                                    size="sm"
                                    onClick={() => approveStudent(s.uid)}
                                    disabled={busy}
                                    className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                                  >
                                    Approve
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteStudent(s.uid)}
                                  disabled={busy}
                                  className="text-destructive border-destructive/30 h-7 text-xs"
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs italic">
                              No students registered yet for this college.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminsManager({ currentUserEmail }: { currentUserEmail: string }) {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newCollege, setNewCollege] = useState("");
  const [newSuper, setNewSuper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("admins")
      .select("email, is_super, college, created_at, added_by")
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      setAdmins([]);
    } else {
      setAdmins((data ?? []) as AdminRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addAdmin() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("admins").insert({
      email,
      is_super: newSuper,
      college: newCollege.trim() || null,
      added_by: currentUserEmail,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNewEmail("");
    setNewCollege("");
    setNewSuper(false);
    load();
  }

  async function removeAdmin(email: string) {
    if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert("You cannot revoke your own super-admin access.");
      return;
    }
    if (!confirm(`Revoke admin access for ${email}?`)) return;
    setBusy(true);
    const { error } = await supabase.from("admins").delete().eq("email", email);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  async function toggleSuper(row: AdminRow) {
    if (row.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert("You cannot change your own super-admin flag.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("admins")
      .update({ is_super: !row.is_super })
      .eq("email", row.email);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold">Manage Admins</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add Google email addresses for principals and invigilators.
          Super-admins can manage other admins; regular admins can only manage exams and submissions.
        </p>
      </div>

      <div className="border border-border rounded p-3 bg-slate-50 space-y-3">
        <div className="text-xs font-semibold">Add new admin</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="principal@college.ac.in"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 h-10"
            data-testid="input-new-admin-email"
          />
          <Input
            placeholder="College Name (e.g. AVN Inter College)"
            value={newCollege}
            onChange={(e) => setNewCollege(e.target.value)}
            className="flex-1 h-10"
          />
          <label className="flex items-center gap-2 text-xs px-2">
            <Switch checked={newSuper} onCheckedChange={setNewSuper} />
            <span>Super-admin</span>
          </label>
          <Button
            onClick={addAdmin}
            disabled={busy || !newEmail.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            Add
          </Button>
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {error}
          </div>
        )}
      </div>

      <div className="border-t pt-3">
        <div className="text-xs font-semibold mb-2">
          Current admins ({admins.length})
        </div>
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No admins yet. Run the setup SQL in Supabase first.
          </div>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => {
              const isSelf = a.email.toLowerCase() === currentUserEmail.toLowerCase();
              return (
                <div
                  key={a.email}
                  className="flex items-center justify-between gap-2 border border-border rounded px-3 py-2 bg-white text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {a.email}{" "}
                      {isSelf && (
                        <span className="text-[10px] text-muted-foreground">(you)</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.is_super ? "Super-admin" : "Admin"}
                      {a.college && ` · ${a.college}`}
                      {a.added_by && ` · added by ${a.added_by}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1 text-[11px]">
                      <Switch
                        checked={a.is_super}
                        onCheckedChange={() => toggleSuper(a)}
                        disabled={isSelf || busy}
                      />
                      <span className="text-muted-foreground">Super</span>
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeAdmin(a.email)}
                      disabled={isSelf || busy}
                      className="text-destructive border-destructive/30 h-7 text-xs"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
