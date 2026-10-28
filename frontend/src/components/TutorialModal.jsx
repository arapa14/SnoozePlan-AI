import { useState } from "react";
import {
  BookOpen,
  PlusCircle,
  CalendarClock,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Modal from "./Modal";

const TUTORIAL_STEPS = [
  {
    icon: PlusCircle,
    title: "1. Tambah Tugas & Agenda",
    description:
      "Mulai dengan mencatat semua tanggung jawab Anda di halaman Dashboard.",
    points: [
      "Klik tombol **Tambah** berwarna biru.",
      "Pilih **Tugas Fleksibel** untuk pekerjaan yang bisa dikerjakan kapan saja (misal: Laporan Praktikum).",
      "Pilih **Agenda (Waktu Tetap)** untuk kegiatan yang jamnya tidak bisa digeser (misal: Rapat BEM, Kuliah).",
    ],
  },
  {
    icon: Sparkles,
    title: "2. Atur Prioritas Otomatis",
    description:
      "Sistem akan menghitung skor prioritas (0-100) secara otomatis.",
    points: [
      "Skor dihitung dari Deadline, Kepentingan, dan Konsekuensi.",
      "Semakin tinggi skor, tugas akan muncul paling atas di daftar.",
      "Tugas yang sudah lewat deadline akan ditandai dengan label **Terlambat** (kuning).",
    ],
  },
  {
    icon: CalendarClock,
    title: "3. Jadwalkan dengan AI",
    description:
      "Biarkan AI menyusun jadwal harian Anda tanpa mengganggu waktu istirahat.",
    points: [
      "Klik tombol **Jadwalkan** di bagian kanan atas Timeline.",
      "Pastikan centang **Sertakan Terlambat** jika Anda ingin AI mencarikan waktu baru untuk tugas yang telat.",
      "AI akan membaca jam tidur Anda (Sleep-Guard) dan Agenda Tetap agar jadwal tidak bentrok.",
    ],
  },
  {
    icon: CheckCircle2,
    title: "4. Tinjau & Setujui",
    description: "Anda memiliki kendali penuh atas jadwal yang dibuat AI.",
    points: [
      "Setelah AI selesai, Anda akan melihat perbandingan (Compare) antara **Jadwal Baru** dan **Jadwal Lama**.",
      "Tinjau apakah jadwal tersebut masuk akal untuk Anda.",
      "Klik **Setujui Jadwal** untuk menyimpan, atau **Tolak** untuk membatalkannya.",
    ],
  },
];

export default function TutorialModal({ open, onClose }) {
  const [step, setStep] = useState(0);

  // Fungsi ini membungkus onClose dari parent,
  // sehingga setiap kali ditutup, step otomatis kembali ke 0.
  const handleClose = () => {
    setStep(0);
    onClose();
  };

  if (!open) return null;

  const current = TUTORIAL_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <Modal
      open={open}
      onClose={handleClose} // <-- Gunakan handleClose di sini
      title="Panduan Penggunaan"
      description="Pelajari cara mengoptimalkan jadwal Anda dengan SnoozePlan AI."
      icon={BookOpen}
      size="md"
    >
      <div className="space-y-6">
        {/* Indikator Langkah */}
        <div className="flex items-center gap-1.5">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx === step ? "bg-indigo-500" : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Konten */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <current.icon className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-white">{current.title}</h3>
          </div>

          <p className="text-xs text-slate-300 mb-4">{current.description}</p>

          <ul className="space-y-2.5">
            {current.points.map((point, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed"
              >
                <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                <span
                  dangerouslySetInnerHTML={{
                    __html: point.replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong class="text-slate-200">$1</strong>',
                    ),
                  }}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Tombol Navigasi */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </button>

          {isLast ? (
            <button
              onClick={handleClose} // <-- Gunakan handleClose di sini
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
            >
              Selesai & Mulai
            </button>
          ) : (
            <button
              onClick={() =>
                setStep((s) => Math.min(TUTORIAL_STEPS.length - 1, s + 1))
              }
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
