import { Clock } from "lucide-react";

export default function OverdueBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 shrink-0"
      title="Deadline sudah lewat — segera selesaikan"
    >
      <Clock className="w-3 h-3" />
      <span className="hidden sm:inline">Terlambat</span>
    </span>
  );
}