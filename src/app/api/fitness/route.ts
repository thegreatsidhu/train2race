// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMergedDailyMetrics } from "@/lib/ai/metrics";
import { computeFitnessAssessment } from "@/lib/ai/fitness-score";
import { anthropic, HAIKU_MODEL, COACH_SYSTEM_PROMPT } from "@/lib/ai/client";

const cache = new Map<string, { assessment: any; narrative: string; expiresAt: number }>();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  const cached = cache.get(userId);
  if (cached && !forceRefresh && Date.now() < cached.expiresAt) {
    return NextResponse.json({ assessment: cached.assessment, narrative: cached.narrative, cached: true });
  }

  const history = await getMergedDailyMetrics(userId, 30);
  if (history.length < 3) {
    return NextResponse.json({ error: "insufficient_data" }, { status: 200 });
  }

  const assessment = computeFitnessAssessment(history);

  const dimText = assessment.dimensions
    .map(d => `${d.name} ${d.score}/100 (${d.trend}): ${d.insight}`)
    .join(" | ");
  const narrativePrompt = `Fitness summary for an athlete. Overall score: ${assessment.overallScore}/100 (${assessment.overallLabel}). Dimensions: ${dimText}. Write 2-3 sentences: highlight their strongest area, call out the biggest opportunity for improvement, and give one specific recommendation. Be direct, cite the numbers.`;

  let narrative = `Your overall fitness score is ${assessment.overallScore}/100. Keep building on your consistency and focus on the areas with room to grow.`;
  try {
    const r = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: narrativePrompt }],
    });
    narrative = r.content.find((b: any) => b.type === "text")?.text ?? narrative;
  } catch {}

  cache.set(userId, { assessment, narrative, expiresAt: Date.now() + 24 * 3600 * 1000 });
  return NextResponse.json({ assessment, narrative, cached: false });
}
