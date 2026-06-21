// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RacePlanView } from "@/components/RacePlanView";

export default async function RacePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const race = await prisma.raceTarget.findUnique({
    where: { id, userId },
    include: {
      trainingPlan: {
        include: {
          workouts: { orderBy: { date: "asc" } },
        },
      },
    },
  });

  if (!race) return <div className="px-8 py-10">Race not found.</div>;

  const plan = race.trainingPlan;
  const fmt = (d: any) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <div className="max-w-5xl px-8 py-10">
      <header className="mb-8">
        <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Training Plan</p>
        <h1 className="text-3xl font-semibold">{race.raceName}</h1>
        <p className="text-foreground-dim text-sm mt-1">
          {race.raceDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          {race.goalTimeSec && ` · Goal: ${Math.floor(race.goalTimeSec/3600)}h ${Math.floor((race.goalTimeSec%3600)/60)}m`}
        </p>
        {plan?.startDate && plan?.endDate && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-surface border border-border px-3 py-1 rounded-full text-foreground-dim">
              Plan: {fmt(plan.startDate)} to {fmt(plan.endDate)}
            </span>
          </div>
        )}
      </header>
      <RacePlanView race={race} plan={race.trainingPlan} />
    </div>
  );
}
