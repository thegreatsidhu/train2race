// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, HAIKU_MODEL } from "@/lib/ai/client";

function cacheKey(conditions: string, stomachSensitivity: string, weightKg: number) {
  return `${conditions}|${stomachSensitivity}|${Math.round(weightKg)}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { raceId, conditions, stomachSensitivity, force } = body;

  const [race, user] = await Promise.all([
    prisma.raceTarget.findUnique({
      where: { id: raceId, userId },
      select: { raceName: true, raceDate: true, distanceM: true, isTriathlon: true, goalTimeSec: true, nutritionPlanCache: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { weightKg: true } }),
  ]);

  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });

  const weightKg = user?.weightKg ?? 70;
  const key = cacheKey(conditions || "normal temperature", stomachSensitivity || "normal", weightKg);

  // Return cached plan if inputs haven't changed (unless force-refresh requested)
  const cached = race.nutritionPlanCache as any;
  if (!force && cached?.key === key && cached?.plan) {
    return NextResponse.json({ plan: cached.plan, race, weightKg, cached: true });
  }

  const distanceMiles = (race.distanceM / 1609.34).toFixed(1);
  const goalTime = race.goalTimeSec
    ? `${Math.floor(race.goalTimeSec / 3600)}h ${Math.floor((race.goalTimeSec % 3600) / 60)}m`
    : "finish";
  const estimatedHours = race.goalTimeSec ? race.goalTimeSec / 3600 : race.distanceM / 1609.34 / 9;

  const prompt = `Sports dietitian. Race day nutrition plan. Race: ${race.raceName}, ${distanceMiles} miles${race.isTriathlon ? " triathlon" : ""}, goal ${goalTime} (~${estimatedHours.toFixed(1)}h), weight ${Math.round(weightKg * 2.20462)}lbs, conditions: ${conditions || "normal"}, stomach: ${stomachSensitivity || "normal"}. Return ONLY valid JSON: {"summary":"2 sentences","dayBefore":{"items":[{"time":"","description":"","targets":""}],"keyTip":""},"raceDay":{"preRace":[{"time":"","description":"","targets":"","foods":[]}],"duringRace":[{"time":"","description":"","targets":"","products":[]}],"postRace":[{"time":"","description":"","targets":"","foods":[]}]},"keyRules":[],"whatToAvoid":[]}`;

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  try {
    const plan = JSON.parse(text.replace(/```json|```/g, "").trim());

    // Save to cache
    await prisma.raceTarget.update({
      where: { id: raceId },
      data: { nutritionPlanCache: { key, plan } },
    });

    return NextResponse.json({ plan, race, weightKg, cached: false });
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
