#!/usr/bin/env node
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

const EXAM_TITLE = process.env.EXAM_TITLE || "TG EAPCET Mock Test";
const SRC = join(
  __dirname,
  "..",
  "..",
  "..",
  "attached_assets",
  "Pasted--exam-TG-Engineering-03rd-May-2025-Shift-2-sections-sub_1777099828893.txt",
);

function splitBilingual(text) {
  if (!text) return { en: "", te: null };
  const idx = text.indexOf("\n");
  if (idx === -1) return { en: text.trim(), te: null };
  const en = text.slice(0, idx).trim();
  const te = text.slice(idx + 1).trim();
  return { en, te: te.length ? te : null };
}

async function main() {
  const raw = readFileSync(SRC, "utf-8");
  const data = JSON.parse(raw);

  const flat = [];
  for (const section of data.sections) {
    for (const q of section.questions) {
      flat.push({ subject: section.subject, ...q });
    }
  }
  console.log(`Loaded ${flat.length} bilingual questions.`);

  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .select("id, title")
    .eq("title", EXAM_TITLE)
    .maybeSingle();
  if (examErr) throw examErr;
  if (!exam) {
    console.error(`Exam "${EXAM_TITLE}" not found. Seed it first.`);
    process.exit(2);
  }
  console.log(`Found exam: ${exam.id}`);

  const { data: rows, error: rowsErr } = await supabase
    .from("exam_questions")
    .select("id, sort_order, question, subject")
    .eq("exam_id", exam.id)
    .order("sort_order", { ascending: true });
  if (rowsErr) throw rowsErr;
  console.log(`Found ${rows.length} stored questions.`);

  if (rows.length !== flat.length) {
    console.warn(
      `WARNING: stored count (${rows.length}) != source count (${flat.length}). Will update by sort_order.`,
    );
  }

  let updated = 0;
  let skipped = 0;
  for (let i = 0; i < flat.length; i++) {
    const row = rows[i];
    if (!row) {
      skipped++;
      continue;
    }
    const { en, te } = splitBilingual(flat[i].question);
    if (!te) {
      skipped++;
      continue;
    }
    const { error: upErr } = await supabase
      .from("exam_questions")
      .update({ question: en, question_te: te })
      .eq("id", row.id);
    if (upErr) {
      if (/question_te/i.test(upErr.message) && /column/i.test(upErr.message)) {
        console.error(
          "\nERROR: 'question_te' column missing on exam_questions table.\n" +
            "Open Supabase → SQL Editor and run:\n\n" +
            "  ALTER TABLE exam_questions ADD COLUMN question_te TEXT;\n" +
            "  ALTER TABLE exam_questions ADD COLUMN options_te JSONB;\n\n" +
            "Then re-run this script.",
        );
        process.exit(3);
      }
      throw upErr;
    }
    updated++;
    if (updated % 20 === 0) console.log(`  → Updated ${updated}/${flat.length}`);
  }

  console.log(`\n✓ Done. Updated ${updated} rows, skipped ${skipped}.`);
}

main().catch((e) => {
  console.error("Update failed:", e.message ?? e);
  process.exit(1);
});
