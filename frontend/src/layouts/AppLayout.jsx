import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Tambahkan useNavigate & useLocation
import { Menu, Moon, HelpCircle } from "lucide-react"; // Tambahkan HelpCircle
import Sidebar from "../components/Sidebar";
import { startTour } from "../lib/tour"; // Import fungsi tur
import { useAuth } from "../hooks/useAuth";
import { linkPushUser } from "../lib/onesignal";

export default function AppLayout() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id) linkPushUser(user.id).catch(console.error);
  }, [user?.id]);

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
    <div className="min-h-screen bg-canvas text-ink">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 h-14 bg-surface/90 backdrop-blur border-b border-line flex items-center justify-between px-3 gap-3">
        {/* Kiri: Hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-1 text-ink-2 hover:text-ink rounded-lg hover:bg-raised transition"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-mint" />
            <span className="font-bold text-sm text-ink">
              SnoozePlan<span className="text-mint">.AI</span>
            </span>
          </div>
        </div>

        {/* Kanan: Tombol Bantuan (Hanya muncul di mobile) */}
        <button
          onClick={handleStartTour}
          className="p-2 text-ink-2 hover:text-mint rounded-lg hover:bg-raised transition"
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
          className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-line transform transition-transform duration-200 lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>

      {/* Main Content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-80 lg:left-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(46,156,124,0.12),transparent)]"
      />
      <main className="relative lg:pl-64 min-h-screen">
        <div className="p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
