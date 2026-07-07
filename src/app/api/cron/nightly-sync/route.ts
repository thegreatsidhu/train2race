// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/sync/engine";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { groupEmailHtml } from "@/lib/email";
import Anthropic from "@anthropic-ai/sdk";
import { computeLeaderboard, formatStat } from "@/lib/platformChallenge";

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

  // Lock platform challenge enrollment once start date passes
  await (prisma as any).platformChallenge.updateMany({
    where: { status: "active", enrollmentLocked: false, startDate: { lte: new Date() } },
    data: { enrollmentLocked: true },
  });

  // Platform challenge invite notifications — delivered once per invite for Train2Race members
  let inviteNotifs = 0;
  if (process.env.RESEND_API_KEY) {
    const pendingInvites = await (prisma as any).platformChallengeInvite.findMany({
      where: { userId: { not: null }, notified: false },
      select: {
        id: true,
        userId: true,
        challengeId: true,
        invitedBy: true,
        challenge: { select: { title: true, startDate: true, id: true } },
      },
    });

    // Group by invitee userId
    const byUser = new Map<string, typeof pendingInvites>();
    for (const inv of pendingInvites as any[]) {
      if (!byUser.has(inv.userId)) byUser.set(inv.userId, []);
      byUser.get(inv.userId)!.push(inv);
    }

    // Fetch inviter names in bulk
    const inviterIds = [...new Set((pendingInvites as any[]).map(i => i.invitedBy))];
    const inviters = await prisma.user.findMany({
      where: { id: { in: inviterIds } },
      select: { id: true, name: true },
    });
    const inviterMap = Object.fromEntries(inviters.map(u => [u.id, u.name || "A friend"]));

    // Fetch invitee email in bulk
    const inviteeIds = [...byUser.keys()];
    const invitees = await prisma.user.findMany({
      where: { id: { in: inviteeIds } },
      select: { id: true, name: true, email: true, emailOptOut: true },
    });
    const inviteeMap = Object.fromEntries(invitees.map(u => [u.id, u]));

    for (const [userId, invites] of byUser.entries()) {
      const user = inviteeMap[userId];
      if (!user?.email || user.emailOptOut) continue;
      const inviteRows = (invites as any[]).map(inv => {
        const inviterName = inviterMap[inv.invitedBy] ?? "A friend";
        const startStr = new Date(inv.challenge.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric" });
        const url = `${process.env.NEXTAUTH_URL || "https://train2race.com"}/challenge/${inv.challenge.id}`;
        return `<p style="margin:0 0 12px;"><strong style="color:#ede9e2;">${inviterName}</strong> invited you to join <a href="${url}" style="color:#5ec9b5;text-decoration:none;font-weight:600;">${inv.challenge.title}</a> — starts <strong style="color:#ede9e2;">${startStr}</strong>.</p>`;
      }).join("");

      try {
        await resend.emails.send({
          from: FROM,
          to: user.email,
          subject: invites.length === 1 ? `You've been invited to a challenge on Train2Race` : `You have ${invites.length} challenge invites on Train2Race`,
          html: groupEmailHtml({
            preheader: "You've been invited to a platform challenge",
            heading: "Challenge invite 🏆",
            body: inviteRows + `<p style="margin:12px 0 0;color:#4a5260;font-size:12px;">To stop receiving these emails, <a href="https://train2race.com/dashboard/settings" style="color:#5ec9b5;text-decoration:none;">unsubscribe in your settings</a>.</p>`,
            cta: "View your dashboard",
            ctaUrl: "https://train2race.com/dashboard",
          }),
        });
        inviteNotifs++;
      } catch {}

      // Mark as notified
      const ids = (invites as any[]).map(i => i.id);
      await (prisma as any).platformChallengeInvite.updateMany({
        where: { id: { in: ids } },
        data: { notified: true },
      });
    }
  }

  // Platform challenge daily awards + final announcements
  let awardsGenerated = 0;
  let announcementsGenerated = 0;
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const todayStr = new Date().toISOString().split("T")[0];
    const now2 = new Date();

    // Daily awards for active challenges
    const activeGlobal = await (prisma as any).platformChallenge.findMany({
      where: { status: "active", startDate: { lte: now2 }, endDate: { gte: now2 } },
      select: { id: true, title: true, type: true, activityFilter: true, startDate: true, endDate: true, dailyAwardsDate: true },
    });

    for (const ch of activeGlobal) {
      if (ch.dailyAwardsDate === todayStr) continue;
      try {
        const parts = await (prisma as any).platformChallengeParticipant.findMany({
          where: { challengeId: ch.id, optedOut: false }, select: { userId: true },
        });
        if (parts.length < 2) continue;
        const lb = await computeLeaderboard(ch, parts.map(p => p.userId));
        const top3 = lb.slice(0, 3).filter(e => e.score > 0);
        if (top3.length < 1) continue;

        const prompt = `Generate fun, punchy daily leaderboard awards for a fitness challenge called "${ch.title}" (tracking: ${ch.type.replace(/_/g," ")}). Top athletes today:\n${top3.map((e,i)=>`${i+1}. ${e.name} — ${e.stat}`).join("\n")}\n\nGenerate one playful award per person under 20 words, sports-announcer energy. Return ONLY a JSON array: [{"rank":1,"text":"..."},{"rank":2,"text":"..."},...]`;

        const resp = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        });
        let awards: any[] = [];
        try {
          const raw = resp.content[0]?.type === "text" ? resp.content[0].text : "";
          awards = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
        } catch {}

        const dailyAwards = {
          date: todayStr,
          awards: top3.map((e, i) => ({
            rank: i + 1,
            userId: e.userId,
            name: e.name,
            stat: e.stat,
            text: awards.find((a: any) => a.rank === i + 1)?.text ?? `${e.name} is crushing it!`,
          })),
        };

        await (prisma as any).platformChallenge.update({
          where: { id: ch.id },
          data: { dailyAwards, dailyAwardsDate: todayStr },
        });
        awardsGenerated++;
      } catch {}
    }

    // Final announcements for newly ended challenges
    const justEnded = await (prisma as any).platformChallenge.findMany({
      where: { status: "active", endDate: { lt: now2 }, finalAnnouncement: null },
      select: { id: true, title: true, type: true, activityFilter: true, startDate: true, endDate: true },
    });

    for (const ch of justEnded) {
      try {
        const parts = await (prisma as any).platformChallengeParticipant.findMany({
          where: { challengeId: ch.id, optedOut: false },
          select: { userId: true, user: { select: { name: true, email: true, emailOptOut: true } } },
        });
        const ids = parts.map(p => p.userId);
        const lb = await computeLeaderboard(ch, ids);
        const top5 = lb.slice(0, 5);

        const prompt = `Generate a fun final announcement for a fitness challenge called "${ch.title}" (${parts.length} athletes competed, tracking: ${ch.type.replace(/_/g," ")}). Top 5 finishers:\n${top5.map((e,i)=>`${i+1}. ${e.name} — ${e.stat}`).join("\n")}\n\nReturn ONLY JSON: {"intro":"1-2 sentence energetic intro celebrating the challenge ending","tributes":[{"rank":1,"text":"under 20 word tribute"},...]}`

        const resp = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        });
        let ann: any = null;
        try {
          const raw = resp.content[0]?.type === "text" ? resp.content[0].text : "";
          ann = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "null");
        } catch {}

        const finalAnnouncement = {
          intro: ann?.intro ?? `The ${ch.title} challenge is over! ${parts.length} athletes competed.`,
          top5: top5.map((e, i) => ({
            rank: i + 1,
            userId: e.userId,
            name: e.name,
            stat: e.stat,
            tribute: ann?.tributes?.find((t: any) => t.rank === i + 1)?.text ?? `${e.name} gave it everything!`,
          })),
        };

        await (prisma as any).platformChallenge.update({
          where: { id: ch.id },
          data: { finalAnnouncement, finalAnnouncedAt: now2, status: "ended" },
        });
        announcementsGenerated++;

        // Send final announcement email to all opted-in participants
        if (process.env.RESEND_API_KEY) {
          const medalsHtml = finalAnnouncement.top5.map(e => {
            const medal = e.rank===1?"🥇":e.rank===2?"🥈":e.rank===3?"🥉":`#${e.rank}`;
            return `<p style="margin:0 0 10px;"><strong style="color:#ede9e2;">${medal} ${e.name}</strong> — ${e.stat}<br/><span style="color:#9aa3ab;font-size:13px;">${e.tribute}</span></p>`;
          }).join("");
          for (const p of parts) {
            if (!p.user.email || p.user.emailOptOut) continue;
            try {
              await resend.emails.send({
                from: FROM,
                to: p.user.email,
                subject: `🏆 ${ch.title} — Final Results!`,
                html: groupEmailHtml({
                  preheader: `See who won the ${ch.title} challenge!`,
                  heading: `🏆 ${ch.title} — It's a wrap!`,
                  body: `<p style="margin:0 0 16px;color:#9aa3ab;">${finalAnnouncement.intro}</p>${medalsHtml}<p style="margin:16px 0 0;color:#4a5260;font-size:12px;">To stop receiving these emails, <a href="https://train2race.com/dashboard/settings" style="color:#5ec9b5;text-decoration:none;">unsubscribe in your settings</a>.</p>`,
                  cta: "See your dashboard",
                  ctaUrl: "https://train2race.com/dashboard",
                }),
              });
            } catch {}
          }
        }
      } catch {}
    }
  }

  return NextResponse.json({ ok: true, sync: syncResult, cleaned: { metrics: deletedMetrics.count, chats: deletedChats.count, advice: deletedAdvice.count, teamMessages: deletedTeamMsgs.count, rejectedChallenges: deletedRejected.count }, weeklyEmails, digestEmails, inviteNotifs, awardsGenerated, announcementsGenerated, ranAt: new Date().toISOString() });
}
