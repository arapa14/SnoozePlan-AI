import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_WEIGHTS } from "../lib/priority";
import {
  Loader2,
  Save,
  Check,
  Moon,
  Sun,
  User,
  Sliders,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

const inputCls =
  "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

const WEIGHT_FIELDS = [
  {
    key: "w_urgency",
    label: "Urgensi",
    hint: "Kedekatan deadline",
    accent: "accent-rose-500",
  },
  {
    key: "w_importance",
    label: "Kepentingan",
    hint: "Pengaruh terhadap tujuan",
    accent: "accent-amber-500",
  },
  {
    key: "w_consequence",
    label: "Konsekuensi",
    hint: "Dampak jika telat",
    accent: "accent-orange-500",
  },
  {
    key: "w_duration",
    label: "Durasi",
    hint: "Kecocokan dengan work block",
    accent: "accent-sky-500",
  },
  {
    key: "w_availability",
    label: "Ketersediaan",
    hint: "Kecocokan dengan waktu luang",
    accent: "accent-emerald-500",
  },
];

function hm(t) {
  return t ? String(t).slice(0, 5) : "";
}

// Helper untuk menghitung selisih jam (mendukung lewat tengah malam)
function calculateSleepWindow(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return (endMins - startMins) / 60;
}

export default function Settings() {
  const { user, profile, fetchProfile } = useAuth();
  const userId = user?.id;

  const [form, setForm] = useState({
    display_name: "",
    sleep_start: "22:00",
    sleep_end: "06:00",
    min_sleep_hours: 8,
    active_start: "06:00",
    active_end: "22:00",
    work_block_minutes: 50,
    break_minutes: 10,
    max_daily_work_minutes: 480,
    persona_key: "balanced",
    ...DEFAULT_WEIGHTS,
  });
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hitung batas maksimal tidur berdasarkan selisih jam mulai dan bangun
  const maxSleepAvailable = calculateSleepWindow(
    form.sleep_start,
    form.sleep_end,
  );
  const isSleepInvalid = Number(form.min_sleep_hours) > maxSleepAvailable;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    Promise.all([
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single(),
      supabase.from("persona_presets").select("*").order("sort_order"),
    ]).then(([prefsRes, presetsRes]) => {
      if (cancelled) return;
      if (!prefsRes.error && prefsRes.data) {
        const p = prefsRes.data;
        setForm({
          display_name: profile?.display_name || profile?.full_name || "",
          sleep_start: hm(p.sleep_start),
          sleep_end: hm(p.sleep_end),
          min_sleep_hours: Number(p.min_sleep_hours),
          active_start: hm(p.active_start),
          active_end: hm(p.active_end),
          work_block_minutes: p.work_block_minutes,
          break_minutes: p.break_minutes,
          max_daily_work_minutes: p.max_daily_work_minutes,
          persona_key: p.persona_key,
          w_urgency: Number(p.w_urgency),
          w_importance: Number(p.w_importance),
          w_consequence: Number(p.w_consequence),
          w_duration: Number(p.w_duration),
          w_availability: Number(p.w_availability),
        });
      }
      if (!presetsRes.error) setPresets(presetsRes.data || []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Saat jam tidur diubah, otomatis turunkan min_sleep_hours jika melebihi kapasitas
  const handleTimeChange = (key, value) => {
    setForm((f) => {
      const newForm = { ...f, [key]: value };
      const maxAvailable = calculateSleepWindow(
        newForm.sleep_start,
        newForm.sleep_end,
      );

      // Jika durasi minimal saat ini lebih besar dari jendela baru, turunkan
      if (Number(newForm.min_sleep_hours) > maxAvailable) {
        newForm.min_sleep_hours = maxAvailable;
      }
      return newForm;
    });
  };

  const applyPreset = (preset) => {
    setForm((f) => ({
      ...f,
      persona_key: preset.key,
      w_urgency: Number(preset.w_urgency),
      w_importance: Number(preset.w_importance),
      w_consequence: Number(preset.w_consequence),
      w_duration: Number(preset.w_duration),
      w_availability: Number(preset.w_availability),
    }));
  };

  const isCustomized = () => {
    const p = presets.find((x) => x.key === form.persona_key);
    if (!p) return true;
    return (
      Number(p.w_urgency) !== form.w_urgency ||
      Number(p.w_importance) !== form.w_importance ||
      Number(p.w_consequence) !== form.w_consequence ||
      Number(p.w_duration) !== form.w_duration ||
      Number(p.w_availability) !== form.w_availability
    );
  };

  const handleSave = async () => {
    if (!userId) return;

    // Validasi sebelum kirim ke database
    if (isSleepInvalid) {
      alert(
        `Durasi minimal tidur (${form.min_sleep_hours} jam) tidak boleh melebihi total jendela tidur (${maxSleepAvailable} jam). Silakan perlebar jam tidur atau kurangi durasi minimal.`,
      );
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      const [profRes, prefRes] = await Promise.all([
        supabase
          .from("profiles")
          .update({ display_name: form.display_name || null })
          .eq("user_id", userId),
        supabase
          .from("user_preferences")
          .update({
            sleep_start: form.sleep_start,
            sleep_end: form.sleep_end,
            min_sleep_hours: Number(form.min_sleep_hours),
            active_start: form.active_start,
            active_end: form.active_end,
            work_block_minutes: Number(form.work_block_minutes),
            break_minutes: Number(form.break_minutes),
            max_daily_work_minutes: Number(form.max_daily_work_minutes),
            persona_key: form.persona_key,
            is_customized: isCustomized(),
            w_urgency: Number(form.w_urgency),
            w_importance: Number(form.w_importance),
            w_consequence: Number(form.w_consequence),
            w_duration: Number(form.w_duration),
            w_availability: Number(form.w_availability),
          })
          .eq("user_id", userId),
      ]);
      if (profRes.error) throw profRes.error;
      if (prefRes.error) throw prefRes.error;

      await fetchProfile(userId);
      setSaved(true);
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center text-slate-500 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Pengaturan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesuaikan profil, jam tidur, pola kerja, dan bobot prioritas.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || isSleepInvalid}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saving ? "Menyimpan…" : saved ? "Tersimpan" : "Simpan"}
        </button>
      </header>

      {/* Profil */}
      <Section icon={User} title="Profil">
        <Field label="Nama Tampilan">
          <input
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            placeholder="Nama Anda"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            value={user?.email || ""}
            disabled
            className={`${inputCls} opacity-60`}
          />
        </Field>
      </Section>

      {/* Sleep-Guard */}
      <Section icon={Moon} title="Jam Tidur (Sleep-Guard)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai Tidur">
            <input
              type="time"
              value={form.sleep_start}
              onChange={(e) => handleTimeChange("sleep_start", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Bangun">
            <input
              type="time"
              value={form.sleep_end}
              onChange={(e) => handleTimeChange("sleep_end", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div
          className={
            isSleepInvalid
              ? "bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg"
              : ""
          }
        >
          <Field label={`Durasi Minimal Tidur · ${form.min_sleep_hours} jam`}>
            <input
              type="range"
              min={4}
              max={12}
              step={0.5}
              value={form.min_sleep_hours}
              onChange={(e) => set("min_sleep_hours", e.target.value)}
              className="w-full accent-indigo-500"
            />
          </Field>
          <div className="flex justify-between text-[10px] mt-1">
            <span className="text-slate-500">
              Jendela tidur saat ini: {maxSleepAvailable} jam
            </span>
            {isSleepInvalid && (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Durasi minimal melebihi
                jendela
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Pola Kerja */}
      <Section icon={Sun} title="Jam Aktif & Pola Kerja">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai Aktif">
            <input
              type="time"
              value={form.active_start}
              onChange={(e) => set("active_start", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Selesai Aktif">
            <input
              type="time"
              value={form.active_end}
              onChange={(e) => set("active_end", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Work Block (mnt)">
            <input
              type="number"
              min={15}
              max={240}
              step={5}
              value={form.work_block_minutes}
              onChange={(e) => set("work_block_minutes", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Jeda (mnt)">
            <input
              type="number"
              min={0}
              max={60}
              step={5}
              value={form.break_minutes}
              onChange={(e) => set("break_minutes", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Maks / Hari (mnt)">
            <input
              type="number"
              min={60}
              max={960}
              step={30}
              value={form.max_daily_work_minutes}
              onChange={(e) => set("max_daily_work_minutes", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Bobot Prioritas */}
      <Section icon={Sliders} title="Bobot Prioritas">
        {presets.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Preset
              Persona
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p)}
                  className={`text-left p-2.5 rounded-lg border transition ${
                    form.persona_key === p.key
                      ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <p className="text-xs font-semibold">{p.name}</p>
                  {p.description && (
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          {WEIGHT_FIELDS.map((f) => (
            <div key={f.key}>
              <div className="flex justify-between items-baseline text-xs mb-1">
                <span className="font-medium text-slate-300">
                  {f.label}{" "}
                  <span className="text-slate-600 font-normal">· {f.hint}</span>
                </span>
                <span className="text-indigo-400 font-mono text-[11px] tabular-nums">
                  {Number(form[f.key]).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form[f.key]}
                onChange={(e) => set(f.key, Number(e.target.value))}
                className={`w-full ${f.accent}`}
              />
            </div>
          ))}
        </div>
        {isCustomized() && (
          <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1.5">
            Bobot tidak sama dengan preset — akan disimpan sebagai{" "}
            <strong>kustom</strong>.
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
          <Icon className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
