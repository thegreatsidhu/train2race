import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMergedDailyMetrics } from "@/lib/ai/metrics";
import { computeFitnessAssessment } from "@/lib/ai/fitness-score";
import { anthropic, HAIKU_MODEL } from "@/lib/ai/client";

const CACHE_HOURS = 24;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const force = new URL(req.url).searchParams.get("refresh") === "1";

  const cutoff = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000);
  const cached = await prisma.adviceCard.findFirst({
    where: {
      userId,
      category: "fitness_cache",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (cached && !force && cached.metricsSnapshotJson) {
    const data = cached.metricsSnapshotJson as { assessment: unknown; narrative: string };
    return NextResponse.json({ ...data, cached: true });
  }

  const [history, user] = await Promise.all([
    getMergedDailyMetrics(userId, 30),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, weightKg: true, heightCm: true, dateOfBirth: true, sex: true },
    }),
  ]);

  if (history.length < 3) {
    return NextResponse.json({ error: "insufficient_data" });
  }

  const assessment = computeFitnessAssessment(history);

  const ageYears = user?.dateOfBirth
    ? Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const prompt = `You are a fitness coach. Based on this fitness assessment data, write a clear 3-4 sentence summary of this person's current fitness level. Be specific, honest, and encouraging. Mention their strongest and weakest areas. Do not use bullet points.

Person: ${user?.name ?? "Athlete"}
${ageYears ? `Age: ${ageYears}` : ""}
${user?.sex ? `Sex: ${user.sex}` : ""}
${user?.weightKg ? `Weight: ${Math.round(user.weightKg * 2.20462)} lbs` : ""}

Overall score: ${assessment.overallScore}/100 (${assessment.overallLabel})
Based on ${assessment.daysOfData} days of data.

Dimension scores:
${assessment.dimensions.map((d) => `- ${d.name}: ${d.score}/100 (${d.label}) â€” ${d.insight}`).join("\n")}`;

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const narrative = response.content.find((b) => b.type === "text")?.text ?? "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.adviceCard.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      headline: `Fitness score: ${assessment.overallScore}`,
      body: narrative,
      category: "fitness_cache",
      severity: "info",
      metricsSnapshotJson: { assessment, narrative } as never,
    },
    update: {
      headline: `Fitness score: ${assessment.overallScore}`,
      body: narrative,
      category: "fitness_cache",
      metricsSnapshotJson: { assessment, narrative } as never,
    },
  });

  return NextResponse.json({ assessment, narrative, cached: false });
}
