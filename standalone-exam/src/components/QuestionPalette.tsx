import type { ExamQuestion, QStatus } from "@/lib/types";

interface Props {
  questions: ExamQuestion[];
  allQuestions?: ExamQuestion[];
  currentId: string;
  statusMap: Record<string, QStatus>;
  onJump: (questionId: string) => void;
  isFinished?: boolean;
  answers?: Record<string, string>;
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
  allQuestions,
  currentId,
  statusMap,
  onJump,
  isFinished,
  answers,
}: Props) {
  const indexLookup = (() => {
    if (!allQuestions) return null;
    const map = new Map<string, number>();
    allQuestions.forEach((q, i) => map.set(q.id, i));
    return map;
  })();
  return (
    <div className="flex flex-wrap">
      {questions.map((q, idx) => {
        const status = statusMap[q.id] ?? "not-visited";
        const isCurrent = q.id === currentId;
        const displayIndex = indexLookup
          ? (indexLookup.get(q.id) ?? idx) + 1
          : idx + 1;

        let finalClass = statusClass[status];
        if (isFinished && answers) {
          const userAns = answers[q.id];
          if (userAns && userAns === q.correct_answer) {
            finalClass = "qp-correct";   // green
          } else {
            finalClass = "qp-incorrect"; // red — wrong OR not attempted
          }
        }

        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onJump(q.id)}
            className={`qp-btn ${finalClass} ${
              isCurrent ? "is-current" : ""
            }`}
            title={`Question ${displayIndex}`}
          >
            {displayIndex}
          </button>
        );
      })}
    </div>
  );
}
