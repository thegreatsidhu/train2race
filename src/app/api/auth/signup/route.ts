import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import { consumeLimit, clientIp, tooManyRequests } from "@/lib/usageLimit";

const SignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
  // Honeypot — a field hidden from people (see signup page); bots that fill every input trip it.
  website: z.string().optional(),
});

export async function POST(req: Request) {
  // Per-IP and app-wide caps stop scripted mass signups (each one also sends a welcome email).
  if (!(await consumeLimit(`signup:ip:${clientIp(req)}`, 5, 60 * 60_000))) return tooManyRequests("Too many sign-ups from this network. Please try again later.");
  if (!(await consumeLimit("signup:global", 150, 60 * 60_000))) return tooManyRequests("Sign-ups are busy right now. Please try again in a few minutes.");

  const body = await req.json().catch(() => ({}));
  const parsed = SignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, website } = parsed.data;
  if (website) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Case-insensitive: older accounts may have been stored with mixed-case emails.
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, isBanned: true } });
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
