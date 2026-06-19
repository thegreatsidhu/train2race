// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const { completed } = await req.json();

  const workout = await prisma.trainingWorkout.update({
    where: { id: params.id },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  return NextResponse.json({ workout });
}
