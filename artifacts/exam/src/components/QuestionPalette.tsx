import type { ExamQuestion, QStatus } from "@/lib/types";

interface Props {
  questions: ExamQuestion[];
  /**
   * The complete (unfiltered) question list. When provided, palette buttons
   * display the question's global position (1..N) within the full exam,
   * not its position within the current subject section.
   */
  allQuestions?: ExamQuestion[];
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
  allQuestions,
  currentId,
  statusMap,
  onJump,
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
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onJump(q.id)}
            className={`qp-btn ${statusClass[status]} ${
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
