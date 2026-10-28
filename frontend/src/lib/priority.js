// Phase 2: Adaptive Priority Scoring — deterministic, no AI.
// Faktor: urgensi, kepentingan, konsekuensi, kesesuaian durasi, ketersediaan waktu.

export const DEFAULT_WEIGHTS = {
  w_urgency: 0.3,
  w_importance: 0.25,
  w_consequence: 0.2,
  w_duration: 0.1,
  w_availability: 0.15,
};

const WORK_BLOCK_MINUTES = 50;
const MAX_TASK_MINUTES = 240;

// Critical override: tugas dengan deadline < durasi + konsekuensi tinggi
// dinaikkan ke skor minimum agar keluar dari bayangan tugas normal.
const CRITICAL_SCORE_FLOOR = 95;
const CRITICAL_CONSEQUENCE_MIN = 4;

export function computePriorityScore(
  task,
  weights = DEFAULT_WEIGHTS,
  now = new Date(),
) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const totalWeight =
    w.w_urgency +
      w.w_importance +
      w.w_consequence +
      w.w_duration +
      w.w_availability || 1;

  // Hitung sekali, pakai di semua faktor
  const est = task.estimated_minutes ?? 60;
  const neededHours = est / 60;
  const hoursLeft = task.deadline
    ? (new Date(task.deadline).getTime() - now.getTime()) / 3_600_000
    : Infinity;

  // 1. Urgensi: 1 jika deadline <= 24 jam, 0 jika >= 7 hari.
  let urgency = 0;
  if (task.deadline) {
    if (hoursLeft <= 24) urgency = 1;
    else if (hoursLeft >= 168) urgency = 0;
    else urgency = 1 - (hoursLeft - 24) / (168 - 24);
  }

  // 2. Kepentingan 1–5 → 0–1
  const importance = (task.importance ?? 3) / 5;

  // 3. Konsekuensi 1–5 → 0–1
  const consequence = (task.late_consequence ?? 3) / 5;

  // 4. Kesesuaian durasi: tugas yang pas dengan work block lebih diutamakan
  let duration = 1;
  if (est > WORK_BLOCK_MINUTES) {
    duration = Math.max(
      0,
      1 - (est - WORK_BLOCK_MINUTES) / (MAX_TASK_MINUTES - WORK_BLOCK_MINUTES),
    );
  }

  // 5. Ketersediaan waktu: apakah estimasi masih muat sebelum deadline?
  let availability = 0.5;
  if (task.deadline) {
    if (hoursLeft <= 0) availability = 1; // sudah lewat → anggap urgent
    else if (hoursLeft >= neededHours) availability = 1; // muat
    else availability = Math.max(0, hoursLeft / neededHours); // tidak muat
  }

  const factors = { urgency, importance, consequence, duration, availability };

  const raw =
    w.w_urgency * urgency +
    w.w_importance * importance +
    w.w_consequence * consequence +
    w.w_duration * duration +
    w.w_availability * availability;

  let score = Math.round((raw / totalWeight) * 100);

  // Critical override: deadline masih ada, tapi lebih pendek dari durasi,
  // dan konsekuensi tinggi. Tugas seperti ini harus "melompat" ke atas.
  const infeasible =
    !!task.deadline && hoursLeft > 0 && hoursLeft < neededHours;
  const highStakes = (task.late_consequence ?? 3) >= CRITICAL_CONSEQUENCE_MIN;
  const critical = infeasible && highStakes;

  if (critical) {
    score = Math.max(CRITICAL_SCORE_FLOOR, score);
  }

  return { score, factors, critical };
}

export function priorityLevel(score) {
  if (score >= 80)
    return { label: "CRITICAL", className: "bg-rose-500/15 text-rose-400" };
  if (score >= 60)
    return { label: "HIGH", className: "bg-amber-500/15 text-amber-400" };
  if (score >= 40)
    return { label: "MEDIUM", className: "bg-sky-500/15 text-sky-400" };
  return { label: "LOW", className: "bg-slate-700/50 text-slate-400" };
}