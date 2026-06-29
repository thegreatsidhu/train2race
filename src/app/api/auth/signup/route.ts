import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  inviteCode: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, inviteCode } = parsed.data;

  let invite: { id: string; usedBy: string | null; expiresAt: Date | null; teamId: string | null; reusable: boolean } | null = null;
  if (inviteCode) {
    invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!invite) {
      return NextResponse.json({ error: "Invalid invite code." }, { status: 400 });
    }
    if (!invite.reusable && invite.usedBy) {
      return NextResponse.json({ error: "Invite code has already been used." }, { status: 400 });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite code has expired." }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user: { id: string; name: string | null; email: string | null };
  try {
    user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    throw err;
  }

  if (invite) {
    if (!invite.reusable) {
      await prisma.inviteCode.update({
        where: { code: inviteCode! },
        data: { usedBy: user.id, usedAt: new Date() },
      });
    }
    if (invite.teamId) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: invite.teamId, userId: user.id } },
        create: { teamId: invite.teamId, userId: user.id, role: "member" },
        update: {},
      });
    }
  }

  return NextResponse.json({ user }, { status: 201 });
}
