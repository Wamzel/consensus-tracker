import webpush from "web-push";

let initialized = false;

function init() {
  if (initialized) return;
  if (!process.env.VAPID_EMAIL || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error("VAPID environment variables not configured");
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  initialized = true;
}

export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: { title: string; body: string; url?: string }
) {
  init();
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 410 || error.statusCode === 404) {
      throw new Error("SUBSCRIPTION_EXPIRED");
    }
    throw err;
  }
}
