import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Exam, ExamSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import SphnHeader from "@/components/SphnHeader";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/useProfile";

type Step = "details" | "general" | "other";

function makeUserId() {
  return "stud-" + Math.random().toString(36).slice(2, 10) + "-" + Math.random().toString(36).slice(2, 10);
}

export default function Instructions() {
  const params = useParams<{ examId: string }>();
  const [, navigate] = useLocation();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [step, setStep] = useState<Step>("details");
  const [agreed, setAgreed] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [college, setCollege] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { loading: authLoading, user } = useAuth();
  const { loading: profileLoading, profile } = useProfile();

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) { navigate("/"); return; }
    if (!profile) { navigate("/complete-profile"); return; }
    if (!studentName) setStudentName(profile.name);
    if (!rollNumber) setRollNumber(profile.roll_number);
    if (!studentPhone) setStudentPhone(profile.phone);
    if (!fatherName) setFatherName(profile.father_name);
    if (!fatherPhone) setFatherPhone(profile.father_phone);
    if (profile.college) setCollege(profile.college);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileLoading, user, profile, navigate]);

  useEffect(() => {
    (async () => {
      const [examRes, qRes] = await Promise.all([
        supabase.from("exams").select("*").eq("id", params.examId).single(),
        supabase.from("exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", params.examId),
      ]);
      if (examRes.data) setExam(examRes.data as Exam);
      setQuestionCount(qRes.count ?? 0);
    })();
  }, [params.examId]);

  const subtitle = useMemo(() => {
    if (step === "details") return "Candidate Details";
    if (step === "general") return "General Instructions";
    return "Other Instructions";
  }, [step]);

  function goNextFromDetails() {
    setError(null);
    if (!studentName.trim() || !rollNumber.trim() || !studentPhone.trim() || !fatherName.trim() || !fatherPhone.trim() || !college.trim()) {
      setError("Please fill all candidate details.");
      return;
    }
    setStep("general");
  }

  function handleStart() {
    setError(null);
    if (!exam) return;
    if (!agreed) { setError("Please confirm you have read the instructions."); return; }
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
      <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
        <SphnHeader subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  const stepIndex = step === "details" ? 0 : step === "general" ? 1 : 2;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      <SphnHeader subtitle={exam.title} />

      {/* Exam info bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs text-slate-500 max-w-xl mx-auto">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {exam.duration_minutes} min
          </span>
          <span>·</span>
          <span>{questionCount} questions</span>
          <span className="ml-auto font-semibold text-[#1e3a8a]">{subtitle}</span>
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-1 mt-2.5 max-w-xl mx-auto">
          {(["details", "general", "other"] as Step[]).map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= stepIndex ? "bg-[#1e3a8a]" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 py-5 max-w-xl w-full mx-auto overflow-y-auto">
        {/* ── STEP 1: Details ── */}
        {step === "details" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-6 space-y-4">
            <div>
              <h2 className="font-bold text-slate-800 text-base">Candidate Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">Verify your details before proceeding.</p>
            </div>

            <InField label="Student Name" htmlFor="sname">
              <Input id="sname" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-student-name" />
            </InField>
            <InField label="Username / Roll No." htmlFor="roll">
              <Input id="roll" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-username" />
            </InField>
            <InField label="Student Phone" htmlFor="sphone">
              <Input id="sphone" type="tel" inputMode="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-student-phone" />
            </InField>
            <InField label="Father's Name" htmlFor="fname">
              <Input id="fname" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-father-name" />
            </InField>
            <InField label="Father's Phone" htmlFor="fphone">
              <Input id="fphone" type="tel" inputMode="tel" value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-father-phone" />
            </InField>
            <InField label="College" htmlFor="col">
              <Input id="col" value={college} onChange={(e) => setCollege(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-college" />
            </InField>

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
            <Button onClick={goNextFromDetails} className="w-full h-12 rounded-xl bg-[#1e3a8a] font-bold text-base" data-testid="button-details-next">
              Next →
            </Button>
          </div>
        )}

        {/* ── STEP 2: General Instructions ── */}
        {step === "general" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-[#f8fafc]">
              <h2 className="font-bold text-slate-800">General Instructions</h2>
            </div>
            <div className="px-5 py-4 space-y-4 text-sm leading-relaxed text-slate-700 max-h-[60vh] overflow-y-auto">
              <p className="font-bold underline">General Instructions:</p>
              <ol className="list-decimal pl-4 space-y-4">
                <InstructionItem en="Total duration of examination is 180 minutes." te="పరీక్ష మొత్తం వ్యవధి 180 నిమిషాలు." />
                <InstructionItem
                  en="The clock will be set at the server. The countdown timer in the top right corner will display remaining time. When the timer reaches zero, the exam ends automatically."
                  te="గడియారం సర్వర్ పై సెట్ చేయబడును. టైమర్ జీరో కు చేరుకున్నప్పుడు, పరీక్ష దానంతటదే ఆగిపోతుంది."
                />
                <li>
                  <p>The Question Palette shows each question's status:</p>
                  <ul className="mt-2 space-y-2 not-prose">
                    {[
                      { chip: "qp-not-visited", text: "Not visited yet." },
                      { chip: "qp-not-answered", text: "Not answered." },
                      { chip: "qp-answered", text: "Answered." },
                      { chip: "qp-marked", text: "Marked for review (not answered)." },
                      { chip: "qp-answered-marked", text: "Answered & marked for review." },
                    ].map(({ chip, text }, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className={`legend-chip ${chip} shrink-0`} />
                        <span className="text-sm">{text}</span>
                      </li>
                    ))}
                  </ul>
                </li>
                <InstructionItem
                  en="Click Save & Next to save your answer and go to the next question."
                  te="జవాబు సేవ్ చేయడానికి Save & Next నొక్కండి."
                />
                <InstructionItem
                  en="Click Mark for Review & Next to save and mark the question for later review."
                  te="తర్వాత సమీక్షించడానికి Mark for Review & Next నొక్కండి."
                />
                <InstructionItem
                  en="Only questions with saved answers or marked for review after answering will be evaluated."
                  te="జవాబు సేవ్ చేసిన లేదా మార్క్ చేసిన ప్రశ్నలు మాత్రమే మూల్యాంకనానికి పరిగణలోనికి తీసుకోబడతాయి."
                />
              </ol>
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <Button onClick={() => setStep("other")} className="w-full h-12 rounded-xl bg-[#1e3a8a] font-bold text-base" data-testid="button-general-next">
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Other Instructions + Start ── */}
        {step === "other" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-[#f8fafc]">
                <h2 className="font-bold text-slate-800">Other Important Instructions</h2>
              </div>
              <div className="px-5 py-4 text-sm leading-relaxed text-slate-700 max-h-[55vh] overflow-y-auto space-y-4">
                <p className="font-semibold">1. Details of the Question Paper</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-[#dbeafe]">
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-2 text-left">Section</th>
                        <th className="border-b border-slate-200 px-3 py-2 text-center">Questions</th>
                        <th className="border-b border-slate-200 px-3 py-2 text-center">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["MATHEMATICS", 80, 80],
                        ["PHYSICS", 40, 40],
                        ["CHEMISTRY", 40, 40],
                      ].map(([name, q, m]) => (
                        <tr key={name as string} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 font-medium">{name}</td>
                          <td className="px-3 py-2 text-center">{q}</td>
                          <td className="px-3 py-2 text-center">{m}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-semibold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-center">160</td>
                        <td className="px-3 py-2 text-center">160</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <ol start={2} className="list-decimal pl-4 space-y-3">
                  <InstructionItem
                    en="Do not leave the test window or switch tabs. Violations are monitored and may result in auto-submission."
                    te="పరీక్ష విండో వదలకండి. ఉల్లంఘనలు నిరంతరం పర్యవేక్షించబడతాయి."
                  />
                  <InstructionItem
                    en="Right-click and copy are disabled during the exam to prevent malpractice."
                    te="పరీక్ష సమయంలో రైట్-క్లిక్ మరియు కాపీ నిలిపివేయబడతాయి."
                  />
                  <InstructionItem
                    en="The test may be submitted automatically when the timer expires."
                    te="టైమర్ ముగిసినప్పుడు పరీక్ష స్వయంచాలకంగా సమర్పించబడవచ్చు."
                  />
                  <InstructionItem
                    en="Ensure stable internet connection throughout the examination."
                    te="పరీక్ష అంతటా స్థిరమైన ఇంటర్నెట్ కనెక్షన్ ఉందని నిర్ధారించుకోండి."
                  />
                </ol>
              </div>
            </div>

            {/* Agreement & Start */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(!!v)}
                  className="mt-0.5 w-5 h-5 shrink-0"
                />
                <span className="text-sm text-slate-700 leading-snug">
                  I have read and understood all the instructions. I agree to comply with the examination rules.
                </span>
              </label>
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-3">
                  {error}
                </div>
              )}
              <Button
                onClick={handleStart}
                disabled={!agreed}
                className="w-full h-13 mt-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] font-bold text-base text-white shadow-md disabled:opacity-50"
              >
                Start Exam →
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InField({ label, htmlFor, children }: {
  label: string; htmlFor: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label} <span className="text-red-500">*</span>
      </Label>
      {children}
    </div>
  );
}

function InstructionItem({ en, te }: { en: string; te: string }) {
  return (
    <li>
      <p>{en}</p>
      <p className="text-slate-500 text-xs mt-0.5">{te}</p>
    </li>
  );
}
