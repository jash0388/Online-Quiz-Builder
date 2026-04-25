import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Exam, ExamSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const DEFAULT_INSTRUCTIONS = `1. The total duration of the examination is shown above. The countdown timer in the top right corner of the screen will display the remaining time available to complete the examination.

2. The Question Palette displayed on the right side of the screen will show the status of each question using one of the following symbols:
   - Grey: You have not visited the question yet.
   - Red: You have not answered the question.
   - Green: You have answered the question.
   - Purple: You have NOT answered the question, but have marked the question for review.
   - Purple with green dot: You have answered the question, but marked it for review.

3. To answer a question, click on one of the option buttons.
4. To change your chosen answer, click on the button of another option.
5. To save your answer, you MUST click on the Save & Next button.
6. To deselect a chosen answer, click on the Clear Response button.
7. To mark the question for review, click on the Mark for Review & Next button.

8. Tab switching, leaving the test window, or losing focus is recorded as a violation. Exceeding the maximum allowed violations will auto-submit your test.`;

function makeUserId() {
  return (
    "stud-" +
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

export default function Instructions() {
  const params = useParams<{ examId: string }>();
  const [, navigate] = useLocation();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [agreed, setAgreed] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [college, setCollege] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [examRes, qRes] = await Promise.all([
        supabase
          .from("exams")
          .select("*")
          .eq("id", params.examId)
          .single(),
        supabase
          .from("exam_questions")
          .select("id", { count: "exact", head: true })
          .eq("exam_id", params.examId),
      ]);
      if (examRes.data) setExam(examRes.data as Exam);
      setQuestionCount(qRes.count ?? 0);
    })();
  }, [params.examId]);

  function handleStart() {
    setError(null);
    if (!exam) return;
    if (
      !studentName.trim() ||
      !rollNumber.trim() ||
      !studentPhone.trim() ||
      !fatherName.trim() ||
      !fatherPhone.trim() ||
      !college.trim()
    ) {
      setError("Please fill all candidate details.");
      return;
    }
    if (!agreed) {
      setError("Please confirm you have read the instructions.");
      return;
    }
    const session: ExamSession = {
      examId: exam.id,
      examTitle: exam.title,
      duration: exam.duration_minutes,
      maxViolations: exam.max_violations ?? 5,
      userId: makeUserId(),
      candidate: {
        student_name: studentName.trim(),
        roll_number: rollNumber.trim(),
        student_phone: studentPhone.trim(),
        father_name: fatherName.trim(),
        father_phone: fatherPhone.trim(),
        college: college.trim(),
      },
    };
    sessionStorage.setItem("exam:session", JSON.stringify(session));
    navigate("/exam");
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef5]">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#e8eef5]">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-white font-bold">
            OA
          </div>
          <div>
            <div className="font-semibold leading-tight">{exam.title}</div>
            <div className="text-xs text-muted-foreground">
              {exam.duration_minutes} minutes &middot; {questionCount}{" "}
              questions
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          ← Back to Tests
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3 bg-white border border-border rounded shadow-sm">
          <div className="border-b border-border px-6 py-3 bg-[#1e3a8a] text-white rounded-t">
            <h1 className="font-semibold">General Instructions</h1>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto text-sm">
            {exam.description && (
              <p className="mb-4 italic text-muted-foreground">
                {exam.description}
              </p>
            )}
            <div className="mb-3">
              <strong>Duration:</strong> {exam.duration_minutes} minutes
              <br />
              <strong>Total Questions:</strong> {questionCount}
              <br />
              <strong>Max Violations Allowed:</strong> {exam.max_violations}
            </div>
            {DEFAULT_INSTRUCTIONS.split("\n").map((line, i) => (
              <p key={i} className="mb-2 leading-relaxed whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-white border border-border rounded shadow-sm p-5 space-y-3">
          <h2 className="font-semibold">Candidate Details</h2>
          <div>
            <Label htmlFor="sname">Student Name *</Label>
            <Input
              id="sname"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="roll">Roll Number *</Label>
            <Input
              id="roll"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sphone">Student Phone *</Label>
            <Input
              id="sphone"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fname">Father's Name *</Label>
            <Input
              id="fname"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fphone">Father's Phone *</Label>
            <Input
              id="fphone"
              value={fatherPhone}
              onChange={(e) => setFatherPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="col">College *</Label>
            <Input
              id="col"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 text-xs cursor-pointer pt-2">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(Boolean(v))}
            />
            <span>
              I have read and understood the instructions and agree to the
              terms.
            </span>
          </label>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <Button
            onClick={handleStart}
            className="w-full bg-primary hover:bg-primary/90"
          >
            I am ready to begin
          </Button>
        </div>
      </main>
    </div>
  );
}
