"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const MESSAGES = [
  { line1: "Rest up.", line2: "Champions are made during recovery too." },
  { line1: "See you on the roads.", line2: "Every mile you've logged is permanent." },
  { line1: "Good work today.", line2: "Come back rested and ready." },
  { line1: "Rest is part of the plan.", line2: "Your body is adapting right now." },
  { line1: "Log off. Recover. Repeat.", line2: "You showed up — that's what counts." },
  { line1: "Well done.", line2: "The roads will be here when you come back." },
];

interface Stats {
  name: string | null;
  streak: number;
  weeklyCount: number;
  weeklyMiles: number;
  weeklyHours: number;
  planTotal: number;
  planDone: number;
  raceName: string | null;
}

function StatCard({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={"rounded-2xl border p-4 text-center " + (accent ? "border-signal/40 bg-signal/5" : "border-border bg-surface")}>
      <div className={"text-2xl font-bold tracking-tight " + (accent ? "text-signal" : "text-foreground")}>{value}</div>
      <div className="text-xs text-foreground-dim mt-1 leading-tight">{label}</div>
    </div>
  );
}

export default function GoodbyePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState(MESSAGES[0]);

  useEffect(() => {
    const raw = sessionStorage.getItem("logout-stats");
    if (raw) {
      try { setStats(JSON.parse(raw)); } catch {}
      sessionStorage.removeItem("logout-stats");
    }
    setMsg(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  }, []);

  const planPct = stats && stats.planTotal > 0
    ? Math.round((stats.planDone / stats.planTotal) * 100)
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Image src="/logo.png" alt="Train2Race" width={60} height={60} className="rounded-2xl mb-3" />
          <span className="text-sm font-medium text-foreground-dim tracking-wide">Train2Race</span>
        </div>

        {/* Message */}
        <div className="text-center mb-10">
          {stats?.name && (
            <p className="text-sm text-foreground-dim mb-2">See you next time, {stats.name}.</p>
          )}
          <h1 className="text-3xl font-bold tracking-tight leading-tight mb-2">{msg.line1}</h1>
          <p className="text-foreground-dim">{msg.line2}</p>
        </div>

        {/* Stats */}
        {stats && (stats.weeklyCount > 0 || stats.streak > 0 || planPct !== null) && (
          <div className="mb-10">
            <p className="text-xs font-medium text-foreground-dim uppercase tracking-widest text-center mb-4">This week</p>
            <div className="grid grid-cols-2 gap-3">
              {stats.weeklyCount > 0 && (
                <StatCard
                  value={String(stats.weeklyCount)}
                  label={stats.weeklyCount === 1 ? "workout logged" : "workouts logged"}
                />
              )}
              {stats.weeklyMiles > 0 && (
                <StatCard
                  value={stats.weeklyMiles + " mi"}
                  label="miles trained"
                />
              )}
              {stats.weeklyMiles === 0 && stats.weeklyHours > 0 && (
                <StatCard
                  value={stats.weeklyHours + "h"}
                  label="hours trained"
                />
              )}
              {stats.streak > 0 && (
                <StatCard
                  value={stats.streak + (stats.streak === 1 ? " day" : " days")}
                  label="current streak"
                  accent={stats.streak >= 3}
                />
              )}
              {planPct !== null && (
                <StatCard
                  value={stats.planDone + "/" + stats.planTotal}
                  label={stats.raceName ? `workouts done · ${stats.raceName.split(" ").slice(0, 3).join(" ")}` : "planned workouts done"}
                  accent={planPct === 100}
                />
              )}
            </div>

            {/* Accountability bar */}
            {planPct !== null && (
              <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-foreground-dim">Week completion</span>
                  <span className={"font-semibold " + (planPct === 100 ? "text-signal" : "text-foreground")}>{planPct}%</span>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={"h-2 rounded-full transition-all " + (planPct === 100 ? "bg-signal" : "bg-signal/60")}
                    style={{ width: planPct + "%" }}
                  />
                </div>
                {planPct < 100 && stats.planTotal - stats.planDone > 0 && (
                  <p className="text-xs text-foreground-dim mt-2">
                    {stats.planTotal - stats.planDone} {stats.planTotal - stats.planDone === 1 ? "workout" : "workouts"} left this week — finish strong.
                  </p>
                )}
                {planPct === 100 && (
                  <p className="text-xs text-signal mt-2">Perfect week. All workouts done.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="w-full text-center py-3 rounded-xl bg-signal text-background font-semibold hover:opacity-90 transition-opacity"
          >
            Log in again →
          </Link>
          <Link href="/" className="text-sm text-foreground-dim hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
