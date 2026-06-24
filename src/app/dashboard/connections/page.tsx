import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConnectionRow } from "@/components/ConnectionRow";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; disconnected?: string; error?: string }>;
}) {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const params = await searchParams;

  const connections = await prisma.deviceConnection.findMany({ where: { userId } });
  const bySource = new Map(connections.map((c) => [c.source, c]));

  return (
    <div className="max-w-3xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Connections</h1>
        <p className="text-foreground-dim text-sm">
          Connect any combination of these — Vitality merges them into one view.
        </p>
      </header>

      {params.connected && (
        <div className="rounded-xl border border-signal/40 bg-signal/10 text-signal text-sm px-4 py-3 mb-6">
          Connected {params.connected} successfully.
        </div>
      )}
      {params.disconnected && (
        <div className="rounded-xl border border-border bg-surface text-foreground-dim text-sm px-4 py-3 mb-6">
          {params.disconnected} disconnected.
        </div>
      )}
      {params.error && (
        <div className="rounded-xl border border-alert/40 bg-alert/10 text-alert text-sm px-4 py-3 mb-6">
          Something went wrong ({params.error}). Try again.
        </div>
      )}

      <div className="space-y-3">
        <ConnectionRow
          source="WHOOP"
          label="Whoop"
          description="Recovery, strain, sleep, and HRV."
          connection={bySource.get("WHOOP")}
        />
        <ConnectionRow
          source="STRAVA"
          label="Strava"
          description="Activities and workouts (no sleep/HRV — pair with Whoop for that)."
          connection={bySource.get("STRAVA")}
        />
      </div>
    </div>
  );
}
