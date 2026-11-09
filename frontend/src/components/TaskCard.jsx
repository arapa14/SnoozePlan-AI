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
import { priorityLevel } from "../lib/priority";

const CATEGORY_STYLES = {
  kuliah: "bg-info/10 text-info",
  praktikum: "bg-mint/10 text-mint",
  organisasi: "bg-warn/10 text-warn",
  pribadi: "bg-line text-ink-2",
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

  const level = priorityLevel(score);

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
      className={`group relative flex items-start gap-3 py-3 pl-4 pr-3 rounded-xl border overflow-hidden transition ${
        isDone
          ? "bg-surface/40 border-line/60 opacity-55"
          : critical
            ? "bg-surface border-danger/30 hover:border-danger/50"
            : isOverdue
              ? "bg-surface border-warn/25 hover:border-warn/40"
              : "bg-surface border-line hover:border-line-strong"
      }`}
    >
      {/* Penanda prioritas di sisi kiri */}
      {!isDone && (
        <span
          aria-hidden
          className={`absolute left-0 inset-y-0 w-1 ${critical ? "bg-danger" : level.bar}`}
        />
      )}

      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 shrink-0 text-ink-4 hover:text-mint transition"
        title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
        aria-label={isDone ? "Tandai belum selesai" : "Tandai selesai"}
      >
        {isDone ? (
          <CheckCircle2 className="w-[18px] h-[18px] text-mint" />
        ) : (
          <Circle className="w-[18px] h-[18px]" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold leading-snug truncate ${
                isDone ? "line-through text-ink-3" : "text-ink"
              }`}
            >
              {task.title}
            </p>
            {task.description && !isDone && (
              <p className="text-[11px] text-ink-3 mt-0.5 truncate">
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

        <div className="flex items-center gap-2 mt-2 text-[11px] text-ink-3 flex-wrap">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${CATEGORY_STYLES[task.category] || CATEGORY_STYLES.pribadi}`}
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
                isOverdue ? "text-warn font-medium" : ""
              }`}
            >
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              {deadlineLabel}
            </span>
          )}
        </div>
      </div>

      {/* Aksi: tampil saat hover di desktop, selalu tampil di layar sentuh */}
      <div className="flex items-center gap-0.5 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 text-ink-4 hover:text-mint hover:bg-raised rounded-md transition"
          title="Ubah"
          aria-label="Ubah"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(task)}
          className="p-1.5 text-ink-4 hover:text-danger hover:bg-raised rounded-md transition"
          title="Hapus"
          aria-label="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
