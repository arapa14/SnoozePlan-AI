import { useState } from "react";
import { X, Save, Loader2, RotateCcw } from "lucide-react";
import { DEFAULT_WEIGHTS } from "../lib/priority";

const FIELDS = [
  { key: "w_urgency", label: "Urgensi", color: "accent-rose-500" },
  { key: "w_importance", label: "Kepentingan", color: "accent-amber-500" },
  { key: "w_consequence", label: "Konsekuensi", color: "accent-orange-500" },
  { key: "w_duration", label: "Durasi", color: "accent-sky-500" },
  { key: "w_availability", label: "Ketersediaan", color: "accent-emerald-500" },
];

// Di-remount oleh parent dengan `key` setiap kali modal dibuka,
// sehingga lazy init cukup berjalan sekali per open.
export default function WeightsEditor({ open, initial, onClose, onSave, saving }) {
  const [w, setW] = useState(() => ({ ...DEFAULT_WEIGHTS, ...initial }));

  if (!open) return null;

  const total = FIELDS.reduce((s, f) => s + Number(w[f.key] || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-sm font-bold text-white">Bobot Prioritas</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Bobot akan dinormalisasi otomatis. Total saat ini:{" "}
          <span className="text-indigo-400 font-semibold">{total.toFixed(2)}</span>
        </p>

        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">{f.label}</span>
                <span className="text-indigo-400 font-mono">
                  {Number(w[f.key] || 0).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={w[f.key]}
                onChange={(e) => setW({ ...w, [f.key]: Number(e.target.value) })}
                className={`w-full ${f.color}`}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={() => setW(DEFAULT_WEIGHTS)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" /> Reset default
          </button>
          <button
            onClick={() => onSave(w)}
            disabled={saving || total <= 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan Bobot
          </button>
        </div>
      </div>
    </div>
  );
}