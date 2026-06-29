import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "Train2Race <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html }: { to: string | string[]; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error("Email send failed:", e);
  }
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
