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
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  marks: number;
  sort_order: number;
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
  exam_id: string;
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
}
