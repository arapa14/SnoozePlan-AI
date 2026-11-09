import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import OneSignal from "react-onesignal";
import { useAuth } from "../hooks/useAuth";
import { initOneSignal, enablePush, disablePush } from "../lib/onesignal";

export default function NotificationSettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const supported = typeof window !== "undefined" && "Notification" in window;
  const denied = supported && Notification.permission === "denied";

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    initOneSignal().then(() => {
      if (cancelled) return;
      setEnabled(!!OneSignal.User.PushSubscription.optedIn);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const toggle = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        await enablePush(user.id);
        const on = !!OneSignal.User.PushSubscription.optedIn;
        setEnabled(on);
        if (!on)
          setMessage(
            "Izin belum diberikan. Klik Aktifkan lagi lalu pilih Izinkan.",
          );
      }
    } catch (err) {
      console.error(err);
      setMessage(
        "Izin notifikasi tidak diberikan. Coba lagi dan pilih Izinkan pada dialog browser.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-surface border border-line rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-mint/10 border border-mint/20 rounded-md">
          <Bell className="w-3.5 h-3.5 text-mint" />
        </div>
        <h2 className="text-sm font-bold text-ink">Notifikasi</h2>
      </div>

      <p className="text-xs text-ink-2 leading-relaxed">
        Pengingat deadline, tugas terlambat, dan agenda yang akan dimulai.
        Notifikasi tidak dikirim di dalam jam tidur Anda.
      </p>

      {!supported ? (
        <p className="text-[11px] text-warn">
          Browser ini tidak mendukung notifikasi.
        </p>
      ) : denied ? (
        <p className="text-[11px] text-warn bg-warn/10 border border-warn/20 rounded-md px-2.5 py-1.5">
          Izin notifikasi diblokir. Aktifkan lewat ikon gembok di address bar,
          lalu muat ulang halaman.
        </p>
      ) : (
        <button
          onClick={toggle}
          disabled={!ready || busy}
          className={`text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 ${
            enabled
              ? "bg-raised text-ink-2 hover:text-ink border border-line-strong"
              : "bg-mint hover:bg-pale text-canvas"
          }`}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : enabled ? (
            <BellOff className="w-3.5 h-3.5" />
          ) : (
            <Bell className="w-3.5 h-3.5" />
          )}
          {enabled ? "Matikan notifikasi" : "Aktifkan notifikasi"}
        </button>
      )}
      {message && (
        <p className="text-[11px] text-warn bg-warn/10 border border-warn/20 rounded-md px-2.5 py-1.5">
          {message}
        </p>
      )}
    </section>
  );
}
