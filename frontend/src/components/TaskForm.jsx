import { useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Clock,
  Briefcase,
} from "lucide-react";
import Modal from "./Modal";

const CATEGORIES = [
  { value: "kuliah", label: "Kuliah" },
  { value: "praktikum", label: "Praktikum" },
  { value: "organisasi", label: "Organisasi" },
  { value: "pribadi", label: "Pribadi" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "kuliah",
  is_fixed: false,
  deadline: "",
  fixed_start_at: "",
  fixed_end_at: "",
  importance: 3,
  late_consequence: 3,
  estimated_minutes: 60,
};

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapTaskToForm(task) {
  if (!task) return EMPTY_FORM;
  return {
    title: task.title || "",
    description: task.description || "",
    category: task.category || "kuliah",
    is_fixed: !!task.fixed_start_at,
    deadline: toLocalInput(task.deadline),
    fixed_start_at: toLocalInput(task.fixed_start_at),
    fixed_end_at: toLocalInput(task.fixed_end_at),
    importance: task.importance ?? 3,
    late_consequence: task.late_consequence ?? 3,
    estimated_minutes: task.estimated_minutes ?? 60,
  };
}

const inputCls =
  "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition [color-scheme:dark]";

export default function TaskForm({
  open,
  initialTask,
  onClose,
  onSubmit,
  submitting,
}) {
  const [form, setForm] = useState(() => mapTaskToForm(initialTask));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();

    let payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      importance: Number(form.importance),
      late_consequence: Number(form.late_consequence),
      fixed_start_at: null,
      fixed_end_at: null,
      deadline: null,
      estimated_minutes: Number(form.estimated_minutes),
    };

    if (form.is_fixed) {
      // Kalkulasi estimasi menit dari selisih waktu (minimal 5 menit agar aman dari constraint DB)
      const start = new Date(form.fixed_start_at);
      const end = new Date(form.fixed_end_at);
      const diffMins = Math.max(5, Math.round((end - start) / 60000));

      payload.fixed_start_at = start.toISOString();
      payload.fixed_end_at = end.toISOString();
      payload.deadline = end.toISOString(); // Agenda menggunakan waktu selesai sebagai deadline
      payload.estimated_minutes = diffMins;
    } else {
      payload.deadline = form.deadline
        ? new Date(form.deadline).toISOString()
        : null;
    }

    onSubmit(payload);
  };

  const editing = Boolean(initialTask);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={editing ? Pencil : Plus}
      title={editing ? "Ubah Item" : "Tambah Item Baru"}
      description={
        editing
          ? "Perbarui detail. Skor prioritas akan dihitung ulang."
          : "Tambahkan tugas fleksibel atau agenda dengan waktu tetap."
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Tipe Item */}
        <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg transition-colors ${form.is_fixed ? "bg-rose-500/20 text-rose-400" : "bg-indigo-500/20 text-indigo-400"}`}
            >
              {form.is_fixed ? (
                <Briefcase className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {form.is_fixed ? "Agenda (Waktu Tetap)" : "Tugas Fleksibel"}
              </p>
              <p className="text-[10px] text-slate-500">
                {form.is_fixed
                  ? "AI tidak akan menggeser jadwal ini."
                  : "AI akan menjadwalkan ini di waktu kosong."}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.is_fixed}
              onChange={(e) => set("is_fixed", e.target.checked)}
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Judul {form.is_fixed ? "Agenda" : "Tugas"}
          </label>
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={
              form.is_fixed
                ? "cth. Rapat Divisi BEMP"
                : "cth. Laporan Praktikum Fisika"
            }
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Deskripsi{" "}
            <span className="text-slate-600 font-normal">(opsional)</span>
          </label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Detail singkat…"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Kategori
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estimasi hanya muncul jika Tugas Fleksibel */}
          {!form.is_fixed && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Estimasi (menit)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                step={5}
                required
                value={form.estimated_minutes}
                onChange={(e) => set("estimated_minutes", e.target.value)}
                className={inputCls}
              />
            </div>
          )}
        </div>

        {/* Input Waktu */}
        {form.is_fixed ? (
          <div className="grid grid-cols-2 gap-3 bg-rose-500/5 p-3 rounded-lg border border-rose-500/20">
            <div>
              <label className="block text-xs font-medium text-rose-300 mb-1.5">
                Mulai
              </label>
              <input
                type="datetime-local"
                required
                value={form.fixed_start_at}
                onChange={(e) => set("fixed_start_at", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-rose-300 mb-1.5">
                Selesai
              </label>
              <input
                type="datetime-local"
                required
                value={form.fixed_end_at}
                onChange={(e) => set("fixed_end_at", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Deadline{" "}
              <span className="text-slate-600 font-normal">(opsional)</span>
            </label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              className={inputCls}
            />
          </div>
        )}

        {/* Slider Prioritas */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-medium text-slate-300">
                Kepentingan
              </label>
              <span className="text-xs font-bold text-indigo-400 tabular-nums">
                {form.importance}/5
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={form.importance}
              onChange={(e) => set("importance", e.target.value)}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-medium text-slate-300">
                Konsekuensi
              </label>
              <span className="text-xs font-bold text-rose-400 tabular-nums">
                {form.late_consequence}/5
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={form.late_consequence}
              onChange={(e) => set("late_consequence", e.target.value)}
              className="w-full accent-rose-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 -mb-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition text-white disabled:opacity-50 ${
              form.is_fixed
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {editing
              ? "Simpan Perubahan"
              : form.is_fixed
                ? "Simpan Agenda"
                : "Simpan Tugas"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
