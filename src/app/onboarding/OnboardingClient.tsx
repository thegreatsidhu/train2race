"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Race {
  id: string;
  name: string;
  raceDate: string | null;
  distanceM: number | null;
  isTriathlon: boolean;
}

const ACTIVITY_TYPES = [
  { value: "run", label: "Run" },
  { value: "bike", label: "Bike" },
  { value: "swim", label: "Swim" },
  { value: "strength", label: "Strength" },
  { value: "other", label: "Other" },
];

const FITNESS_GOALS = [
  { value: "Train for a race", icon: "🏁", desc: "Set a race target and follow a training plan" },
  { value: "Get more active",  icon: "💪", desc: "Build a consistent workout habit" },
  { value: "Lose weight",      icon: "⚖️", desc: "Track workouts and stay accountable" },
  { value: "Stay accountable with friends", icon: "👥", desc: "Train with your crew and push each other" },
];

function fmtRaceDate(d: string | null) {
  if (!d) return "Date TBD";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDistance(m: number | null) {
  if (!m) return "";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function StepDots({ current, total = 4 }: { current: number; total?: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={`rounded-full transition-all duration-300 ${
            n === current
              ? "w-6 h-1.5 bg-signal"
              : n < current
              ? "w-3 h-1.5 bg-signal/40"
              : "w-3 h-1.5 bg-surface-dim"
          }`}
        />
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md mx-auto px-6 py-8 rounded-2xl bg-surface border border-border shadow-lg">
      {children}
    </div>
  );
}

// Maps step number → visual dot position based on goal
function getDotStep(step: number, goal: string, skipTeam = false) {
  if (skipTeam) {
    // Team step removed: goal(1) [race(2)] workout(4→last)
    if (step === 1) return 1;
    if (step === 2) return 2;
    if (step === 4) return goal === "Train for a race" ? 3 : 2;
    return step;
  }
  if (goal === "Train for a race") {
    // goal(1) race(2) team(3) workout(4)
    return step;
  }
  // Non-race: goal(1) team(3→2) workout(4→3)
  if (step === 1) return 1;
  if (step === 3) return 2;
  if (step === 4) return 3;
  return step;
}

export function OnboardingClient({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // Pending team invite (set by /join/[code] before redirecting to auth)
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  useEffect(() => {
    const code = localStorage.getItem("pendingTeamCode");
    if (code) setPendingInviteCode(code);
  }, []);
  const hasPendingInvite = pendingInviteCode !== null;

  // Step 1 — Fitness goal
  const [fitnessGoal, setFitnessGoal] = useState("");

  // Step 2 — Race (only for "Train for a race")
  const [raceQuery, setRaceQuery] = useState("");
  const [raceResults, setRaceResults] = useState<Race[]>([]);
  const [raceSearching, setRaceSearching] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [savingRace, setSavingRace] = useState(false);
  const [showCommunityPrompt, setShowCommunityPrompt] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState(false);

  // Step 3 — Team
  const [teamMode, setTeamMode] = useState<"invite" | "create" | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  // Step 4 — Workout
  const [workoutType, setWorkoutType] = useState("run");
  const [workoutDate, setWorkoutDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [durationH, setDurationH] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [distance, setDistance] = useState("");
  const [distUnit, setDistUnit] = useState("mi");
  const [savingWorkout, setSavingWorkout] = useState(false);

  useEffect(() => {
    if (step !== 2 || !raceQuery || raceQuery.length < 2) {
      setRaceResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setRaceSearching(true);
      try {
        const res = await fetch(
          `/api/major-races?search=${encodeURIComponent(raceQuery)}&upcoming=1&limit=6`
        );
        const d = await res.json();
        setRaceResults(d.races || []);
      } catch {
        setRaceResults([]);
      }
      setRaceSearching(false);
    }, 320);
    return () => clearTimeout(t);
  }, [raceQuery, step]);

  async function saveRace() {
    if (!selectedRace) return;
    setSavingRace(true);
    setError("");
    const res = await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raceName: selectedRace.name,
        raceDate: selectedRace.raceDate,
        distanceM: selectedRace.distanceM,
        isTriathlon: selectedRace.isTriathlon,
        majorRaceId: selectedRace.id,
      }),
    });
    if (res.ok || res.status === 409) {
      setShowCommunityPrompt(true);
    } else {
      setError("Couldn't save race. You can skip for now.");
    }
    setSavingRace(false);
  }

  async function joinRaceCommunity() {
    if (!selectedRace) { setStep(3); return; }
    setJoiningCommunity(true);
    try {
      const res = await fetch("/api/major-races/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ majorRaceId: selectedRace.id, isPublic: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Couldn't join community. You can join from the Community page.");
      }
    } catch {
      setError("Couldn't join community. You can join from the Community page.");
    }
    setJoiningCommunity(false);
    setStep(hasPendingInvite ? 4 : 3);
  }

  async function joinTeam() {
    if (!inviteCode.trim()) return;
    setSavingTeam(true);
    setTeamError("");
    const code = inviteCode.trim().toUpperCase();
    const res = await fetch(`/api/teams/invite/${code}`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok || d.alreadyMember) {
      setStep(4);
    } else {
      setTeamError(d.error || "Invalid invite code. Try again.");
    }
    setSavingTeam(false);
  }

  async function createTeam() {
    if (!teamName.trim()) return;
    setSavingTeam(true);
    setTeamError("");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName.trim() }),
    });
    if (res.ok) {
      setStep(4);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamError(d.error || "Failed to create team.");
    }
    setSavingTeam(false);
  }

  async function logWorkout() {
    const totalMin = Number(durationH || 0) * 60 + Number(durationMin || 0);
    if (!totalMin) {
      setError("Enter a duration first.");
      return;
    }
    setSavingWorkout(true);
    setError("");
    await fetch("/api/activities/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: workoutType,
        date: workoutDate,
        durationMin: totalMin,
        distance: distance || null,
        unit: distUnit,
      }),
    }).catch(() => {});
    setStep(5);
    setSavingWorkout(false);
  }

  async function finish() {
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fitnessGoal }),
    }).catch(() => {});
    if (pendingInviteCode) {
      localStorage.removeItem("pendingTeamCode");
      router.push(`/join/${pendingInviteCode}`);
    } else {
      router.push("/dashboard");
    }
  }

  const dotTotal = hasPendingInvite
    ? (fitnessGoal === "Train for a race" ? 3 : 2)
    : (fitnessGoal === "Train for a race" ? 4 : 3);
  const dotStep = getDotStep(step, fitnessGoal, hasPendingInvite);

  // Step 0 — Welcome
  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <Image
          src="/logo.png"
          alt="Train2Race"
          width={72}
          height={72}
          className="rounded-2xl mb-6"
        />
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome to Train2Race{name ? `, ${name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-foreground-dim text-lg mb-10">Train smart. Race ready.</p>
        <button
          onClick={() => setStep(1)}
          className="px-8 py-3.5 rounded-full bg-signal text-background font-semibold text-base hover:bg-signal-dim transition-colors"
        >
          Get Started →
        </button>
      </div>
    );
  }

  // Step 1 — Fitness goal
  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <StepDots current={1} total={dotTotal} />
          <Card>
            <h2 className="text-2xl font-bold tracking-tight mb-1">What is your fitness goal?</h2>
            <p className="text-foreground-dim text-sm mb-6">We'll tailor your experience to match.</p>
            <div className="flex flex-col gap-3">
              {FITNESS_GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => {
                    setFitnessGoal(g.value);
                    setStep(g.value === "Train for a race" ? 2 : (hasPendingInvite ? 4 : 3));
                  }}
                  className="w-full py-3 rounded-xl border border-border hover:border-signal text-sm font-medium transition-colors text-left px-4 flex items-center gap-3"
                >
                  <span className="text-xl">{g.icon}</span>
                  <div>
                    <div className="font-medium">{g.value}</div>
                    <div className="text-xs text-foreground-dim">{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2 — Find race (only reached if goal === "Train for a race")
  if (step === 2) {
    // Sub-state: race saved, now offer to join community
    if (showCommunityPrompt && selectedRace) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <div className="w-full max-w-md mx-auto">
            <StepDots current={2} total={4} />
            <Card>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🎯</div>
                <h2 className="text-xl font-bold tracking-tight mb-1">Race target set!</h2>
                <p className="text-foreground-dim text-sm">{selectedRace.name} · {fmtRaceDate(selectedRace.raceDate)}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 mb-6">
                <p className="text-sm font-semibold mb-1">Join the {selectedRace.name} community?</p>
                <p className="text-xs text-foreground-dim leading-relaxed">
                  Connect with other athletes training for this race — compare progress, chat, and cheer each other on.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={joinRaceCommunity}
                  disabled={joiningCommunity}
                  className="w-full py-2.5 rounded-xl bg-signal text-background font-medium text-sm disabled:opacity-60"
                >
                  {joiningCommunity ? "Joining…" : "Join community →"}
                </button>
                <button
                  onClick={() => setStep(hasPendingInvite ? 4 : 3)}
                  className="w-full py-2 rounded-xl border border-border text-sm text-foreground-dim hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <StepDots current={2} total={4} />
          <Card>
            <h2 className="text-2xl font-bold tracking-tight mb-1">What race are you training for?</h2>
            <p className="text-foreground-dim text-sm mb-6">Search the race library to set your target.</p>

            {!selectedRace ? (
              <>
                <input
                  type="text"
                  placeholder="Search races…"
                  value={raceQuery}
                  onChange={(e) => setRaceQuery(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm mb-2"
                />
                {raceSearching && (
                  <p className="text-xs text-foreground-dim mb-2">Searching…</p>
                )}
                {raceResults.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    {raceResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedRace(r);
                          setRaceResults([]);
                          setRaceQuery(r.name);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl bg-background border border-border hover:border-signal transition-colors"
                      >
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-foreground-dim mt-0.5">
                          {fmtRaceDate(r.raceDate)}
                          {fmtDistance(r.distanceM) ? ` · ${fmtDistance(r.distanceM)}` : ""}
                          {r.isTriathlon ? " · Triathlon" : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="mb-4 p-3 rounded-xl bg-signal/10 border border-signal/30">
                <div className="font-semibold text-sm">{selectedRace.name}</div>
                <div className="text-xs text-foreground-dim mt-0.5">
                  {fmtRaceDate(selectedRace.raceDate)}
                  {fmtDistance(selectedRace.distanceM) ? ` · ${fmtDistance(selectedRace.distanceM)}` : ""}
                  {selectedRace.isTriathlon ? " · Triathlon" : ""}
                </div>
                <button
                  onClick={() => { setSelectedRace(null); setRaceQuery(""); }}
                  className="text-xs text-foreground-dim hover:text-foreground mt-1.5"
                >
                  ← Choose a different race
                </button>
              </div>
            )}

            {error && <p className="text-alert text-xs mb-3">{error}</p>}

            <div className="flex gap-3 mt-2">
              {selectedRace && (
                <button
                  onClick={saveRace}
                  disabled={savingRace}
                  className="flex-1 py-2.5 rounded-xl bg-signal text-background font-medium text-sm disabled:opacity-60"
                >
                  {savingRace ? "Saving…" : "Set as target →"}
                </button>
              )}
              <button
                onClick={() => { setError(""); setStep(hasPendingInvite ? 4 : 3); }}
                className={`py-2.5 rounded-xl text-sm text-foreground-dim hover:text-foreground border border-border transition-colors ${selectedRace ? "px-4" : "flex-1"}`}
              >
                Skip for now
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3 — Team
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <StepDots current={dotStep} total={dotTotal} />
          <Card>
            <h2 className="text-2xl font-bold tracking-tight mb-1">Train with your crew.</h2>
            <p className="text-foreground-dim text-sm mb-6">
              Join a team to compete on the leaderboard together.
            </p>

            {!teamMode && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setTeamMode("invite")}
                  className="w-full py-3 rounded-xl border border-border hover:border-signal text-sm font-medium transition-colors text-left px-4 flex items-center gap-3"
                >
                  <span className="text-xl">🔑</span>
                  <div>
                    <div className="font-medium">I have an invite code</div>
                    <div className="text-xs text-foreground-dim">Join an existing team</div>
                  </div>
                </button>
                <button
                  onClick={() => setTeamMode("create")}
                  className="w-full py-3 rounded-xl border border-border hover:border-signal text-sm font-medium transition-colors text-left px-4 flex items-center gap-3"
                >
                  <span className="text-xl">🏗️</span>
                  <div>
                    <div className="font-medium">Create a new team</div>
                    <div className="text-xs text-foreground-dim">Start fresh with your friends</div>
                  </div>
                </button>
              </div>
            )}

            {teamMode === "invite" && (
              <div>
                <button
                  onClick={() => { setTeamMode(null); setTeamError(""); setInviteCode(""); }}
                  className="text-xs text-foreground-dim hover:text-foreground mb-4"
                >
                  ← Back
                </button>
                <input
                  type="text"
                  placeholder="Invite code (e.g. T2R-XXXX)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm font-data tracking-wider mb-3"
                />
                {teamError && <p className="text-alert text-xs mb-3">{teamError}</p>}
                <button
                  onClick={joinTeam}
                  disabled={savingTeam || !inviteCode.trim()}
                  className="w-full py-2.5 rounded-xl bg-signal text-background font-medium text-sm disabled:opacity-60"
                >
                  {savingTeam ? "Joining…" : "Join Team →"}
                </button>
              </div>
            )}

            {teamMode === "create" && (
              <div>
                <button
                  onClick={() => { setTeamMode(null); setTeamError(""); setTeamName(""); }}
                  className="text-xs text-foreground-dim hover:text-foreground mb-4"
                >
                  ← Back
                </button>
                <input
                  type="text"
                  placeholder="Team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm mb-3"
                />
                {teamError && <p className="text-alert text-xs mb-3">{teamError}</p>}
                <button
                  onClick={createTeam}
                  disabled={savingTeam || !teamName.trim()}
                  className="w-full py-2.5 rounded-xl bg-signal text-background font-medium text-sm disabled:opacity-60"
                >
                  {savingTeam ? "Creating…" : "Create Team →"}
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setStep(4)}
                className="w-full py-2 text-sm text-foreground-dim hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Step 4 — Log workout
  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <StepDots current={dotStep} total={dotTotal} />
          <Card>
            <h2 className="text-2xl font-bold tracking-tight mb-1">Log a recent workout.</h2>
            <p className="text-foreground-dim text-sm mb-6">Get on the leaderboard right away.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-foreground-dim mb-1.5 block">Activity type</label>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-foreground-dim mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-foreground-dim mb-1.5 block">Duration</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={durationH}
                      onChange={(e) => setDurationH(e.target.value)}
                      className="w-full px-4 py-3 pr-8 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">h</span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={durationMin}
                      onChange={(e) => setDurationMin(e.target.value)}
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">min</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-foreground-dim mb-1.5 block">Distance (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.0"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
                  />
                  <select
                    value={distUnit}
                    onChange={(e) => setDistUnit(e.target.value)}
                    className="px-3 py-3 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
                  >
                    <option value="mi">mi</option>
                    <option value="km">km</option>
                    <option value="m">m</option>
                    <option value="yd">yd</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <p className="text-alert text-xs mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={logWorkout}
                disabled={savingWorkout}
                className="flex-1 py-2.5 rounded-xl bg-signal text-background font-medium text-sm disabled:opacity-60"
              >
                {savingWorkout ? "Logging…" : "Log Workout →"}
              </button>
              <button
                onClick={() => { setError(""); setStep(5); }}
                className="px-4 py-2.5 rounded-xl border border-border text-sm text-foreground-dim hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Step 5 — Done
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="text-6xl mb-6">🏁</div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">You're all set.</h1>
      <p className="text-foreground-dim text-lg mb-10">Your team is waiting.</p>
      <button
        onClick={finish}
        className="px-8 py-3.5 rounded-full bg-signal text-background font-semibold text-base hover:bg-signal-dim transition-colors"
      >
        Go to dashboard →
      </button>
    </div>
  );
}
