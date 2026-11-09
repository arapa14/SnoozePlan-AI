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
  created: {
    icon: Plus,
    tone: "text-mint bg-mint/10 border-mint/20",
    label: "Dibuat",
  },
  updated: {
    icon: Pencil,
    tone: "text-info bg-info/10 border-info/20",
    label: "Diperbarui",
  },
  status_changed: {
    icon: RotateCcw,
    tone: "text-pale bg-pale/10 border-pale/20",
    label: "Status berubah",
  },
  completed: {
    icon: CheckCircle2,
    tone: "text-mint bg-mint/10 border-mint/20",
    label: "Selesai",
  },
  reopened: {
    icon: RotateCcw,
    tone: "text-warn bg-warn/10 border-warn/20",
    label: "Dibuka kembali",
  },
  snoozed: {
    icon: Bell,
    tone: "text-lilac bg-lilac/10 border-lilac/20",
    label: "Ditunda",
  },
  deleted: {
    icon: Trash2,
    tone: "text-danger bg-danger/10 border-danger/20",
    label: "Dihapus",
  },
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
        <h1 className="text-xl font-bold text-ink">Riwayat</h1>
        <p className="text-xs text-ink-3 mt-0.5">
          Catatan perubahan tugas yang tercatat otomatis oleh sistem.
        </p>
      </header>

      {loading ? (
        <div className="py-16 flex justify-center text-ink-3 text-xs">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat riwayat...
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-10 text-center">
          <HistoryIcon className="w-8 h-8 text-ink-4 mx-auto mb-3" />
          <p className="text-sm text-ink-2">Belum ada riwayat.</p>
          <p className="text-xs text-ink-4 mt-1">
            Aktivitas tugas Anda akan tampil di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <section key={label}>
              <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2 px-1">
                {label}
              </h2>
              <div className="bg-surface border border-line rounded-xl divide-y divide-line">
                {items.map((ev) => {
                  const meta = EVENT_META[ev.event_type] || EVENT_META.updated;
                  const Icon = meta.icon;
                  const time = new Date(ev.created_at).toLocaleTimeString(
                    "id-ID",
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 flex items-start gap-3 hover:bg-raised/30 transition"
                    >
                      <div
                        className={`p-1.5 rounded-md border shrink-0 ${meta.tone}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-ink truncate">
                            {ev.task_title}
                          </p>
                          <span className="text-[10px] text-ink-3 tabular-nums shrink-0">
                            {time}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-3 mt-0.5">
                          <span className="text-ink-2">{meta.label}</span>
                          {describeChange(ev) && (
                            <>
                              {" · "}
                              <span>{describeChange(ev)}</span>
                            </>
                          )}
                          {" · "}
                          <span className="text-ink-4">oleh {ev.actor}</span>
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
