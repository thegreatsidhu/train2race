"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function JoinTeamForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const challengeId = searchParams.get("challenge") || "";

  const [team, setTeam] = useState<any>(null);
  const [challenge, setChallenge] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [challengeJoined, setChallengeJoined] = useState(false);

  async function doJoin() {
    setJoining(true);
    setError("");
    const res = await fetch(`/api/teams/invite/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challengeId || undefined }),
    });
    if (res.status === 401) {
      localStorage.setItem("pendingTeamCode", code);
      if (challengeId) localStorage.setItem("pendingChallengeId", challengeId);
      else localStorage.removeItem("pendingChallengeId");
      const dest = challengeId ? `/join/${code}?challenge=${challengeId}` : `/join/${code}`;
      router.push(`/login?redirect=${encodeURIComponent(dest)}`);
      return;
    }
    const data = await res.json();
    if (res.ok) {
      setJoined(true);
      setChallengeJoined(!!data.challengeJoined);
      setTimeout(() => router.push(`/dashboard/teams/${data.teamId}?tab=challenges`), 1500);
    } else {
      setError(data.error || "Failed to join team.");
      setJoining(false);
    }
  }

  useEffect(() => {
    const pending = localStorage.getItem("pendingTeamCode");
    const autoJoin = pending === code;

    const url = challengeId ? `/api/teams/invite/${code}?challenge=${challengeId}` : `/api/teams/invite/${code}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.team) {
          setTeam(d.team);
          setChallenge(d.challenge || null);
          setLoading(false);
          if (autoJoin) {
            localStorage.removeItem("pendingTeamCode");
            localStorage.removeItem("pendingChallengeId");
            doJoin();
          }
        } else {
          setError(d.error || "Invalid invite link.");
          setLoading(false);
        }
      })
      .catch(() => { setError("Something went wrong."); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, challengeId]);

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
          <p className="text-sm text-foreground-dim">
            {challenge && challengeJoined ? `Joined ${team.name} and "${challenge.title}". Taking you there...` : `Taking you to ${team.name}...`}
          </p>
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
          <p className="text-sm text-foreground-dim mb-4">
            {team._count.members} member{team._count.members !== 1 ? "s" : ""}
          </p>
          {challengeId && challenge && (
            <div className="rounded-xl border border-signal/30 bg-signal/5 p-3 mb-4 text-left">
              <p className="text-xs text-signal font-medium mb-0.5">🏆 You'll also join this challenge</p>
              <p className="text-sm font-medium">{challenge.title}</p>
              <p className="text-xs text-foreground-dim capitalize mt-0.5">
                {challenge.type} · {challenge.metric} · {challenge.unit}
                {challenge.goal ? ` · Goal: ${challenge.goal} ${challenge.unit}${challenge.goalPerDay ? " / day" : ""}` : " · Open leaderboard"}
              </p>
              <p className="text-xs text-foreground-dim mt-0.5">
                {new Date(challenge.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(challenge.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          )}
          {challengeId && !challenge && (
            <p className="text-xs text-amber-400 mb-4">This challenge invite has expired, but you can still join the team.</p>
          )}
          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
          <button
            onClick={doJoin}
            disabled={joining}
            className="w-full py-3 rounded-full bg-signal text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mb-3"
          >
            {joining ? "Joining..." : challenge ? "Join team + challenge" : "Join team"}
          </button>
          <Link href="/dashboard" className="block text-xs text-foreground-dim hover:text-foreground transition-colors">
            Maybe later
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense>
      <JoinTeamForm />
    </Suspense>
  );
}
