// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { r2, deleteFromR2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
// Minimum 200x200 is enforced client-side (canvas crop already normalizes to a square).

function ext(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function requireTeamAdmin(teamId: string, userId: string) {
  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  return member?.role === "admin";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const isAdmin = await requireTeamAdmin(teamId, userId);
  if (!isAdmin) return NextResponse.json({ error: "Team admins only" }, { status: 403 });

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { isPrivate: true, logoUrl: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  let formData: FormData;
  try { formData = await req.formData(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Logo must be JPG or PNG" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Logo must be under 2 MB" }, { status: 400 });

  const key = `teams/${teamId}/logo-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!, Key: key, Body: bytes,
    ContentType: file.type, ContentLength: bytes.length,
  }));

  const url = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  const logoStatus = team.isPrivate ? "approved" : "pending";

  const oldLogoUrl = team.logoUrl;
  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl: url, logoStatus },
    select: { logoUrl: true, logoStatus: true },
  });

  if (oldLogoUrl) {
    deleteFromR2(oldLogoUrl).catch(() => {});
  }

  return NextResponse.json({ logoUrl: updated.logoUrl, logoStatus: updated.logoStatus });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const isAdmin = await requireTeamAdmin(teamId, userId);
  if (!isAdmin) return NextResponse.json({ error: "Team admins only" }, { status: 403 });

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { logoUrl: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await prisma.team.update({ where: { id: teamId }, data: { logoUrl: null, logoStatus: "none" } });
  if (team.logoUrl) deleteFromR2(team.logoUrl).catch(() => {});

  return NextResponse.json({ ok: true });
}
