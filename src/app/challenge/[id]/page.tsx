// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeLeaderboard, formatStat } from "@/lib/platformChallenge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JoinButton } from "./JoinButton";
import { AlertButton } from "./AlertButton";

const TYPE_LABELS: Record<string, string> = {
  most_workouts: "Most Workouts",
  most_miles: "Most Miles",
  most_active_days: "Most Active Days",
  most_steps: "Most Steps",
};

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function ChallengeLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const challenge = await (prisma as any).platformChallenge.findUnique({
    where: { id: challengeId },
    include: {
      _count: { select: { participants: { where: { optedOut: false } } } },
    },
  });

  if (!challenge) notFound();

  const now = new Date();
  const isUpcoming = new Date(challenge.startDate) > now;
  const isActive = challenge.status === "active" && !isUpcoming && new Date(challenge.endDate) > now;
  const isEnded = challenge.status === "ended" || (!isUpcoming && new Date(challenge.endDate) <= now);

  const participants = await (prisma as any).platformChallengeParticipant.findMany({
    where: { challengeId, optedOut: false },
    select: { userId: true },
  });
  const participantCount = participants.length;

  // Compute leaderboard for active/ended challenges
  let leaderboard: any[] = [];
  if (isActive || isEnded) {
    leaderboard = await computeLeaderboard(challenge, participants.map((p: any) => p.userId));
  }

  // Check if current user is joined
  let isJoined = false;
  if (userId) {
    const p = await (prisma as any).platformChallengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    isJoined = p ? !p.optedOut : false;
  }

  const startStr = new Date(challenge.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const endStr = new Date(challenge.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-signal">Train2Race</Link>
        {!userId && (
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-foreground-dim hover:text-foreground transition-colors">Log in</Link>
            <Link href="/signup" className="text-sm px-4 py-1.5 rounded-full bg-signal text-background font-medium hover:bg-signal/90 transition-colors">Sign up free</Link>
          </div>
        )}
        {userId && (
          <Link href="/dashboard" className="text-sm text-foreground-dim hover:text-foreground transition-colors">Dashboard →</Link>
        )}
      </nav>

      <main className="max-w-lg mx-auto px-6 py-10">
        {/* Challenge header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-900/30 border border-teal-700/40 text-teal-300">
              🌍 Platform Challenge
            </span>
            {isUpcoming && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-700/40 text-blue-300">Upcoming</span>}
            {isActive && <span className="text-xs px-2.5 py-1 rounded-full bg-green-900/30 border border-green-700/40 text-green-300">Active</span>}
            {isEnded && <span className="text-xs px-2.5 py-1 rounded-full bg-surface-raised border border-border text-foreground-dim">Ended</span>}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{challenge.title}</h1>
          {challenge.description && <p className="text-foreground-dim mb-3">{challenge.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-dim">
            <span>📊 {TYPE_LABELS[challenge.type] ?? challenge.type}</span>
            <span>📅 {startStr} – {endStr}</span>
            <span>👥 {participantCount} athlete{participantCount !== 1 ? "s" : ""}</span>
            {challenge.badgeName && <span>🏅 {challenge.badgeName}</span>}
          </div>
        </div>

        {/* Join / auth prompt */}
        {isUpcoming && (
          <div className="rounded-2xl border border-border bg-surface p-6 mb-8">
            {userId ? (
              <div className="text-center">
                <p className="text-sm text-foreground-dim mb-4">Join now to compete when it starts on <strong className="text-foreground">{startStr}</strong>.</p>
                <JoinButton challengeId={challengeId} initialJoined={isJoined} />
                {isJoined && (
                  <p className="text-xs text-foreground-dim mt-3">You're in! Your workout activity will be counted automatically once the challenge begins.</p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="font-semibold mb-2">Join this challenge</p>
                <p className="text-sm text-foreground-dim mb-5">Create a free account to compete when it starts on <strong className="text-foreground">{startStr}</strong>.</p>
                <Link href={`/signup?redirect=/challenge/${challengeId}`}
                  className="inline-block px-6 py-3 rounded-2xl bg-signal text-background font-semibold text-sm hover:bg-signal/90 transition-colors">
                  Sign up free →
                </Link>
                <p className="text-xs text-foreground-dim mt-3">Already have an account? <Link href={`/login?redirect=/challenge/${challengeId}`} className="text-signal hover:underline">Log in</Link></p>
              </div>
            )}
          </div>
        )}

        {isActive && !isJoined && (
          <div className="rounded-2xl border border-border bg-surface p-6 mb-8 text-center">
            <p className="text-lg font-semibold mb-2">This challenge has already started</p>
            <p className="text-sm text-foreground-dim mb-5">
              This challenge began on <strong className="text-foreground">{startStr}</strong> and is no longer accepting new members. Don't miss the next one!
            </p>
            {userId ? (
              <AlertButton challengeType={challenge.type} />
            ) : (
              <div className="space-y-3">
                <Link href="/signup" className="inline-block px-5 py-2.5 rounded-2xl bg-signal text-background font-semibold text-sm hover:bg-signal/90 transition-colors">
                  🔔 Sign up to get notified for the next challenge
                </Link>
              </div>
            )}
            <p className="text-xs text-foreground-dim mt-4">View the current leaderboard below to see what you're missing 👀</p>
          </div>
        )}

        {isActive && isJoined && (
          <div className="rounded-2xl border border-border bg-surface p-5 mb-8 flex items-center justify-between">
            <p className="text-sm text-foreground-dim">You're participating!</p>
            <Link href="/dashboard" className="text-xs text-signal hover:underline">Log workouts →</Link>
          </div>
        )}

        {isActive && !isJoined && !userId && (
          <div className="mb-4 rounded-xl border border-yellow-700/40 bg-yellow-900/20 px-4 py-3">
            <p className="text-sm text-yellow-300 font-medium">Challenge in progress — invites closed</p>
            <p className="text-xs text-yellow-300/70 mt-0.5">Started {startStr}. <Link href="/signup" className="underline">Sign up</Link> to join future challenges.</p>
          </div>
        )}

        {/* Daily awards */}
        {challenge.dailyAwards?.awards?.length > 0 && isActive && (
          <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
            <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-3">Today's leaders</p>
            <div className="space-y-2">
              {challenge.dailyAwards.awards.map((a: any) => (
                <div key={a.rank} className="flex items-baseline gap-2">
                  <span className="text-base shrink-0">{RANK_MEDAL[a.rank] ?? `#${a.rank}`}</span>
                  <p className="text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-foreground-dim"> — {a.text}</span>
                    <span className="text-foreground-dim/60 text-xs ml-1">({a.stat})</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {(isActive || isEnded) && leaderboard.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-foreground-dim uppercase tracking-wide mb-3">
              {isEnded ? "Final standings" : "Leaderboard"}
            </h2>
            <div className="space-y-2">
              {leaderboard.slice(0, 20).map((e: any, i: number) => (
                <div key={e.userId} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm shrink-0">{RANK_MEDAL[i + 1] ?? `#${i + 1}`}</span>
                    <span className="text-sm font-medium">{e.userId === userId ? "You" : e.name}</span>
                  </div>
                  <span className="text-xs text-foreground-dim">{e.stat}</span>
                </div>
              ))}
            </div>
            {leaderboard.length > 20 && (
              <p className="text-xs text-foreground-dim mt-2 text-center">+{leaderboard.length - 20} more athletes</p>
            )}
          </div>
        )}

        {/* Final announcement */}
        {isEnded && challenge.finalAnnouncement && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <p className="font-semibold mb-2">🏆 Challenge complete</p>
            <p className="text-sm text-foreground-dim mb-4">{challenge.finalAnnouncement.intro}</p>
            <div className="space-y-3">
              {challenge.finalAnnouncement.top5?.map((e: any) => (
                <div key={e.rank} className="flex items-start gap-2">
                  <span className="shrink-0">{RANK_MEDAL[e.rank] ?? `#${e.rank}`}</span>
                  <div>
                    <p className="text-sm font-medium">{e.name} <span className="text-foreground-dim font-normal">— {e.stat}</span></p>
                    <p className="text-xs text-foreground-dim mt-0.5">{e.tribute}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer nudge */}
        {!userId && (
          <div className="mt-10 text-center">
            <p className="text-xs text-foreground-dim">Train2Race — free fitness challenge app</p>
            <Link href="/signup" className="text-xs text-signal hover:underline">Create account →</Link>
          </div>
        )}
      </main>
    </div>
  );
}
