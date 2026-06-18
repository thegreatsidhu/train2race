"use client";

import { useState, useEffect } from "react";

export default function ProfilePage() {
  const [weightLbs, setWeightLbs] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ user }) => {
        if (!user) return;
        if (user.weightKg) setWeightLbs(Math.round(user.weightKg * 2.20462).toString());
        if (user.heightCm) {
          const totalIn = Math.round(user.heightCm / 2.54);
          setHeightFt(Math.floor(totalIn / 12).toString());
          setHeightIn((totalIn % 12).toString());
        }
        if (user.dateOfBirth) setDob(user.dateOfBirth.slice(0, 10));
        if (user.sex) setSex(user.sex);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const weightKg = weightLbs ? parseFloat(weightLbs) / 2.20462 : null;
    const totalIn = heightFt || heightIn
      ? parseInt(heightFt || "0") * 12 + parseInt(heightIn || "0")
      : null;
    const heightCm = totalIn ? totalIn * 2.54 : null;
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg, heightCm, dateOfBirth: dob || null, sex: sex || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Profile</h1>
        <p className="text-foreground-dim text-sm">Used by the AI coach for more accurate calorie and training load estimates.</p>
      </header>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Weight</label>
          <div className="flex items-center gap-2">
            <input type="number" placeholder="175" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)}
              className="w-32 px-3 py-2 rounded-lg bg-surface border border-border focus:border-signal outline-none text-sm" />
            <span className="text-sm text-foreground-dim">lbs</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Height</label>
          <div className="flex items-center gap-2">
            <input type="number" placeholder="5" value={heightFt} onChange={(e) => setHeightFt(e.target.value)}
              className="w-20 px-3 py-2 rounded-lg bg-surface border border-border focus:border-signal outline-none text-sm" />
            <span className="text-sm text-foreground-dim">ft</span>
            <input type="number" placeholder="10" min="0" max="11" value={heightIn} onChange={(e) => setHeightIn(e.target.value)}
              className="w-20 px-3 py-2 rounded-lg bg-surface border border-border focus:border-signal outline-none text-sm" />
            <span className="text-sm text-foreground-dim">in</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date of birth</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface border border-border focus:border-signal outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Biological sex</label>
          <p className="text-xs text-foreground-dim mb-2">Used for HR and HRV baseline calculations only.</p>
          <select value={sex} onChange={(e) => setSex(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface border border-border focus:border-signal outline-none text-sm">
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-signal">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}