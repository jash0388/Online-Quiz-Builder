import { useEffect, useState } from "react";
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

export default function Admin() {
  const [tab, setTab] = useState<"questions" | "submissions">("questions");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [subs, setSubs] = useState<ExamSubmissionRow[]>([]);
  const [busy, setBusy] = useState(false);

  // New exam form
  const [newTitle, setNewTitle] = useState("");
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
    const { data } = await supabase
      .from("exam_submissions")
      .select("*")
      .eq("exam_id", examId)
      .order("submitted_at", { ascending: false });
    setSubs((data ?? []) as ExamSubmissionRow[]);
  }

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      loadQuestions(selectedExam);
      loadSubmissions(selectedExam);
    }
  }, [selectedExam]);

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
      })
      .select()
      .single();
    setBusy(false);
    if (error) return alert(error.message);
    setNewTitle("");
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
    const { error } = await supabase.from("exam_questions").insert({
      exam_id: selectedExam,
      question: qBody,
      question_type: "mcq",
      options: opts,
      correct_answer: correctText,
      marks: qMarks,
      sort_order: questions.length + 1,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setQBody("");
    setQA("");
    setQB("");
    setQC("");
    setQD("");
    loadQuestions(selectedExam);
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("exam_questions").delete().eq("id", id);
    if (selectedExam) loadQuestions(selectedExam);
  }

  return (
    <div className="min-h-screen bg-[#e8eef5]">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="font-semibold">Online Assessment · Admin</div>
        <a href="" className="text-xs text-muted-foreground hover:text-primary">
          Back to Tests
        </a>
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
              <Input
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
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
        </div>

        {/* Right column */}
        <div className="col-span-12 md:col-span-8 space-y-4">
          {!selectedExam && (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Select an exam to manage questions and view submissions.
            </Card>
          )}

          {selectedExam && (
            <>
              <div className="flex gap-2">
                <Button
                  variant={tab === "questions" ? "default" : "outline"}
                  onClick={() => setTab("questions")}
                  size="sm"
                >
                  Questions ({questions.length})
                </Button>
                <Button
                  variant={tab === "submissions" ? "default" : "outline"}
                  onClick={() => setTab("submissions")}
                  size="sm"
                >
                  Submissions ({subs.length})
                </Button>
              </div>

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
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>A</Label>
                          <Input value={qA} onChange={(e) => setQA(e.target.value)} />
                        </div>
                        <div>
                          <Label>B</Label>
                          <Input value={qB} onChange={(e) => setQB(e.target.value)} />
                        </div>
                        <div>
                          <Label>C</Label>
                          <Input value={qC} onChange={(e) => setQC(e.target.value)} />
                        </div>
                        <div>
                          <Label>D</Label>
                          <Input value={qD} onChange={(e) => setQD(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
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
                  <h3 className="font-semibold mb-3">Submissions</h3>
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
                            <td className={`py-2 pr-3 ${s.violations && s.violations > 0 ? "text-red-700" : ""}`}>
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
                          </tr>
                        ))}
                        {subs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                              No submissions yet.
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
