import { useState, useEffect } from "react";
import {
  Sparkles,
  Brain,
  Clock,
  ShieldCheck,
  CalendarCheck,
  Check,
  Loader2,
} from "lucide-react";

const STEPS = [
  {
    icon: Brain,
    title: "Menganalisis prioritas",
    desc: "Membaca skor dan deadline tiap tugas",
    at: 0,
  },
  {
    icon: Clock,
    title: "Mencari slot kosong",
    desc: "Memeriksa kuliah, agenda, dan jam tidur",
    at: 4,
  },
  {
    icon: Sparkles,
    title: "Menyusun blok kerja",
    desc: "Memecah tugas besar menjadi sesi fokus",
    at: 9,
  },
  {
    icon: ShieldCheck,
    title: "Memvalidasi jadwal",
    desc: "Memastikan tidak ada bentrok",
    at: 16,
  },
  {
    icon: CalendarCheck,
    title: "Menyelesaikan",
    desc: "Menyimpan usulan jadwal",
    at: 22,
  },
];

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function TimelineLoadingState() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  let activeIndex = 0;
  STEPS.forEach((s, i) => {
    if (elapsed >= s.at) activeIndex = i;
  });

  // Progress linear mendekati 95%
  const progress = Math.min(95, Math.round((elapsed / 25) * 100));
  const isSlow = elapsed >= 25;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm"
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Menyusun jadwal dengan AI
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {STEPS[activeIndex].desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            Waktu
          </div>
          <div className="text-xs font-semibold tabular-nums text-slate-300">
            {formatTime(elapsed)}
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="h-1 w-full bg-slate-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>

      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        {/* DAFTAR LANGKAH */}
        <div className="border-b border-slate-800 p-4 md:border-b-0 md:border-r bg-slate-900/50">
          <ol className="space-y-2">
            {STEPS.map((s, i) => {
              const done = i < activeIndex;
              const active = i === activeIndex;
              const Icon = s.icon;

              return (
                <li
                  key={s.title}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    active ? "bg-slate-800/60" : "opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      done
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : active
                          ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                          : "border-slate-700 bg-slate-800 text-slate-500"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      done
                        ? "text-slate-300"
                        : active
                          ? "text-slate-200"
                          : "text-slate-500"
                    }`}
                  >
                    {s.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* SKELETON TIMELINE */}
        <div className="p-5 bg-slate-900">
          <div className="space-y-6 animate-pulse">
            {/* Mock Hari 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-2.5 w-32 rounded bg-slate-800" />
                  <div className="h-2 w-20 rounded bg-slate-800/60" />
                </div>
              </div>
              <div className="ml-4 pl-5 border-l-2 border-slate-800/80 space-y-2.5">
                <div className="h-12 w-full rounded-lg bg-slate-800/50" />
                <div className="h-12 w-[85%] rounded-lg bg-slate-800/50" />
                <div className="h-12 w-[92%] rounded-lg bg-slate-800/50" />
              </div>
            </div>

            {/* Mock Hari 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-2.5 w-28 rounded bg-slate-800" />
                  <div className="h-2 w-16 rounded bg-slate-800/60" />
                </div>
              </div>
              <div className="ml-4 pl-5 border-l-2 border-slate-800/80 space-y-2.5">
                <div className="h-12 w-[78%] rounded-lg bg-slate-800/50" />
                <div className="h-12 w-[90%] rounded-lg bg-slate-800/50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/40 px-5 py-3">
        <p className="text-[11px] text-slate-400">
          {isSlow
            ? "Server AI sedang sibuk, sistem mencoba lagi otomatis. Mohon tunggu sebentar…"
            : "Biasanya selesai dalam 10–30 detik. Jangan tutup halaman ini."}
        </p>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-indigo-400">
          {progress}%
        </span>
      </div>
    </div>
  );
}