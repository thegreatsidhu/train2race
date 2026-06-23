import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithCoach } from "@/lib/ai/client";
import { getMergedDailyMetrics, computeBaselineComparisons, detectCardiacFlags } from "@/lib/ai/metrics";

const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
});

const CONTEXT_MESSAGE_LIMIT = 12; // trailing messages kept as conversation history

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { message } = parsed.data;

  // Pull recent chat history + fresh metrics context every turn so the
  // coach always reasons over current data, not stale context from when
  // the conversation started.
  const [recentMessages, user, history, raceTargets] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: CONTEXT_MESSAGE_LIMIT,
    }),
    prisma.user.findUnique({ where: { id: userId }, include: { goals: { where: { status: "active" } } } }),
    getMergedDailyMetrics(userId, 7),
    prisma.raceTarget.findMany({ where: { userId } }),
  ]);

  const comparisons = computeBaselineComparisons(history);
  const flags = detectCardiacFlags(comparisons);

  // Compress metrics to a summary string — avoids sending hundreds of tokens of raw JSON
  const latest = history[history.length - 1];
  const metricsSummary = latest
    ? [
        latest.hrvMs != null && `HRV ${Math.round(latest.hrvMs)}ms`,
        latest.restingHeartRate != null && `RHR ${Math.round(latest.restingHeartRate)}bpm`,
        latest.sleepScore != null && `sleep ${Math.round(latest.sleepScore)}`,
        latest.bodyBatteryOrRecoveryPct != null && `recovery ${Math.round(latest.bodyBatteryOrRecoveryPct)}%`,
        latest.sleepDurationMin != null && `slept ${Math.round(latest.sleepDurationMin / 60 * 10) / 10}h`,
      ].filter(Boolean).join(", ")
    : "no recent metrics";

  const trendSummary = comparisons
    .filter((c) => c.deltaPct != null && Math.abs(c.deltaPct) >= 5)
    .map((c) => `${c.field} ${c.direction} ${Math.abs(c.deltaPct!)}% vs baseline`)
    .join("; ") || "all metrics near baseline";

  const contextPrimer = `[Athlete context]
User: ${user?.name ?? "unknown"}
Goals: ${user?.goals.map((g) => g.description).join("; ") || "none"}
Races: ${raceTargets.map((r) => `${r.raceName} ${r.raceDate.toISOString().slice(0, 10)}`).join("; ") || "none"}
Today: ${metricsSummary}
Trends (30d): ${trendSummary}
${flags.length ? `Flags: ${flags.join(" | ")}` : ""}`;

  const chronological = recentMessages
    .slice()
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const messagesForApi: { role: "user" | "assistant"; content: string }[] = [
    { role: "user" as const, content: contextPrimer },
    { role: "assistant" as const, content: "Understood, I have their current data in mind." },
    ...chronological,
    { role: "user" as const, content: message },
  ];

  const reply = await chatWithCoach(messagesForApi);

  await prisma.chatMessage.createMany({
    data: [
      { userId, role: "user", content: message },
      { userId, role: "assistant", content: reply },
    ],
  });

  return NextResponse.json({ reply });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages });
}
