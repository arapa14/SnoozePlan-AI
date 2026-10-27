import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  ShieldAlert,
  Sparkles,
  Moon,
  ArrowRight,
  Clock,
  CheckCircle2,
  Zap,
  Lock,
  RefreshCw,
  Sliders,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Glow Overlay - Indigo & Sky Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-indigo-600/10 blur-[140px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-[600px] -right-20 w-[400px] h-[400px] bg-sky-500/10 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* Header / Navbar */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center relative z-10 backdrop-blur-md bg-slate-950/40 sticky top-0 border-b border-slate-800/50">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300">
            <Moon className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            SnoozePlan<span className="text-indigo-400 font-extrabold">.AI</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition"
          >
            Masuk
          </Link>
          <Link
            to="/auth"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-95 duration-200"
          >
            Mulai Sekarang
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-medium px-4 py-1.5 rounded-full mb-8 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Optimizer Jadwal Cerdas Mahasiswa FMIPA UNJ
          </div>

          {/* Heading Utama */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
            Tugas Selesai Tepat Waktu, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-400 drop-shadow-[0_0_35px_rgba(99,102,241,0.4)]">
              Jam Tidur Tetap Terjaga.
            </span>
          </h1>

          {/* Deskripsi */}
          <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Sistem penjadwalan dinamis berbasis Gemini AI yang menyusun ulang agenda perkuliahan, laporan praktikum, dan ormawa <strong className="text-slate-200 font-medium">tanpa pernah memotong kuota jam tidur minimal Anda</strong>.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] transform hover:-translate-y-0.5 duration-200"
            >
              Optimalkan Jadwal Sekarang
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </Link>
            <a
              href="#fitur"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-7 py-4 rounded-xl font-medium transition duration-200"
            >
              Pelajari Cara Kerja
            </a>
          </div>

          {/* Stat / Proof Badges */}
          <div className="pt-6 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-slate-400 text-xs sm:text-sm">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Restrukturisasi 1-Klik</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Batas Tidur 7+ Jam</span>
            </div>
            <div className="flex items-center justify-center gap-2 col-span-2 sm:col-span-1">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Khusus FMIPA UNJ</span>
            </div>
          </div>
        </div>

        {/* Visual Mockup Dashboard Interactive Preview */}
        <div className="mt-16 max-w-5xl mx-auto p-2 sm:p-3 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
          <div className="absolute -top-3 right-6 bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-3 py-1 rounded-full font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            Live Preview AI
          </div>
          
          <div className="bg-slate-950 rounded-xl p-4 sm:p-6 border border-slate-800/80">
            {/* Window Controls Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-indigo-500/80" />
                <span className="ml-2 text-xs text-slate-500 font-mono">dashboard.snoozeplan.ai</span>
              </div>
              <div className="text-xs bg-indigo-500/10 text-indigo-400 font-mono px-2.5 py-1 rounded border border-indigo-500/20">
                Mode: Sleep-Guard Active
              </div>
            </div>

            {/* Simulated Rescheduling Diff Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {/* Conflicting Schedule */}
              <div className="bg-slate-900/50 border border-rose-500/20 p-4 rounded-xl relative">
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 mb-2 inline-block">
                  Sebelum (Bentrok)
                </span>
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  Praktikum Kimia Organik & BEMP
                </p>
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5 text-rose-400">
                    <Clock className="w-3.5 h-3.5" /> 23.00 - 02.00 (Potensi Begadang)
                  </p>
                  <p className="text-slate-500">Kuota Tidur Terpaksa: ~4 Jam</p>
                </div>
              </div>

              {/* Optimized AI Schedule */}
              <div className="bg-slate-900/90 border border-indigo-500/40 p-4 rounded-xl relative shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 mb-2 inline-block">
                  Sesudah (Dioptimalkan Gemini AI)
                </span>
                <p className="text-sm font-semibold text-indigo-300 mb-1 flex items-center justify-between">
                  <span>Laporan Praktikum Digeser</span>
                  <Zap className="w-4 h-4 text-indigo-400" />
                </p>
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="flex items-center gap-1.5 text-indigo-400 font-medium">
                    <Clock className="w-3.5 h-3.5" /> Besok, 15.30 - 17.00 (Slot Kosong)
                  </p>
                  <p className="text-indigo-400/80 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Lock Tidur: 22.00 - 06.00 (8 Jam)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features Section */}
        <section id="fitur" className="pt-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Dirancang Spesifik untuk <br />
              <span className="text-indigo-400">Beban Akademik FMIPA</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Menangani jadwal kuliah padat, laporan praktikum laboratorium mingguan, hingga rapat organisasi tanpa membuat fisik kelelahan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Feature 1 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-8 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] group">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl w-fit mb-5 group-hover:bg-indigo-500/20 transition">
                <ShieldAlert className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition">
                Sleep-Guard Locked
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Slot waktu tidur minimal (6–8 jam) dikunci permanen di sistem. AI secara ketat dilarang menyelipkan alokasi tugas pada jam istirahat Anda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-8 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] group">
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl w-fit mb-5 group-hover:bg-sky-500/20 transition">
                <RefreshCw className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-sky-300 transition">
                Dynamic Rescheduling
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Kuliah pengganti mendadak atau praktikum molor? Cukup satu klik, Gemini AI merestrukturisasi urutan prioritas seluruh agenda harian Anda.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-8 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] group">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit mb-5 group-hover:bg-amber-500/20 transition">
                <Sliders className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition">
                Cognitive Effort Estimator
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Estimasi otomatis durasi dan tingkat kesulitan tugas berdasarkan kategori: Kalkulus, Laporan Praktikum Lab, Kuis, atau Tugas Reguler.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner Section */}
        <section className="mt-28 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 p-8 sm:p-12 rounded-3xl text-center relative overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.1)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Siap Bebas dari Badai Tugas & Begadang?
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-8 text-sm sm:text-base">
            Bergabunglah dengan mahasiswa FMIPA UNJ lainnya dan rasakan manajemen waktu otomatis berbasis AI.
          </p>

          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl transition shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] duration-200"
          >
            Mulai Pengaturan Jadwal
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-400">SnoozePlan AI</span>
          </div>
          <p>© 2026 SnoozePlan AI • FMIPA Universitas Negeri Jakarta</p>
          <div className="flex gap-4 text-slate-400">
            <span className="hover:text-indigo-400 transition cursor-pointer">Bantuan</span>
            <span className="hover:text-indigo-400 transition cursor-pointer">Privasi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}