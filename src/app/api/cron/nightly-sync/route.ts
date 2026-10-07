// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { groupEmailHtml, unsubscribeUrl } from "@/lib/email";
import { sendPush } from "@/lib/oneSignal";
import { anthropic, HAIKU_MODEL } from "@/lib/ai/client";
import { computeLeaderboard } from "@/lib/platformChallenge";

// ─── Batched nightly job ─────────────────────────────────────────────────────────────────────
// The work is split into phases, and each phase walks its items with a saved cursor. A single
// invocation works for at most TIME_BUDGET_MS, saves where it got to (in the `settings` table)
// and returns. vercel.json fires this route every 10 minutes from 05:00–06:50 UTC; each run picks
// up where the previous one stopped, and once everything is done for the day the remaining runs
// return immediately. Every send is either marked in the DB or uses a Resend idempotency key, so
// a run that dies mid-batch never double-sends when the next one resumes.

export const maxDuration = 300; // seconds — within Vercel Pro limits with or without Fluid compute
const TIME_BUDGET_MS = 240_000; // leave headroom under maxDuration to save state and respond
const STATE_KEY = "cron:nightly-sync:state";
const LEASE_MS = (maxDuration + 30) * 1000; // stops two overlapping runs (e.g. a manual trigger)
const EMAIL_BATCH = 100; // Resend batch API maximum
const PUSH_CONCURRENCY = 10;
const SITE = process.env.NEXTAUTH_URL || "https://train2race.com";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Train2Race <support@train2race.com>";

const PHASES = ["cleanup", "weeklySummary", "highFiveDigest", "editNotifs", "inviteNotifs", "challengeAwards", "finalAnnouncements"] as const;
type Phase = typeof PHASES[number];

interface State {
  day: string;               // UTC date this state belongs to
  phase: Phase | "done";
  cursor: string | null;     // phase-specific resume point
  digestFrom: string;        // high-five digest window (fixed for the whole day so resumes agree)
  digestTo: string;
  leaseUntil: string | null;
  runs: number;
  stats: Record<string, number>;
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function loadState(now: Date): Promise<State> {
  const day = now.toISOString().slice(0, 10);
  const row = await prisma.setting.findUnique({ where: { key: STATE_KEY } });
  let prev: State | null = null;
  try { prev = row ? JSON.parse(row.value) : null; } catch {}
  if (prev?.day === day) return prev;
  // New day: the digest window starts where yesterday's ended, so no high five is missed or
  // counted twice (capped at 48h back in case the job didn't run for a while).
  const prevTo = prev?.digestTo ? new Date(prev.digestTo) : null;
  const from = prevTo && now.getTime() - prevTo.getTime() < 48 * 3600_000 ? prevTo : new Date(now.getTime() - 24 * 3600_000);
  return { day, phase: PHASES[0], cursor: null, digestFrom: from.toISOString(), digestTo: now.toISOString(), leaseUntil: null, runs: 0, stats: {} };
}

async function saveState(state: State) {
  const value = JSON.stringify(state);
  await prisma.setting.upsert({ where: { key: STATE_KEY }, create: { key: STATE_KEY, value }, update: { value } });
}

// ─── Sending helpers ─────────────────────────────────────────────────────────────────────────

let lastResendCall = 0;
async function paceResend() {
  // Resend's default limit is a few requests/second per account; batch sends count as one.
  const wait = lastResendCall + 600 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastResendCall = Date.now();
}

/** Sends emails in Resend batches of 100. Returns the number accepted. Never throws. */
async function sendEmails(emails: { to: string; subject: string; html: string }[], idempotencyKey: string): Promise<number> {
  if (!process.env.RESEND_API_KEY || emails.length === 0) return 0;
  let sent = 0;
  for (let i = 0; i < emails.length; i += EMAIL_BATCH) {
    const chunk = emails.slice(i, i + EMAIL_BATCH).map(e => ({ from: FROM, ...e }));
    for (let attempt = 0; attempt < 3; attempt++) {
      await paceResend();
      try {
        const { error } = await resend.batch.send(chunk, { idempotencyKey: `${idempotencyKey}:${i / EMAIL_BATCH}` });
        if (!error) { sent += chunk.length; break; }
        console.error("nightly-sync: email batch failed", idempotencyKey, error);
        if (error.name !== "rate_limit_exceeded") break;
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      } catch (e) {
        console.error("nightly-sync: email batch threw", idempotencyKey, e);
        break;
      }
    }
  }
  return sent;
}

/** Awaits pushes with bounded concurrency (un-awaited promises can be dropped when a serverless function returns). */
async function sendPushes(pushes: Parameters<typeof sendPush>[0][]) {
  for (let i = 0; i < pushes.length; i += PUSH_CONCURRENCY) {
    await Promise.allSettled(pushes.slice(i, i + PUSH_CONCURRENCY).map(p => sendPush(p)));
  }
}

// ─── Phases ──────────────────────────────────────────────────────────────────────────────────
// Each returns { done, cursor }. `outOfTime()` should be checked between units of work.

type Ctx = { state: State; outOfTime: () => boolean; save: () => Promise<void>; bump: (k: string, n?: number) => void };

async function cleanup({ bump }: Ctx) {
  const metricsCutoff = new Date(Date.now() - 90 * 86400_000);
  const teamCutoff = new Date(Date.now() - 90 * 86400_000);
  const rejectedCutoff = new Date(Date.now() - 7 * 86400_000);
  const [m, t, r] = await Promise.all([
    prisma.dailyMetrics.deleteMany({ where: { date: { lt: metricsCutoff } } }),
    prisma.teamMessage.deleteMany({ where: { createdAt: { lt: teamCutoff } } }),
    prisma.teamChallenge.deleteMany({ where: { status: "rejected", createdAt: { lt: rejectedCutoff } } }),
  ]);
  bump("cleanedMetrics", m.count); bump("cleanedTeamMessages", t.count); bump("cleanedRejectedChallenges", r.count);
  // Prune usage-limiter rows (src/lib/usageLimit.ts) and expired remember-me tokens
  const [rl, rt] = await Promise.all([
    prisma.adminAuthAttempt.deleteMany({ where: { key: { startsWith: "rl:" }, updatedAt: { lt: new Date(Date.now() - 2 * 86400_000) } } }),
    prisma.rememberToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
  bump("prunedLimiterRows", rl.count); bump("prunedRememberTokens", rt.count);
  // Lock platform challenge enrollment once start date passes
  await prisma.platformChallenge.updateMany({ where: { status: "active", enrollmentLocked: false, startDate: { lte: new Date() } }, data: { enrollmentLocked: true } });
  return { done: true, cursor: null };
}

async function weeklySummary({ state, outOfTime, save, bump }: Ctx) {
  const settings = await prisma.setting.findMany({ where: { key: { in: ["emailWeeklySummaryEnabled", "emailWeeklySummaryDay"] } } });
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  if (map.emailWeeklySummaryEnabled !== "true") return { done: true, cursor: null };
  if (new Date(state.day + "T12:00:00Z").getUTCDay() !== parseInt(map.emailWeeklySummaryDay ?? "1", 10)) return { done: true, cursor: null };

  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  let cursor = state.cursor;
  while (!outOfTime()) {
    const teams = await prisma.team.findMany({
      where: { members: { some: {} }, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: 10,
      select: {
        id: true, name: true,
        majorRace: { select: { name: true, raceDate: true } },
        members: { select: { user: { select: { id: true, name: true, email: true, emailOptOut: true, emailWeeklyOptOut: true, pushEnabled: true, pushWeeklyOptOut: true } } } },
      },
    });
    if (teams.length === 0) return { done: true, cursor: null };

    for (const team of teams) {
      if (outOfTime()) return { done: false, cursor };
      const memberIds = team.members.map(m => m.user.id);
      if (memberIds.length >= 2) {
        const weeklyStats = await prisma.activity.groupBy({
          by: ["userId"], where: { userId: { in: memberIds }, startTime: { gte: weekAgo } },
          _sum: { distanceM: true }, _count: { userId: true },
        });
        const statMap = Object.fromEntries(weeklyStats.map(s => [s.userId, s]));
        const mvp = [...weeklyStats].sort((a, b) => (b._count.userId || 0) - (a._count.userId || 0))[0];
        const mvpMember = team.members.find(m => m.user.id === mvp?.userId);
        const daysToRace = team.majorRace?.raceDate ? Math.max(0, Math.ceil((new Date(team.majorRace.raceDate).getTime() - Date.now()) / 86400000)) : null;

        const rows = team.members.map(m => {
          const s = statMap[m.user.id];
          const miles = s?._sum?.distanceM ? (s._sum.distanceM / 1609.34).toFixed(1) : "0.0";
          const wk = s?._count?.userId || 0;
          return `<tr><td style="padding:6px 12px 6px 0;color:#ede9e2;font-size:14px;">${esc(m.user.name || "Athlete")}</td><td style="padding:6px 12px;color:#5ec9b5;font-size:14px;font-weight:600;">${miles} mi</td><td style="padding:6px 0;color:#9aa3ab;font-size:14px;">${wk} workout${wk !== 1 ? "s" : ""}</td></tr>`;
        }).join("");
        const body = [
          `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;"><thead><tr><th style="text-align:left;padding:0 12px 8px 0;color:#4a5260;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Athlete</th><th style="text-align:left;padding:0 12px 8px;color:#4a5260;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Miles</th><th style="text-align:left;padding:0 0 8px;color:#4a5260;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Workouts</th></tr></thead><tbody>${rows}</tbody></table>`,
          mvpMember && mvp._count.userId > 0 ? `<p style="margin:0 0 10px;">&#127942; MVP this week: <strong style="color:#ede9e2;">${esc(mvpMember.user.name || "Athlete")}</strong> with ${mvp._count.userId} workout${mvp._count.userId !== 1 ? "s" : ""}.</p>` : "",
          daysToRace !== null && daysToRace > 0 ? `<p style="margin:0;">&#127937; <strong style="color:#ede9e2;">${daysToRace} day${daysToRace !== 1 ? "s" : ""}</strong> until ${esc(team.majorRace.name)}. Keep it up!</p>` : daysToRace === 0 ? `<p style="margin:0;">&#127937; Race day is today — good luck, ${esc(team.name)}!</p>` : "",
        ].filter(Boolean).join("");
        const pushSummary = mvpMember && mvp._count.userId > 0
          ? `MVP this week: ${mvpMember.user.name || "Athlete"} with ${mvp._count.userId} workout${mvp._count.userId !== 1 ? "s" : ""}`
          : "See how your team did this week";

        const emails = team.members
          .filter(m => m.user.email && !m.user.emailOptOut && !m.user.emailWeeklyOptOut)
          .map(m => ({
            to: m.user.email, subject: `${team.name} — Weekly Summary`,
            html: groupEmailHtml({ preheader: `Weekly team update for ${esc(team.name)}`, heading: `${esc(team.name)} — Weekly Update`, body, unsubUrl: unsubscribeUrl(m.user.id) }),
          }));
        bump("weeklyEmails", await sendEmails(emails, `weekly:${state.day}:${team.id}`));

        // Same message for the whole team → one OneSignal call targeting every eligible member.
        const pushIds = team.members.filter(m => m.user.pushEnabled && !m.user.pushWeeklyOptOut).map(m => m.user.id);
        if (pushIds.length) await sendPush({ userId: pushIds, title: `${team.name} — Weekly Summary`, message: pushSummary });
      }
      cursor = team.id;
      state.cursor = cursor;
      await save();
    }
  }
  return { done: false, cursor };
}

async function highFiveDigest({ state, outOfTime, save, bump }: Ctx) {
  const highFives = await prisma.highFive.findMany({
    where: { createdAt: { gte: new Date(state.digestFrom), lt: new Date(state.digestTo) } },
    select: {
      fromUser: { select: { name: true } },
      activity: { select: { title: true, type: true, user: { select: { id: true, email: true, emailOptOut: true, emailDigestOptOut: true, pushEnabled: true, pushDigestOptOut: true } } } },
    },
  });
  const byRecipient = new Map<string, { user: any; rows: { fromName: string; workoutName: string }[] }>();
  for (const hf of highFives) {
    const owner = hf.activity.user;
    if (!byRecipient.has(owner.id)) byRecipient.set(owner.id, { user: owner, rows: [] });
    byRecipient.get(owner.id)!.rows.push({ fromName: hf.fromUser.name || "A teammate", workoutName: hf.activity.title || hf.activity.type });
  }
  const recipients = [...byRecipient.keys()].sort().filter(id => !state.cursor || id > state.cursor);

  for (let i = 0; i < recipients.length; i += EMAIL_BATCH) {
    if (outOfTime()) return { done: false, cursor: state.cursor };
    const chunk = recipients.slice(i, i + EMAIL_BATCH).map(id => byRecipient.get(id)!);
    const emails = chunk
      .filter(({ user }) => user.email && !user.emailOptOut && !user.emailDigestOptOut)
      .map(({ user, rows }) => ({
        to: user.email, subject: "You got high fives 🙌",
        html: groupEmailHtml({
          preheader: `${rows.length} high five${rows.length !== 1 ? "s" : ""} on your workouts`,
          heading: "You got high fives 🙌",
          body: rows.map(r => `<p style="margin:0 0 8px;"><strong style="color:#ede9e2;">${esc(r.fromName)}</strong> high fived your <strong style="color:#ede9e2;">${esc(r.workoutName)}</strong></p>`).join(""),
          cta: "View your dashboard", ctaUrl: `${SITE}/dashboard`, unsubUrl: unsubscribeUrl(user.id),
        }),
      }));
    bump("digestEmails", await sendEmails(emails, `digest:${state.day}:${chunk[0].user.id}`));
    await sendPushes(chunk
      .filter(({ user }) => user.pushEnabled && !user.pushDigestOptOut)
      .map(({ user, rows }) => ({
        userId: user.id, title: "You got high fives 🙌",
        message: rows.length === 1 ? `${rows[0].fromName} high fived your ${rows[0].workoutName}` : `${rows.length} high fives on your workouts`,
      })));
    state.cursor = chunk[chunk.length - 1].user.id;
    await save();
  }
  return { done: true, cursor: null };
}

async function editNotifs({ state, outOfTime, bump }: Ctx) {
  while (!outOfTime()) {
    // One challenge at a time; its logs are marked notified right after its emails go out.
    const first = await prisma.challengeEditLog.findFirst({ where: { notified: false }, orderBy: { createdAt: "asc" }, select: { challengeId: true } });
    if (!first) return { done: true, cursor: null };
    const logs = await prisma.challengeEditLog.findMany({ where: { notified: false, challengeId: first.challengeId }, orderBy: { createdAt: "asc" } });
    const firstLog = logs[0], latestLog = logs[logs.length - 1];

    let participants: { id: string; email: string }[] = [];
    const userSel = { select: { id: true, email: true, emailOptOut: true, emailChallengeOptOut: true } };
    if (firstLog.challengeType === "platform") {
      participants = (await prisma.platformChallengeParticipant.findMany({ where: { challengeId: first.challengeId, optedOut: false }, select: { user: userSel } })).map(p => p.user);
    } else if (firstLog.challengeType === "team") {
      participants = (await prisma.teamChallengeEntry.findMany({ where: { challengeId: first.challengeId }, distinct: ["userId"], select: { user: userSel } })).map(e => e.user);
    }
    participants = participants.filter((u: any) => u.email && !u.emailOptOut && !u.emailChallengeOptOut);

    const allChanges = logs.flatMap(l => l.changes as any[]);
    const endDateChange = allChanges.find(ch => ch.field === "endDate");
    const title = esc(latestLog.challengeTitle), editor = esc(latestLog.editedByName);
    const changeLines = allChanges.map((ch: any) => {
      const label = ch.field === "endDate" ? "End date" : ch.field === "startDate" ? "Start date" : ch.field === "title" ? "Title" : ch.field === "badgeName" ? "Badge" : ch.field.replace(/([A-Z])/g, " $1");
      return `<p style="margin:0 0 4px;color:#9aa3ab;font-size:13px;">• <strong style="color:#ede9e2;">${esc(label)}:</strong> ${esc(ch.from)} → ${esc(ch.to)}</p>`;
    }).join("");
    const heading = endDateChange ? `Great news! ${title} has been extended` : `${title} has been updated`;
    const preheader = endDateChange ? `${title} has been extended to ${esc(endDateChange.to)}` : `${title} was updated by ${editor}`;
    const body = `<p style="margin:0 0 12px;color:#9aa3ab;">${endDateChange ? `<strong style="color:#ede9e2;">${title}</strong> has been extended to <strong style="color:#ede9e2;">${esc(endDateChange.to)}</strong> by ${editor}.` : `<strong style="color:#ede9e2;">${title}</strong> was updated by <strong style="color:#ede9e2;">${editor}</strong>:`}</p>${changeLines}`;
    const subject = endDateChange ? `Great news! ${latestLog.challengeTitle} has been extended` : `${latestLog.challengeTitle} has been updated`;

    bump("editNotifs", await sendEmails(participants.map(p => ({
      to: p.email, subject,
      html: groupEmailHtml({ preheader, heading, body, cta: "View challenge", ctaUrl: `${SITE}/dashboard`, unsubUrl: unsubscribeUrl(p.id) }),
    })), `edits:${latestLog.id}`));
    await prisma.challengeEditLog.updateMany({ where: { id: { in: logs.map(l => l.id) } }, data: { notified: true } });
  }
  return { done: false, cursor: null };
}

async function inviteNotifs({ outOfTime, bump }: Ctx) {
  while (!outOfTime()) {
    const pending = await prisma.platformChallengeInvite.findMany({
      where: { userId: { not: null }, notified: false },
      orderBy: { userId: "asc" },
      take: 300,
      select: { id: true, userId: true, invitedBy: true, challenge: { select: { title: true, startDate: true, id: true } } },
    });
    if (pending.length === 0) return { done: true, cursor: null };

    const byUser = new Map<string, any[]>();
    for (const inv of pending) {
      if (!byUser.has(inv.userId)) byUser.set(inv.userId, []);
      byUser.get(inv.userId)!.push(inv);
    }
    const [inviters, invitees] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: [...new Set(pending.map(i => i.invitedBy))] } }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { id: { in: [...byUser.keys()] } }, select: { id: true, email: true, emailOptOut: true, emailChallengeOptOut: true } }),
    ]);
    const inviterMap = Object.fromEntries(inviters.map(u => [u.id, u.name || "A friend"]));
    const inviteeMap = Object.fromEntries(invitees.map(u => [u.id, u]));

    const emails = [];
    for (const [userId, invites] of byUser.entries()) {
      const user = inviteeMap[userId];
      if (!user?.email || user.emailOptOut || user.emailChallengeOptOut) continue;
      const body = invites.map(inv => {
        const startStr = new Date(inv.challenge.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
        return `<p style="margin:0 0 12px;"><strong style="color:#ede9e2;">${esc(inviterMap[inv.invitedBy] ?? "A friend")}</strong> invited you to join <a href="${SITE}/challenge/${inv.challenge.id}" style="color:#5ec9b5;text-decoration:none;font-weight:600;">${esc(inv.challenge.title)}</a> — starts <strong style="color:#ede9e2;">${startStr}</strong>.</p>`;
      }).join("");
      emails.push({
        to: user.email,
        subject: invites.length === 1 ? `You've been invited to a challenge on Train2Race` : `You have ${invites.length} challenge invites on Train2Race`,
        html: groupEmailHtml({ preheader: "You've been invited to a platform challenge", heading: "Challenge invite 🏆", body, cta: "View your dashboard", ctaUrl: `${SITE}/dashboard`, unsubUrl: unsubscribeUrl(userId) }),
      });
    }
    bump("inviteNotifs", await sendEmails(emails, `invites:${pending[0].id}`));
    await prisma.platformChallengeInvite.updateMany({ where: { id: { in: pending.map(i => i.id) } }, data: { notified: true } });
  }
  return { done: false, cursor: null };
}

async function challengeAwards({ state, outOfTime, bump }: Ctx) {
  if (!process.env.ANTHROPIC_API_KEY) return { done: true, cursor: null };
  const now = new Date();
  const active = await prisma.platformChallenge.findMany({
    where: { status: "active", startDate: { lte: now }, endDate: { gte: now }, OR: [{ dailyAwardsDate: null }, { dailyAwardsDate: { not: state.day } }] },
    select: { id: true, title: true, type: true, activityFilter: true, startDate: true, endDate: true },
  });
  for (const ch of active) {
    if (outOfTime()) return { done: false, cursor: null };
    try {
      const parts = await prisma.platformChallengeParticipant.findMany({ where: { challengeId: ch.id, optedOut: false }, select: { userId: true } });
      const top3 = parts.length < 2 ? [] : (await computeLeaderboard(ch, parts.map(p => p.userId))).slice(0, 3).filter(e => e.score > 0);
      if (top3.length < 1) {
        // Mark as handled so it isn't re-queried on every resumed run today.
        await prisma.platformChallenge.update({ where: { id: ch.id }, data: { dailyAwardsDate: state.day } });
        continue;
      }
      const prompt = `Generate fun, punchy daily leaderboard awards for a fitness challenge called "${ch.title}" (tracking: ${ch.type.replace(/_/g, " ")}). Top athletes today:\n${top3.map((e, i) => `${i + 1}. ${e.name} — ${e.stat}`).join("\n")}\n\nGenerate one playful award per person under 20 words, sports-announcer energy. Return ONLY a JSON array: [{"rank":1,"text":"..."},{"rank":2,"text":"..."},...]`;
      const resp = await anthropic.messages.create({ model: HAIKU_MODEL, max_tokens: 400, messages: [{ role: "user", content: prompt }] });
      let awards: any[] = [];
      try { const raw = resp.content[0]?.type === "text" ? resp.content[0].text : ""; awards = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]"); } catch {}
      const dailyAwards = {
        date: state.day,
        awards: top3.map((e, i) => ({ rank: i + 1, userId: e.userId, name: e.name, stat: e.stat, text: awards.find((a: any) => a.rank === i + 1)?.text ?? `${e.name} is crushing it!` })),
      };
      await prisma.platformChallenge.update({ where: { id: ch.id }, data: { dailyAwards, dailyAwardsDate: state.day } });
      bump("awardsGenerated");
    } catch (e) {
      console.error("nightly-sync: daily awards failed", ch.id, e);
    }
  }
  return { done: true, cursor: null };
}

async function finalAnnouncements({ state, outOfTime, bump }: Ctx) {
  const now = new Date();
  const justEnded = await prisma.platformChallenge.findMany({
    where: { status: "active", endDate: { lt: now }, finalAnnouncement: null },
    select: { id: true, title: true, type: true, activityFilter: true, startDate: true, endDate: true },
  });
  for (const ch of justEnded) {
    if (outOfTime()) return { done: false, cursor: null };
    try {
      const parts = await prisma.platformChallengeParticipant.findMany({
        where: { challengeId: ch.id, optedOut: false },
        select: { userId: true, user: { select: { email: true, emailOptOut: true, emailChallengeOptOut: true, pushEnabled: true, pushChallengeOptOut: true } } },
      });
      const top5 = (await computeLeaderboard(ch, parts.map(p => p.userId))).slice(0, 5);

      let ann: any = null;
      if (process.env.ANTHROPIC_API_KEY) {
        const prompt = `Generate a fun final announcement for a fitness challenge called "${ch.title}" (${parts.length} athletes competed, tracking: ${ch.type.replace(/_/g, " ")}). Top 5 finishers:\n${top5.map((e, i) => `${i + 1}. ${e.name} — ${e.stat}`).join("\n")}\n\nReturn ONLY JSON: {"intro":"1-2 sentence energetic intro celebrating the challenge ending","tributes":[{"rank":1,"text":"under 20 word tribute"},...]}`;
        try {
          const resp = await anthropic.messages.create({ model: HAIKU_MODEL, max_tokens: 600, messages: [{ role: "user", content: prompt }] });
          const raw = resp.content[0]?.type === "text" ? resp.content[0].text : "";
          ann = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "null");
        } catch {}
      }
      const finalAnnouncement = {
        intro: ann?.intro ?? `The ${ch.title} challenge is over! ${parts.length} athletes competed.`,
        top5: top5.map((e, i) => ({ rank: i + 1, userId: e.userId, name: e.name, stat: e.stat, tribute: ann?.tributes?.find((t: any) => t.rank === i + 1)?.text ?? `${e.name} gave it everything!` })),
      };
      // Mark ended before notifying, so a resumed run never announces the same challenge twice.
      await prisma.platformChallenge.update({ where: { id: ch.id }, data: { finalAnnouncement, finalAnnouncedAt: now, status: "ended" } });
      bump("announcementsGenerated");

      const medal = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
      const medalsHtml = finalAnnouncement.top5.map(e => `<p style="margin:0 0 10px;"><strong style="color:#ede9e2;">${medal(e.rank)} ${esc(e.name)}</strong> — ${esc(e.stat)}<br/><span style="color:#9aa3ab;font-size:13px;">${esc(e.tribute)}</span></p>`).join("");
      const emails = parts
        .filter(p => p.user.email && !p.user.emailOptOut && !p.user.emailChallengeOptOut)
        .map(p => ({
          to: p.user.email, subject: `🏆 ${ch.title} — Final Results!`,
          html: groupEmailHtml({
            preheader: `See who won the ${esc(ch.title)} challenge!`, heading: `🏆 ${esc(ch.title)} — It's a wrap!`,
            body: `<p style="margin:0 0 16px;color:#9aa3ab;">${esc(finalAnnouncement.intro)}</p>${medalsHtml}`,
            cta: "See your dashboard", ctaUrl: `${SITE}/dashboard`, unsubUrl: unsubscribeUrl(p.userId),
          }),
        }));
      bump("finalResultEmails", await sendEmails(emails, `final:${ch.id}`));

      const rankByUserId = new Map(finalAnnouncement.top5.map(e => [e.userId, e]));
      await sendPushes(parts.filter(p => p.user.pushEnabled && !p.user.pushChallengeOptOut).map(p => {
        const mine = rankByUserId.get(p.userId);
        return { userId: p.userId, title: `🏆 ${ch.title} — Final Results!`, message: mine ? `You finished ${medal(mine.rank)} — ${mine.stat}!` : `See how the challenge wrapped up.` };
      }));
    } catch (e) {
      console.error("nightly-sync: final announcement failed", ch.id, e);
    }
  }
  return { done: true, cursor: null };
}

const RUNNERS: Record<Phase, (ctx: Ctx) => Promise<{ done: boolean; cursor: string | null }>> = {
  cleanup, weeklySummary, highFiveDigest, editNotifs, inviteNotifs, challengeAwards, finalAnnouncements,
};

// ─── Handler ─────────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const started = Date.now();
  const now = new Date();
  const state = await loadState(now);
  if (state.phase === "done") return NextResponse.json({ ok: true, done: true, day: state.day, stats: state.stats });
  if (state.leaseUntil && new Date(state.leaseUntil) > now) return NextResponse.json({ ok: true, skipped: "another run is in progress", phase: state.phase });

  state.leaseUntil = new Date(now.getTime() + LEASE_MS).toISOString();
  state.runs += 1;
  await saveState(state);

  const ctx: Ctx = {
    state,
    outOfTime: () => Date.now() - started > TIME_BUDGET_MS,
    save: () => saveState(state),
    bump: (k, n = 1) => { state.stats[k] = (state.stats[k] ?? 0) + n; },
  };

  try {
    while (state.phase !== "done" && !ctx.outOfTime()) {
      const phase = state.phase;
      const { done, cursor } = await RUNNERS[phase](ctx);
      if (!done) { state.cursor = cursor; break; }
      const next = PHASES.indexOf(phase) + 1;
      state.phase = next < PHASES.length ? PHASES[next] : "done";
      state.cursor = null;
      await saveState(state);
    }
  } catch (e) {
    console.error("nightly-sync: phase failed", state.phase, e);
    // Skip past a phase that keeps throwing rather than retrying it all night; it gets another
    // chance tomorrow.
    const next = PHASES.indexOf(state.phase as Phase) + 1;
    state.phase = next < PHASES.length ? PHASES[next] : "done";
    state.cursor = null;
  } finally {
    state.leaseUntil = null;
    await saveState(state);
  }

  return NextResponse.json({ ok: true, done: state.phase === "done", phase: state.phase, runs: state.runs, stats: state.stats, elapsedMs: Date.now() - started, ranAt: now.toISOString() });
}
