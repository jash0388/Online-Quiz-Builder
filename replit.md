# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Online Assessment Artifact (`artifacts/exam`)

A digialm.com / TCS iON style online test platform.

- **Stack**: React + Vite, wouter, TanStack Query, shadcn/ui, Tailwind v4, `@supabase/supabase-js`.
- **Backend**: Supabase project `cqjjbvccldipkqqtqzqc` (no Postgres on Replit).
- **Important**: Supabase client must be created with `db: { schema: 'public' }` because the project's default exposed REST schema is `api`, not `public`.
- **Schema used (already exists in Supabase)**:
  - `exams` — id, title, description, duration_minutes, max_violations, is_active.
  - `exam_questions` — id, exam_id, question, question_type, options (jsonb array of strings), correct_answer (full text), marks, sort_order.
  - `exam_submissions` — id, exam_id, user_id, student_name, roll_number, student_phone, father_name, father_phone, answers (jsonb), student_answers (jsonb with `__candidate__` key), score, total_marks, violations, time_used_seconds, status, submitted_at, exam_title.
- **Routes**: `/` exam list, `/instructions/:examId` candidate form + instructions, `/exam` running test, `/result/:submissionId`, `/admin` exam/question CRUD + submissions table.
- **Features**: timer with auto-submit, Save & Next / Mark for Review / Clear Response, color-coded question palette with status counts, tab-switch violation tracking with auto-submit at `max_violations + 1`, localStorage state restore across reloads, right-click/copy blocking on test page.
- **Env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` available but not used in client.
