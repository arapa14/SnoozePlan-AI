import { AlertTriangle } from "lucide-react";

export default function CriticalBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 shrink-0"
      title="Deadline lebih pendek dari estimasi durasi — tidak akan selesai tepat waktu"
    >
      <AlertTriangle className="w-3 h-3" />
      <span className="hidden sm:inline">Tidak muat</span>
    </span>
  );
}