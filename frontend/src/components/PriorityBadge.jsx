import { priorityLevel } from "../lib/priority";

export default function PriorityBadge({ score }) {
  const level = priorityLevel(score);
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded tabular-nums shrink-0 ${level.className}`}
      title={`Prioritas ${level.label} · ${score}/100`}
    >
      <span className="text-[11px] font-bold">{score}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-75">
        {level.label}
      </span>
    </span>
  );
}