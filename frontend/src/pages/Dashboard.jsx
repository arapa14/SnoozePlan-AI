import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { computePriorityScore, DEFAULT_WEIGHTS } from "../lib/priority";
import TaskForm from "../components/TaskForm";
import TaskCard from "../components/TaskCard";
import { useSchedule } from "../hooks/useSchedule";
import TimelineView from "../components/TimelineView";
import TimelineLoadingState from "../components/TimelineLoadingState";
import {
  Plus,
  Moon,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  CalendarClock,
  Check,
  X,
  ArrowRightLeft,
  ListTodo,
  CheckCircle2,
  Clock,
  Flame,
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "Semua" },
  { value: "kuliah", label: "Kuliah" },
  { value: "praktikum", label: "Praktikum" },
  { value: "organisasi", label: "Organisasi" },
  { value: "pribadi", label: "Pribadi" },
];

async function fetchDashboardData(userId) {
  const [taskRes, prefsRes, fixedRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("fixed_schedules")
      .select("id, title, day_of_week, start_time, end_time")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);
  if (taskRes.error) throw taskRes.error;
  return {
    tasks: taskRes.data || [],
    prefs: prefsRes.error ? null : prefsRes.data,
    fixedSchedules: fixedRes.error ? [] : fixedRes.data || [],
  };
}

function weightsFromPrefs(prefs) {
  if (!prefs) return DEFAULT_WEIGHTS;
  return {
    w_urgency: Number(prefs.w_urgency),
    w_importance: Number(prefs.w_importance),
    w_consequence: Number(prefs.w_consequence),
    w_duration: Number(prefs.w_duration),
    w_availability: Number(prefs.w_availability),
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [fixedSchedules, setFixedSchedules] = useState([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [now, setNow] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [includeOverdue, setIncludeOverdue] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    activePlan,
    activeBlocks,
    proposedPlan,
    proposedBlocks,
    loading: timelineLoading,
    generating,
    error: timelineError,
    warnings: timelineWarnings,
    generateSchedule,
    approveSchedule,
    rejectSchedule,
  } = useSchedule(userId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetchDashboardData(userId)
      .then((data) => {
        if (cancelled) return;
        setTasks(data.tasks);
        setFixedSchedules(data.fixedSchedules);
        if (data.prefs) {
          setPrefs(data.prefs);
          setWeights(weightsFromPrefs(data.prefs));
        }
        setNow(Date.now());
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshData = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchDashboardData(userId);
      setTasks(data.tasks);
      setFixedSchedules(data.fixedSchedules);
      if (data.prefs) {
        setPrefs(data.prefs);
        setWeights(weightsFromPrefs(data.prefs));
      }
      setNow(Date.now());
    } catch (err) {
      console.error("Gagal refresh:", err);
    }
  }, [userId]);

  const scoredTasks = useMemo(() => {
    if (!now) return [];
    return tasks
      .map((t) => {
        const { score, critical } = computePriorityScore(
          t,
          weights,
          new Date(now),
        );
        return { ...t, score, critical };
      })
      .sort((a, b) => b.score - a.score);
  }, [tasks, weights, now]);

  const counts = useMemo(() => {
    const isActive = (t) => t.status === "todo" || t.status === "in_progress";
    const active = scoredTasks.filter(isActive).length;
    const done = scoredTasks.filter((t) => t.status === "done").length;
    const overdue = now
      ? scoredTasks.filter(
          (t) => isActive(t) && t.deadline && new Date(t.deadline).getTime() < now,
        ).length
      : 0;
    const critical = scoredTasks.filter((t) => isActive(t) && t.critical).length;
    return { active, done, overdue, critical, all: scoredTasks.length };
  }, [scoredTasks, now]);

  const visibleTasks = useMemo(
    () =>
      scoredTasks.filter((t) => {
        if (filterCategory !== "all" && t.category !== filterCategory)
          return false;
        if (filterStatus === "active")
          return t.status === "todo" || t.status === "in_progress";
        if (filterStatus === "done") return t.status === "done";
        return true;
      }),
    [scoredTasks, filterCategory, filterStatus],
  );

  // 1. Siapkan Agenda Aktif (yang saat ini berjalan)
  const activeAgendas = useMemo(() => {
    return tasks
      .filter((t) => t.fixed_start_at && t.status !== "done")
      .map((t) => ({
        id: `agenda-act-${t.id}`,
        kind: "agenda",
        task_title: t.title,
        start_at: t.fixed_start_at,
        end_at: t.fixed_end_at,
        chunk_index: 1,
      }));
  }, [tasks]);

  // 2. Siapkan Agenda Usulan (untuk pratinjau)
  const proposedAgendas = useMemo(() => {
    return tasks
      .filter((t) => t.fixed_start_at && t.status !== "done")
      .map((t) => ({
        id: `agenda-prop-${t.id}`,
        kind: "agenda",
        task_title: t.title,
        start_at: t.fixed_start_at,
        end_at: t.fixed_end_at,
        chunk_index: 1,
      }));
  }, [tasks]);

  // 3. Gabungkan Blok AI dengan Agenda
  const finalActiveBlocks = useMemo(
    () => [...activeBlocks, ...activeAgendas],
    [activeBlocks, activeAgendas],
  );
  const finalProposedBlocks = useMemo(
    () => [...proposedBlocks, ...proposedAgendas],
    [proposedBlocks, proposedAgendas],
  );

  const openNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const checkSleepConflict = (startStr, endStr) => {
    if (!startStr || !endStr || !prefs) return false;
    const s = new Date(startStr);
    const e = new Date(endStr);
    const [sh, sm] = (prefs.sleep_start || "22:00").split(":").map(Number);
    const [eh, em] = (prefs.sleep_end || "06:00").split(":").map(Number);

    // Cek di hari sebelum, hari H, dan hari setelahnya (karena tidur bisa lewat tengah malam)
    for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
      const day = new Date(s);
      day.setDate(day.getDate() + dayOffset);
      day.setHours(0, 0, 0, 0);

      const ws = new Date(day);
      ws.setHours(sh, sm, 0, 0);
      const we = new Date(day);
      we.setHours(eh, em, 0, 0);
      if (we <= ws) we.setDate(we.getDate() + 1); // Tidur lewat tengah malam

      if (s < we && e > ws) return true; // Ada irisan waktu
    }
    return false;
  };

  const handleCreateOrUpdate = async (payload) => {
    if (!userId) return;

    // VALIDASI SLEEP-GUARD UNTUK AGENDA TETAP
    if (payload.fixed_start_at && payload.fixed_end_at) {
      if (checkSleepConflict(payload.fixed_start_at, payload.fixed_end_at)) {
        alert("Gagal: Agenda Tetap tidak boleh diletakkan di dalam zona jam tidur Anda.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const { score, factors } = computePriorityScore(payload, weights);
      const payloadWithScores = {
        ...payload,
        priority_score: score,
        priority_factors: factors,
        priority_computed_at: new Date().toISOString(),
      };

      let error;
      if (editingTask) {
        const { error: err } = await supabase
          .from("tasks")
          .update(payloadWithScores)
          .eq("id", editingTask.id)
          .eq("user_id", userId);
        error = err;
      } else {
        const { error: err } = await supabase.from("tasks").insert({
          user_id: userId,
          ...payloadWithScores,
          status: "todo",
        });
        error = err;
      }

      if (error) throw error;

      setFormOpen(false);
      setEditingTask(null);
      await refreshData();
    } catch (err) {
      alert("Gagal menyimpan tugas: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (task) => {
    if (!userId) return;
    const nextStatus = task.status === "done" ? "todo" : "done";
    await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", task.id)
      .eq("user_id", userId);
    refreshData();
  };

  const handleDelete = async (task) => {
    if (!userId || !confirm(`Hapus tugas "${task.title}"?`)) return;
    await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", userId);
    refreshData();
  };

  const handleGenerate = async () => {
    if (!userId) return;

    let activeTasks = scoredTasks.filter(
      (t) => t.status === "todo" || t.status === "in_progress",
    );

    if (!includeOverdue) {
      activeTasks = activeTasks.filter(
        (t) => !t.deadline || new Date(t.deadline).getTime() > Date.now(),
      );
    }

    const fixed_events = activeTasks
      .filter((t) => t.fixed_start_at && t.fixed_end_at)
      .map((t) => ({
        start_at: t.fixed_start_at,
        end_at: t.fixed_end_at,
        title: t.title,
      }));

    const flexible_tasks = activeTasks.filter((t) => !t.fixed_start_at);

    if (flexible_tasks.length === 0) {
      alert(
        "Tidak ada tugas fleksibel untuk dijadwalkan. (Agenda tetap tidak perlu dijadwalkan ulang).",
      );
      return;
    }

    const start = new Date();
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    const horizonStart = start.toISOString();
    const horizonEnd = new Date(
      start.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    try {
      await generateSchedule({
        tasks: flexible_tasks.map((t) => ({
          id: t.id,
          title: t.title,
          estimated_minutes: t.estimated_minutes,
          deadline: t.deadline,
          priority_score: t.score,
          category: t.category,
        })),
        fixed_events: fixed_events,
        fixed_schedules: fixedSchedules.map((f) => ({
          day_of_week: f.day_of_week,
          start_time: f.start_time,
          end_time: f.end_time,
          title: f.title,
        })),
        preferences: {
          timezone: prefs?.timezone || "Asia/Jakarta",
          sleep_start: prefs?.sleep_start || "22:00",
          sleep_end: prefs?.sleep_end || "06:00",
          work_block_minutes: prefs?.work_block_minutes || 50,
          break_minutes: prefs?.break_minutes || 10,
          max_daily_work_minutes: prefs?.max_daily_work_minutes || 480,
        },
        horizon_start: horizonStart,
        horizon_end: horizonEnd,
        now: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Generate schedule error:", err);
    }
  };

  const sleepStart = prefs?.sleep_start?.slice(0, 5) || "22:00";
  const sleepEnd = prefs?.sleep_end?.slice(0, 5) || "06:00";

  const TABS = [
    { value: "active", label: "Aktif", count: counts.active },
    { value: "done", label: "Selesai", count: counts.done },
    { value: "all", label: "Semua", count: counts.all },
  ];

  const canGenerate = !generating && counts.active > 0 && !proposedPlan;

  return (
    <div className="space-y-6">
      {/* HEADER UTAMA */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Tugas & Agenda
          </h1>
          <p className="text-xs text-ink-3 mt-1">
            {now
              ? new Date(now).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-ink-2 bg-surface border border-line hover:border-line-strong px-2.5 py-1.5 rounded-lg transition tabular-nums"
          >
            <Moon className="w-3 h-3 text-mint" /> {sleepStart}–{sleepEnd}
          </Link>

          <button
            id="tour-add-task"
            onClick={openNew}
            className="flex items-center gap-1.5 bg-mint hover:bg-pale text-canvas text-xs font-semibold px-3.5 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </header>

      {/* RINGKASAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Aktif" value={counts.active} icon={ListTodo} tone="mint" />
        <StatCard label="Selesai" value={counts.done} icon={CheckCircle2} tone="info" />
        <StatCard label="Terlambat" value={counts.overdue} icon={Clock} tone="warn" />
        <StatCard label="Kritis" value={counts.critical} icon={Flame} tone="danger" />
      </div>

      {/* FILTERS */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-0.5 bg-surface border border-line rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterStatus(t.value)}
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition ${
                filterStatus === t.value
                  ? "bg-raised text-ink"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {t.label}{" "}
              <span
                className={`text-[10px] tabular-nums ${
                  filterStatus === t.value
                    ? "text-mint"
                    : "text-ink-4"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition ${
                filterCategory === c.value
                  ? "bg-raised text-ink"
                  : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST TUGAS */}
      <div id="tour-task-list" className="space-y-2">
        {loading ? (
          <LoadingState />
        ) : visibleTasks.length === 0 ? (
          <EmptyState onCreate={openNew} />
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              score={task.score}
              critical={task.critical}
              now={now}
              onToggle={handleToggle}
              onEdit={(t) => {
                setEditingTask(t);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* TIMELINE SECTION */}
      <section id="tour-timeline" className="pt-6 border-t border-line">
        {/* HEADER TIMELINE (Tombol Overdue & Jadwalkan tetap di sini) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-mint" /> Timeline
            </h2>
            <p className="text-[11px] text-ink-3 mt-0.5">
              {activePlan
                ? `Jadwal aktif · ${new Date(activePlan.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Jadwal kerja 7 hari ke depan"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              id="tour-overdue-toggle"
              className="flex items-center gap-2 cursor-pointer bg-surface px-3 py-2 rounded-lg border border-line hover:border-line-strong transition"
            >
              <input
                type="checkbox"
                checked={includeOverdue}
                onChange={(e) => setIncludeOverdue(e.target.checked)}
                className="w-3.5 h-3.5 accent-mint rounded border-line-strong bg-raised"
              />
              <span className="text-[11px] text-ink-2 font-medium select-none hidden sm:inline">
                Sertakan Terlambat
              </span>
            </label>

            <button
              id="tour-generate-btn"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-1.5 bg-mint/10 hover:bg-mint/20 border border-mint/30 disabled:opacity-50 text-mint text-xs font-semibold px-3.5 py-2 rounded-lg transition"
            >
              <RefreshCw
                className={`w-4 h-4 ${generating ? "animate-spin" : ""}`}
              />
              {generating ? "Menyusun…" : "Jadwalkan"}
            </button>
          </div>
        </div>

        {/* Banner Persetujuan Usulan */}
        {proposedPlan && !generating && (
          <div className="mb-6 bg-brand/10 border border-mint/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-pale flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Usulan Jadwal Baru
              </h3>
              <p className="text-xs text-ink-2 mt-1">
                {proposedPlan.summary}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={rejectSchedule}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-2 bg-raised hover:bg-line-strong rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" /> Tolak
              </button>
              <button
                onClick={approveSchedule}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-canvas bg-mint hover:bg-pale rounded-lg transition"
              >
                <Check className="w-3.5 h-3.5" /> Setujui Jadwal
              </button>
            </div>
          </div>
        )}

        {/* Warnings */}
        {timelineWarnings?.length > 0 && (
          <div className="mb-4 bg-warn/10 border border-warn/20 rounded-xl p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-warn">
                Catatan Jadwal
              </p>
              <ul className="text-[11px] text-warn/80 mt-1 list-disc list-inside">
                {timelineWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* RENDER TIMELINE BERDASARKAN STATE */}
        {timelineLoading ? (
          <TimelineSkeleton />
        ) : generating ? (
          <TimelineLoadingState /> // <--- Loading UI baru
        ) : timelineError ? (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-danger">
                Gagal menyusun jadwal
              </p>
              <p className="text-xs text-danger/80 mt-0.5 break-words">
                {timelineError}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="text-[11px] font-semibold text-danger hover:text-danger underline shrink-0 disabled:opacity-50"
            >
              Coba lagi
            </button>
          </div>
        ) : proposedPlan ? (
          // ===== MODE COMPARE (LAMA VS BARU) =====
          <div className="space-y-6">
            {/* Jadwal Usulan (BARU) */}
            <div className="border-2 border-mint/40 rounded-2xl p-4 bg-surface shadow-lg shadow-mint/10">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-mint" />
                  <span className="text-[11px] uppercase text-mint font-bold tracking-wider">
                    Usulan Jadwal Baru (Pratinjau)
                  </span>
                </div>
                <span className="text-[10px] text-ink-3 bg-raised px-2 py-0.5 rounded">
                  Belum disimpan
                </span>
              </div>
              <TimelineView
                blocks={finalProposedBlocks}
                sleepStart={sleepStart}
                sleepEnd={sleepEnd}
              />
            </div>

            {/* Jadwal Aktif Sebelumnya (LAMA) */}
            {finalActiveBlocks.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 bg-canvas/60 z-10 flex items-center justify-center rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-ink-2 bg-surface px-3 py-1.5 rounded-full border border-line shadow-xl">
                    Ini adalah jadwal yang akan digantikan
                  </span>
                </div>
                <div className="border border-line rounded-2xl p-4 bg-surface/40 opacity-40 grayscale-[50%]">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-line">
                    <ArrowRightLeft className="w-4 h-4 text-ink-3" />
                    <span className="text-[11px] uppercase text-ink-2 font-bold tracking-wider">
                      Jadwal Lama (Aktif Saat Ini)
                    </span>
                  </div>
                  <TimelineView
                    blocks={finalActiveBlocks}
                    sleepStart={sleepStart}
                    sleepEnd={sleepEnd}
                  />
                </div>
              </div>
            )}
          </div>
        ) : finalActiveBlocks.length > 0 ? (
          // ===== MODE NORMAL (HANYA JADWAL AKTIF) =====
          <div className="border border-line rounded-2xl p-4 bg-surface/30">
            <TimelineView
              blocks={finalActiveBlocks}
              sleepStart={sleepStart}
              sleepEnd={sleepEnd}
            />
          </div>
        ) : (
          <EmptyTimeline onGenerate={handleGenerate} disabled={!canGenerate} />
        )}
      </section>

      <TaskForm
        key={`form-${editingTask?.id ?? "new"}`}
        open={formOpen}
        initialTask={editingTask}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateOrUpdate}
        submitting={submitting}
      />
    </div>
  );
}

// ===== SUB-KOMPONEN (SKELETON & EMPTY STATE) =====

function LoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 bg-surface border border-line rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="bg-surface border border-line border-dashed rounded-xl p-12 text-center">
      <div className="w-12 h-12 bg-raised/60 rounded-full flex items-center justify-center mx-auto mb-3">
        <CalendarDays className="w-5 h-5 text-ink-4" />
      </div>
      <p className="text-sm font-medium text-ink-2 mb-1">Belum ada tugas</p>
      <p className="text-xs text-ink-3 mb-4">
        Mulai dengan menambahkan tugas atau agenda pertama Anda.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint hover:text-pale transition"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah Item
      </button>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-32 bg-surface border border-line rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyTimeline({ onGenerate, disabled }) {
  return (
    <div className="bg-surface border border-line border-dashed rounded-xl p-8 text-center">
      <div className="w-12 h-12 bg-raised/60 rounded-full flex items-center justify-center mx-auto mb-3">
        <CalendarClock className="w-5 h-5 text-ink-4" />
      </div>
      <p className="text-sm font-medium text-ink-2 mb-1">
        Belum ada jadwal
      </p>
      <p className="text-xs text-ink-3 mb-4 max-w-sm mx-auto">
        Klik tombol di bawah untuk menyusun timeline otomatis berdasarkan
        prioritas tugas, agenda, dan jam tidur Anda.
      </p>
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint hover:text-pale disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Jadwalkan sekarang
      </button>
    </div>
  );
}

const STAT_TONES = {
  mint: "text-mint bg-mint/10 border-mint/20",
  info: "text-info bg-info/10 border-info/20",
  warn: "text-warn bg-warn/10 border-warn/20",
  danger: "text-danger bg-danger/10 border-danger/20",
};

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 flex items-center gap-3">
      <div className={`p-2 rounded-lg border ${STAT_TONES[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-ink leading-none tabular-nums">
          {value}
        </p>
        <p className="text-[11px] text-ink-3 mt-1">{label}</p>
      </div>
    </div>
  );
}
