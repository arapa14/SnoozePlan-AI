import * as PusherPushNotifications from "@pusher/push-notifications-web";
import { supabase } from "./supabaseClient";

const client = new PusherPushNotifications.Client({
  instanceId: import.meta.env.VITE_BEAMS_INSTANCE_ID,
});

export async function enableNotifications(userId) {
  const { data: { session } } = await supabase.auth.getSession();

  const tokenProvider = new PusherPushNotifications.TokenProvider({
    url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beams-auth`,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  await client.start();                       // minta izin browser di sini
  await client.setUserId(userId, tokenProvider);
}

export async function disableNotifications() {
  await client.clearAllState();               // panggil juga saat logout
}