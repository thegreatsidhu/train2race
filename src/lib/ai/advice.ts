import { prisma } from "@/lib/prisma";
import { getMergedDailyMetrics, computeBaselineComparisons, detectCardiacFlags, type MergedDayMetrics } from "./metrics";
import { generateDailyAdvice } from "./client";

function buildAdvicePrompt(opts: {
  userName: string | null;
  goals: string[];
  history: MergedDayMetrics[];
  flags: string[];
}): string {
  const { userName, goals, history, flags } = opts;
  const today = history[history.length - 1];
  const recentDays = history.slice(-7);

  return `Generate today's health/fitness advice card for ${userName ?? "this user"}.

Their active goals: ${goals.length ? goals.join("; ") : "none specified — give general health-focused advice"}

Today's metrics:
${JSON.stringify(today, null, 2)}

Last 7 days trend:
${JSON.stringify(recentDays, null, 2)}

${flags.length > 0 ? `IMPORTANT — potential cardiac-relevant flags detected (non-diagnostic, just statistically notable vs their own baseline):\n${flags.map((f) => `- ${f}`).join("\n")}\n` : ""}

Respond with a JSON object only, no markdown fences, no preamble, in this exact shape:
{
  "headline": "short headline, under 10 words",
  "body": "the advice itself, 2-4 sentences, specific and actionable",
  "category": "training" | "recovery" | "sleep" | "cardiac_flag" | "nutrition" | "general",
  "severity": "info" | "suggestion" | "flag"
}

Use "flag" severity and "cardiac_flag" category ONLY if the flags above are non-empty. Otherwise pick whichever category best matches the most relevant insight in their data today.`;
}

interface ParsedAdvice {
  headline: string;
  body: string;
  category: string;
  severity: "info" | "suggestion" | "flag";
}

function parseAdviceResponse(raw: string): ParsedAdvice {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      headline: String(parsed.headline ?? "Today's check-in"),
      body: String(parsed.body ?? cleaned),
      category: String(parsed.category ?? "general"),
      severity: ["info", "suggestion", "flag"].includes(parsed.severity) ? parsed.severity : "info",
    };
  } catch {
    // Fall back to treating the whole response as the body if JSON parsing fails
    return { headline: "Today's check-in", body: cleaned, category: "general", severity: "info" };
  }
}

export async function generateAndSaveDailyAdvice(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { goals: { where: { status: "active" } } },
  });
  if (!user) return;

  const history = await getMergedDailyMetrics(userId, 30);
  if (history.length === 0) return; // nothing synced yet — skip rather than generate empty advice

  const comparisons = computeBaselineComparisons(history);
  const flags = detectCardiacFlags(comparisons);

  const prompt = buildAdvicePrompt({
    userName: user.name,
    goals: user.goals.map((g) => g.description),
    history,
    flags,
  });

  const raw = await generateDailyAdvice(prompt);
  const advice = parseAdviceResponse(raw);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.adviceCard.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      headline: advice.headline,
      body: advice.body,
      category: advice.category,
      severity: advice.severity,
      metricsSnapshotJson: { history: history.slice(-7), comparisons, flags } as never,
    },
    update: {
      headline: advice.headline,
      body: advice.body,
      category: advice.category,
      severity: advice.severity,
      metricsSnapshotJson: { history: history.slice(-7), comparisons, flags } as never,
    },
  });
}

export async function generateAdviceForAllUsers(): Promise<{ total: number; succeeded: number; failed: number }> {
  const users = await prisma.user.findMany({ select: { id: true } });
  let succeeded = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await generateAndSaveDailyAdvice(user.id);
      succeeded += 1;
    } catch (err) {
      console.error(`Advice generation failed for user ${user.id}:`, err);
      failed += 1;
    }
  }

  return { total: users.length, succeeded, failed };
}
