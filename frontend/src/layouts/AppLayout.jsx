import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Tambahkan useNavigate & useLocation
import { Menu, Moon, HelpCircle } from "lucide-react"; // Tambahkan HelpCircle
import Sidebar from "../components/Sidebar";
import { startTour } from "../lib/tour"; // Import fungsi tur

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fungsi untuk menjalankan tur dari Header Mobile
  const handleStartTour = () => {
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
      setTimeout(() => startTour(), 500); 
    } else {
      startTour();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 gap-3">
        {/* Kiri: Hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm text-white">
              SnoozePlan<span className="text-indigo-400">.AI</span>
            </span>
          </div>
        </div>

        {/* Kanan: Tombol Bantuan (Hanya muncul di mobile) */}
        <button
          onClick={handleStartTour}
          className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition"
          aria-label="Mulai Tur"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Overlay (mobile) */}
      {drawerOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}