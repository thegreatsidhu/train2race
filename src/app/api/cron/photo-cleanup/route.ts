// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";
import { Resend } from "resend";
import { groupEmailHtml } from "@/lib/email";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Train2Race <support@train2race.com>";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const day83 = new Date(now - 83 * 86400000);
  const day84 = new Date(now - 84 * 86400000);
  const day90 = new Date(now - 90 * 86400000);

  // ── 1. Warning: photos that will be deleted in 7 days ─────────────────
  const expiring = await prisma.activity.findMany({
    where: {
      photos: { isEmpty: false },
      createdAt: { gte: day84, lt: day83 },
    },
    select: {
      id: true,
      title: true,
      type: true,
      startTime: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
  });

  // Group by userId so each user gets one email
  const byUser: Record<string, { email: string; name: string; activities: typeof expiring }> = {};
  for (const a of expiring) {
    if (!a.user.email) continue;
    if (!byUser[a.userId]) byUser[a.userId] = { email: a.user.email, name: a.user.name || "Athlete", activities: [] };
    byUser[a.userId].activities.push(a);
  }

  let warningsSent = 0;
  const deleteDate = new Date(now - 83 * 86400000 + 7 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  for (const { email, name, activities } of Object.values(byUser)) {
    const activityList = activities
      .map(a => `• ${a.title || a.type} on ${new Date(a.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`)
      .join("<br/>");
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Your Train2Race workout photos expire soon",
      html: groupEmailHtml({
        preheader: `Photos from ${activities.length} workout${activities.length > 1 ? "s" : ""} will be deleted on ${deleteDate}`,
        heading: "Your workout photos are expiring",
        body: `Hi ${name},<br/><br/>To keep storage manageable, Train2Race automatically removes workout photos after 90 days.<br/><br/>Photos from the following workouts will be deleted on <strong>${deleteDate}</strong>:<br/><br/>${activityList}<br/><br/>Download any photos you'd like to keep before that date.`,
        cta: "Go to Train2Race",
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://train2race.com"}/dashboard`,
      }),
    }).catch(() => {});
    warningsSent++;
  }

  // ── 2. Deletion: photos older than 90 days ────────────────────────────
  const toDelete = await prisma.activity.findMany({
    where: {
      photos: { isEmpty: false },
      createdAt: { lt: day90 },
    },
    select: { id: true, photos: true },
  });

  let photosDeleted = 0;
  let activitiesUpdated = 0;
  for (const activity of toDelete) {
    // Delete each photo object from R2
    await Promise.allSettled(activity.photos.map(url => deleteFromR2(url)));
    photosDeleted += activity.photos.length;
    // Clear the photos array in DB
    await prisma.activity.update({ where: { id: activity.id }, data: { photos: [] } });
    activitiesUpdated++;
  }

  return NextResponse.json({ warningsSent, activitiesUpdated, photosDeleted });
}
