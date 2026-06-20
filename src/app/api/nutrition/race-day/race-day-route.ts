// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, HAIKU_MODEL } from "@/lib/ai/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { raceId, conditions, stomachSensitivity } = body;

  const [race, user] = await Promise.all([
    prisma.raceTarget.findUnique({
      where: { id: raceId, userId },
      select: { raceName: true, raceDate: true, distanceM: true, isTriathlon: true, goalTimeSec: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { weightKg: true, name: true },
    }),
  ]);

  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });

  const weightKg = user?.weightKg ?? 70;
  const weightLbs = Math.round(weightKg * 2.20462);
  const distanceMiles = (race.distanceM / 1609.34).toFixed(1);
  const goalTime = race.goalTimeSec
    ? `${Math.floor(race.goalTimeSec / 3600)}h ${Math.floor((race.goalTimeSec % 3600) / 60)}m`
    : "finish";
  const estimatedHours = race.goalTimeSec
    ? race.goalTimeSec / 3600
    : race.distanceM / 1609.34 / 9;

  const prompt = `You are a sports dietitian. Create a detailed race day nutrition plan.

Race: ${race.raceName}
Distance: ${distanceMiles} miles ${race.isTriathlon ? "(triathlon)" : "(running)"}
Goal time: ${goalTime}
Estimated finish: ${estimatedHours.toFixed(1)} hours
Weight: ${weightLbs} lbs (${weightKg.toFixed(0)} kg)
Conditions: ${conditions || "normal temperature"}
Stomach sensitivity: ${stomachSensitivity || "normal"}

Return ONLY valid JSON, no markdown:
{
  "summary": "2-sentence fueling strategy overview",
  "dayBefore": {
    "title": "Day Before",
    "items": [{"time": "Lunch", "description": "...", "targets": "..."}],
    "keyTip": "one key tip"
  },
  "raceDay": {
    "preRace": [{"time": "3-4 hours before", "description": "...", "targets": "...", "foods": ["food1", "food2"]}],
    "duringRace": [{"time": "time/mile marker", "description": "...", "targets": "carbs/fluid", "products": ["gel", "drink"]}],
    "postRace": [{"time": "Within 30 min", "description": "...", "targets": "...", "foods": ["food1"]}]
  },
  "keyRules": ["rule1", "rule2", "rule3", "rule4"],
  "whatToAvoid": ["avoid1", "avoid2", "avoid3"]
}`;

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const plan = JSON.parse(cleaned);
    return NextResponse.json({ plan, race, weightKg });
  } catch {
    return NextResponse.json({ error: "Failed to parse plan" }, { status: 500 });
  }
}
