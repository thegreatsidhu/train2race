"use client";
import { useState, useEffect } from "react";
function formatGoal(sec){if(!sec)return null;const h=Math.floor(sec/3600);const m=Math.floor((sec%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;}
function distanceLabel(m){if(m>=200000)return"140.6 Ironman";if(m>=100000)return"70.3";if(m>=40000)return"Marathon";if(m>=20000)return"Half Marathon";if(m>=9000)return"10K";return"5K";}
export default function CommunityPage() {
  const [search,setSearch]=useState("");const [races,setRaces]=useState([]);const [myRegs,setMyRegs]=useState([]);const [selected,setSelected]=useState(null);const [community,setCommunity]=useState([]);const [loading,setLoading]=useState(false);const [registering,setRegistering]=useState(false);const [goalH,setGoalH]=useState("");const [goalM,setGoalM]=useState("");const [isPublic,setIsPublic]=useState(true);const [tab,setTab]=useState("find");
  useEffect(()=>{fetch("/api/major-races?upcoming=1").then(r=>r.json()).then(d=>setRaces(d.races||[]));fetch("/api/major-races/register").then(r=>r.json()).then(d=>setMyRegs(d.registrations||[]));}, []);
  useEffect(()=>{if(!search)return;const t=setTimeout(()=>{fetch(`/api/major-races?search=${encodeURIComponent(search)}&upcoming=1`).then(r=>r.json()).then(d=>setRaces(d.races||[]));},300);return()=>clearTimeout(t);},[search]);
  async function loadCommunity(race){setSelected(race);setLoading(true);const res=await fetch(`/api/major-races/community?raceId=${race.id}`);const data=await res.json();setCommunity(data.community||[]);setLoading(false);}
  async function handleRegister(race){setRegistering(true);const sec=(goalH||goalM)?parseInt(goalH||"0")*3600+parseInt(goalM||"0")*60:null;await fetch("/api/major-races/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId:race.id,goalTimeSec:sec,isPublic})});const d=await fetch("/api/major-races/register").then(r=>r.json());setMyRegs(d.registrations||[]);setRegistering(false);loadCommunity(race);}
  async function handleUnregister(majorRaceId){await fetch("/api/major-races/register",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId})});const d=await fetch("/api/major-races/register").then(r=>r.json());setMyRegs(d.registrations||[]);}
  const isReg=(id)=>myRegs.some(r=>r.majorRaceId===id);
  const filtered=races.filter(r=>!search||r.name.toLowerCase().includes(search.toLowerCase()));
  return(
    <div className="max-w-4xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6"><h1 className="text-3xl font-semibold tracking-tight mb-1">Community</h1><p className="text-foreground-dim text-sm">Find your race and see who else is training for it.</p></header>
      <div className="flex gap-2 mb-6">{[{id:"find",label:"Find a race"},{id:"myraces",label:`My races (${myRegs.length})`}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(tab===t.id?"bg-signal text-background":"border border-border hover:bg-surface")}>{t.label}</button>)}</div>
      {tab==="find"&&<div className="grid md:grid-cols-2 gap-6">
        <div>
          <input placeholder="Search races..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm mb-4" />
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map(race=>{const daysAway=Math.ceil((new Date(race.raceDate).getTime()-Date.now())/(1000*60*60*24));return(
              <button key={race.id} onClick={()=>loadCommunity(race)} className={"w-full text-left rounded-xl border p-3 transition-colors "+(selected?.id===race.id?"border-signal bg-signal/5":"border-border bg-surface hover:bg-surface-raised")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-medium text-sm truncate">{race.name}</p><p className="text-xs text-foreground-dim">{race.city}, {race.country} · {distanceLabel(race.distanceM)}</p><p className="text-xs text-foreground-dim">{new Date(race.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {daysAway}d away</p></div>
                  <div className="flex flex-col items-end gap-1 shrink-0">{isReg(race.id)&&<span className="text-xs bg-signal/20 text-signal px-2 py-0.5 rounded-full">Joined</span>}<span className="text-xs text-foreground-dim">{race._count?.registrations||0} athletes</span></div>
                </div>
              </button>
            );})}
          </div>
        </div>
        <div>{selected?(
          <div>
            <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
              <h2 className="font-semibold text-lg mb-0.5">{selected.name}</h2>
              <p className="text-sm text-foreground-dim mb-1">{selected.city}, {selected.country} · {distanceLabel(selected.distanceM)}</p>
              <p className="text-sm text-foreground-dim mb-4">{new Date(selected.raceDate).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</p>
              {isReg(selected.id)?<button onClick={()=>handleUnregister(selected.id)} className="text-sm text-red-400 hover:text-red-300">Leave this race</button>:(
                <div className="space-y-3">
                  <p className="text-xs text-foreground-dim uppercase tracking-wide">Join this race</p>
                  <div className="flex gap-2"><div className="flex-1"><label className="text-xs text-foreground-dim mb-1 block">Goal time (optional)</label><div className="flex gap-2"><input type="number" placeholder="h" value={goalH} onChange={e=>setGoalH(e.target.value)} className="w-14 px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" /><input type="number" placeholder="m" value={goalM} onChange={e=>setGoalM(e.target.value)} className="w-14 px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" /></div></div><div><label className="text-xs text-foreground-dim mb-1 block">Visible</label><button onClick={()=>setIsPublic(!isPublic)} className={"px-3 py-1.5 rounded-lg border text-xs transition-colors "+(isPublic?"bg-signal text-background border-signal":"border-border")}>{isPublic?"Public":"Private"}</button></div></div>
                  <button onClick={()=>handleRegister(selected)} disabled={registering} className="w-full py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{registering?"Joining...":"Join race"}</button>
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium text-foreground-dim mb-3">{community.length} athlete{community.length!==1?"s":""} training</h3>
            {loading?<p className="text-sm text-foreground-dim">Loading...</p>:community.length===0?<div className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground-dim">No public athletes yet — be the first!</div>:(
              <div className="space-y-2">{community.map((a,i)=>(
                <div key={a.userId} className={"rounded-xl border p-3 "+(a.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
                  <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="text-xs text-foreground-dim w-5">#{i+1}</span><span className="text-sm font-medium">{a.name}{a.isMe?" (you)":""}</span></div><div className="flex items-center gap-3 text-xs text-foreground-dim">{a.goalTimeSec&&<span>Goal: {formatGoal(a.goalTimeSec)}</span>}{a.weeklyMiles>0&&<span>{a.weeklyMiles}mi/wk</span>}</div></div>
                  {a.totalWorkouts>0&&<div><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{a.doneWorkouts}/{a.totalWorkouts} workouts</span><span>{a.pct}%</span></div><div className="w-full h-1 bg-border rounded-full"><div className={"h-1 rounded-full "+(a.isMe?"bg-signal":"bg-foreground-dim")} style={{width:`${a.pct}%`}} /></div></div>}
                </div>
              ))}</div>
            )}
          </div>
        ):<div className="rounded-2xl border border-border bg-surface p-8 text-center text-foreground-dim text-sm">Select a race to see who is training for it</div>}</div>
      </div>}
      {tab==="myraces"&&<div className="space-y-3">{myRegs.length===0?<p className="text-sm text-foreground-dim">No races joined yet.</p>:myRegs.map(reg=>(
        <div key={reg.id} className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-start justify-between"><div><h3 className="font-medium">{reg.majorRace.name}</h3><p className="text-sm text-foreground-dim">{reg.majorRace.city} · {new Date(reg.majorRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>{reg.goalTimeSec&&<p className="text-xs text-foreground-dim mt-0.5">Goal: {formatGoal(reg.goalTimeSec)}</p>}<p className="text-xs text-foreground-dim mt-0.5">{reg.isPublic?"Visible to community":"Private"}</p></div><div className="flex gap-3"><button onClick={()=>loadCommunity(reg.majorRace)} className="text-xs text-signal hover:underline">View community</button><button onClick={()=>handleUnregister(reg.majorRaceId)} className="text-xs text-red-400 hover:text-red-300">Leave</button></div></div></div>
      ))}</div>}
    </div>
  );
}
