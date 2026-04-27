#!/usr/bin/env node
/**
 * Seeds the official TG EAPCET 2025 (Engineering — 03 May Shift 2) paper.
 *
 *   pnpm --filter @workspace/exam run seed:eapcet
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *
 * Idempotent: re-running will reuse the existing exam row (matched by title)
 * and skip seeding if questions already exist.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "public" },
});

const dataPath = join(__dirname, "..", "src", "data", "eapcet-2025-shift2.json");
const questions = JSON.parse(readFileSync(dataPath, "utf8"));

const EXAM_TITLE = "TG EAPCET Engineering — 03 May 2025 Shift 2";
const EXAM_DESCRIPTION =
  "Telangana EAPCET 2025 Engineering stream — official Shift 2, 03 May 2025. " +
  "160 MCQs across Mathematics (80), Physics (40) and Chemistry (40). " +
  "Each correct answer: +1, no negative marking.";

async function main() {
  console.log(`Seeding "${EXAM_TITLE}" with ${questions.length} questions...`);

  const { data: existing, error: findErr } = await supabase
    .from("exams")
    .select("id, title")
    .eq("title", EXAM_TITLE)
    .maybeSingle();
  if (findErr) throw findErr;

  let examId;
  if (existing?.id) {
    examId = existing.id;
    console.log(`  → Reusing existing exam row: ${examId}`);
  } else {
    const { data: created, error: createErr } = await supabase
      .from("exams")
      .insert({
        title: EXAM_TITLE,
        description: EXAM_DESCRIPTION,
        duration_minutes: 180,
        is_active: true,
      })
      .select("id")
      .single();
    if (createErr) throw createErr;
    examId = created.id;
    console.log(`  → Created new exam row: ${examId}`);
  }

  const { count: existingCount, error: countErr } = await supabase
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);
  if (countErr) throw countErr;
  if ((existingCount ?? 0) > 0) {
    console.log(
      `  → Exam already has ${existingCount} questions; skipping seed. ` +
        "Delete them in the Admin page if you want to re-seed.",
    );
    return;
  }

  const rows = questions.map((q, i) => ({
    exam_id: examId,
    question: q.question,
    question_type: "mcq",
    options: q.options,
    correct_answer: q.options[q.answer],
    marks: 1,
    sort_order: i + 1,
    subject: q.subject,
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await supabase.from("exam_questions").insert(chunk);
    if (error) {
      if (/subject/i.test(error.message) && /column/i.test(error.message)) {
        console.error(
          "\nERROR: 'subject' column missing on exam_questions table.\n" +
            "Open Supabase → SQL Editor and run:\n\n" +
            "  ALTER TABLE exam_questions ADD COLUMN subject TEXT;\n\n" +
            "Then re-run this script.",
        );
        process.exit(2);
      }
      throw error;
    }
    console.log(`  → Inserted ${Math.min(i + 50, rows.length)} / ${rows.length}`);
  }

  console.log(`\n✓ Done. Seeded ${rows.length} questions into "${EXAM_TITLE}".`);
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
