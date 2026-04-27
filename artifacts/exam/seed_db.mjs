import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  'https://cqjjbvccldipkqqtqzqc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxampidmNjbGRpcGtxcXRxenFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM5NTk5NywiZXhwIjoyMDg1OTcxOTk3fQ.X66_viw192Ra2brJpf_XoePPnGvOD5V-A-t5kBQptNg'
);

async function run() {
  const jsonPath = path.join(process.cwd(), 'src', 'data', 'eapcet-shift1.json');
  const shift1Data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const examTitle = "TG EAPCET MOCK TEST - 2";
  const { data: existing } = await supabase
    .from("exams")
    .select("id, title")
    .eq("title", examTitle)
    .maybeSingle();

  let examId = existing?.id;
  if (!examId) {
    const { data: created, error: createErr } = await supabase
      .from("exams")
      .insert({
        title: examTitle,
        description: "Telangana EAPCET 2025 Engineering stream — official Shift 1, 02 May 2025. 160 MCQs across Mathematics (80), Physics (40) and Chemistry (40). Each correct answer: +1, no negative marking.",
        duration_minutes: 180,
        is_active: true,
      })
      .select("id")
      .single();
    if (createErr) throw createErr;
    examId = created.id;
  }

  const { count: existingCount } = await supabase
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  if (existingCount > 0) {
    console.log(`Exam already has ${existingCount} questions. Deleting existing to reseed...`);
    await supabase.from('exam_questions').delete().eq('exam_id', examId);
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
      question_image: q.question_image ?? null,
      option_images: q.option_images ?? null,
    };
  });

  console.log(`Inserting ${rows.length} questions...`);
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await supabase.from("exam_questions").insert(chunk);
    if (error) {
      console.error("Error inserting chunk:", error);
      return;
    }
  }

  console.log("Successfully seeded database!");
}

run().catch(console.error);
