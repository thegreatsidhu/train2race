"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isMedianApp, requestHealthPermissions, getHealthData, extractHealthValue, getRecentWorkouts, type HealthWorkout } from "@/lib/median";

type PaceProfileEntry = { type: string; avgSpeedMps: number };

/**
 * Health Connect / Apple Health via the bridge only give us metrics (distance, duration), not
 * the workout's actual type — so this is a best-effort guess from average pace, not authoritative.
 * Can't distinguish swim or strength at all (no distance signal), so it only guesses among
 * ride/run/walk and leaves the type alone otherwise.
 *
 * When the user has enough of their own logged history, matches against THEIR typical pace per
 * type instead of fixed generic thresholds — a fast runner and a casual cyclist can have nearly
 * identical average speed, so no one-size-fits-all cutoff works for everyone, but comparing
 * against someone's own actual runs vs. their own actual rides does.
 */
function guessActivityType(distanceM: number | null, durationMin: number, paceProfile: PaceProfileEntry[] = []): string | null {
  if (!distanceM || durationMin <= 0) return null;
  const speedMps = distanceM / (durationMin * 60);

  const relevant = paceProfile.filter(p => p.type === "run" || p.type === "ride" || p.type === "walk");
  if (relevant.length > 0) {
    let closest = relevant[0];
    for (const p of relevant) {
      if (Math.abs(p.avgSpeedMps - speedMps) < Math.abs(closest.avgSpeedMps - speedMps)) closest = p;
    }
    return closest.type;
  }

  if (speedMps >= 4) return "ride";
  if (speedMps >= 1.3) return "run";
  return "walk";
}

export default function LogWorkoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("mi");
  const [swimUnit, setSwimUnit] = useState("m");
  const [photoRequiredChallenge, setPhotoRequiredChallenge] = useState<{ title: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ type: string; title: string; startTime: string } | null>(null);
  const [confirmingDuplicate, setConfirmingDuplicate] = useState(false);
  const [showHealthSync, setShowHealthSync] = useState(false);
  const [syncingHealth, setSyncingHealth] = useState(false);
  const [healthSyncMsg, setHealthSyncMsg] = useState("");
  const [recentWorkouts, setRecentWorkouts] = useState<HealthWorkout[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [selectedHealthId, setSelectedHealthId] = useState<string | null>(null);
  const [paceProfile, setPaceProfile] = useState<PaceProfileEntry[]>([]);
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [parsingVoice, setParsingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/activities/pace-profile").then(r => r.json()).then(d => setPaceProfile(d.profile || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const native = isMedianApp();
    setShowHealthSync(native);
    if (!native) return;
    (async () => {
      setLoadingWorkouts(true);
      await requestHealthPermissions();
      const workouts = await getRecentWorkouts(14);
      if (workouts.length === 0) { setLoadingWorkouts(false); return; }
      try {
        const res = await fetch("/api/activities/health-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ externalIds: workouts.map(w => w.externalId) }),
        });
        const { imported } = await res.json().catch(() => ({ imported: [] as string[] }));
        const importedSet = new Set<string>(imported || []);
        setRecentWorkouts(workouts.filter(w => !importedSet.has(w.externalId)).slice(0, 3));
      } catch {
        setRecentWorkouts(workouts.slice(0, 3));
      }
      setLoadingWorkouts(false);
    })();
  }, []);

  function applyWorkout(w: HealthWorkout) {
    setSelectedHealthId(w.externalId);
    const d = new Date(w.start);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const guessedType = guessActivityType(w.distanceM, w.durationMin, paceProfile);
    setForm(f => ({
      ...f,
      date: dateStr,
      type: guessedType || f.type,
      durationHours: String(Math.floor(w.durationMin / 60)),
      durationMins: String(Math.round(w.durationMin % 60)),
      distance: w.distanceM ? (w.distanceM / 1609.34).toFixed(2) : f.distance,
    }));
    if (w.distanceM) setUnit("mi");
    setHealthSyncMsg(guessedType
      ? "Filled from your Health app — type guessed from pace, double check it's right."
      : "Filled from your Health app — no distance data, so pick the activity type yourself.");
  }

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setMicSupported(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    fetch("/api/me/active-challenges")
      .then(r => r.json())
      .then(d => {
        const match = (d.challenges || []).find((c: any) =>
          c.unit === "steps" && c.metric === "count" && c.requirePhotoVerification && c.userAccepted && c.isActive
        );
        if (match) setPhotoRequiredChallenge({ title: match.title });
      })
      .catch(() => {});
  }, []);

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  const [form, setForm] = useState({
    type: "run",
    title: "",
    date: todayLocal(),
    durationHours: "0",
    durationMins: "0",
    distance: "",
    steps: "",
    notes: "",
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");

  const isSwim = form.type === "swim";
  const isWalk = form.type === "walk";
  const noDistance = form.type === "strength" || form.type === "other";

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - photoFiles.length;
    const toAdd = files.slice(0, remaining);
    const invalid = toAdd.find(f =>
      !["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"].includes(f.type) ||
      f.size > 5 * 1024 * 1024
    );
    if (invalid) { setPhotoError("Photos must be JPG, PNG, or HEIC and under 5 MB each."); return; }
    setPhotoError("");
    setPhotoPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    setPhotoFiles(prev => [...prev, ...toAdd]);
    e.target.value = "";
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(photoPreviews[i]);
    setPhotoFiles(prev => prev.filter((_, j) => j !== i));
    setPhotoPreviews(prev => prev.filter((_, j) => j !== i));
  }

  async function handleSyncHealth() {
    setSyncingHealth(true);
    setHealthSyncMsg("");
    setError("");
    // iOS never reports which permissions were actually granted — request, then just
    // try to read data and handle an empty result rather than branching on the response.
    await requestHealthPermissions();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    // Steps are a running daily total (no clean per-workout boundary), so keep the "day"
    // aggregate. Distance/exercise time are fetched as individual sessions instead — with
    // multiple workouts in one day, a "day" aggregate would sum them all together, so we pull
    // raw entries and take the most recent one to match "sync the workout I just finished."
    const [dayResult, rawResult] = await Promise.all([
      getHealthData(startOfDay.toISOString(), endOfDay.toISOString(), "day"),
      getHealthData(startOfDay.toISOString(), endOfDay.toISOString(), "raw"),
    ]);

    const steps = extractHealthValue(dayResult?.data?.steps);
    const distanceM = extractHealthValue(rawResult?.data?.distance);
    const exerciseMin = extractHealthValue(rawResult?.data?.exerciseTime);

    if (!steps && !distanceM && !exerciseMin) {
      setHealthSyncMsg("No health data found for today - enter manually");
      setSyncingHealth(false);
      return;
    }

    const guessedType = exerciseMin ? guessActivityType(distanceM, exerciseMin, paceProfile) : null;
    setForm(f => ({
      ...f,
      type: guessedType || f.type,
      steps: steps ? String(Math.round(steps)) : f.steps,
      distance: distanceM ? (distanceM / 1609.34).toFixed(2) : f.distance,
      durationHours: exerciseMin ? String(Math.floor(exerciseMin / 60)) : f.durationHours,
      durationMins: exerciseMin ? String(Math.round(exerciseMin % 60)) : f.durationMins,
    }));
    if (distanceM) setUnit("mi");
    setHealthSyncMsg(guessedType
      ? "Synced from Health app — type guessed from pace, double check it's right."
      : "Synced from Health app — review and edit before saving.");
    setSyncingHealth(false);
  }

  function startVoiceInput() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setVoiceError("");
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      console.log("[voice] speech recognition transcript:", transcript, event.results);
      setVoiceTranscript(transcript || "");
      if (transcript) handleVoiceTranscript(transcript);
    };
    recognition.onerror = (event: any) => {
      console.error("[voice] speech recognition error:", event.error, event);
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError("Microphone access denied — enable it in your browser settings, or enter manually.");
      } else if (event.error === "no-speech") {
        setVoiceError("Didn't catch that — try again.");
      } else {
        setVoiceError(`Voice input failed (${event.error}) — please enter manually.`);
      }
    };
    recognition.onend = () => setListening(false);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError("Couldn't start listening — please enter manually.");
    }
  }

  async function handleVoiceTranscript(transcript: string) {
    setParsingVoice(true);
    setVoiceError("");
    try {
      const res = await fetch("/api/activities/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.parsed) {
        console.error("[voice] parse-voice API failed:", res.status, d);
        setVoiceError("Couldn't extract workout details from that — please enter manually.");
        setParsingVoice(false);
        return;
      }
      const p = d.parsed;
      setForm(f => ({
        ...f,
        type: p.type || f.type,
        durationHours: p.durationMin != null ? String(Math.floor(p.durationMin / 60)) : f.durationHours,
        durationMins: p.durationMin != null ? String(Math.round(p.durationMin % 60)) : f.durationMins,
        distance: p.distance != null ? String(p.distance) : f.distance,
        steps: p.steps != null ? String(p.steps) : f.steps,
        notes: p.notes || f.notes,
      }));
      if (p.unit) {
        if (p.type === "swim" && (p.unit === "m" || p.unit === "yd")) setSwimUnit(p.unit);
        else if (p.unit === "mi" || p.unit === "km") setUnit(p.unit);
      }
    } catch (err) {
      console.error("[voice] handleVoiceTranscript failed:", err);
      setVoiceError("Something went wrong processing that — please enter manually.");
    }
    setParsingVoice(false);
  }

  async function handleSubmit(confirmDuplicate = false) {
    const errors: string[] = [];
    if (!form.date) errors.push("date");
    const totalMin = Number(form.durationHours || 0) * 60 + Number(form.durationMins || 0);
    if (!totalMin) errors.push("duration (hours or minutes)");
    if (errors.length) { setError("Missing required fields: " + errors.join(", ") + "."); return; }
    if (photoRequiredChallenge && Number(form.steps || 0) > 0 && photoFiles.length === 0) {
      setError(`"${photoRequiredChallenge.title}" requires photo proof of your step count. Attach a screenshot from your phone's health app, Fitbit, or step counter.`);
      return;
    }
    setError("");
    setDuplicateWarning(null);
    setLoading(true);
    const effectiveUnit = isSwim ? swimUnit : unit;
    let photos: string[] = [];
    if (photoFiles.length > 0) {
      const results = await Promise.all(photoFiles.map(async file => {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return { error: d.error || "Upload failed" };
        return { url: d.url as string };
      }));
      const failed = results.find(r => "error" in r);
      if (failed && "error" in failed) {
        setLoading(false);
        setError("Photo upload failed: " + failed.error + ". Please try again.");
        return;
      }
      photos = results.map(r => ("url" in r ? r.url : "")).filter(Boolean);
    }
    const res = await fetch("/api/activities/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationMin: totalMin, unit: effectiveUnit, photos, healthExternalId: selectedHealthId, confirmDuplicate }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      router.push(data.isFirstWorkout ? "/dashboard?kudo=first" : "/dashboard");
    } else if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      if (data.duplicate) { setDuplicateWarning(data.existing); return; }
      setError(data.error || "Something went wrong. Please try again.");
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  async function confirmLogAnyway() {
    setConfirmingDuplicate(true);
    await handleSubmit(true);
    setConfirmingDuplicate(false);
  }

  return (
    <div className="max-w-lg px-8 py-10">
      <h1 className="text-2xl font-semibold mb-6">Log Workout</h1>
      <div className="flex flex-col gap-4">
        {showHealthSync && loadingWorkouts && (
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-dim animate-pulse">
            Checking your Health app for recent workouts...
          </div>
        )}
        {showHealthSync && !loadingWorkouts && recentWorkouts.length > 0 && (
          <div>
            <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Import a recent workout</label>
            <div className="space-y-2">
              {recentWorkouts.map(w => {
                const d = new Date(w.start);
                const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const miles = w.distanceM ? `${(w.distanceM / 1609.34).toFixed(1)} mi` : null;
                const selected = selectedHealthId === w.externalId;
                return (
                  <button key={w.externalId} onClick={() => applyWorkout(w)}
                    className={"w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-left transition-colors " + (selected ? "border-signal bg-signal/10" : "border-border bg-surface hover:bg-surface-raised")}>
                    <div>
                      <p className="text-sm font-medium">{dateLabel} · {Math.round(w.durationMin)} min{miles ? ` · ${miles}` : ""}</p>
                      <p className="text-xs text-foreground-dim">Tap to fill in the form below</p>
                    </div>
                    {selected && <span className="text-signal text-sm shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
            {healthSyncMsg && <p className="text-xs text-signal mt-2">{healthSyncMsg}</p>}
          </div>
        )}
        {showHealthSync && !loadingWorkouts && recentWorkouts.length === 0 && (
          <div>
            <button onClick={handleSyncHealth} disabled={syncingHealth}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-signal/50 bg-signal/5 text-signal text-sm font-medium hover:bg-signal/10 transition-colors disabled:opacity-60">
              {syncingHealth ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-signal border-t-transparent animate-spin" />
                  Syncing...
                </>
              ) : (
                <>❤️ Sync from Health App</>
              )}
            </button>
            {healthSyncMsg && (
              <p className={"text-xs mt-1.5 " + (healthSyncMsg.startsWith("No health data") ? "text-foreground-dim" : "text-signal")}>{healthSyncMsg}</p>
            )}
          </div>
        )}
        {micSupported && (
          <div>
            <button onClick={startVoiceInput} disabled={listening || parsingVoice}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-signal/50 bg-signal/5 text-signal text-sm font-medium hover:bg-signal/10 transition-colors disabled:opacity-60">
              {listening ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  Listening...
                </>
              ) : parsingVoice ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-signal border-t-transparent animate-spin" />
                  Understanding...
                </>
              ) : (
                <>🎤 Describe your workout</>
              )}
            </button>
            {!listening && voiceTranscript && (
              <p className="text-xs text-foreground-dim mt-1.5">🎤 You said: "{voiceTranscript}"</p>
            )}
            {voiceError && <p className="text-xs text-red-400 mt-1">{voiceError}</p>}
          </div>
        )}
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity type</label>
          <select className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            value={form.type} onChange={e => setForm({ ...form, type: e.target.value, distance: "", steps: "" })}>
            <option value="run">Run</option>
            <option value="ride">Ride</option>
            <option value="swim">Swim</option>
            <option value="strength">Strength</option>
            <option value="walk">Walk</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Title (optional)</label>
          <input className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            placeholder="e.g. Morning Run" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Date</label>
          <input type="date" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Duration</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" min="0" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm pr-10"
                value={form.durationHours}
                onChange={e => setForm({ ...form, durationHours: e.target.value })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">hr</span>
            </div>
            <div className="relative flex-1">
              <input type="number" min="0" max="59" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm pr-10"
                value={form.durationMins}
                onChange={e => setForm({ ...form, durationMins: e.target.value })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">min</span>
            </div>
          </div>
        </div>
        {!noDistance && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-foreground-dim uppercase tracking-wide">Distance (optional)</label>
              {isSwim ? (
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  <button onClick={() => setSwimUnit("m")}
                    className={"px-3 py-1 " + (swimUnit === "m" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>m</button>
                  <button onClick={() => setSwimUnit("yd")}
                    className={"px-3 py-1 " + (swimUnit === "yd" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>yd</button>
                </div>
              ) : (
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  <button onClick={() => setUnit("mi")}
                    className={"px-3 py-1 " + (unit === "mi" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>mi</button>
                  <button onClick={() => setUnit("km")}
                    className={"px-3 py-1 " + (unit === "km" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>km</button>
                </div>
              )}
            </div>
            <input type="number" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
              placeholder={isSwim ? (swimUnit === "m" ? "e.g. 1500" : "e.g. 1650") : (unit === "mi" ? "e.g. 3.1" : "e.g. 5.0")}
              value={form.distance}
              onChange={e => setForm({ ...form, distance: e.target.value })} />
          </div>
        )}
        {(form.type === "walk" || form.type === "run") && (
          <div>
            <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Steps (optional)</label>
            <input type="number" min="0" step="1" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
              placeholder="e.g. 8000"
              value={form.steps}
              onChange={e => setForm({ ...form, steps: e.target.value })} />
            {photoRequiredChallenge && Number(form.steps || 0) > 0 && (
              <p className="text-xs text-amber-400 mt-1">
                📸 "{photoRequiredChallenge.title}" requires photo proof of your step count — attach a screenshot below.
              </p>
            )}
          </div>
        )}
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Photos (optional)</label>
          {photoPreviews.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-20 h-20 object-cover rounded-xl border border-border" />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoFiles.length < 3 && (
            <>
              {/* Mobile: camera + library side by side */}
              <div className="flex gap-2 md:hidden">
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-signal/50 bg-signal/5 cursor-pointer active:bg-signal/10 transition-colors text-sm text-signal">
                  <span>📷</span>
                  <span className="font-medium">Take a photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={handlePhotoSelect} />
                </label>
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-border bg-surface cursor-pointer active:bg-surface-raised transition-colors text-sm text-foreground-dim">
                  <span>🖼️</span>
                  <span>Library</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={handlePhotoSelect} />
                </label>
              </div>
              {/* Desktop: single upload button */}
              <label className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border bg-surface cursor-pointer hover:bg-surface-raised transition-colors text-sm text-foreground-dim">
                <span>📷</span>
                <span>Upload photo{photoFiles.length > 0 ? ` (${photoFiles.length}/3)` : " (up to 3)"}</span>
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/heic,image/heif" multiple className="hidden"
                  onChange={handlePhotoSelect} />
              </label>
              {photoFiles.length > 0 && (
                <p className="text-xs text-foreground-dim mt-1 md:hidden">{photoFiles.length}/3 photo{photoFiles.length !== 1 ? "s" : ""} added</p>
              )}
            </>
          )}
          {photoError && <p className="text-xs text-red-400 mt-1">{photoError}</p>}
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Notes (optional)</label>
          <textarea className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            rows={3} placeholder="How did it feel?"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {duplicateWarning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-3 space-y-2">
            <p className="text-sm">
              This looks like it might already be logged — you have a {duplicateWarning.type} workout
              ("{duplicateWarning.title}") starting around {new Date(duplicateWarning.startTime).toLocaleString()}.
            </p>
            <div className="flex gap-2">
              <button onClick={confirmLogAnyway} disabled={confirmingDuplicate}
                className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-60">
                {confirmingDuplicate ? "Saving..." : "Log it anyway"}
              </button>
              <button onClick={() => setDuplicateWarning(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
            </div>
          </div>
        )}
        <button onClick={() => handleSubmit()} disabled={loading}
          className="w-full py-3 rounded-full bg-signal text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? "Saving..." : "Save workout"}
        </button>
        <button onClick={() => router.back()}
          className="w-full py-3 rounded-full border border-border text-sm hover:bg-surface transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}