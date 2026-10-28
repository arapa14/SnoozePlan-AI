import { useState } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
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
  deadline: "",
  importance: 3,
  late_consequence: 3,
  estimated_minutes: 60,
};

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function mapTaskToForm(task) {
  if (!task) return EMPTY_FORM;
  return {
    title: task.title || "",
    description: task.description || "",
    category: task.category || "kuliah",
    deadline: toLocalInput(task.deadline),
    importance: task.importance ?? 3,
    late_consequence: task.late_consequence ?? 3,
    estimated_minutes: task.estimated_minutes ?? 60,
  };
}

const inputCls =
  "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

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
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      importance: Number(form.importance),
      late_consequence: Number(form.late_consequence),
      estimated_minutes: Number(form.estimated_minutes),
    });
  };

  const editing = Boolean(initialTask);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={editing ? Pencil : Plus}
      title={editing ? "Ubah Tugas" : "Tambah Tugas Baru"}
      description={
        editing
          ? "Perbarui detail tugas. Skor prioritas akan dihitung ulang."
          : "Isi detail tugas. Skor prioritas dihitung otomatis setelah disimpan."
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Judul Tugas
          </label>
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="cth. Laporan Praktikum Fisika Dasar"
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
            placeholder="Detail singkat tugas…"
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
        </div>

        <div className="relative">
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition [color-scheme:dark]"
          />
          {/* <CalendarDays className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" /> */}
        </div>

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
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {editing ? "Simpan Perubahan" : "Simpan Tugas"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
