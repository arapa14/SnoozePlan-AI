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
    const active = scoredTasks.filter(
      (t) => t.status === "todo" || t.status === "in_progress",
    ).length;
    const done = scoredTasks.filter((t) => t.status === "done").length;
    return { active, done, all: scoredTasks.length };
  }, [scoredTasks]);

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

  const handleCreateOrUpdate = async (payload) => {
    if (!userId) return;
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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Tugas & Agenda
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {counts.active} aktif · {counts.done} selesai
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg transition tabular-nums"
          >
            <Moon className="w-3 h-3 text-indigo-400" /> {sleepStart}–{sleepEnd}
          </Link>

          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </header>

      {/* FILTERS */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterStatus(t.value)}
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition ${
                filterStatus === t.value
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}{" "}
              <span
                className={`text-[10px] tabular-nums ${
                  filterStatus === t.value
                    ? "text-indigo-400"
                    : "text-slate-600"
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
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST TUGAS */}
      <div className="space-y-2">
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
      <section className="pt-6 border-t border-slate-800">
        {/* HEADER TIMELINE (Tombol Overdue & Jadwalkan tetap di sini) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-400" /> Timeline
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activePlan
                ? `Jadwal aktif · ${new Date(activePlan.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Jadwal kerja 7 hari ke depan"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={includeOverdue}
                onChange={(e) => setIncludeOverdue(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 rounded border-slate-700 bg-slate-800"
              />
              <span className="text-[11px] text-slate-300 font-medium select-none hidden sm:inline">
                Sertakan Terlambat
              </span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
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
          <div className="mb-6 bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Usulan Jadwal Baru
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {proposedPlan.summary}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={rejectSchedule}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" /> Tolak
              </button>
              <button
                onClick={approveSchedule}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-950 bg-indigo-400 hover:bg-indigo-300 rounded-lg transition"
              >
                <Check className="w-3.5 h-3.5" /> Setujui Jadwal
              </button>
            </div>
          </div>
        )}

        {/* Warnings */}
        {timelineWarnings?.length > 0 && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-300">
                Catatan Jadwal
              </p>
              <ul className="text-[11px] text-amber-400/80 mt-1 list-disc list-inside">
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
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-rose-300">
                Gagal menyusun jadwal
              </p>
              <p className="text-xs text-rose-400/80 mt-0.5 break-words">
                {timelineError}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 underline shrink-0 disabled:opacity-50"
            >
              Coba lagi
            </button>
          </div>
        ) : proposedPlan ? (
          // ===== MODE COMPARE (LAMA VS BARU) =====
          <div className="space-y-6">
            {/* Jadwal Usulan (BARU) */}
            <div className="border-2 border-indigo-500/40 rounded-2xl p-4 bg-slate-900 shadow-lg shadow-indigo-500/10">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-[11px] uppercase text-indigo-400 font-bold tracking-wider">
                    Usulan Jadwal Baru (Pratinjau)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
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
                <div className="absolute inset-0 bg-slate-950/60 z-10 flex items-center justify-center rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-slate-300 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 shadow-xl">
                    Ini adalah jadwal yang akan digantikan
                  </span>
                </div>
                <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40 opacity-40 grayscale-[50%]">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                    <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                    <span className="text-[11px] uppercase text-slate-400 font-bold tracking-wider">
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
          <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/30">
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
          className="h-16 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-12 text-center">
      <div className="w-12 h-12 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-3">
        <CalendarDays className="w-5 h-5 text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-300 mb-1">Belum ada tugas</p>
      <p className="text-xs text-slate-500 mb-4">
        Mulai dengan menambahkan tugas atau agenda pertama Anda.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
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
          className="h-32 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyTimeline({ onGenerate, disabled }) {
  return (
    <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-8 text-center">
      <div className="w-12 h-12 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-3">
        <CalendarClock className="w-5 h-5 text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-300 mb-1">
        Belum ada jadwal
      </p>
      <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
        Klik tombol di bawah untuk menyusun timeline otomatis berdasarkan
        prioritas tugas, agenda, dan jam tidur Anda.
      </p>
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Jadwalkan sekarang
      </button>
    </div>
  );
}
