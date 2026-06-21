// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/sync/engine";
import { prisma } from "@/lib/prisma";
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const syncResult = await syncAllConnections();
  const metricsCutoff = new Date(Date.now()-90*24*60*60*1000);
  const deletedMetrics = await prisma.dailyMetrics.deleteMany({ where: { date: { lt: metricsCutoff } } });
  const chatCutoff = new Date(Date.now()-30*24*60*60*1000);
  const deletedChats = await prisma.chatMessage.deleteMany({ where: { createdAt: { lt: chatCutoff } } });
  const deletedAdvice = await prisma.adviceCard.deleteMany({ where: { createdAt: { lt: chatCutoff } } });
  const teamCutoff = new Date(Date.now()-90*24*60*60*1000);
  const deletedTeamMsgs = await prisma.teamMessage.deleteMany({ where: { createdAt: { lt: teamCutoff } } });
  return NextResponse.json({ ok: true, sync: syncResult, cleaned: { metrics: deletedMetrics.count, chats: deletedChats.count, advice: deletedAdvice.count, teamMessages: deletedTeamMsgs.count }, ranAt: new Date().toISOString() });
}
