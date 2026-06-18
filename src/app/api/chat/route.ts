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

  const contextPrimer = `[Context for this turn — not shown to the user verbatim]
User: ${user?.name ?? "unknown"}
Active goals: ${user?.goals.map((g) => g.description).join("; ") || "none"}
Race targets: ${raceTargets.map((r) => `${r.raceName} on ${r.raceDate.toISOString().slice(0, 10)}, distance ${r.distanceM}m`).join("; ") || "none"}
Last 7 days of metrics: ${JSON.stringify(history.slice(-7))}
30-day baseline comparisons: ${JSON.stringify(comparisons)}
${flags.length ? `Notable flags vs personal baseline: ${flags.join(" | ")}` : "No notable flags."}`;

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
