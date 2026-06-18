import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProfileSchema = z.object({
  weightKg: z.number().positive().max(300).optional().nullable(),
  heightCm: z.number().positive().max(300).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  sex: z.enum(["male", "female", "other"]).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weightKg: true, heightCm: true, dateOfBirth: true, sex: true, name: true },
  });

  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { weightKg, heightCm, dateOfBirth, sex } = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      weightKg: weightKg ?? null,
      heightCm: heightCm ?? null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      sex: sex ?? null,
    },
    select: { weightKg: true, heightCm: true, dateOfBirth: true, sex: true },
  });

  return NextResponse.json({ user });
}