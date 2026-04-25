import { useEffect, useState } from "react";

interface Props {
  endsAt: number; // ms epoch
  onExpire: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Timer({ endsAt, onExpire }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));

  useEffect(() => {
    if (remaining <= 0) onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const danger = remaining <= 60;
  const warn = remaining <= 300 && remaining > 60;

  return (
    <div
      className={`flex items-center gap-2 text-sm font-mono px-3 py-1.5 rounded border ${
        danger
          ? "bg-red-100 text-red-700 border-red-300 animate-pulse"
          : warn
            ? "bg-amber-100 text-amber-800 border-amber-300"
            : "bg-white text-foreground border-border"
      }`}
      data-testid="timer"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
      Time Left: {pad(h)}:{pad(m)}:{pad(s)}
    </div>
  );
}
