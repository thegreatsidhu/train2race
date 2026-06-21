"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
export default function TeamsPage() {
  const router = useRouter();
  const [teams,setTeams]=useState([]);const [loading,setLoading]=useState(true);const [showCreate,setShowCreate]=useState(false);const [showJoin,setShowJoin]=useState(false);const [name,setName]=useState("");const [description,setDescription]=useState("");const [inviteCode,setInviteCode]=useState("");const [submitting,setSubmitting]=useState(false);const [error,setError]=useState("");const [races,setRaces]=useState([]);const [selectedRace,setSelectedRace]=useState("");
  useEffect(()=>{fetch("/api/teams").then(r=>r.json()).then(d=>{setTeams(d.teams||[]);setLoading(false);});fetch("/api/major-races?upcoming=1").then(r=>r.json()).then(d=>setRaces(d.races||[]));}, []);
  async function handleCreate(){if(!name.trim())return;setSubmitting(true);setError("");const res=await fetch("/api/teams",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,description,majorRaceId:selectedRace||null})});const data=await res.json();if(!res.ok){setError(data.error);setSubmitting(false);return;}router.push(`/dashboard/teams/${data.team.id}`);}
  async function handleJoin(){if(!inviteCode.trim())return;setSubmitting(true);setError("");const res=await fetch("/api/teams/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({inviteCode})});const data=await res.json();setSubmitting(false);if(res.status===409){router.push(`/dashboard/teams/${data.teamId}`);return;}if(!res.ok){setError(data.error||"Invalid invite code");return;}router.push(`/dashboard/teams/${data.teamId}`);}
  return(
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6"><h1 className="text-3xl font-semibold tracking-tight mb-1">Teams</h1><p className="text-foreground-dim text-sm">Train together, compete together.</p></header>
      <div className="flex gap-2 mb-8">
        <button onClick={()=>{setShowCreate(true);setShowJoin(false);setError("");}} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(showCreate?"bg-signal text-background":"border border-border hover:bg-surface")}>Create team</button>
        <button onClick={()=>{setShowJoin(true);setShowCreate(false);setError("");}} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(showJoin?"bg-signal text-background":"border border-border hover:bg-surface")}>Join with code</button>
      </div>
      {showCreate&&<div className="rounded-2xl border border-border bg-surface p-6 mb-8">
        <h2 className="font-semibold mb-4">Create a team</h2>
        <div className="space-y-3">
          <div><label className="block text-xs text-foreground-dim mb-1">Team name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Chicago Marathon Crew" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"/></div>
          <div><label className="block text-xs text-foreground-dim mb-1">Description (optional)</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} placeholder="What is this team about?" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm resize-none"/></div>
          <div><label className="block text-xs text-foreground-dim mb-1">Target race (optional)</label><select value={selectedRace} onChange={e=>setSelectedRace(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"><option value="">No specific race</option>{races.map(r=><option key={r.id} value={r.id}>{r.name} · {new Date(r.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</option>)}</select></div>
          {error&&<p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2"><button onClick={()=>setShowCreate(false)} className="flex-1 py-2 rounded-full border border-border text-sm">Cancel</button><button onClick={handleCreate} disabled={submitting||!name.trim()} className="flex-1 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{submitting?"Creating...":"Create team"}</button></div>
        </div>
      </div>}
      {showJoin&&<div className="rounded-2xl border border-border bg-surface p-6 mb-8">
        <h2 className="font-semibold mb-4">Join a team</h2>
        <div className="space-y-3">
          <div><label className="block text-xs text-foreground-dim mb-1">Invite code</label><input value={inviteCode} onChange={e=>setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123" maxLength={6} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm font-mono tracking-widest"/></div>
          {error&&<p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2"><button onClick={()=>setShowJoin(false)} className="flex-1 py-2 rounded-full border border-border text-sm">Cancel</button><button onClick={handleJoin} disabled={submitting||!inviteCode.trim()} className="flex-1 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{submitting?"Joining...":"Join team"}</button></div>
        </div>
      </div>}
      {loading?<p className="text-sm text-foreground-dim">Loading...</p>:teams.length===0?(
        <div className="rounded-2xl border border-border bg-surface p-8 text-center"><p className="text-foreground-dim text-sm mb-2">No teams yet.</p><p className="text-xs text-foreground-dim">Create a team or join one with an invite code.</p></div>
      ):(
        <div className="space-y-3">{teams.map((team:any)=>(
          <button key={team.id} onClick={()=>router.push(`/dashboard/teams/${team.id}`)} className="w-full text-left rounded-2xl border border-border bg-surface p-5 hover:bg-surface-raised transition-colors">
            <div className="flex items-start justify-between"><div><p className="font-semibold">{team.name}</p>{team.description&&<p className="text-sm text-foreground-dim mt-0.5">{team.description}</p>}{team.majorRace&&<p className="text-xs text-signal mt-1">🏁 {team.majorRace.name}</p>}<p className="text-xs text-foreground-dim mt-1">{team._count.members} member{team._count.members!==1?"s":""} · {team.members[0]?.role==="admin"?"Admin":"Member"}</p></div><span className="text-foreground-dim">→</span></div>
          </button>
        ))}</div>
      )}
    </div>
  );
}
