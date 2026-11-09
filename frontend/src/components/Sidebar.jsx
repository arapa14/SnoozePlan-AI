import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  History as HistoryIcon,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { startTour } from "../lib/tour";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "Riwayat", icon: HistoryIcon },
  { to: "/settings", label: "Pengaturan", icon: SettingsIcon },
];

export default function Sidebar({ onNavigate }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const name = profile?.display_name || profile?.full_name || "Mahasiswa";

  const handleStartTour = () => {
    onNavigate?.(); // Tutup drawer mobile jika ada

    // Jika user tidak di dashboard, pindahkan ke dashboard dulu
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
      // Beri waktu sejenak agar Dashboard selesai render sebelum tur dimulai
      setTimeout(() => startTour(), 500);
    } else {
      startTour();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="h-16 px-5 border-b border-line flex items-center gap-2.5 shrink-0">
        <div className="p-1.5 bg-mint/10 border border-mint/20 rounded-lg">
          <Moon className="w-4 h-4 text-mint" />
        </div>
        <span className="font-bold text-sm tracking-tight text-ink">
          SnoozePlan<span className="text-mint">.AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-mint/10 text-mint"
                  : "text-ink-2 hover:text-ink hover:bg-raised/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-mint"
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-line shrink-0 space-y-1.5">
        <button
          onClick={handleStartTour}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-ink-3 hover:text-mint hover:bg-mint/10 transition"
        >
          <HelpCircle className="w-4 h-4" />
          Mulai Tur Aplikasi
        </button>

        {/* Info user */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-canvas/60 border border-line">
          <div className="w-8 h-8 rounded-full bg-mint/15 text-mint grid place-items-center text-xs font-bold shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{name}</p>
            <p className="text-[10px] text-ink-3 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => {
            onNavigate?.();
            signOut();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-ink-3 hover:text-danger hover:bg-danger/10 transition"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}
