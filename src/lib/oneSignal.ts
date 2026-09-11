const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

/**
 * Sends a push notification to one or more users via OneSignal, targeting the external ID(s)
 * set by Median.onesignal.login(userId) on the device (see src/lib/median.ts). Silently does
 * nothing if OneSignal isn't configured, if there are no target users, or if a user has no
 * registered device — this mirrors sendEmail()'s fire-and-forget shape so it can be dropped in
 * alongside every existing sendEmail() call without extra error handling at the call site.
 *
 * `data` is delivered as-is to the client's push-opened handler (see addPushOpenedListener() in
 * src/lib/median.ts) for deep-linking — e.g. { type: "chat_message", teamId }.
 */
export async function sendPush({ userId, title, message, url, data }: { userId: string | string[]; title: string; message: string; url?: string; data?: Record<string, unknown> }) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) return;
  const externalIds = Array.isArray(userId) ? userId : [userId];
  if (externalIds.length === 0) return;
  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: externalIds },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        ...(url ? { url } : {}),
        ...(data ? { data } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Push send failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Push send failed:", e);
  }
}
