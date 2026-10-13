import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Moon, AlertCircle } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-2xl shadow-xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Moon className="w-8 h-8 text-indigo-400" />
          <span className="font-bold text-2xl text-white">
            SnoozePlan<span className="text-indigo-400">.AI</span>
          </span>
        </div>

        <h2 className="text-lg font-semibold text-white text-center mb-1">
          {isLogin ? "Masuk ke Akun Anda" : "Buat Akun Mahasiswa"}
        </h2>
        <p className="text-xs text-slate-400 text-center mb-6">
          Kelola prioritas tugas tanpa memangkas waktu tidur
        </p>

        {errorMsg && (
          <div className="mb-4 bg-red-950/60 border border-red-800 text-red-300 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="cth. Budi Mahasiswa"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@mhs.unj.ac.id"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition mt-2 disabled:opacity-50"
          >
            {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar Akun"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
            className="text-indigo-400 hover:underline font-medium"
          >
            {isLogin ? "Daftar di sini" : "Masuk di sini"}
          </button>
        </div>
      </div>
    </div>
  );
}
