# Sphoorthy Engineering College — Online Examination Portal

Complete technical documentation for the multi-college online assessment platform.

---

## 1. What this product does

A browser-based, proctored online testing platform built for engineering colleges
to run secure, large-scale objective examinations (multiple choice, single best
answer). Used for class tests, mid-semester exams, model EAPCET / JEE / NEET
papers, and placement assessments.

### Headline features

| Capability | Description |
|---|---|
| Authentication | Firebase Auth — Google sign-in + email/password |
| Student profiles | One-time capture of phone, parent contact, college; reused across all tests |
| Multi-college | College name is captured per student; the platform is generic and rentable to other colleges |
| Subject sections | Each exam can be split into subjects (Mathematics / Physics / Chemistry) with tabbed navigation and per-subject palettes |
| Question types | MCQ with 2–4 options, optional images on the question and on each option |
| Question palette | TCS iON / digialm-style colored shapes (Answered / Not Answered / Marked / Answered & Marked / Not Visited) |
| Proctoring | Tab-switch and focus monitoring with violation count and auto-submit |
| Timer | Server-issued end time, persisted in `sessionStorage` to survive refreshes |
| Auto-evaluation | Single-best-answer scoring at submission; per-subject breakdown |
| Result review | Question palette repaints in correct/incorrect colours after submission |
| Admin role mgmt | Super-admin can grant/revoke admin and super-admin roles |
| Image uploads | Question and option images stored as compressed JPEG data URLs |
| Bulk import | Built-in seeders for TG-EAPCET 2025 Shift 1 and Shift 2 papers |
| Result export | Submissions table with per-question answers, exportable from admin |

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7, TypeScript 5 |
| Routing | wouter (lightweight, sub-path safe) |
| State / data | TanStack Query 5, plain React state |
| UI | shadcn/ui (Radix primitives) + Tailwind CSS 3 |
| Auth | Firebase Authentication (Google + Email/Password) |
| Database | Supabase Postgres (project `cqjjbvccldipkqqtqzqc`) |
| RLS | Permissive `anon` policies — app-level role gates |
| Hosting | Replit Deployments (autoscale) |
| Package mgr | pnpm workspace (monorepo: `artifacts/exam`) |

---

## 3. Architecture

```
                       ┌──────────────────────────────┐
                       │      Browser (Vite SPA)      │
                       │  React + wouter + Tailwind   │
                       └────────────┬─────────────────┘
                                    │
            ┌───────────────────────┼────────────────────────┐
            │                       │                        │
   ┌────────▼────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
   │ Firebase Auth   │    │ Supabase Postgres │    │  sessionStorage   │
   │  Google + Email │    │  exams,           │    │  Active session,  │
   │  Manages users, │    │  exam_questions,  │    │  timer endsAt,    │
   │  password reset │    │  submissions,     │    │  answers cache    │
   │                 │    │  admins,          │    │                   │
   │                 │    │  student_profiles │    │                   │
   └─────────────────┘    └───────────────────┘    └───────────────────┘
```

Firebase owns identity. Supabase owns content. The browser glues them: Firebase
issues the user; the user's email is then looked up in `admins` (for admin
gating) and their UID is looked up in `student_profiles` (for student data).

### Folder layout

```
artifacts/exam/
├── DOCUMENTATION.md          ← this file
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── scripts/
│   ├── admins-table-setup.sql        ← run once in Supabase SQL editor
│   └── student-profiles-setup.sql    ← run once in Supabase SQL editor
└── src/
    ├── App.tsx                ← wouter routes
    ├── main.tsx               ← entry
    ├── index.css              ← Tailwind + palette CSS
    ├── components/
    │   ├── ErrorBoundary.tsx  ← catches render errors during exam
    │   ├── ImagePicker.tsx    ← admin file → compressed JPEG data URL
    │   ├── QuestionPalette.tsx
    │   ├── SphnHeader.tsx     ← top bar w/ college brand
    │   ├── SphnWatermark.tsx  ← anti-screenshot watermark
    │   ├── Timer.tsx          ← countdown w/ auto-submit callback
    │   └── ui/                ← shadcn primitives
    ├── lib/
    │   ├── firebase.ts        ← Firebase init + auth helpers
    │   ├── supabase.ts        ← Supabase client
    │   ├── types.ts           ← shared TS types
    │   ├── useAuth.ts         ← hook: Firebase user + admin lookup
    │   ├── useProfile.ts      ← hook: student profile lookup
    │   └── utils.ts
    └── pages/
        ├── Login.tsx          ← Google + email/password sign-in/up/reset
        ├── CompleteProfile.tsx← one-time profile capture after registration
        ├── ExamList.tsx       ← available tests
        ├── Instructions.tsx   ← per-exam instructions + candidate confirm
        ├── Exam.tsx           ← the actual test UI
        ├── Result.tsx         ← post-submission summary
        ├── Admin.tsx          ← admin console (exams / questions / submissions / admins)
        └── not-found.tsx
```

---

## 4. Data model (Supabase Postgres)

### `exams`
| column | type | notes |
|---|---|---|
| `id` | uuid (pk) | |
| `title` | text | display name |
| `description` | text | shown on listing & instructions |
| `duration_minutes` | int | timer length |
| `max_violations` | int | tab/focus events before auto-submit |
| `is_active` | bool | soft on/off |
| `created_at` | timestamptz | |

### `exam_questions`
| column | type | notes |
|---|---|---|
| `id` | uuid (pk) | |
| `exam_id` | uuid → exams | |
| `question` | text | |
| `question_te` | text | optional Telugu translation |
| `options` | text[] | 2–4 strings |
| `options_te` | text[] | optional Telugu options |
| `correct_answer` | text | exact string match against `options` |
| `marks` | numeric | per-question marks (default 1) |
| `subject` | text | e.g. "Mathematics" |
| `sort_order` | int | display order within exam |
| `question_type` | text | "mcq" |
| `question_image` | text | base64 data URL, optional |
| `option_images` | jsonb | `{ "0": "data:image/...", "2": "..." }`, optional |

### `exam_submissions`
| column | type | notes |
|---|---|---|
| `id` | uuid (pk) | |
| `exam_id` | uuid | |
| `user_id` | text | Firebase UID |
| `student_name` | text | |
| `roll_number` | text | |
| `student_phone` | text | |
| `father_name` | text | |
| `father_phone` | text | |
| `college` | text | |
| `score` | numeric | computed |
| `total` | numeric | sum of marks |
| `started_at` | timestamptz | |
| `submitted_at` | timestamptz | |
| `time_spent_seconds` | int | |
| `violations_count` | int | tab/focus events |
| `answers` | jsonb | `{ [question_id]: chosen_text }` |
| `subject_breakdown` | jsonb | `{ Mathematics: { score, total }, … }` |

### `admins`
| column | type | notes |
|---|---|---|
| `email` | text (pk) | lowercased Firebase email |
| `is_super` | bool | super-admins can manage admins |
| `added_by` | text | audit trail |
| `created_at` | timestamptz | |

### `student_profiles`
| column | type | notes |
|---|---|---|
| `uid` | text (pk) | Firebase UID |
| `email` | text | |
| `name` | text | |
| `roll_number` | text | |
| `phone` | text | |
| `father_name` | text | |
| `father_phone` | text | |
| `college` | text | |
| `completed_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Row Level Security
All tables enable RLS with permissive `anon` policies (select/insert/update/
delete). The app enforces authorization in code: Admin-only mutations are
gated by Firebase sign-in + `admins.is_super` lookup. For higher security,
move admin and submission writes behind a server endpoint that verifies a
Firebase ID token before using a Supabase service-role key.

---

## 5. Application flow

### 5.1 Student journey

```
   Open URL
      │
      ▼
   /  (Login.tsx)  ─── Google sign-in ──► Firebase
                  └── Email + Password ─► Firebase
      │
      ▼
   useAuth → user object available
      │
      ▼
   useProfile → looks up student_profiles by UID
      │
      ├── profile MISSING ──► /complete-profile
      │                         (CompleteProfile.tsx — phone/parent/college)
      │                         │
      │                         ▼
      │                       saveProfile() → /exams
      │
      └── profile EXISTS ───► /exams (ExamList.tsx — active exams)
                                │
                                ▼
                              /instructions/:examId  (Instructions.tsx)
                                │  reviews details + reads exam rules
                                ▼
                              /exam (Exam.tsx)
                                │
                                ├── Timer countdown
                                ├── Tab/focus violation counter
                                ├── Per-subject palette
                                └── Auto- or manual-submit
                                ▼
                              POST exam_submissions row
                                ▼
                              /result/:submissionId
```

### 5.2 Admin journey

```
   /admin
      │
      ▼
   Sign in with Google (must already be in admins table)
      │
      ▼
   useAuth → isAdmin / isSuperAdmin
      │
      ├── Exams tab     — create exam, toggle active, delete
      ├── Questions tab — add question (text + image + 4 options + per-option image)
      ├── Submissions   — view & export attempts per exam
      └── Manage Admins (super-admin only)
              ├── Add admin by email
              ├── Toggle super
              └── Revoke admin
```

### 5.3 Authentication state machine

`src/lib/useAuth.ts`

```
              firebase.onAuthStateChanged
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        user === null            user !== null
              │                       │
              ▼                       ▼
    loading=false               supabase.from('admins')
    isAdmin=false                .select(...).eq('email', user.email)
                                       │
                          ┌────────────┴────────────┐
                          ▼                         ▼
                        row found              no row / error
                          │                         │
                  isAdmin=true (and          isAdmin=false
                  isSuperAdmin if            (warned in console
                  is_super=true)              if table missing)
```

---

## 6. Key functions reference

### `src/lib/firebase.ts`
| Function | Purpose |
|---|---|
| `signInWithGoogle()` | Opens Google popup, returns `UserCredential`. |
| `signInWithEmail(email, password)` | Standard email/password sign-in. |
| `signUpWithEmail(email, password, displayName?)` | Creates user, optionally sets display name. |
| `sendResetEmail(email)` | Sends Firebase password-reset link. |
| `signOut()` | Signs out the current Firebase user. |
| `describeAuthError(e)` | Converts Firebase error codes to friendly user messages. |
| `onAuthStateChanged` | Re-export for hook subscriptions. |

### `src/lib/useAuth.ts`
- `useAuth(): { loading, user, admin, isAdmin, isSuperAdmin }`
- Subscribes to Firebase auth state and looks up the user's email in the
  `admins` Supabase table to compute role flags.

### `src/lib/useProfile.ts`
- `useProfile(): { loading, profile, refresh }`
- Looks up the current Firebase user's UID in `student_profiles`. Used by
  `ExamList`, `Instructions`, and `CompleteProfile` to gate exam access on
  profile completion.
- `saveProfile(p: StudentProfile)` — upsert helper used by CompleteProfile.

### `src/components/ImagePicker.tsx`
Used in admin's "Add Question" form. Reads the chosen file, uses an HTML5
`<canvas>` to resize to ≤1280 px on the long edge and re-encodes to
JPEG (quality 0.82, falling back to 0.6 if still over ~1.2 MB). Returns a
`data:` URL that can be stored directly in Postgres.

### `src/pages/Exam.tsx`
- `createPRNG(seed)` / `shuffleArray` / `shuffleOptions` — deterministic
  per-candidate option shuffle keyed by exam-id + UID, so the answer order is
  scrambled but reproducible if a candidate refreshes.
- `handleSubmit()` — computes score across answered questions, stores a row
  in `exam_submissions`, persists `lastResult` summary in `sessionStorage`.
- `counts` (memo) — palette legend counts, scoped to the active subject.

### `src/pages/Admin.tsx`
- `createQuestion()` — inserts a row into `exam_questions` including
  `question_image` and a parallel-indexed `option_images` map so blanks aren't
  stored.
- `importEapcet2025()` / `importShift1()` — bulk seeders that idempotently
  create the named exam if missing and skip if questions already exist.
- `<AdminsManager>` (inside Admin.tsx) — UI for super-admins to add/revoke
  admins and toggle super-admin status.

---

## 7. Local development

```bash
# from repo root
pnpm install
pnpm --filter @workspace/exam run dev      # http://localhost:5000
pnpm --filter @workspace/exam run typecheck
pnpm --filter @workspace/exam run build
```

Replit workflow `Start application` runs the dev server on port 5000.

### Environment / configuration
| What | Where | Notes |
|---|---|---|
| Firebase config | `src/lib/firebase.ts` (inline) | Public client config — safe to ship. |
| Supabase URL + anon key | `src/lib/supabase.ts` | Read from Vite env at build time. |

### One-time backend setup
Run both files in **Supabase → SQL Editor** for project `cqjjbvccldipkqqtqzqc`:

1. `scripts/admins-table-setup.sql` — creates the `admins` table and seeds
   `drbalaramallam@sphoorthyengg.ac.in` as super-admin.
2. `scripts/student-profiles-setup.sql` — creates the `student_profiles` table.

In **Firebase Console → Authentication**:

1. **Get started** (initialises Auth on the project).
2. **Sign-in method** → enable **Email/Password** and **Google**.
3. **Settings → Authorized domains** → add the Replit dev URL and the production
   `.replit.app` (and any custom college domain).

---

## 8. Deployment (Replit)

The project is set up for **Replit Autoscale Deployments**:

1. From the Replit workspace, click **Publish** in the top bar.
2. Confirm the build command is `pnpm --filter @workspace/exam run build`
   and the run command serves the built files (`vite preview` or any static
   host).
3. After publish, copy the `.replit.app` URL and add it to Firebase's
   Authorized domains list.

---

## 9. Multi-college rollout checklist

For each new college that wants to use this portal:

- [ ] Confirm college name will be captured per student (no code change needed
      — students type their own college on first login).
- [ ] If the college wants its own logo on the header, swap the brand asset
      and redeploy, or extract `SphnHeader.tsx` into a per-college variant.
- [ ] Provision admin emails: super-admin adds the college's principal /
      invigilators in **Admin → Manage Admins**.
- [ ] Bulk-import that college's question bank via the admin UI or by adding
      a JSON file under `src/data/` and an importer in `Admin.tsx` (mirror
      `importShift1` / `importEapcet2025`).
- [ ] Communicate the URL and the sign-up flow to students.

---

## 10. Known limitations & future work

- All Supabase tables use permissive RLS — for production hardening, route
  mutations through a server with Firebase ID-token verification + Supabase
  service-role key.
- Images are inlined as base64. For large question banks, switch to Supabase
  Storage and store only the public URL in `question_image` / `option_images`.
- Admin "Manage Students" view is not yet built. Planned: list all
  `student_profiles` rows with search and link-out to that student's
  submissions.
- No formal unit / e2e tests yet.
- The proctoring is browser-side only (tab/focus events). For true proctoring
  add webcam capture + audio + a server-side reviewer dashboard.

---

## 11. Operational support

- Project: `sphntestonline` (Firebase) / `cqjjbvccldipkqqtqzqc` (Supabase).
- First super-admin: `drbalaramallam@sphoorthyengg.ac.in`.
- For technical changes, edit the Vite app under `artifacts/exam/` and redeploy.
