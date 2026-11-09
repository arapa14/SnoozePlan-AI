import { useMemo } from "react";
import { Clock, Coffee, Zap, Moon, Briefcase } from "lucide-react";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtTime(d) {
  return new Date(d)
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(":", ".");
}

function durationMin(start, end) {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
}

export default function TimelineView({
  blocks,
  sleepStart = "22:00",
  sleepEnd = "06:00",
  horizonDays = 7,
}) {
  const days = useMemo(() => {
    const start = startOfDay(new Date());
    return Array.from({ length: horizonDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [horizonDays]);

  const grouped = useMemo(() => {
    return days
      .map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        // 1. Ambil semua blok (kerja + agenda) untuk hari ini
        const dayBlocks = blocks
          .filter((b) => {
            const s = new Date(b.start_at);
            return s >= dayStart && s < dayEnd;
          })
          .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

        // 2. Buat blok tidur imajiner
        const [sh, sm] = sleepStart.split(":").map(Number);
        const [eh, em] = sleepEnd.split(":").map(Number);

        const morningSleepEnd = new Date(dayStart);
        morningSleepEnd.setHours(eh, em, 0, 0);
        const nightSleepStart = new Date(dayStart);
        nightSleepStart.setHours(sh, sm, 0, 0);

        const sleepBlocks = [];
        if (eh < 12) {
          sleepBlocks.push({
            id: `sleep-m-${day.toISOString()}`,
            kind: "sleep",
            start_at: dayStart,
            end_at: morningSleepEnd,
            task_title: "Tidur Pagi",
          });
        }
        sleepBlocks.push({
          id: `sleep-n-${day.toISOString()}`,
          kind: "sleep",
          start_at: nightSleepStart,
          end_at: new Date(dayEnd.getTime() - 60000),
          task_title: "Tidur Malam",
        });

        // 3. Gabungkan dan urutkan berdasarkan waktu
        const allItems = [...dayBlocks, ...sleepBlocks].sort(
          (a, b) => new Date(a.start_at) - new Date(b.start_at),
        );

        // 4. Hitung total jam (Tugas + Agenda)
        const totalMins = dayBlocks
          .filter((b) => b.kind === "work" || b.kind === "agenda")
          .reduce((acc, b) => acc + durationMin(b.start_at, b.end_at), 0);

        return { day, items: allItems, totalMins };
      })
      .filter((d) =>
        d.items.some((i) => i.kind === "work" || i.kind === "agenda"),
      ); // Sembunyikan hari yang kosong
  }, [days, blocks, sleepStart, sleepEnd]);

  if (grouped.length === 0) return null;

  return (
    <div className="space-y-6">
      {grouped.map(({ day, items, totalMins }) => (
        <div
          key={day.toISOString()}
          className="bg-surface border border-line rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Header Hari */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface/80">
            <div className="flex items-center gap-3">
              <div className="bg-mint/10 border border-mint/20 text-mint p-2 rounded-xl">
                <span className="text-sm font-bold block leading-none">
                  {day.toLocaleDateString("id-ID", { day: "2-digit" })}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  {day.toLocaleDateString("id-ID", {
                    weekday: "long",
                    month: "long",
                    year: "numeric",
                  })}
                  {day.toDateString() === new Date().toDateString() && (
                    <span className="ml-2 align-middle text-[10px] font-semibold text-mint bg-mint/10 border border-mint/20 px-1.5 py-0.5 rounded">
                      Hari ini
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-ink-2 mt-0.5">
                  Total Beban:{" "}
                  <span className="font-semibold text-mint">
                    {Math.round((totalMins / 60) * 10) / 10} Jam
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Rail */}
          <div className="p-4 sm:p-5 relative">
            {/* Garis Vertikal */}
            <div className="absolute left-[31px] sm:left-[39px] top-6 bottom-6 w-px bg-raised" />

            <div className="space-y-3">
              {items.map((b) => {
                const isSleep = b.kind === "sleep";
                const isBreak = b.kind === "break";
                const isAgenda = b.kind === "agenda";
                const isWork = b.kind === "work";
                const mins = durationMin(b.start_at, b.end_at);

                return (
                  <div key={b.id} className="relative flex items-start gap-4">
                    {/* Node / Dot */}
                    <div
                      className={`relative z-10 mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-1 sm:ml-2 ${
                        isSleep
                          ? "bg-canvas border-ink-3"
                          : isBreak
                            ? "bg-raised border-ink-3"
                            : isAgenda
                              ? "bg-danger/30 border-danger"
                              : "bg-brand/30 border-mint"
                      }`}
                    >
                      {isWork && (
                        <div className="w-1.5 h-1.5 bg-mint rounded-full" />
                      )}
                      {isAgenda && (
                        <div className="w-1.5 h-1.5 bg-danger rounded-full" />
                      )}
                      {isSleep && (
                        <div className="w-1.5 h-1.5 bg-ink-3 rounded-full" />
                      )}
                    </div>

                    {/* Card Content */}
                    <div
                      className={`flex-1 p-3 rounded-xl border transition-all ${
                        isSleep
                          ? "bg-surface/40 border-line/50 opacity-60"
                          : isBreak
                            ? "bg-raised/20 border-line/60 border-dashed"
                            : isAgenda
                              ? "bg-danger/10 border-danger/30 shadow-sm"
                              : "bg-canvas border-line hover:border-line-strong shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          {isSleep ? (
                            <Moon className="w-3.5 h-3.5 text-mint" />
                          ) : isBreak ? (
                            <Coffee className="w-3.5 h-3.5 text-ink-3" />
                          ) : isAgenda ? (
                            <Briefcase className="w-3.5 h-3.5 text-danger" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-mint" />
                          )}
                          <p
                            className={`text-xs sm:text-sm font-semibold ${
                              isSleep
                                ? "text-ink-2"
                                : isBreak
                                  ? "text-ink-2"
                                  : isAgenda
                                    ? "text-danger"
                                    : "text-ink"
                            }`}
                          >
                            {b.task_title || (isBreak ? "Istirahat" : "Tugas")}

                            {isAgenda && (
                              <span className="ml-2 text-[10px] bg-danger/20 text-danger px-1.5 py-0.5 rounded font-medium">
                                Agenda Tetap
                              </span>
                            )}
                            {isWork && b.chunk_index > 1 && (
                              <span className="ml-2 text-[10px] bg-raised text-ink-2 px-1.5 py-0.5 rounded font-medium">
                                Bagian {b.chunk_index}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-2 bg-surface/50 px-2 py-1 rounded w-fit tabular-nums">
                          <Clock className="w-3 h-3" />
                          {fmtTime(b.start_at)} – {fmtTime(b.end_at)}
                          <span className="text-ink-4">•</span>
                          <span className="font-semibold text-ink-2">
                            {mins} mnt
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
