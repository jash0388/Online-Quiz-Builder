export interface Exam {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  max_violations: number;
  is_active: boolean;
  created_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question: string;
  question_te?: string | null;
  question_type: string;
  options: string[] | null;
  options_te?: string[] | null;
  correct_answer: string;
  marks: number;
  sort_order: number;
  subject: string | null;
  /** Base64 data-URL for a diagram/graph/formula image attached to the question */
  question_image?: string | null;
  /** Per-option images keyed by option index (0-3) as base64 data-URLs */
  option_images?: Record<string, string> | null;
}

export type QStatus =
  | "not-visited"
  | "not-answered"
  | "answered"
  | "marked"
  | "answered-marked";

export interface CandidateInfo {
  student_name: string;
  roll_number: string;
  student_phone: string;
  father_name: string;
  father_phone: string;
  college: string;
}

export interface ExamSession {
  examId: string;
  examTitle: string;
  duration: number;
  maxViolations: number;
  userId: string;
  candidate: CandidateInfo;
}

export interface ExamSubmissionRow {
  id: string;
  exam_id: string | null;
  user_id: string;
  student_name: string | null;
  roll_number: string | null;
  answers: Record<string, string> | null;
  student_answers: Record<string, unknown> | null;
  score: number | null;
  total_marks: number | null;
  violations: number | null;
  time_used_seconds: number | null;
  status: string | null;
  submitted_at: string | null;
  exam_title: string | null;
  student_phone: string | null;
  father_name: string | null;
  father_phone: string | null;
}
