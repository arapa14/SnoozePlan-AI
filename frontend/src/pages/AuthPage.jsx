import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  Moon,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowLeft,
} from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      }
      navigate("/dashboard");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* ================= KOLOM KIRI: FORM ================= */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 w-full max-w-2xl mx-auto">
        {/* Tombol Kembali ke Landing Page */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white mb-12 transition w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Beranda
        </Link>

        {/* Logo & Judul */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              SnoozePlan<span className="text-indigo-400">.AI</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isLogin ? "Selamat datang kembali" : "Buat akun baru"}
          </h2>
          <p className="text-sm text-slate-400 mt-1.5">
            {isLogin
              ? "Masuk untuk melanjutkan pengelolaan jadwal Anda."
              : "Mulai kelola prioritas tugas tanpa memangkas waktu tidur."}
          </p>
        </div>

        {/* Pesan Error */}
        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="cth. Budi Mahasiswa"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@mhs.unj.ac.id"
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Kata Sandi
              </label>
              {/* {isLogin && (
                <span className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer transition">
                  Lupa sandi?
                </span>
              )} */}
            </div>

            {/* Input Password dengan Toggle Mata */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pr-10`} // pr-10 memberi ruang untuk ikon di kanan
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition focus:outline-none"
                aria-label={
                  showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-10 rounded-lg text-sm transition mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar Akun"}
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="mt-8 text-center text-xs text-slate-400">
          {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
            className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition ml-1"
          >
            {isLogin ? "Daftar sekarang" : "Masuk di sini"}
          </button>
        </div>
      </div>

      {/* ================= KOLOM KANAN: VISUAL / BRANDING ================= */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-slate-900 border-l border-slate-800 p-12 relative overflow-hidden">
        {/* Abstract Pattern Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Optimizer Jadwal Mahasiswa
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight leading-tight mb-4">
            Tugas beres, <br /> tidur pun puas.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            SnoozePlan AI membantu Anda memprioritaskan tugas dan menyusun
            jadwal harian secara otomatis.
          </p>
        </div>

        {/* Feature Cards (Visual) */}
        <div className="relative z-10 space-y-3 mt-12 mb-auto">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Sleep-Guard Locked
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                AI dilarang menaruh jadwal di jam tidur Anda.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Penjadwalan Otomatis
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Satu klik untuk menyusun ulang seluruh agenda.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © 2026 SnoozePlan AI. Hak cipta dilindungi.
        </div>
      </div>
    </div>
  );
}
