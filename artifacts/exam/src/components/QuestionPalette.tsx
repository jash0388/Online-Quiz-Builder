import type { ExamQuestion, QStatus } from "@/lib/types";

interface Props {
  questions: ExamQuestion[];
  currentId: string;
  statusMap: Record<string, QStatus>;
  onJump: (questionId: string) => void;
}

const statusClass: Record<QStatus, string> = {
  "not-visited": "qp-not-visited",
  "not-answered": "qp-not-answered",
  answered: "qp-answered",
  marked: "qp-marked",
  "answered-marked": "qp-answered-marked",
};

export default function QuestionPalette({
  questions,
  currentId,
  statusMap,
  onJump,
}: Props) {
  return (
    <div className="flex flex-wrap">
      {questions.map((q, idx) => {
        const status = statusMap[q.id] ?? "not-visited";
        const isCurrent = q.id === currentId;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onJump(q.id)}
            className={`qp-btn ${statusClass[status]} ${
              isCurrent ? "is-current" : ""
            }`}
            title={`Question ${idx + 1}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
