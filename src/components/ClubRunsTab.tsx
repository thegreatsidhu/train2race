"use client";
import { useState } from "react";
import { Linkify } from "@/components/Linkify";
import { fmtClockTime, fmtRunDate } from "@/lib/clubRuns";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "EDT"-style label, shown only when the viewer's phone is in a different zone from the club. */
function zoneNote(tz: string): string | null {
  try {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === tz) return null;
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value || tz;
  } catch { return null; }
}

function splitGroups(text: string): string[] {
  return text.split(",").map(p => p.trim()).filter(Boolean);
}

const EMPTY_FORM = { title: "", dayOfWeek: "6", startTime: "07:00", meetingPoint: "", mapUrl: "", distance: "", paceGroups: "", notes: "" };

interface Props {
  teamId: string;
  isCaptain: boolean;
  myUserId: string;
  runs: any[] | null;
  setRuns: (fn: (prev: any[] | null) => any[] | null) => void;
  reload: () => Promise<void>;
  clubCity: string | null;
  onCityChange: (city: string | null) => void;
}

export function ClubRunsTab({ teamId, isCaptain, myUserId, runs, setRuns, reload, clubCity, onCityChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ key: string; msg: string } | null>(null);
  const [openGoing, setOpenGoing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(clubCity || "");

  async function createRun() {
    setSaving(true); setFormError("");
    const res = await fetch(`/api/teams/${teamId}/club-runs`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dayOfWeek: Number(form.dayOfWeek),
        paceGroups: splitGroups(form.paceGroups),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setFormError(d.error || "Couldn't save. Please try again."); return; }
    setForm(EMPTY_FORM); setShowForm(false);
    await reload();
  }

  function startEdit(run: any) {
    setShowForm(false); setFormError(""); setConfirmDelete(null);
    setForm({
      title: run.title, dayOfWeek: String(run.dayOfWeek), startTime: run.startTime, meetingPoint: run.meetingPoint,
      mapUrl: run.mapUrl || "", distance: run.distance || "", paceGroups: run.paceGroups.join(", "), notes: run.notes || "",
    });
    setEditingId(run.id);
  }

  function cancelForm() {
    setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormError("");
  }

  async function saveEdit(runId: string) {
    setSaving(true); setFormError("");
    const res = await fetch(`/api/teams/${teamId}/club-runs/${runId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dayOfWeek: Number(form.dayOfWeek), paceGroups: splitGroups(form.paceGroups) }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setFormError(d.error || "Couldn't save. Please try again."); return; }
    cancelForm();
    await reload();
  }

  // Updates one occurrence in place so RSVP taps feel instant.
  function patchOccurrence(runId: string, date: string, fn: (o: any) => any) {
    setRuns(prev => prev && prev.map(r => r.id !== runId ? r : { ...r, occurrences: r.occurrences.map((o: any) => o.date === date ? fn(o) : o) }));
  }

  async function rsvp(run: any, occ: any, paceGroup: string | null) {
    const key = run.id + occ.date;
    const dropping = occ.myRsvp && (run.paceGroups.length === 0 || occ.myRsvp.paceGroup === paceGroup);
    setBusyKey(key); setRowError(null);
    const res = await fetch(`/api/teams/${teamId}/club-runs/${run.id}/rsvp`, {
      method: dropping ? "DELETE" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: occ.date, paceGroup }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyKey(null);
    if (!res.ok) { setRowError({ key, msg: d.error || "Couldn't update your RSVP." }); return; }
    const myName = occ.going.find((g: any) => g.userId === myUserId)?.name || "You";
    patchOccurrence(run.id, occ.date, o => {
      const others = o.going.filter((g: any) => g.userId !== myUserId);
      return dropping
        ? { ...o, myRsvp: null, going: others }
        : { ...o, myRsvp: { paceGroup }, going: [...others, { userId: myUserId, name: myName, paceGroup }] };
    });
  }

  async function setCancelled(run: any, occ: any, cancelled: boolean) {
    const key = run.id + occ.date;
    setBusyKey(key); setRowError(null);
    const res = await fetch(`/api/teams/${teamId}/club-runs`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: run.id, date: occ.date, cancelled }),
    });
    setBusyKey(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setRowError({ key, msg: d.error || "Couldn't update." }); return; }
    patchOccurrence(run.id, occ.date, o => ({ ...o, cancelled }));
  }

  async function deleteRun(runId: string) {
    setConfirmDelete(null); setBusyKey(runId);
    const res = await fetch(`/api/teams/${teamId}/club-runs`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
    setBusyKey(null);
    if (res.ok) setRuns(prev => prev && prev.filter(r => r.id !== runId));
  }

  async function saveCity() {
    const city = cityInput.trim() || null;
    const res = await fetch(`/api/teams/${teamId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clubCity: city }) });
    if (res.ok) { onCityChange(city); setEditingCity(false); }
  }

  function renderForm(run: any | null) {
    const dayChanged = !!run && Number(form.dayOfWeek) !== run.dayOfWeek;
    const removedGroups: string[] = run ? run.paceGroups.filter((g: string) => !splitGroups(form.paceGroups).includes(g)) : [];
    const rsvpCount = run ? new Set(run.occurrences.flatMap((o: any) => o.going.map((g: any) => g.userId))).size : 0;
    return (
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <p className="font-medium text-sm">{run ? "Edit group run" : "New weekly group run"}</p>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Name * (e.g. Saturday long run)" maxLength={80} className={input} />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))} className={input}>
                  {DAYS.map((d, i) => <option key={d} value={i}>Every {d}</option>)}
                </select>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={input} />
              </div>
              <input value={form.meetingPoint} onChange={e => setForm(f => ({ ...f, meetingPoint: e.target.value }))} placeholder="Meeting spot * (e.g. Zilker Park boathouse)" maxLength={200} className={input} />
              <input value={form.mapUrl} onChange={e => setForm(f => ({ ...f, mapUrl: e.target.value }))} placeholder="Map link (optional — paste from Google or Apple Maps)" className={input} />
              <input value={form.distance} onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} placeholder="Distance (optional, e.g. 5–10 mi)" maxLength={40} className={input} />
              <div>
                <input value={form.paceGroups} onChange={e => setForm(f => ({ ...f, paceGroups: e.target.value }))} placeholder="Pace groups (optional, e.g. 8:00, 9:30, 11:00, Walk/run)" className={input} />
                <p className="text-xs text-foreground-dim mt-1">Separate with commas. Members pick one when they RSVP. Leave empty for a simple “I’m in”.</p>
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional — route, parking, coffee after…)" rows={3} maxLength={1000} className={input + " resize-none"} />
              {!run && <p className="text-xs text-foreground-dim">Times are in your current time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}). Members will be notified.</p>}
              {run && dayChanged && <p className="text-xs text-amber-400">Changing the day clears upcoming RSVPs{rsvpCount ? ` (${rsvpCount})` : ""}. Those members will be notified and asked to RSVP again.</p>}
              {run && !dayChanged && form.startTime !== run.startTime && rsvpCount > 0 && <p className="text-xs text-foreground-dim">RSVPs stay. The {rsvpCount} member{rsvpCount === 1 ? "" : "s"} going will be told the new time.</p>}
              {run && !dayChanged && removedGroups.length > 0 && splitGroups(form.paceGroups).length > 0 && <p className="text-xs text-amber-400">Members in {removedGroups.join(", ")} will be asked to pick a new pace group.</p>}
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex gap-2">
                <button onClick={() => run ? saveEdit(run.id) : createRun()} disabled={saving || !form.title.trim() || !form.meetingPoint.trim() || !form.startTime} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{saving ? "Saving…" : run ? "Save changes" : "Save run"}</button>
                <button onClick={cancelForm} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button>
              </div>
            </div>
    );
  }

  const input = "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none";

  return (
    <div>
      {isCaptain && (
        <div className="mb-5 space-y-3">
          <div className="text-xs text-foreground-dim">
            {editingCity ? (
              <span className="flex items-center gap-2">
                <input autoFocus value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveCity(); if (e.key === "Escape") setEditingCity(false); }} placeholder="e.g. Austin, TX" maxLength={80} className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:border-signal outline-none" />
                <button onClick={saveCity} className="text-signal hover:underline">Save</button>
                <button onClick={() => setEditingCity(false)} className="hover:underline">Cancel</button>
              </span>
            ) : (
              <span>📍 Club city: {clubCity || "not set"} · <button onClick={() => { setCityInput(clubCity || ""); setEditingCity(true); }} className="text-signal hover:underline">Edit</button></span>
            )}
          </div>
          {!showForm ? (
            <button onClick={() => { cancelForm(); setShowForm(true); }} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:opacity-90">+ Add weekly run</button>
          ) : (
            renderForm(null)
          )}
        </div>
      )}

      {runs === null ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-surface border border-border animate-pulse" />)}</div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-dim">{isCaptain ? "No group runs yet. Add your club's weekly runs above." : "No group runs scheduled yet."}</div>
      ) : (
        <div className="space-y-4">
          {runs.map(run => {
            const zone = zoneNote(run.timezone);
            return (
              editingId === run.id ? <div key={run.id}>{renderForm(run)}</div> :
              <div key={run.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{run.title}</p>
                    <p className="text-sm text-signal mt-0.5">Every {DAYS[run.dayOfWeek]} · {fmtClockTime(run.startTime)}{zone ? ` ${zone}` : ""}{run.distance ? ` · ${run.distance}` : ""}</p>
                    <p className="text-sm text-foreground-dim mt-1">📍 {run.meetingPoint}{run.mapUrl && <> · <a href={run.mapUrl} target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Map →</a></>}</p>
                    {run.notes && <p className="text-sm text-foreground-dim mt-2 leading-snug whitespace-pre-wrap break-words"><Linkify text={run.notes} /></p>}
                  </div>
                  {isCaptain && (confirmDelete === run.id ? (
                    <span className="flex gap-2 shrink-0 text-xs">
                      <button onClick={() => deleteRun(run.id)} className="text-red-400 hover:text-red-300">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-foreground-dim">Keep</button>
                    </span>
                  ) : (
                    <span className="flex gap-3 shrink-0 text-xs">
                      <button onClick={() => startEdit(run)} className="text-foreground-dim hover:text-foreground">Edit</button>
                      <button onClick={() => setConfirmDelete(run.id)} disabled={busyKey === run.id} className="text-red-400 hover:text-red-300 disabled:opacity-40">Delete</button>
                    </span>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {run.occurrences.map((occ: any) => {
                    const key = run.id + occ.date;
                    const busy = busyKey === key;
                    return (
                      <div key={occ.date} className={"rounded-xl border border-border bg-background px-3 py-2.5 " + (occ.cancelled ? "opacity-60" : "")}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            {fmtRunDate(occ.date)}
                            {occ.cancelled
                              ? <span className="ml-2 text-xs text-red-400 font-normal">Cancelled</span>
                              : <button onClick={() => setOpenGoing(openGoing === key ? null : key)} className="ml-2 text-xs text-foreground-dim font-normal hover:text-foreground">{occ.going.length} going{occ.going.length ? (openGoing === key ? " ▴" : " ▾") : ""}</button>}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!occ.cancelled && (run.paceGroups.length ? run.paceGroups.map((pg: string) => {
                              const mine = occ.myRsvp?.paceGroup === pg;
                              const n = occ.going.filter((g: any) => g.paceGroup === pg).length;
                              return (
                                <button key={pg} onClick={() => rsvp(run, occ, pg)} disabled={busy} className={"px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 " + (mine ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                                  {mine ? "✓ " : ""}{pg}{n ? ` · ${n}` : ""}
                                </button>
                              );
                            }) : (
                              <button onClick={() => rsvp(run, occ, null)} disabled={busy} className={"px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 " + (occ.myRsvp ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                                {occ.myRsvp ? "✓ Going" : "I'm in"}
                              </button>
                            ))}
                            {isCaptain && <button onClick={() => setCancelled(run, occ, !occ.cancelled)} disabled={busy} className="text-xs text-foreground-dim hover:text-foreground ml-1 disabled:opacity-50">{occ.cancelled ? "Restore" : "Cancel week"}</button>}
                          </div>
                        </div>
                        {!occ.cancelled && run.paceGroups.length > 0 && !occ.myRsvp && <p className="text-xs text-foreground-dim mt-1">Tap your pace group to RSVP.</p>}
                        {!occ.cancelled && run.paceGroups.length > 0 && occ.myRsvp && !run.paceGroups.includes(occ.myRsvp.paceGroup) && <p className="text-xs text-amber-400 mt-1">You're going, but your pace group changed. Tap a new one.</p>}
                        {rowError?.key === key && <p className="text-xs text-red-400 mt-1">{rowError?.msg}</p>}
                        {openGoing === key && occ.going.length > 0 && (
                          <div className="mt-2 text-xs text-foreground-dim space-y-0.5">
                            {(run.paceGroups.length ? [...run.paceGroups, "__none"] : [null]).map((pg: string | null) => {
                              const names = occ.going.filter((g: any) => !pg || (pg === "__none" ? !run.paceGroups.includes(g.paceGroup) : g.paceGroup === pg)).map((g: any) => g.userId === myUserId ? "You" : g.name);
                              return names.length ? <p key={pg || "all"}>{pg ? <span className="text-foreground">{pg === "__none" ? "No pace group yet" : pg}: </span> : null}{names.join(", ")}</p> : null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
