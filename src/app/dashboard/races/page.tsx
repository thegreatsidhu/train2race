import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewRaceForm } from "@/components/NewRaceForm";

export default async function RacesPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const races = await prisma.raceTarget.findMany({
    where: { userId },
    orderBy: { raceDate: "asc" },
  });

  return (
    <div className="max-w-3xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Race plans</h1>
        <p className="text-foreground-dim text-sm">
          Add a race and ask your coach to build the training plan around your actual recovery data.
        </p>
      </header>

      <NewRaceForm />

      <div className="space-y-3 mt-8">
        {races.length === 0 && (
          <p className="text-sm text-foreground-dim">No races added yet.</p>
        )}
        {races.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium">{r.raceName}</h3>
              <span className="font-data text-xs text-foreground-dim">
                {r.raceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <p className="text-sm text-foreground-dim">
              {(r.distanceM / 1000).toFixed(1)} km
              {r.goalTimeSec ? ` · goal ${formatSeconds(r.goalTimeSec)}` : ""}
            </p>
            <a
              href="/dashboard/chat"
              className="inline-block mt-3 text-sm text-signal hover:underline"
            >
              Ask coach to build/update the training plan →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
