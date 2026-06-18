import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeNutritionPlan } from "@/lib/ai/nutrition";

const Schema = z.object({
  type: z.enum(["run", "ride", "swim", "strength", "other"]),
  durationMin: z.number().min(10).max(600),
  intensityLabel: z.enum(["easy", "moderate", "hard", "race"]),
  heatIndex: z.enum(["normal", "hot"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weightKg: true },
  });

  const weightKg = user?.weightKg ?? 70;
  const plan = computeNutritionPlan({ ...parsed.data, weightKg });
  return NextResponse.json({ plan, weightKg });
}