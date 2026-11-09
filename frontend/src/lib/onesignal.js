import OneSignal from "react-onesignal";

let initPromise;
export function initOneSignal() {
  if (!initPromise) {
    initPromise = OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: import.meta.env.DEV,
    });
  }
  return initPromise;
}

// Hubungkan browser ini ke user Supabase (tidak meminta izin)
export async function linkPushUser(userId) {
  await initOneSignal();
  await OneSignal.login(userId);
}

// Dipanggil dari tombol di Settings: login + minta izin browser
export async function enablePush(userId) {
  await linkPushUser(userId);
  await OneSignal.Notifications.requestPermission();
}

export async function disablePush() {
  await initOneSignal();
  await OneSignal.User.PushSubscription.optOut();
}

export async function logoutPush() {
  await initOneSignal();
  await OneSignal.logout();
}