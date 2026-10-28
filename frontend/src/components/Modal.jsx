import { useEffect } from "react";
import { createPortal } from "react-dom"; // <-- Tambahkan ini
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  size = "md",
  children,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Bungkus return dengan createPortal
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-slate-900 border border-slate-800 w-full ${SIZES[size]} rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex items-start gap-3">
          {Icon && (
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shrink-0">
              <Icon className="w-4 h-4 text-indigo-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">{title}</h2>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 -m-1 rounded-md hover:bg-slate-800 transition shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body // <-- Render langsung ke body
  );
}