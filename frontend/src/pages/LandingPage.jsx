import { Link } from "react-router-dom";
import {
  Calendar,
  ShieldAlert,
  Sparkles,
  Moon,
  ArrowRight,
  Clock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Moon className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-xl tracking-tight">
            SnoozePlan<span className="text-indigo-400">.AI</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="text-sm text-slate-300 hover:text-white transition"
          >
            Masuk
          </Link>
          <Link
            to="/auth"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            Mulai Sekarang
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 text-center my-auto py-12">
        <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Optimalisasi Jadwal Cerdas Mahasiswa FMIPA UNJ
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          Tugas Selesai Tepat Waktu, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">
            Jam Tidur Tetap Terjaga.
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
          Sistem penjadwalan cerdas berbasis AI yang secara otomatis
          merestrukturisasi agenda saat ada kuliah pengganti atau laporan
          praktikum mendadak tanpa memangkas kuota tidur.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Daftar & Optimalkan Jadwal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">
              Sleep-Guard Locked
            </h3>
            <p className="text-sm text-slate-400">
              AI otomatis mengunci batas tidur minimal 7 jam. Tidak ada tugas
              yang dialokasikan di jam istirahat.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl">
            <Calendar className="w-6 h-6 text-sky-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">
              Dynamic Rescheduling
            </h3>
            <p className="text-sm text-slate-400">
              Jadwal kuliah bentrok atau praktikum molor? Cukup satu klik untuk
              menyusun ulang seluruh kegiatan harian.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl">
            <Clock className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">
              FMIPA Workload Matrix
            </h3>
            <p className="text-sm text-slate-400">
              Estimasi beban pengerjaan terintegrasi untuk kalkulus, praktikum
              laboratorium, dan kegiatan ormawa.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        &copy; 2026 SnoozePlan AI • FMIPA Universitas Negeri Jakarta
      </footer>
    </div>
  );
}
