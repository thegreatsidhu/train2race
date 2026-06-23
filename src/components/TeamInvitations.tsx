"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export function TeamInvitations({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team-invitations");
      const d = await res.json().catch(() => ({}));
      const inv = d.invitations || [];
      setInvitations(inv);
      onCountChange?.(inv.length);
    } catch {}
    setLoading(false);
  }, [onCountChange]);

  useEffect(() => { load(); }, [load]);

  async function respond(id: string, action: "accept" | "decline") {
    setActing(id + action);
    const res = await fetch(`/api/team-invitations/${id}/${action}`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setActing(null);
    if (res.ok) {
      if (action === "accept" && d.teamId) {
        router.push(`/dashboard/teams/${d.teamId}`);
        return;
      }
      setInvitations(prev => prev.filter(i => i.id !== id));
      onCountChange?.(invitations.length - 1);
    }
  }

  if (loading || invitations.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium text-foreground-dim mb-3">Team invitations</h2>
      <div className="space-y-2">
        {invitations.map(inv => (
          <div key={inv.id} className="flex items-center justify-between rounded-2xl border border-signal/30 bg-signal/5 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium text-sm">{inv.team?.name}</p>
              <p className="text-xs text-foreground-dim mt-0.5">
                Invited by {inv.inviter?.name || "a team admin"}
                {inv.team?.description && <> · {inv.team.description}</>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={() => respond(inv.id, "accept")}
                disabled={!!acting}
                className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-50">
                {acting === inv.id + "accept" ? "Joining…" : "Accept"}
              </button>
              <button
                onClick={() => respond(inv.id, "decline")}
                disabled={!!acting}
                className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground-dim hover:text-foreground disabled:opacity-50">
                {acting === inv.id + "decline" ? "…" : "Decline"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
