import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";

const SignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
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

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, isBanned: true } });
  if (existing) {
    if (existing.isBanned) {
      return NextResponse.json(
        { error: "This account has been suspended. Contact support if you believe this is an error." },
        { status: 403 }
      );
    }
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

  // Send welcome email — fire and forget, never block signup
  const firstName = user.name?.split(" ")[0] ?? "Athlete";
  sendEmail({
    to: user.email!,
    subject: "Welcome to Train2Race 🏁",
    html: welcomeEmailHtml(firstName),
    from: "Train2Race <support@train2race.com>",
  }).catch(() => {});

  return NextResponse.json({ user }, { status: 201 });
}
