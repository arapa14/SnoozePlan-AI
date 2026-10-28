import {
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import PriorityBadge from "./PriorityBadge";
import CriticalBadge from "./CriticalBadge";
import OverdueBadge from "./OverdueBadge";

const CATEGORY_STYLES = {
  kuliah: "bg-sky-500/10 text-sky-400",
  praktikum: "bg-emerald-500/10 text-emerald-400",
  organisasi: "bg-amber-500/10 text-amber-400",
  pribadi: "bg-slate-700/50 text-slate-300",
};

export default function TaskCard({
  task,
  score,
  critical,
  now,
  onToggle,
  onEdit,
  onDelete,
}) {
  const isDone = task.status === "done";
  const isOverdue =
    !!now &&
    !!task.deadline &&
    !isDone &&
    new Date(task.deadline).getTime() < now;

  const deadlineLabel = task.deadline
    ? new Date(task.deadline).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl border transition ${
        isDone
          ? "bg-slate-900/40 border-slate-800/60 opacity-50"
          : critical
            ? "bg-slate-900 border-rose-500/30 hover:border-rose-500/50"
            : isOverdue
              ? "bg-slate-900 border-amber-500/25 hover:border-amber-500/40"
              : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70"
      }`}
    >
      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 shrink-0 text-slate-500 hover:text-emerald-400 transition"
        title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
      >
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium leading-snug truncate ${
                isDone ? "line-through text-slate-500" : "text-slate-100"
              }`}
            >
              {task.title}
            </p>
            {task.description && !isDone && (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <PriorityBadge score={score} />
            {critical && !isDone && <CriticalBadge />}
            {isOverdue && <OverdueBadge />}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 flex-wrap">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_STYLES[task.category]}`}
          >
            {task.category}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3" />
            {task.estimated_minutes}m
          </span>
          {deadlineLabel && (
            <span
              className={`flex items-center gap-1 tabular-nums ${
                isOverdue ? "text-amber-400 font-medium" : ""
              }`}
            >
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              {deadlineLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 text-slate-600 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition"
          title="Ubah"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(task)}
          className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
          title="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}