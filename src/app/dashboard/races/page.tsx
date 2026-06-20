import { DeleteRaceButton } from "@/components/DeleteRaceButton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewRaceForm } from "@/components/NewRaceForm";
export default async function RacesPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const races = await prisma.raceTarget.findMany({
    where: { userId }, orderBy: { raceDate: "asc" },
    include: { trainingPlan: { select: { id: true, _count: { select: { workouts: true } }, workouts: { where: { completed: false }, select: { id: true }, take: 1 } } } },
  });
  const hasActivePlan = races.some(r => r.trainingPlan && r.trainingPlan.workouts.length > 0);
  return (
    <div className="max-w-3xl px-8 py-10">
      <header className="mb-8"><h1 className="text-3xl font-semibold tracking-tight mb-2">Race plans</h1><p className="text-foreground-dim text-sm">Add a race and build a training plan around your actual recovery data.</p></header>
      {hasActivePlan ? (
        <div className="rounded-2xl border border-border bg-surface p-5 mb-8"><p className="text-sm font-medium mb-1">You have an active training plan</p><p className="text-xs text-foreground-dim">Complete your current race plan before adding a new one.</p></div>
      ) : (
        <div className="mb-8"><NewRaceForm /></div>
      )}
      <div className="space-y-3">
        {races.length === 0 && <p className="text-sm text-foreground-dim">No races added yet.</p>}
        {races.map(r => {
          const total = r.trainingPlan?._count?.workouts ?? 0;
          const remaining = r.trainingPlan?.workouts?.length ?? 0;
          const done = total - remaining;
          const pct = total > 0 ? Math.round((done/total)*100) : 0;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-1"><h3 className="font-medium">{r.raceName}</h3><span className="text-xs text-foreground-dim">{r.raceDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span></div>
              <p className="text-sm text-foreground-dim">{(r.distanceM/1609.34).toFixed(1)} mi{r.goalTimeSec?` · goal ${Math.floor(r.goalTimeSec/3600)}h ${Math.floor((r.goalTimeSec%3600)/60)}m`:""}</p>
              {total > 0 && <div className="mt-3"><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{done}/{total} workouts done</span><span>{pct}%</span></div><div className="w-full h-1.5 bg-border rounded-full"><div className="h-1.5 bg-signal rounded-full" style={{width:`${pct}%`}} /></div></div>}
              <div className="flex items-center justify-between mt-3"><a href={`/dashboard/races/${r.id}`} className="text-sm text-signal hover:underline">View training plan →</a><DeleteRaceButton raceId={r.id} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
