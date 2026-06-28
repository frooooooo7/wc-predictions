import type { DailyResult } from "@/lib/daily";

interface FormDotsProps {
  form: DailyResult[];
}

const DOT_STYLE: Record<DailyResult, string> = {
  correct: "bg-emerald-400",
  wrong: "bg-rose-400",
  pending: "bg-surface-2",
};

const DOT_TITLE: Record<DailyResult, string> = {
  correct: "Trafione",
  wrong: "Pudło",
  pending: "W toku",
};

/** Recent form as colored dots — oldest on the left, newest on the right. */
export function FormDots({ form }: FormDotsProps) {
  if (form.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }

  const ordered = [...form].reverse();

  return (
    <span className="inline-flex items-center gap-1" aria-label="Forma">
      {ordered.map((result, index) => (
        <span
          key={index}
          title={DOT_TITLE[result]}
          className={`h-2 w-2 rounded-full ${DOT_STYLE[result]}`}
        />
      ))}
    </span>
  );
}
