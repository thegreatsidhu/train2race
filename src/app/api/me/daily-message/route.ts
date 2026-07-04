// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function generateMessage(userId: string): Promise<string> {
  // Gather user context
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);

  const [user, weeklyActivities, activeRace, teams, lastActivity] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.activity.findMany({ where: { userId, startTime: { gte: weekStart } }, select: { distanceM: true } }),
    prisma.raceTarget.findFirst({ where: { userId, raceDate: { gte: today } }, orderBy: { raceDate: "asc" }, select: { raceName: true, raceDate: true } }),
    prisma.team.findMany({ where: { members: { some: { userId } } }, select: { name: true }, take: 3 }),
    prisma.activity.findFirst({ where: { userId }, orderBy: { startTime: "desc" }, select: { type: true, title: true } }),
  ]);

  const firstName = user?.name?.split(" ")[0] ?? "Athlete";
  const weeklyMiles = weeklyActivities.reduce((s, a) => s + (a.distanceM || 0) / 1609.34, 0);
  const daysToRace = activeRace ? Math.ceil((new Date(activeRace.raceDate).getTime() - Date.now()) / 86400000) : null;
  const teamNames = teams.map(t => t.name).join(", ") || null;
  const lastWorkout = lastActivity ? (lastActivity.title || lastActivity.type) : null;

  const contextParts = [
    `Athlete name: ${firstName}`,
    weeklyMiles > 0 ? `Weekly miles so far: ${weeklyMiles.toFixed(1)} mi` : "No workouts this week yet",
    daysToRace != null ? `Days until ${activeRace!.raceName}: ${daysToRace}` : null,
    teamNames ? `Teams: ${teamNames}` : null,
    lastWorkout ? `Most recent workout: ${lastWorkout}` : null,
  ].filter(Boolean).join("\n");

  const prompt = `You are a friendly fitness coach for Train2Race, a team training app. Based on this athlete's data, write either a short motivational quote OR a light-hearted fitness humor joke that references their specific situation. Keep it under 2 sentences. Be warm and personal. Don't use generic quotes — make it feel tailored to them.

Athlete data:
${contextParts}

Respond with only the message text, no quotes, no explanation.`;

  const response = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 120,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "Every great race starts with today's workout.";
  return text;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiDailyMessage: true, aiDailyMessageDate: true },
  });

  // Return cached message if it's from today
  if (user?.aiDailyMessage && user?.aiDailyMessageDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msgDate = new Date(user.aiDailyMessageDate);
    msgDate.setHours(0, 0, 0, 0);
    if (msgDate.getTime() === today.getTime()) {
      return NextResponse.json({ message: user.aiDailyMessage, cached: true });
    }
  }

  // Generate new message
  try {
    const message = await generateMessage(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { aiDailyMessage: message, aiDailyMessageDate: new Date() },
    });
    return NextResponse.json({ message, cached: false });
  } catch (err) {
    console.error("AI daily message error:", err);
    return NextResponse.json({ message: "Every rep counts. Show up today.", cached: false });
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  try {
    const message = await generateMessage(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { aiDailyMessage: message, aiDailyMessageDate: new Date() },
    });
    return NextResponse.json({ message, cached: false });
  } catch (err) {
    console.error("AI daily message error:", err);
    return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
  }
}
