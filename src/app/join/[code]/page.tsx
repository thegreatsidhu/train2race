"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinTeamPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [team, setTeam] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  async function doJoin() {
    setJoining(true);
    setError("");
    const res = await fetch(`/api/teams/invite/${code}`, { method: "POST" });
    if (res.status === 401) {
      localStorage.setItem("pendingTeamCode", code);
      router.push(`/login?redirect=/join/${code}`);
      return;
    }
    const data = await res.json();
    if (res.ok) {
      setJoined(true);
      setTimeout(() => router.push(`/dashboard/teams/${data.teamId}`), 1500);
    } else {
      setError(data.error || "Failed to join team.");
      setJoining(false);
    }
  }

  useEffect(() => {
    const pending = localStorage.getItem("pendingTeamCode");
    const autoJoin = pending === code;

    fetch(`/api/teams/invite/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.team) {
          setTeam(d.team);
          setLoading(false);
          if (autoJoin) {
            localStorage.removeItem("pendingTeamCode");
            doJoin();
          }
        } else {
          setError(d.error || "Invalid invite link.");
          setLoading(false);
        }
      })
      .catch(() => { setError("Something went wrong."); setLoading(false); });
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-foreground-dim">Loading invite...</p>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-2xl mb-2">🔗</p>
          <h1 className="text-xl font-semibold mb-2">Invalid invite</h1>
          <p className="text-sm text-foreground-dim mb-6">{error}</p>
          <Link href="/dashboard" className="text-sm text-signal hover:underline">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-4xl mb-3">🎉</p>
          <h1 className="text-xl font-semibold mb-2">You're in!</h1>
          <p className="text-sm text-foreground-dim">Taking you to {team.name}...</p>
        </div>
      </div>
    );
  }

  if (joining) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-8 h-8 rounded-full border-2 border-signal border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-foreground-dim">Joining {team?.name}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl mb-4">🏁</p>
          <h1 className="text-2xl font-semibold mb-1">Join {team.name}</h1>
          {team.description && (
            <p className="text-sm text-foreground-dim mb-4">{team.description}</p>
          )}
          {team.majorRace && (
            <p className="text-xs text-signal mb-4">
              Training for {team.majorRace.name} · {new Date(team.majorRace.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
          <p className="text-sm text-foreground-dim mb-6">
            {team._count.members} member{team._count.members !== 1 ? "s" : ""}
          </p>
          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
          <button
            onClick={doJoin}
            disabled={joining}
            className="w-full py-3 rounded-full bg-signal text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mb-3"
          >
            {joining ? "Joining..." : "Join team"}
          </button>
          <Link href="/dashboard" className="block text-xs text-foreground-dim hover:text-foreground transition-colors">
            Maybe later
          </Link>
        </div>
      </div>
    </div>
  );
}
