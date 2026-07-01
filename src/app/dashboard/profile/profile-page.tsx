"use client";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Australia/Sydney",
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"personal" | "body" | "account">("personal");

  // Personal info
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");

  // Body metrics
  const [weightLbs, setWeightLbs] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");

  // Account
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  // Delete account state
  const [deleteStep, setDeleteStep] = useState<null | "survey" | "confirm">(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteOther, setDeleteOther] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) return;
        if (user.name) setName(user.name);
        if (user.email) setEmail(user.email);
        if (user.dateOfBirth) setDob(user.dateOfBirth.slice(0, 10));
        if (user.sex) setSex(user.sex);
        if (user.timezone) setTimezone(user.timezone);
        if (user.weightKg) setWeightLbs(Math.round(user.weightKg * 2.20462).toString());
        if (user.heightCm) {
          const totalIn = Math.round(user.heightCm / 2.54);
          setHeightFt(Math.floor(totalIn / 12).toString());
          setHeightIn((totalIn % 12).toString());
        }
        setHasPassword(user.hasPassword || false);
      });
  }, []);

  function showSaved(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(""), 3000);
  }

  async function savePersonal() {
    setSaving(true); setError("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dateOfBirth: dob || null, sex: sex || null, timezone }),
    });
    setSaving(false);
    if (res.ok) showSaved("Personal info saved");
    else setError("Failed to save");
  }

  async function saveBody() {
    setSaving(true); setError("");
    const weightKg = weightLbs ? parseFloat(weightLbs) / 2.20462 : null;
    const totalIn = (heightFt || heightIn) ? parseInt(heightFt || "0") * 12 + parseInt(heightIn || "0") : null;
    const heightCm = totalIn ? totalIn * 2.54 : null;
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg, heightCm }),
    });
    setSaving(false);
    if (res.ok) showSaved("Body metrics saved");
    else setError("Failed to save");
  }

  async function saveEmail() {
    setSaving(true); setError("");
    const res = await fetch("/api/profile/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSaving(false);
    if (res.ok) showSaved("Email updated");
    else { const d = await res.json(); setError(d.error || "Failed"); }
  }

  async function savePassword() {
    setError("");
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);
    if (res.ok) {
      showSaved("Password updated");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setHasPassword(true);
    } else { const d = await res.json(); setError(d.error || "Failed"); }
  }

  async function deleteAccount() {
    if (!deleteReason) { setDeleteError("Please select a reason."); return; }
    setDeleting(true); setDeleteError("");
    const res = await fetch("/api/profile/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: deleteReason, otherText: deleteOther.trim() || null }),
    });
    if (res.ok) {
      await signOut({ callbackUrl: window.location.origin + "/" });
    } else {
      setDeleting(false);
      setDeleteError("Something went wrong. Please try again.");
    }
  }

  // Compute age from DOB
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

  return (
    <div className="max-w-xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Profile</h1>
        <p className="text-foreground-dim text-sm">Your details help the AI coach give more accurate advice.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {([
          { id: "personal", label: "Personal" },
          { id: "body", label: "Body metrics" },
          { id: "account", label: "Account" },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(""); setSaved(""); }}
            className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (activeTab === tab.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Personal tab */}
      {activeTab === "personal" && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && savePersonal()} placeholder="Your name"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of birth{age ? ` — age ${age}` : ""}</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Biological sex</label>
            <p className="text-xs text-foreground-dim mb-2">Used for HR and HRV baseline calculations only.</p>
            <select value={sex} onChange={e => setSex(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <SaveRow saving={saving} saved={saved} error={error} onSave={savePersonal} />
        </div>
      )}

      {/* Body metrics tab */}
      {activeTab === "body" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-foreground-dim">
            Used to calculate calorie burn, training load, and nutrition targets. All data stays private.
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Weight</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="175" value={weightLbs} onChange={e => setWeightLbs(e.target.value)}
                className="w-32 px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
              <span className="text-sm text-foreground-dim">lbs</span>
              {weightLbs && <span className="text-xs text-foreground-dim">({(parseFloat(weightLbs) / 2.20462).toFixed(1)} kg)</span>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Height</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="5" value={heightFt} onChange={e => setHeightFt(e.target.value)}
                className="w-20 px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
              <span className="text-sm text-foreground-dim">ft</span>
              <input type="number" placeholder="10" min="0" max="11" value={heightIn} onChange={e => setHeightIn(e.target.value)}
                className="w-20 px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
              <span className="text-sm text-foreground-dim">in</span>
              {heightFt && <span className="text-xs text-foreground-dim">({((parseInt(heightFt||"0")*12+parseInt(heightIn||"0"))*2.54).toFixed(0)} cm)</span>}
            </div>
          </div>
          {weightLbs && heightFt && (
            <div className="rounded-xl bg-surface border border-border px-4 py-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">BMI</p>
              <p className="text-lg font-semibold">
                {(() => {
                  const kg = parseFloat(weightLbs) / 2.20462;
                  const cm = (parseInt(heightFt||"0")*12+parseInt(heightIn||"0"))*2.54;
                  const bmi = kg / ((cm/100)**2);
                  const label = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
                  return `${bmi.toFixed(1)} — ${label}`;
                })()}
              </p>
            </div>
          )}
          <SaveRow saving={saving} saved={saved} error={error} onSave={saveBody} />
        </div>
      )}

      {/* Account tab */}
      {activeTab === "account" && (
        <div className="space-y-8">
          {/* Email */}
          <div>
            <h2 className="text-sm font-medium mb-4">Email address</h2>
            <div className="space-y-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
              <button onClick={saveEmail} disabled={saving}
                className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
                {saving ? "Saving..." : "Update email"}
              </button>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Password */}
          <div>
            <h2 className="text-sm font-medium mb-1">
              {hasPassword ? "Change password" : "Set a password"}
            </h2>
            <p className="text-xs text-foreground-dim mb-4">
              {hasPassword ? "Enter your current password to set a new one." : "Add a password to your account."}
            </p>
            <div className="space-y-3">
              {hasPassword && (
                <div>
                  <label className="block text-xs text-foreground-dim mb-1">Current password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs text-foreground-dim mb-1">New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs text-foreground-dim mb-1">Confirm new password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {saved && <p className="text-signal text-sm">{saved} ✓</p>}
              <button onClick={savePassword} disabled={saving || !newPassword}
                className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
                {saving ? "Saving..." : hasPassword ? "Change password" : "Set password"}
              </button>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Delete account */}
          <div>
            <h2 className="text-sm font-medium mb-1 text-red-400">Delete account</h2>
            <p className="text-xs text-foreground-dim mb-4">Permanently removes your account and all associated data. This cannot be undone.</p>

            {!deleteStep && (
              <button onClick={() => setDeleteStep("survey")}
                className="px-5 py-2 rounded-full border border-red-700/50 text-red-400 text-sm font-medium hover:border-red-500 hover:bg-red-900/10 transition-colors">
                Delete my account
              </button>
            )}

            {deleteStep === "survey" && (
              <div className="rounded-2xl border border-red-700/30 bg-red-900/10 p-5 space-y-4">
                <p className="text-sm font-medium">Before you go — what&apos;s the reason?</p>
                <div className="space-y-2">
                  {[
                    { v: "not_using", l: "I'm not using the app enough" },
                    { v: "better_alt", l: "I found a better alternative" },
                    { v: "privacy", l: "Privacy or data concerns" },
                    { v: "missing_features", l: "Missing features I need" },
                    { v: "bugs", l: "Too many bugs or technical issues" },
                    { v: "other", l: "Other" },
                  ].map(opt => (
                    <label key={opt.v} className={"flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border transition-colors " + (deleteReason === opt.v ? "border-red-600/50 bg-red-900/20" : "border-border bg-surface hover:border-red-700/30")}>
                      <input type="radio" name="deleteReason" value={opt.v} checked={deleteReason === opt.v} onChange={() => { setDeleteReason(opt.v); setDeleteError(""); }}
                        className="accent-red-500 shrink-0" />
                      <span className="text-sm">{opt.l}</span>
                    </label>
                  ))}
                </div>
                {deleteReason === "other" && (
                  <textarea value={deleteOther} onChange={e => setDeleteOther(e.target.value)} placeholder="Tell us more (optional)…" rows={2} maxLength={300}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm placeholder:text-foreground-dim focus:outline-none focus:border-red-600/50 resize-none" />
                )}
                {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setDeleteStep("confirm")} disabled={!deleteReason}
                    className="px-4 py-2 rounded-full bg-red-700 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                    Continue
                  </button>
                  <button onClick={() => { setDeleteStep(null); setDeleteReason(""); setDeleteOther(""); setDeleteError(""); }}
                    className="px-4 py-2 rounded-full border border-border text-sm hover:bg-surface transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deleteStep === "confirm" && (
              <div className="rounded-2xl border border-red-700/40 bg-red-900/15 p-5 space-y-4">
                <p className="text-sm font-medium">Are you absolutely sure?</p>
                <p className="text-sm text-foreground-dim">Your account, all training data, teams, plans, and activity history will be permanently deleted. There is no way to recover this.</p>
                {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
                <div className="flex gap-2">
                  <button onClick={deleteAccount} disabled={deleting}
                    className="px-4 py-2 rounded-full bg-red-700 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                    {deleting ? "Deleting…" : "Yes, permanently delete my account"}
                  </button>
                  <button onClick={() => { setDeleteStep(null); setDeleteReason(""); setDeleteOther(""); setDeleteError(""); }}
                    disabled={deleting}
                    className="px-4 py-2 rounded-full border border-border text-sm hover:bg-surface transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SaveRow({ saving, saved, error, onSave }: { saving: boolean; saved: string; error: string; onSave: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button onClick={onSave} disabled={saving}
        className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
        {saving ? "Saving..." : "Save"}
      </button>
      {saved && <span className="text-sm text-signal">{saved} ✓</span>}
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
