// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await (prisma as any).contentReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      reportedUser: { select: { id: true, name: true, email: true } },
    },
    take: 300,
  });

  return NextResponse.json({ reports });
}

export async function PATCH(req: NextRequest) {
  const { password, reportId, action } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

  const report = await (prisma as any).contentReport.findUnique({ where: { id: reportId } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "reviewed" || action === "dismissed") {
    const updated = await (prisma as any).contentReport.update({ where: { id: reportId }, data: { status: action } });
    return NextResponse.json({ report: updated });
  }

  if (action === "restorePhoto") {
    if (report.contentType !== "activity_photo") return NextResponse.json({ error: "Not a photo report" }, { status: 400 });
    await prisma.activity.update({ where: { id: report.contentId }, data: { photosHidden: false } });
    const updated = await (prisma as any).contentReport.update({ where: { id: reportId }, data: { status: "reviewed" } });
    return NextResponse.json({ report: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
