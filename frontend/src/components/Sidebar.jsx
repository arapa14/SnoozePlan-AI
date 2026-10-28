import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  History as HistoryIcon,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  HelpCircle, // Tambahkan icon ini
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import TutorialModal from "./TutorialModal"; // Import modal baru

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "Riwayat", icon: HistoryIcon },
  { to: "/settings", label: "Pengaturan", icon: SettingsIcon },
];

export default function Sidebar({ onNavigate }) {
  const { user, profile, signOut } = useAuth();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Brand */}
        <div className="h-14 px-5 border-b border-slate-800 flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            SnoozePlan<span className="text-indigo-400">.AI</span>
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-300"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-1">
          {/* TOMBOL BANTUAN */}
          <button
            onClick={() => {
              setIsTutorialOpen(true);
              onNavigate?.(); // Tutup drawer mobile jika di mobile
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
          >
            <HelpCircle className="w-4 h-4" />
            Bantuan & Tutorial
          </button>

          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-slate-200 truncate">
              {profile?.display_name || profile?.full_name || "Mahasiswa"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>

          <button
            onClick={() => {
              onNavigate?.();
              signOut();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>

      {/* RENDER MODAL DI LUAR SIDEBAR CONTAINER AGAR TIDAK TERPOTONG OVERFLOW */}
      <TutorialModal
        open={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </>
  );
}
