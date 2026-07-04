// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/sync/engine";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { groupEmailHtml } from "@/lib/email";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Train2Race <support@train2race.com>";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const syncResult = await syncAllConnections();
  const metricsCutoff = new Date(Date.now()-90*24*60*60*1000);
  const deletedMetrics = await prisma.dailyMetrics.deleteMany({ where: { date: { lt: metricsCutoff } } });
  const chatCutoff = new Date(Date.now()-30*24*60*60*1000);
  const deletedChats = await prisma.chatMessage.deleteMany({ where: { createdAt: { lt: chatCutoff } } });
  const deletedAdvice = await prisma.adviceCard.deleteMany({ where: { createdAt: { lt: chatCutoff } } });
  const teamCutoff = new Date(Date.now()-90*24*60*60*1000);
  const deletedTeamMsgs = await prisma.teamMessage.deleteMany({ where: { createdAt: { lt: teamCutoff } } });
  const rejectedCutoff = new Date(Date.now()-7*24*60*60*1000);
  const deletedRejected = await prisma.teamChallenge.deleteMany({ where: { status: "rejected", createdAt: { lt: rejectedCutoff } } });

  // Weekly team summary emails — controlled by admin settings
  let weeklyEmails = 0;
  const summarySettings = await prisma.setting.findMany({ where: { key: { in: ["emailWeeklySummaryEnabled", "emailWeeklySummaryDay"] } } });
  const summaryMap = Object.fromEntries(summarySettings.map(s => [s.key, s.value]));
  const summaryEnabled = summaryMap.emailWeeklySummaryEnabled === "true";
  const summaryDay = parseInt(summaryMap.emailWeeklySummaryDay ?? "1", 10);
  if (summaryEnabled && new Date().getDay() === summaryDay && process.env.RESEND_API_KEY) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const teams = await prisma.team.findMany({
      where: { members: { some: {} } },
      select: {
        id: true,
        name: true,
        majorRace: { select: { name: true, raceDate: true } },
        members: { select: { user: { select: { id: true, name: true, email: true, emailOptOut: true } } } },
      },
    });

    for (const team of teams) {
      const memberIds = team.members.map(m => m.user.id);
      if (memberIds.length < 2) continue;

      const weeklyStats = await prisma.activity.groupBy({
        by: ["userId"],
        where: { userId: { in: memberIds }, startTime: { gte: weekAgo } },
        _sum: { distanceM: true },
        _count: { userId: true },
      });

      const statMap = Object.fromEntries(weeklyStats.map(s => [s.userId, s]));
      const sorted = [...weeklyStats].sort((a, b) => (b._count.userId || 0) - (a._count.userId || 0));
      const mvp = sorted[0];
      const mvpMember = team.members.find(m => m.user.id === mvp?.userId);

      const daysToRace = team.majorRace?.raceDate
        ? Math.max(0, Math.ceil((new Date(team.majorRace.raceDate).getTime() - Date.now()) / 86400000))
        : null;

      const rows = team.members.map(m => {
        const s = statMap[m.user.id];
        const miles = s?._sum?.distanceM ? (s._sum.distanceM / 1609.34).toFixed(1) : "0.0";
        const wk = s?._count?.userId || 0;
        return `<tr><td style="padding:6px 12px 6px 0;color:#ede9e2;font-size:14px;">${m.user.name || "Athlete"}</td><td style="padding:6px 12px;color:#5ec9b5;font-size:14px;font-weight:600;">${miles} mi</td><td style="padding:6px 0;color:#9aa3ab;font-size:14px;">${wk} workout${wk !== 1 ? "s" : ""}</td></tr>`;
      }).join("");

      const bodyParts = [
        `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;"><thead><tr><th style="text-align:left;padding:0 12px 8px 0;color:#4a5260;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Athlete</th><th style="text-align:left;padding:0 12px 8px;color:#4a5260;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Miles</th><th style="text-align:left;padding:0 0 8px;color:#4a5260;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Workouts</th></tr></thead><tbody>${rows}</tbody></table>`,
        mvpMember && mvp._count.userId > 0 ? `<p style="margin:0 0 10px;">&#127942; MVP this week: <strong style="color:#ede9e2;">${mvpMember.user.name || "Athlete"}</strong> with ${mvp._count.userId} workout${mvp._count.userId !== 1 ? "s" : ""}.</p>` : "",
        daysToRace !== null && daysToRace > 0 ? `<p style="margin:0;">&#127937; <strong style="color:#ede9e2;">${daysToRace} day${daysToRace !== 1 ? "s" : ""}</strong> until ${team.majorRace.name}. Keep it up!</p>` : daysToRace === 0 ? `<p style="margin:0;">&#127937; Race day is today — good luck, ${team.name}!</p>` : "",
      ].filter(Boolean).join("");

      for (const m of team.members) {
        if (!m.user.email || m.user.emailOptOut) continue;
        try {
          await resend.emails.send({
            from: FROM,
            to: m.user.email,
            subject: `${team.name} — Weekly Summary`,
            html: groupEmailHtml({ preheader: `Weekly team update for ${team.name}`, heading: `${team.name} — Weekly Update`, body: bodyParts }),
          });
          weeklyEmails++;
        } catch {}
      }
    }
  }

  // Daily high five digest — send once per day per user
  let digestEmails = 0;
  if (process.env.RESEND_API_KEY) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    // Find all high fives received today, grouped by activity owner
    const todayHighFives = await (prisma as any).highFive.findMany({
      where: { createdAt: { gte: dayStart } },
      select: {
        fromUser: { select: { name: true } },
        activity: {
          select: {
            id: true,
            title: true,
            type: true,
            user: { select: { id: true, name: true, email: true, emailOptOut: true } },
          },
        },
      },
    });

    // Group by recipient userId
    const byRecipient = new Map<string, { user: any; rows: { fromName: string; workoutName: string }[] }>();
    for (const hf of todayHighFives as any[]) {
      const owner = hf.activity.user;
      if (!owner.email || owner.emailOptOut) continue;
      if (!byRecipient.has(owner.id)) {
        byRecipient.set(owner.id, { user: owner, rows: [] });
      }
      byRecipient.get(owner.id)!.rows.push({
        fromName: hf.fromUser.name || "A teammate",
        workoutName: hf.activity.title || hf.activity.type,
      });
    }

    for (const { user, rows } of byRecipient.values()) {
      if (!rows.length) continue;
      const listHtml = rows
        .map(r => `<p style="margin:0 0 8px;"><strong style="color:#ede9e2;">${r.fromName}</strong> high fived your <strong style="color:#ede9e2;">${r.workoutName}</strong></p>`)
        .join("");
      try {
        await resend.emails.send({
          from: FROM,
          to: user.email,
          subject: "You got high fives today 🙌",
          html: groupEmailHtml({
            preheader: `${rows.length} high five${rows.length !== 1 ? "s" : ""} on your workouts today`,
            heading: "You got high fives today 🙌",
            body: listHtml + `<p style="margin:16px 0 0;color:#4a5260;font-size:12px;">To stop receiving these emails, <a href="https://train2race.com/dashboard/settings" style="color:#5ec9b5;text-decoration:none;">unsubscribe in your settings</a>.</p>`,
            cta: "View your dashboard",
            ctaUrl: "https://train2race.com/dashboard",
          }),
        });
        digestEmails++;
      } catch {}
    }
  }

  return NextResponse.json({ ok: true, sync: syncResult, cleaned: { metrics: deletedMetrics.count, chats: deletedChats.count, advice: deletedAdvice.count, teamMessages: deletedTeamMsgs.count, rejectedChallenges: deletedRejected.count }, weeklyEmails, digestEmails, ranAt: new Date().toISOString() });
}
