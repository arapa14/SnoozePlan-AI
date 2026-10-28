import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Moon } from "lucide-react";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-3 gap-3">
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

      {/* Main */}
      <main className="lg:pl-64 min-h-screen">
        <div className="p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}