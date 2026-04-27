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
  return (
    "stud-" +
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

function CandidateRail({ name }: { name: string }) {
  return (
    <aside className="w-full md:w-56 shrink-0 bg-white border border-border rounded p-4 text-center">
      <div className="w-24 h-24 mx-auto rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-3xl text-slate-500 mb-3">
        {name ? name.trim().charAt(0).toUpperCase() : "?"}
      </div>
      <div className="font-semibold text-sm text-slate-800 break-words">
        {name || "Candidate"}
      </div>
    </aside>
  );
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
  const [college, setCollege] = useState("Sphoorthy Engineering College");
  const [error, setError] = useState<string | null>(null);

  // Auth gate via Firebase + prefill from saved student profile
  const { loading: authLoading, user } = useAuth();
  const { loading: profileLoading, profile } = useProfile();
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      navigate("/");
      return;
    }
    if (!profile) {
      navigate("/complete-profile");
      return;
    }
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
        supabase
          .from("exam_questions")
          .select("id", { count: "exact", head: true })
          .eq("exam_id", params.examId),
      ]);
      if (examRes.data) setExam(examRes.data as Exam);
      setQuestionCount(qRes.count ?? 0);
    })();
  }, [params.examId]);

  const subtitle = useMemo(() => {
    if (step === "details") return "Candidate Details";
    if (step === "general") return "General Instructions";
    return "Other Important Instructions";
  }, [step]);

  function goNextFromDetails() {
    setError(null);
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
    setStep("general");
  }

  function handleStart() {
    setError(null);
    if (!exam) return;
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
      <div className="min-h-screen flex flex-col bg-[#e8eef5]">
        <SphnHeader subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#e8eef5]">
      <SphnHeader
        subtitle={`${exam.title} · ${exam.duration_minutes} minutes · ${questionCount} questions`}
      />

      {/* Section title bar */}
      <div className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 text-sm font-semibold text-slate-700">
          {subtitle}
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {step === "details" && (
          <div className="bg-white border border-border rounded shadow-sm p-5 space-y-3 max-w-2xl mx-auto">
            <h2 className="font-semibold">Candidate Details</h2>
            <div>
              <Label htmlFor="sname">Student Name *</Label>
              <Input
                id="sname"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                data-testid="input-student-name"
              />
            </div>
            <div>
              <Label htmlFor="roll">Username *</Label>
              <Input
                id="roll"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                data-testid="input-username"
              />
            </div>
            <div>
              <Label htmlFor="sphone">Student Phone *</Label>
              <Input
                id="sphone"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                data-testid="input-student-phone"
              />
            </div>
            <div>
              <Label htmlFor="fname">Father's Name *</Label>
              <Input
                id="fname"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                data-testid="input-father-name"
              />
            </div>
            <div>
              <Label htmlFor="fphone">Father's Phone *</Label>
              <Input
                id="fphone"
                value={fatherPhone}
                onChange={(e) => setFatherPhone(e.target.value)}
                data-testid="input-father-phone"
              />
            </div>
            <div>
              <Label htmlFor="col">College *</Label>
              <Input
                id="col"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                data-testid="input-college"
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {error}
              </div>
            )}
            <Button
              onClick={goNextFromDetails}
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7]"
              data-testid="button-details-next"
            >
              Next
            </Button>
          </div>
        )}

        {step === "general" && (
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 bg-white border border-border rounded shadow-sm">
              <div className="border-b border-border px-5 py-2 bg-[#f1f5f9]">
                <h2 className="font-semibold text-slate-800">Instructions</h2>
              </div>
              <div className="p-5 max-h-[65vh] overflow-y-auto text-sm leading-relaxed">
                <p className="font-bold underline mb-3">General Instructions:</p>

                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <p>Total duration of examination is 180 minutes.</p>
                    <p className="text-slate-600">
                      పరీక్ష మొత్తం వ్యవధి 180 నిమిషాలు.
                    </p>
                  </li>
                  <li>
                    <p>
                      The clock will be set at the server. The countdown timer
                      in the top right corner of screen will display the
                      remaining time available for you to complete the
                      examination. When the timer reaches zero, the examination
                      will end by itself. You will not be required to end or
                      submit your examination.
                    </p>
                    <p className="text-slate-600">
                      గడియారం సర్వర్ పై సెట్ చేయబడును. స్క్రీన్ కు పై భాగములో
                      కుడి మూలలో (కార్నెర్ లో) కౌంట్ డౌన్ టైమర్ మీకు పరీక్ష
                      పూర్తీ చేయడానికి అందుబాటులో ఉండే మిగితా సమయం
                      సూచిస్తుంది. టైమర్ జీరో కు చేరుకున్నప్పుడు, పరీక్ష
                      దానంతటదే ఆగిపోతుంది, ప్రత్యేకంగా సబ్మిట్ చేయ వలసిన
                      అవసరం లేదు.
                    </p>
                  </li>
                  <li>
                    <p>
                      The Question Palette displayed on the right side of
                      screen will show the status of each question using one of
                      the following symbols:
                    </p>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="legend-chip qp-not-visited mt-0.5">1</span>
                        <span>You have not visited the question yet.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="legend-chip qp-not-answered mt-0.5">2</span>
                        <span>You have not answered the question.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="legend-chip qp-answered mt-0.5">3</span>
                        <span>You have answered the question.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="legend-chip qp-marked mt-0.5">4</span>
                        <span>
                          You have NOT answered the question, but have marked
                          the question for review and this will NOT be
                          considered for evaluation.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="legend-chip qp-answered-marked mt-0.5">
                          5
                        </span>
                        <span>
                          You have answered the question, but marked it for
                          review and this will be considered for evaluation.
                        </span>
                      </li>
                    </ul>
                    <p className="text-slate-600 mt-2">
                      స్క్రీన్ కు కుడివైపు ఉన్న ప్రశ్న పాలెట్, ఈ దిగువ
                      చిహ్నాలలో ఒకదానిని తో ప్రతి ప్రశ్న యొక్క స్ధితిని
                      తెలుపుతుంది.
                    </p>
                  </li>
                  <li>
                    <p>
                      The Marked for Review status for a question simply
                      indicates that you would like to look at that question
                      again. If a question is answered and Marked for Review
                      then your answer for that question will be considered in
                      the evaluation.
                    </p>
                    <p className="text-slate-600">
                      ప్రశ్నకు పునరాలోచన కోసం మార్క్ చేసిన స్ధితి, కేవలం మీరు
                      ప్రశ్నను మళ్ళీ చూస్తారని సూచిస్తుంది. ఒక వేళ జవాబు
                      ఇచ్చిన తరువాత పునరాలోచన కోసం మార్క్ చేసిన, ఆ ప్రశ్నకు
                      మీ జవాబు మూల్యాంకనం కోసం పరిగణలోనికి తీసుకోబడును.
                    </p>
                  </li>
                  <li>
                    <p className="font-semibold">
                      Navigating From One Question to Another Question:
                    </p>
                    <p className="text-slate-600">
                      ఒక ప్రశ్న నుండి మరొక ప్రశ్నకు వెళ్ళడం (నావిగేషన్):
                    </p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>
                        Click on the question number in the Question Palette
                        at the right of your screen to go to that numbered
                        question directly. Note that using this option does
                        NOT save your answer to the current question.
                      </li>
                      <li>
                        Click on <b>Save &amp; Next</b> to save your answer for
                        the current question and then go to the next question.
                      </li>
                      <li>
                        Click on <b>Mark for Review &amp; Next</b> to save your
                        answer for the current question, mark it for review,
                        and then go to the next question.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <p className="font-semibold">Answering a Question:</p>
                    <p className="text-slate-600">ప్రశ్నకు జవాబు ఇవ్వడం</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>
                        To answer a question, click on the button against the
                        chosen option among the given four options.
                      </li>
                      <li>
                        To change your chosen answer, click on the button of
                        another option.
                      </li>
                      <li>
                        To deselect your chosen answer, click on the button of
                        the chosen option again or click on the{" "}
                        <b>Clear Response</b> button.
                      </li>
                      <li>
                        To save your answer, you MUST click on the{" "}
                        <b>Save &amp; Next</b> button.
                      </li>
                      <li>
                        To mark the question for review, click on the{" "}
                        <b>Mark for Review &amp; Next</b> button. If an answer
                        is selected for a question that is Marked for Review,
                        that answer will be considered in the evaluation.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <p>
                      Note that ONLY Questions for which answers are saved or
                      marked for review after answering will be considered for
                      evaluation.
                    </p>
                    <p className="text-slate-600">
                      గమనిక: జవాబు ఇచ్చిన తరువాత, పునరాలోచన కోసం మార్క్ చేసిన
                      ప్రశ్నలు లేదా జవాబులు సేవ్ చేసిన ప్రశ్నలు మాత్రమె
                      మూల్యాంకనం కోసం పరిగణలోనికి తీసుకోబడును.
                    </p>
                  </li>
                  <li>
                    <p className="font-semibold">Navigating through sections:</p>
                    <p className="text-slate-600">
                      ఒక సెక్షన్ నుండి మరొక సెక్షన్ కు వెళ్ళడం (నావిగేషన్):
                    </p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>
                        Various section names in this question paper are
                        displayed on the top bar of the screen. Questions in a
                        section can be viewed by clicking on the section
                        name. The section name you are currently viewing is
                        highlighted.
                      </li>
                      <li>
                        After clicking the Save &amp; Next button on the last
                        question for a section, you will automatically be
                        taken to the first question of the next section.
                      </li>
                      <li>
                        You can shuffle between sections (subjects) and
                        questions anytime during the examination as per your
                        convenience only during the time stipulated.
                      </li>
                    </ul>
                  </li>
                </ol>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setStep("other")}
                    className="bg-[#0ea5e9] hover:bg-[#0284c7]"
                    data-testid="button-general-next"
                  >
                    Next &gt;
                  </Button>
                </div>
              </div>
            </div>

            <CandidateRail name={studentName} />
          </div>
        )}

        {step === "other" && (
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 bg-white border border-border rounded shadow-sm">
              <div className="border-b border-border px-5 py-2 bg-[#f1f5f9]">
                <h2 className="font-semibold text-slate-800">
                  Other Important Instructions
                </h2>
              </div>
              <div className="p-5 max-h-[65vh] overflow-y-auto text-sm leading-relaxed">
                <div className="text-center mb-4">
                  <div className="font-bold underline">
                    Other Important Instructions
                  </div>
                  <div className="font-semibold text-slate-700">
                    ఇతర ముఖ్యమైన సూచనలు
                  </div>
                </div>

                <p className="font-semibold">1. Details of the Question Paper.</p>
                <p className="text-slate-600 mb-2">ప్రశ్న పత్రంలోని వివరాలు</p>

                <div className="overflow-x-auto mb-3">
                  <table className="w-full border border-slate-400 text-xs sm:text-sm">
                    <thead className="bg-[#dbeafe]">
                      <tr>
                        <th className="border border-slate-400 px-2 py-1 text-left">
                          S.No
                        </th>
                        <th className="border border-slate-400 px-2 py-1 text-left">
                          Section(Subject) Name
                        </th>
                        <th className="border border-slate-400 px-2 py-1 text-left">
                          No. of objective type Questions
                        </th>
                        <th className="border border-slate-400 px-2 py-1 text-left">
                          Marks
                        </th>
                        <th className="border border-slate-400 px-2 py-1 text-left">
                          Marks Per Question
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 px-2 py-1">1</td>
                        <td className="border border-slate-400 px-2 py-1">
                          MATHEMATICS
                        </td>
                        <td className="border border-slate-400 px-2 py-1">80</td>
                        <td className="border border-slate-400 px-2 py-1">80</td>
                        <td className="border border-slate-400 px-2 py-1">1</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 px-2 py-1">2</td>
                        <td className="border border-slate-400 px-2 py-1">
                          PHYSICS
                        </td>
                        <td className="border border-slate-400 px-2 py-1">40</td>
                        <td className="border border-slate-400 px-2 py-1">40</td>
                        <td className="border border-slate-400 px-2 py-1">1</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 px-2 py-1">3</td>
                        <td className="border border-slate-400 px-2 py-1">
                          CHEMISTRY
                        </td>
                        <td className="border border-slate-400 px-2 py-1">40</td>
                        <td className="border border-slate-400 px-2 py-1">40</td>
                        <td className="border border-slate-400 px-2 py-1">1</td>
                      </tr>
                      <tr className="font-semibold bg-slate-50">
                        <td className="border border-slate-400 px-2 py-1" colSpan={2}>
                          Total
                        </td>
                        <td className="border border-slate-400 px-2 py-1">160</td>
                        <td className="border border-slate-400 px-2 py-1">160</td>
                        <td className="border border-slate-400 px-2 py-1"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <ol start={2} className="list-decimal pl-5 space-y-3">
                  <li>
                    <p>You will be given 180 minutes to attempt 160 questions.</p>
                    <p className="text-slate-600">
                      160 ప్రశ్నలకు జవాబు ఇవ్వడానికి మీకు 180 నిమిషాల సమయం
                      ఇవ్వబడుతుంది.
                    </p>
                  </li>
                  <li>
                    <p>
                      The Question Paper consists of objective type questions
                      only.
                    </p>
                    <p className="text-slate-600">
                      ప్రశ్న పత్రంలో కేవలం ఆబ్జెక్టివ్ తరహా ప్రశ్నలు మాత్రమే
                      ఉంటాయి.
                    </p>
                  </li>
                  <li>
                    <p>There will be no negative marks for wrong answers.</p>
                    <p className="text-slate-600">
                      తప్పు గా ఇచ్చిన జవాబులకి నెగెటివ్ మార్కులు ఉండవు.
                    </p>
                  </li>
                  <li>
                    <p>
                      Questions will be available in two languages – English
                      and Telugu.
                    </p>
                    <p className="text-slate-600">
                      ప్రశ్నలు ఇంగ్లిష్ మరియు తెలుగు భాషలలో అందుబాటులో
                      ఉంటాయి.
                    </p>
                  </li>
                  <li>
                    <p>
                      The questions will be displayed on the screen one at a
                      time in both the languages.
                    </p>
                    <p className="text-slate-600">
                      కంప్యుటర్ తెర మీద ఒక్కో ప్రశ్న ఒకే సారి రెండు భాషల్లో
                      ప్రదర్శించబడుతుంది.
                    </p>
                  </li>
                  <li>
                    <p>
                      Each question will have 4 options, out of which one will
                      be the correct answer and the candidate has to select one
                      option.
                    </p>
                    <p className="text-slate-600">
                      ఒక్కో ప్రశ్నకు 4 ప్రత్యామ్నాయాలు (options) ఉంటాయి,
                      అందులో సరియైన జవాబుని అభ్యర్థి గుర్తించవలెను.
                    </p>
                  </li>
                  <li>
                    <p>
                      If there is any ambiguity in Telugu version of the
                      question and options, the English version will be
                      considered as final.
                    </p>
                    <p className="text-slate-600">
                      ప్రశ్న మరియు ఎంపికల యొక్క తెలుగు వెర్షన్‌లో ఏదైనా
                      అస్పష్టత ఉంటే, ఇంగ్లీష్ వెర్షన్ ఫైనల్‌గా
                      పరిగణించబడుతుంది.
                    </p>
                  </li>
                </ol>

                <label className="flex items-start gap-2 text-xs cursor-pointer pt-4 mt-4 border-t border-border">
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(Boolean(v))}
                    data-testid="checkbox-agree"
                  />
                  <span>
                    I have read and understood the instructions. All computer
                    hardware allotted to me are in proper working condition. I
                    declare that I am not in possession of / not wearing / not
                    carrying any prohibited gadget like mobile phone, bluetooth
                    devices etc. /any prohibited material with me into the
                    Examination Hall. I agree that in case of not adhering to
                    the instructions, I shall be liable to be debarred from
                    this Test and/or to disciplinary action, which may include
                    ban from future Tests / Examinations.
                  </span>
                </label>

                {error && (
                  <div className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex justify-between">
                  <Button
                    onClick={() => setStep("general")}
                    variant="outline"
                    data-testid="button-other-back"
                  >
                    &lt; Previous
                  </Button>
                  <Button
                    onClick={handleStart}
                    className="bg-[#0ea5e9] hover:bg-[#0284c7]"
                    data-testid="button-begin"
                  >
                    I am ready to begin
                  </Button>
                </div>
              </div>
            </div>

            <CandidateRail name={studentName} />
          </div>
        )}
      </main>

      <footer className="bg-slate-800 text-white/70 text-center text-[11px] py-2">
        Version 17.07.00 &middot; Sphoorthy Engineering College Online
        Assessment Portal
      </footer>
    </div>
  );
}
