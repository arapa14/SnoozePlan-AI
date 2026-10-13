import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import axios from "axios";
import {
  Moon,
  ShieldCheck,
  RefreshCw,
  Plus,
  Clock,
  LogOut,
  X,
  Loader2,
  CalendarDays,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    category: "AKADEMIK",
    estimated_minutes: 60,
    deadline: "",
    priority: "MEDIUM",
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function fetchDashboardData() {
      setLoading(true);
      try {
        // 1. Ambil tugas aktif
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .order("deadline", { ascending: true });

        if (taskError) throw taskError;

        // 2. Ambil jadwal aktif
        const { data: scheduleData, error: scheduleError } = await supabase
          .from("schedules")
          .select("*")
          .eq("user_id", user.id)
          .order("start_time", { ascending: true });

        if (scheduleError) throw scheduleError;

        if (isMounted) {
          setTasks(taskData || []);
          setSchedules(scheduleData || []);
        }
      } catch (err) {
        console.error("Gagal memuat data dashboard:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Fungsi helper terpisah jika butuh refresh manual (misal setelah tambah tugas / reschedule)
  const refreshData = async () => {
    if (!user) return;
    try {
      const [{ data: taskData }, { data: scheduleData }] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .order("deadline", { ascending: true }),
        supabase
          .from("schedules")
          .select("*")
          .eq("user_id", user.id)
          .order("start_time", { ascending: true }),
      ]);

      if (taskData) setTasks(taskData);
      if (scheduleData) setSchedules(scheduleData);
    } catch (err) {
      console.error("Gagal memperbarui data:", err);
    }
  };

  // Handler Tambah Tugas
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmittingTask(true);
    try {
      const payload = {
        user_id: user.id,
        title: taskForm.title,
        category: taskForm.category,
        estimated_minutes: parseInt(taskForm.estimated_minutes, 10),
        deadline: new Date(taskForm.deadline).toISOString(),
        priority: taskForm.priority,
      };

      const { error } = await supabase.from("tasks").insert([payload]);
      if (error) throw error;

      setIsModalOpen(false);
      setTaskForm({
        title: "",
        category: "AKADEMIK",
        estimated_minutes: 60,
        deadline: "",
        priority: "MEDIUM",
      });
      await refreshData();
    } catch (err) {
      alert("Gagal menambahkan tugas: " + err.message);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Handler Trigger AI Reschedule
  const handleTriggerReschedule = async () => {
    if (!user) return;
    setIsRescheduling(true);

    try {
      // Ambil jadwal tetap (misal kuliah yang terkunci)
      const fixedSchedules = schedules.filter((s) => s.is_locked);

      const res = await axios.post(`${API_URL}/reschedule/optimize`, {
        profile: {
          target_sleep_hours: profile?.target_sleep_hours || 7.0,
          preferred_sleep_start: profile?.preferred_sleep_start || "23:00:00",
        },
        fixed_schedules: fixedSchedules,
        tasks: tasks,
      });

      const optimizedBlocks = res.data.optimized_schedule;

      if (Array.isArray(optimizedBlocks) && optimizedBlocks.length > 0) {
        // Hapus jadwal lama yang tidak terkunci
        await supabase
          .from("schedules")
          .delete()
          .eq("user_id", user.id)
          .eq("is_locked", false);

        // Masukkan slot jadwal baru hasil perhitungan Gemini
        const newRows = optimizedBlocks.map((block) => ({
          user_id: user.id,
          task_id: block.task_id || null,
          title: block.title,
          category: block.category,
          start_time: block.start_time,
          end_time: block.end_time,
          is_locked: block.is_sleep_guard,
        }));

        await supabase.from("schedules").insert(newRows);
        await refreshData();
        alert("Jadwal berhasil dioptimalkan oleh SnoozePlan AI!");
      }
    } catch (err) {
      console.error("Gagal optimasi jadwal:", err);
      alert(
        "Gagal menyusun ulang jadwal via AI. Pastikan backend FastAPI aktif.",
      );
    } finally {
      setIsRescheduling(false);
    }
  };

  const formatTimeSlot = (isoString) => {
    if (!isoString) return "--:--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString.slice(11, 16);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Navigation */}
      <nav className="border-b border-slate-900 bg-slate-900/60 backdrop-blur sticky top-0 z-20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-400" />
          <span className="font-bold tracking-tight text-white text-base">
            SnoozePlan<span className="text-indigo-400"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {profile?.full_name || user?.email} ({profile?.prodi || "FMIPA UNJ"}
            )
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Banner Sleep-Guard */}
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl shadow-black/20">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Sleep-Guard Aktif
            </div>
            <h1 className="text-xl font-bold text-white">
              Target Istirahat: {profile?.target_sleep_hours || 7.0} Jam
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Batas tidur dikunci mulai pukul{" "}
              {profile?.preferred_sleep_start || "23:00"}. AI secara otomatis
              melarang penempatan tugas pada jam istirahat.
            </p>
          </div>
          <button
            onClick={handleTriggerReschedule}
            disabled={isRescheduling}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-lg shadow-indigo-950 shrink-0"
          >
            {isRescheduling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengoptimalkan...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Rebalance Schedule (AI)
              </>
            )}
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Jadwal Hari Ini */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                Timeline Kegiatan
              </h2>
              <span className="text-xs text-slate-500">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 divide-y divide-slate-800 space-y-3">
              {loading ? (
                <div className="py-12 flex justify-center text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat
                  timeline...
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  Belum ada jadwal tersinkronisasi. Klik{" "}
                  <strong>"Rebalance Schedule"</strong> agar AI memetakan tugas
                  ke slot bebas Anda.
                </div>
              ) : (
                schedules.map((item) => (
                  <div
                    key={item.id}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.category === "TIDUR" ||
                          item.category === "ISTIRAHAT"
                            ? "bg-purple-500 ring-2 ring-purple-500/20"
                            : item.category === "AKADEMIK"
                              ? "bg-sky-500 ring-2 ring-sky-500/20"
                              : "bg-amber-500 ring-2 ring-amber-500/20"
                        }`}
                      />
                      <div className="truncate">
                        <p className="text-sm font-medium text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatTimeSlot(item.start_time)} -{" "}
                          {formatTimeSlot(item.end_time)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                        item.category === "TIDUR"
                          ? "bg-purple-950/80 text-purple-300 border border-purple-800"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kolom Kanan: Tugas Aktif */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-sm text-white">Tugas Aktif</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
              {loading ? (
                <div className="py-8 flex justify-center text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat
                  tugas...
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Tidak ada tugas menumpuk saat ini.
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-medium text-slate-200 line-clamp-2">
                        {task.title}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          task.priority === "CRITICAL"
                            ? "bg-red-950 text-red-400 border border-red-900"
                            : task.priority === "HIGH"
                              ? "bg-amber-950 text-amber-400 border border-amber-900"
                              : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {task.estimated_minutes}{" "}
                        mnt
                      </span>
                      <span>
                        {new Date(task.deadline).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Input Tugas Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">
                Tambah Tugas Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Judul Tugas / Modul
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth. Laporan Praktikum Fisika Dasar"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Kategori
                  </label>
                  <select
                    value={taskForm.category}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="AKADEMIK">Akademik</option>
                    <option value="ORGANISASI">Organisasi</option>
                    <option value="PRIBADI">Pribadi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, priority: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Estimasi (Menit)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={taskForm.estimated_minutes}
                    onChange={(e) =>
                      setTaskForm({
                        ...taskForm,
                        estimated_minutes: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={taskForm.deadline}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, deadline: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                >
                  {submittingTask && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
