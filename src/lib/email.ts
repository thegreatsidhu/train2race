import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "Train2Race <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html, from }: { to: string | string[]; subject: string; html: string; from?: string }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({ from: from ?? FROM, to, subject, html });
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

export function welcomeEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Welcome to Train2Race</title></head>
<body style="background:#0b0d10;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">Your race journey starts now. 🏁</div>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

  <!-- Logo -->
  <tr><td align="center" style="padding-bottom:24px;">
    <a href="https://train2race.com" style="display:inline-flex;flex-direction:column;align-items:center;gap:10px;text-decoration:none;">
      <img src="https://train2race.com/logo.png" alt="Train2Race" width="64" height="64" style="border-radius:14px;display:block;" />
      <span style="color:#ede9e2;font-size:16px;font-weight:700;letter-spacing:.04em;">Train2Race</span>
    </a>
  </td></tr>

  <!-- Card -->
  <tr><td style="background:#13161b;border-radius:20px;border:1px solid #2a2e35;padding:40px 36px;">

    <h1 style="color:#ede9e2;font-size:26px;font-weight:700;margin:0 0 10px;line-height:1.3;">Welcome, ${firstName}. 🏁</h1>
    <p style="color:#9aa3ab;font-size:15px;line-height:1.65;margin:0 0 32px;">Train together. Race together. Track your journey to the finish line with your team.</p>

    <div style="height:1px;background:#2a2e35;margin:0 0 28px;"></div>

    <p style="color:#5ec9b5;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin:0 0 20px;">Three steps to get started</p>

    <!-- Step 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
      <td width="36" valign="top" style="padding-top:1px;">
        <div style="width:28px;height:28px;border-radius:50%;background:#5ec9b5;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#0b0d10;">1</div>
      </td>
      <td style="padding-left:10px;">
        <p style="color:#ede9e2;font-size:14px;font-weight:600;margin:0 0 3px;">Find your race</p>
        <p style="color:#9aa3ab;font-size:13px;margin:0;line-height:1.5;">Set your goal race and get a personalized training plan built for you.</p>
      </td>
    </tr></table>

    <!-- Step 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
      <td width="36" valign="top" style="padding-top:1px;">
        <div style="width:28px;height:28px;border-radius:50%;background:#5ec9b5;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#0b0d10;">2</div>
      </td>
      <td style="padding-left:10px;">
        <p style="color:#ede9e2;font-size:14px;font-weight:600;margin:0 0 3px;">Join or create a team</p>
        <p style="color:#9aa3ab;font-size:13px;margin:0;line-height:1.5;">Train alongside your crew and compete on the leaderboard.</p>
      </td>
    </tr></table>

    <!-- Step 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;"><tr>
      <td width="36" valign="top" style="padding-top:1px;">
        <div style="width:28px;height:28px;border-radius:50%;background:#5ec9b5;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#0b0d10;">3</div>
      </td>
      <td style="padding-left:10px;">
        <p style="color:#ede9e2;font-size:14px;font-weight:600;margin:0 0 3px;">Log your first workout</p>
        <p style="color:#9aa3ab;font-size:13px;margin:0;line-height:1.5;">Manually log a run or connect your device to auto-sync your training.</p>
      </td>
    </tr></table>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="https://train2race.com/dashboard" style="display:inline-block;padding:14px 36px;background:#5ec9b5;color:#0b0d10;border-radius:999px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:.02em;">Go to your dashboard →</a>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="color:#4a5260;font-size:12px;margin:0 0 4px;line-height:1.6;">Questions? <a href="mailto:support@train2race.com" style="color:#5ec9b5;text-decoration:none;">support@train2race.com</a></p>
    <p style="color:#4a5260;font-size:12px;margin:0;"><a href="https://train2race.com" style="color:#4a5260;text-decoration:none;">train2race.com</a></p>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

export function groupEmailHtml({ preheader, heading, body, cta, ctaUrl }: { preheader?: string; heading: string; body: string; cta?: string; ctaUrl?: string }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="background:#0b0d10;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="480" cellpadding="0" cellspacing="0" style="background:#13161b;border-radius:16px;border:1px solid #2a2e35;padding:32px;">
<tr><td>
  <p style="color:#5ec9b5;font-size:13px;font-weight:600;margin:0 0 8px;letter-spacing:.08em;text-transform:uppercase;">Train2Race</p>
  <h1 style="color:#ede9e2;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">${heading}</h1>
  <div style="color:#9aa3ab;font-size:14px;line-height:1.6;margin-bottom:${cta ? "28px" : "0"};">${body}</div>
  ${cta && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background:#5ec9b5;color:#0b0d10;border-radius:999px;font-weight:600;text-decoration:none;font-size:14px;">${cta}</a>` : ""}
  <p style="color:#4a5260;font-size:12px;margin-top:24px 0 0;">You're receiving this because you're a member of this group on Train2Race.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
