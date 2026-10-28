import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import {
  Plus,
  Pencil,
  CheckCircle2,
  RotateCcw,
  Bell,
  Trash2,
  History as HistoryIcon,
  Loader2,
} from "lucide-react";

const EVENT_META = {
  created: { icon: Plus, tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Dibuat" },
  updated: { icon: Pencil, tone: "text-sky-400 bg-sky-500/10 border-sky-500/20", label: "Diperbarui" },
  status_changed: { icon: RotateCcw, tone: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", label: "Status berubah" },
  completed: { icon: CheckCircle2, tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Selesai" },
  reopened: { icon: RotateCcw, tone: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Dibuka kembali" },
  snoozed: { icon: Bell, tone: "text-purple-400 bg-purple-500/10 border-purple-500/20", label: "Ditunda" },
  deleted: { icon: Trash2, tone: "text-rose-400 bg-rose-500/10 border-rose-500/20", label: "Dihapus" },
};

function dayLabel(iso, nowMs) {
  const d = new Date(iso);
  const now = new Date(nowMs);
  if (d.toDateString() === now.toDateString()) return "Hari ini";
  const y = new Date(nowMs - 86_400_000);
  if (d.toDateString() === y.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function describeChange(ev) {
  if (ev.event_type === "created") return "Tugas dibuat";
  if (ev.event_type === "deleted") return "Tugas dihapus";
  if (ev.changes?.status)
    return `Status: ${ev.changes.status.from} → ${ev.changes.status.to}`;
  const keys = Object.keys(ev.changes || {});
  if (keys.length === 0) return "";
  return `Diubah: ${keys.slice(0, 3).join(", ")}`;
}

export default function History() {
  const { user } = useAuth();
  const userId = user?.id;

  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from("task_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setEvents(data);
        setNow(Date.now());
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const grouped = useMemo(() => {
    if (!now) return [];
    const map = new Map();
    for (const ev of events) {
      const key = dayLabel(ev.created_at, now);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return Array.from(map, ([label, items]) => ({ label, items }));
  }, [events, now]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-white">Riwayat</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Catatan perubahan tugas yang tercatat otomatis oleh sistem.
        </p>
      </header>

      {loading ? (
        <div className="py-16 flex justify-center text-slate-500 text-xs">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat riwayat...
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <HistoryIcon className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada riwayat.</p>
          <p className="text-xs text-slate-600 mt-1">
            Aktivitas tugas Anda akan tampil di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <section key={label}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                {label}
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                {items.map((ev) => {
                  const meta = EVENT_META[ev.event_type] || EVENT_META.updated;
                  const Icon = meta.icon;
                  const time = new Date(ev.created_at).toLocaleTimeString(
                    "id-ID",
                    { hour: "2-digit", minute: "2-digit" }
                  );
                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 flex items-start gap-3 hover:bg-slate-800/30 transition"
                    >
                      <div
                        className={`p-1.5 rounded-md border shrink-0 ${meta.tone}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {ev.task_title}
                          </p>
                          <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                            {time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          <span className="text-slate-400">{meta.label}</span>
                          {describeChange(ev) && (
                            <>
                              {" · "}
                              <span>{describeChange(ev)}</span>
                            </>
                          )}
                          {" · "}
                          <span className="text-slate-600">
                            oleh {ev.actor}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}