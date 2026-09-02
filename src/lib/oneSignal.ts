const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

/**
 * Sends a push notification to one user via OneSignal, targeting the external ID set by
 * Median.onesignal.login(userId) on the device (see src/lib/median.ts). Silently does nothing
 * if OneSignal isn't configured, or if the user has no registered device — this mirrors
 * sendEmail()'s fire-and-forget shape so it can be dropped in alongside every existing
 * sendEmail() call without extra error handling at the call site.
 */
export async function sendPush({ userId, title, message, url }: { userId: string; title: string; message: string; url?: string }) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) return;
  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [userId] },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        ...(url ? { url } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Push send failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Push send failed:", e);
  }
}
