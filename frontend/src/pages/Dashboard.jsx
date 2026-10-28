import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { computePriorityScore, DEFAULT_WEIGHTS } from "../lib/priority";
import TaskForm from "../components/TaskForm";
import TaskCard from "../components/TaskCard";
import { Plus, Moon, CalendarDays } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "Semua" },
  { value: "kuliah", label: "Kuliah" },
  { value: "praktikum", label: "Praktikum" },
  { value: "organisasi", label: "Organisasi" },
  { value: "pribadi", label: "Pribadi" },
];

async function fetchDashboardData(userId) {
  const [taskRes, prefsRes] = await Promise.all([
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
  ]);
  if (taskRes.error) throw taskRes.error;
  return {
    tasks: taskRes.data || [],
    prefs: prefsRes.error ? null : prefsRes.data,
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
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [now, setNow] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetchDashboardData(userId)
      .then((data) => {
        if (cancelled) return;
        setTasks(data.tasks);
        if (data.prefs) {
          setPrefs(data.prefs);
          setWeights(weightsFromPrefs(data.prefs));
        }
        setNow(Date.now());
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Gagal memuat dashboard:", err);
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

  const stats = useMemo(() => {
    if (!now) return { overdue: 0, totalHours: 0 };
    const active = scoredTasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled",
    );
    const overdue = active.filter(
      (t) => t.deadline && new Date(t.deadline).getTime() < now,
    );
    const totalMinutes = active.reduce(
      (s, t) => s + (t.estimated_minutes || 0),
      0,
    );
    return {
      overdue: overdue.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    };
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

  const openNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleCreateOrUpdate = async (payload) => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const { score, factors } = computePriorityScore(payload, weights);

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            ...payload,
            priority_score: score,
            priority_factors: factors,
            priority_computed_at: new Date().toISOString(),
          })
          .eq("id", editingTask.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({
          user_id: userId,
          ...payload,
          status: "todo",
          priority_score: score,
          priority_factors: factors,
          priority_computed_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

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
    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", task.id)
      .eq("user_id", userId);
    if (error) alert("Gagal memperbarui status: " + error.message);
    else refreshData();
  };

  const handleDelete = async (task) => {
    if (!userId) return;
    if (
      !confirm(
        `Hapus tugas "${task.title}"? Riwayat tetap tercatat di task_events.`,
      )
    )
      return;
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", userId);
    if (error) alert("Gagal menghapus: " + error.message);
    else refreshData();
  };

  const sleepStart = prefs?.sleep_start?.slice(0, 5) || "22:00";
  const sleepEnd = prefs?.sleep_end?.slice(0, 5) || "06:00";

  const TABS = [
    { value: "active", label: "Aktif", count: counts.active },
    { value: "done", label: "Selesai", count: counts.done },
    { value: "all", label: "Semua", count: counts.all },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Tugas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {counts.active} aktif
            {stats.overdue > 0 && (
              <>
                {" · "}
                <span className="text-rose-400 font-medium">
                  {stats.overdue} terlambat
                </span>
              </>
            )}
            {" · "}
            {stats.totalHours} jam beban
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg transition tabular-nums"
            title="Atur jam tidur di Pengaturan"
          >
            <Moon className="w-3 h-3 text-indigo-400" />
            {sleepStart}–{sleepEnd}
          </Link>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {TABS.map((t) => {
            const active = filterStatus === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFilterStatus(t.value)}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
                <span
                  className={`text-[10px] tabular-nums ${
                    active ? "text-indigo-400" : "text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-0.5 flex-wrap">
          {CATEGORIES.map((c) => {
            const active = filterCategory === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setFilterCategory(c.value)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
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
        Mulai dengan menambahkan tugas pertama Anda.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        Tambah tugas
      </button>
    </div>
  );
}
