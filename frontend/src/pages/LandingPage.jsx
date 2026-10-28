import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Sparkles,
  Moon,
  ArrowRight,
  Clock,
  Zap,
  Lock,
  RefreshCw,
  Sliders,
  CheckCircle2,
  CalendarDays,
  Briefcase,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white font-sans">
      {/* ================= NAVBAR ================= */}
      <header className="border-b border-slate-800/80 bg-slate-950 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Moon className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              SnoozePlan<span className="text-indigo-400">.AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition"
            >
              Masuk
            </Link>
            <Link
              to="/auth"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg transition"
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <main className="flex-1 max-w-6xl mx-auto px-6 pt-20 pb-24 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Sistem Penjadwalan Cerdas Mahasiswa
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            Tugas Selesai Tepat Waktu, <br className="hidden sm:block" />
            <span className="text-indigo-400">Jam Tidur Tetap Terjaga.</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            To-do list dengan skor prioritas otomatis dan penjadwalan berbasis
            AI yang dirancang khusus untuk melindungi jam istirahat Anda.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              Mulai Optimalkan Jadwal
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#fitur"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-6 py-3 rounded-lg font-medium transition"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>

        {/* ================= MOCKUP PREVIEW ================= */}
        <div className="max-w-4xl mx-auto border border-slate-800 rounded-xl bg-slate-900 shadow-2xl overflow-hidden">
          {/* Mockup Header */}
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              snooze-plan-ai/dashboard
            </div>
            <div className="w-12" />
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50">
            {/* Mockup Kiri: Task List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">Tugas & Agenda</h3>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded">
                  7 Aktif
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Kuis Kalkulus II
                  </p>
                  <p className="text-[10px] text-slate-500">
                    2 jam lagi · 180m
                  </p>
                </div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded">
                  93 CRITICAL
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Revisi Laporan KPM
                  </p>
                  <p className="text-[10px] text-slate-500">Besok · 120m</p>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  88 HIGH
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center opacity-60">
                <div>
                  <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3 text-rose-400" /> Rapat BEMP
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Agenda Tetap · 19:00
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  FIXED
                </span>
              </div>
            </div>

            {/* Mockup Kanan: Timeline */}
            <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-6 md:pt-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-400" /> Timeline
                  AI
                </h3>
              </div>

              {/* Sleep Block */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/50 opacity-60">
                <div className="w-1 self-stretch rounded-full bg-indigo-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-indigo-400" /> Sleep-Guard
                  </p>
                  <p className="text-[10px] text-slate-500">22.00 – 06.00</p>
                </div>
              </div>

              {/* Work Block */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="w-1 self-stretch rounded-full bg-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-emerald-400" /> Laporan Fisika
                  </p>
                  <p className="text-[10px] text-slate-500">
                    06.30 – 07.20 · 50m
                  </p>
                </div>
              </div>

              {/* Work Block 2 */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="w-1 self-stretch rounded-full bg-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-emerald-400" /> Revisi KPM
                  </p>
                  <p className="text-[10px] text-slate-500">
                    07.30 – 08.20 · 50m
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= FEATURES SECTION ================= */}
        <section id="fitur" className="pt-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">
              Fitur yang Bekerja untuk Anda
            </h2>
            <p className="text-slate-400 text-sm">
              Dirancang khusus untuk menangani beban akademik tanpa mengorbankan
              kesehatan mental dan fisik.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition">
              <div className="p-2.5 bg-indigo-500/10 rounded-lg w-fit mb-4">
                <Sliders className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                Adaptive Priority Scoring
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tugas diurutkan secara otomatis berdasarkan 5 faktor: Urgensi,
                Kepentingan, Konsekuensi, Durasi, dan Ketersediaan Waktu.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition">
              <div className="p-2.5 bg-sky-500/10 rounded-lg w-fit mb-4">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                Sleep-Guard Locked
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jam tidur Anda (misal 22:00–06:00) dikunci secara sistem. AI
                dilarang keras menempatkan blok kerja di dalam zona tersebut.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg w-fit mb-4">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                AI Rescheduling
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Satu klik untuk menyusun ulang seluruh timeline. AI akan mencari
                slot kosong di antara jadwal kuliah dan agenda tetap Anda.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition">
              <div className="p-2.5 bg-rose-500/10 rounded-lg w-fit mb-4">
                <Briefcase className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                Agenda Waktu Tetap
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bedakan antara Tugas Fleksibel dan Agenda Tetap (seperti Rapat
                atau Kuliah). AI tidak akan pernah menggeser Agenda Anda.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition">
              <div className="p-2.5 bg-amber-500/10 rounded-lg w-fit mb-4">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                Penanganan Tugas Telat
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tugas yang sudah melewati deadline (overdue) akan ditandai
                secara visual dan AI akan mencarikan slot baru jika Anda
                mengizinkannya.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition">
              <div className="p-2.5 bg-purple-500/10 rounded-lg w-fit mb-4">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                Review & Compare
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anda memegang kendali penuh. Bandingkan jadwal lama dengan
                usulan AI sebelum memutuskan untuk menyetujuinya.
              </p>
            </div>
          </div>
        </section>

        {/* ================= CTA SECTION ================= */}
        <section className="mt-24 bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            Siap Mengakhiri Begadang?
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8 text-sm">
            Bergabunglah dengan mahasiswa lainnya yang sudah mengotomatiskan
            manajemen waktu mereka bersama SnoozePlan AI.
          </p>

          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Daftar Sekarang
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-800 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300 text-sm">
              SnoozePlan AI
            </span>
          </div>
          <p className="text-xs text-slate-500">
            © 2026 SnoozePlan AI. Dibuat untuk mahasiswa.
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="hover:text-indigo-400 transition cursor-pointer">
              Bantuan
            </span>
            <span className="hover:text-indigo-400 transition cursor-pointer">
              Privasi
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
