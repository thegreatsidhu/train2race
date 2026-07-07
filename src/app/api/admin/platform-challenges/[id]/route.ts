// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = "train2race2024";

async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}

async function isSuperAdmin(): Promise<{ ok: boolean; userId?: string; name?: string }> {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return { ok: false };
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } });
    if (user?.role === "superadmin" || user?.role === "admin") return { ok: true, userId, name: user.name || "Admin" };
    return { ok: false };
  } catch { return { ok: false }; }
}

// PATCH — edit a platform challenge
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;

  const body = await req.json();
  const { password, force, ...fields } = body;

  const adminCheck = await isSuperAdmin();
  if (!adminCheck.ok) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`admin-pch-edit:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const valid = await verifyAdminPassword(password ?? "");
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await auth();
  const editorId = adminCheck.userId ?? (session?.user as any)?.id ?? "admin";
  const editorName = adminCheck.name ?? (session?.user as any)?.name ?? "Admin";

  const challenge = await (prisma as any).platformChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, title: true, description: true, type: true, activityFilter: true, badgeName: true, startDate: true, endDate: true, status: true, enrollmentLocked: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const hasStarted = new Date(challenge.startDate) <= now;
  const isActive = challenge.status === "active" && hasStarted && new Date(challenge.endDate) > now;

  // Validate: type is immutable
  if (fields.type && fields.type !== challenge.type) {
    return NextResponse.json({ error: "Challenge type cannot be changed after creation." }, { status: 422 });
  }

  // Validate: cannot change startDate once started
  if (fields.startDate !== undefined) {
    const newStart = new Date(fields.startDate + "T12:00:00");
    if (hasStarted && newStart.toISOString() !== challenge.startDate.toISOString()) {
      return NextResponse.json({ error: "Cannot change start date — challenge has already started." }, { status: 422 });
    }
  }

  // Validate: cannot shorten endDate on active challenge unless force
  if (fields.endDate !== undefined && isActive) {
    const newEnd = new Date(fields.endDate + "T23:59:59");
    if (newEnd < challenge.endDate) {
      if (!force) {
        return NextResponse.json({
          error: "Shortening an active challenge will affect participant progress. Send force: true to confirm.",
          requiresForce: true,
        }, { status: 409 });
      }
    }
  }

  // Build diff
  const changes: { field: string; from: any; to: any }[] = [];
  const data: any = {};

  function track(field: string, rawFrom: any, rawTo: any, transform?: (v: any) => any) {
    const fromVal = transform ? transform(rawFrom) : rawFrom;
    const toVal = transform ? transform(rawTo) : rawTo;
    if (fromVal !== toVal) {
      changes.push({ field, from: fromVal, to: toVal });
    }
  }

  if (fields.title !== undefined) {
    track("title", challenge.title, fields.title);
    data.title = fields.title.trim();
  }
  if (fields.description !== undefined) {
    track("description", challenge.description ?? "", fields.description ?? "");
    data.description = fields.description?.trim() || null;
  }
  if (fields.badgeName !== undefined) {
    track("badgeName", challenge.badgeName ?? "", fields.badgeName ?? "");
    data.badgeName = fields.badgeName?.trim() || null;
  }
  if (fields.activityFilter !== undefined) {
    track("activityFilter", challenge.activityFilter ?? "all", fields.activityFilter ?? "all");
    data.activityFilter = fields.activityFilter || null;
  }
  if (fields.enrollmentLocked !== undefined) {
    track("enrollmentLocked", challenge.enrollmentLocked, fields.enrollmentLocked);
    data.enrollmentLocked = fields.enrollmentLocked;
  }
  if (fields.startDate !== undefined && !hasStarted) {
    const newStart = new Date(fields.startDate + "T12:00:00");
    track("startDate",
      challenge.startDate.toISOString().split("T")[0],
      fields.startDate,
    );
    data.startDate = newStart;
  }
  if (fields.endDate !== undefined) {
    const newEnd = new Date(fields.endDate + "T23:59:59");
    track("endDate",
      challenge.endDate.toISOString().split("T")[0],
      fields.endDate,
    );
    data.endDate = newEnd;
  }

  if (changes.length === 0) return NextResponse.json({ ok: true, noChanges: true });

  const updated = await (prisma as any).platformChallenge.update({ where: { id: challengeId }, data });

  // Store audit log
  await (prisma as any).challengeEditLog.create({
    data: {
      challengeType: "platform",
      challengeId,
      challengeTitle: updated.title,
      editedBy: editorId,
      editedByName: editorName,
      changes,
      notified: false,
    },
  });

  return NextResponse.json({ challenge: updated, changes });
}

// GET — return edit logs for a specific challenge
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") ?? "";

  const adminCheck = await isSuperAdmin();
  if (!adminCheck.ok) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`admin-pch-log:${ip}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const valid = await verifyAdminPassword(password);
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await (prisma as any).challengeEditLog.findMany({
    where: { challengeId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ logs });
}
