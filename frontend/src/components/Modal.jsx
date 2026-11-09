import { useEffect } from "react";
import { createPortal } from "react-dom";
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-surface border border-line-strong/60 w-full ${SIZES[size]} rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh] animate-pop`}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-start gap-3">
          {Icon && (
            <div className="p-2 bg-mint/10 border border-mint/20 rounded-lg shrink-0">
              <Icon className="w-4 h-4 text-mint" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-ink">{title}</h2>
            {description && (
              <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink p-1 -m-1 rounded-md hover:bg-raised transition shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
