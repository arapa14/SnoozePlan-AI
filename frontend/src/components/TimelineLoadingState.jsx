import { useState, useEffect } from "react";
import { Loader2, Sparkles, Brain, Clock, ShieldCheck } from "lucide-react";

const STEPS = [
  { icon: Brain, text: "Menganalisis skor prioritas tugas..." },
  { icon: Clock, text: "Mencari slot waktu kosong..." },
  { icon: ShieldCheck, text: "Memvalidasi jam tidur & agenda..." },
  { icon: Sparkles, text: "Menyusun ulang timeline..." },
];

export default function TimelineLoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const CurrentIcon = STEPS[step].icon;

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/5">
      {/* Header Status */}
      <div className="p-4 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        <div className="flex items-center gap-2 text-sm font-medium text-indigo-300">
          <CurrentIcon className="w-4 h-4" />
          <span className="animate-pulse">{STEPS[step].text}</span>
        </div>
      </div>

      {/* Skeleton Timeline */}
      <div className="p-5 space-y-4 opacity-50">
        {/* Mock Hari 1 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="w-32 h-3 bg-slate-800 rounded animate-pulse" />
              <div className="w-20 h-2 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="pl-6 border-l-2 border-slate-800 space-y-3 ml-5">
            <div className="h-14 bg-slate-800/50 border border-slate-800 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-800/50 border border-slate-800 rounded-xl animate-pulse delay-75" />
            <div className="h-14 bg-slate-800/50 border border-slate-800 rounded-xl animate-pulse delay-150" />
          </div>
        </div>
      </div>
    </div>
  );
}
