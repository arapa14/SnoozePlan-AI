import { useState } from "react";
import { Save, Loader2, RotateCcw, Sliders } from "lucide-react";
import Modal from "./Modal";
import { DEFAULT_WEIGHTS } from "../lib/priority";

const FIELDS = [
  { key: "w_urgency", label: "Urgensi", color: "accent-danger" },
  { key: "w_importance", label: "Kepentingan", color: "accent-warn" },
  { key: "w_consequence", label: "Konsekuensi", color: "accent-ember" },
  { key: "w_duration", label: "Durasi", color: "accent-info" },
  { key: "w_availability", label: "Ketersediaan", color: "accent-mint" },
];

// Di-remount oleh parent dengan `key` setiap kali modal dibuka,
// sehingga lazy init cukup berjalan sekali per open.
export default function WeightsEditor({ open, initial, onClose, onSave, saving }) {
  const [w, setW] = useState(() => ({ ...DEFAULT_WEIGHTS, ...initial }));
  const total = FIELDS.reduce((s, f) => s + Number(w[f.key] || 0), 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Sliders}
      title="Bobot Prioritas"
      description={`Bobot dinormalisasi otomatis. Total saat ini: ${total.toFixed(2)}`}
      size="md"
    >
      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-ink-2">{f.label}</span>
              <span className="text-mint font-mono tabular-nums">
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

      <div className="flex justify-between items-center pt-4 mt-5 border-t border-line">
        <button
          onClick={() => setW(DEFAULT_WEIGHTS)}
          className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset default
        </button>
        <button
          onClick={() => onSave(w)}
          disabled={saving || total <= 0}
          className="bg-mint hover:bg-pale disabled:opacity-50 text-canvas font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Simpan Bobot
        </button>
      </div>
    </Modal>
  );
}
