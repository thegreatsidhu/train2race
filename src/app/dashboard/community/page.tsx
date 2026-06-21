"use client";
import { useState, useEffect, useRef } from "react";

function formatGoal(sec) {
  if (!sec) return null;
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? h + "h " + m + "m" : m + "m";
}
function distLabel(m) {
  if (m >= 200000) return "140.6 Ironman";
  if (m >= 100000) return "70.3";
  if (m >= 40000) return "Marathon";
  if (m >= 20000) return "Half Marathon";
  if (m >= 9000) return "10K";
  if (m >= 4500) return "5K";
  return (m / 1609.34).toFixed(1) + "mi";
}
const DFILTERS = [
  { label: "All", min: 0, max: Infinity },
  { label: "5K/10K", min: 0, max: 15000 },
  { label: "Half", min: 15000, max: 30000 },
  { label: "Marathon", min: 30000, max: 50000 },
  { label: "Ultra", min: 50000, max: 150000 },
  { label: "Triathlon", min: 0, max: Infinity, tri: true },
  { label: "Ironman", min: 100000, max: Infinity, tri: true },
];
const DISTS = { "5K":5000,"10K":10000,"Half Marathon":21097,"Marathon":42195,"Ultra (50K)":50000,"Sprint Triathlon":25750,"Olympic Triathlon":51500,"70.3 Half Ironman":113000,"140.6 Full Ironman":226000 };
const TRIS = ["Sprint Triathlon","Olympic Triathlon","70.3 Half Ironman","140.6 Full Ironman"];

export default function CommunityPage() {
  const [search,setSearch]=useState("");const [df,setDf]=useState(0);const [races,setRaces]=useState([]);const [myRegs,setMyRegs]=useState([]);const [sel,setSel]=useState(null);const [comm,setComm]=useState([]);const [messages,setMessages]=useState([]);const [loading,setLoading]=useState(false);const [reging,setReging]=useState(false);const [goalH,setGoalH]=useState("");const [goalM,setGoalM]=useState("");const [pub,setPub]=useState(true);const [tab,setTab]=useState("find");const [eventTab,setEventTab]=useState("leaderboard");const [newMsg,setNewMsg]=useState("");const [sending,setSending]=useState(false);
  const [rName,setRName]=useState("");const [rDate,setRDate]=useState("");const [rDist,setRDist]=useState("Marathon");const [rCity,setRCity]=useState("");const [rCountry,setRCountry]=useState("USA");const [rWeb,setRWeb]=useState("");const [rTri,setRTri]=useState(false);const [subbing,setSubbing]=useState(false);const [subResult,setSubResult]=useState(null);
  const messagesEndRef = useRef(null);

  useEffect(()=>{fetch("/api/major-races?upcoming=1").then(r=>r.json()).then(d=>setRaces(d.races||[]));fetch("/api/major-races/register").then(r=>r.json()).then(d=>setMyRegs(d.registrations||[]));}, []);
  useEffect(()=>{const t=setTimeout(()=>{fetch("/api/major-races?upcoming=1"+(search?"&search="+encodeURIComponent(search):"")).then(r=>r.json()).then(d=>setRaces(d.races||[]));},300);return()=>clearTimeout(t);},[search]);

  async function loadEvent(race) {
    setSel(race);setLoading(true);setMessages([]);
    const [cr,mr] = await Promise.all([fetch("/api/major-races/community?raceId="+race.id),fetch("/api/major-races/messages?raceId="+race.id)]);
    const cd=await cr.json();const md=await mr.json();
    setComm(cd.community||[]);setMessages(md.messages||[]);setLoading(false);
  }
  async function handleReg(race) {
    setReging(true);
    const sec=(goalH||goalM)?parseInt(goalH||"0")*3600+parseInt(goalM||"0")*60:null;
    await fetch("/api/major-races/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId:race.id,goalTimeSec:sec,isPublic:pub})});
    const d=await fetch("/api/major-races/register").then(r=>r.json());setMyRegs(d.registrations||[]);setReging(false);loadEvent(race);
  }
  async function handleUnreg(majorRaceId) {
    await fetch("/api/major-races/register",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId})});
    const d=await fetch("/api/major-races/register").then(r=>r.json());setMyRegs(d.registrations||[]);
  }
  async function sendMessage() {
    if(!newMsg.trim()||!sel)return;setSending(true);
    const res=await fetch("/api/major-races/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId:sel.id,content:newMsg})});
    const data=await res.json();
    if(res.ok){setMessages(prev=>[...prev,data.message]);setNewMsg("");setTimeout(()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"}),100);}
    setSending(false);
  }
  async function deleteMessage(messageId) {
    await fetch("/api/major-races/messages",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({messageId})});
    setMessages(prev=>prev.filter(m=>m.id!==messageId));
  }
  async function handleSub() {
    setSubbing(true);setSubResult(null);
    const res=await fetch("/api/major-races/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:rName,raceDate:rDate,distanceM:DISTS[rDist],city:rCity,country:rCountry,website:rWeb||null,isTriathlon:rTri})});
    const data=await res.json();setSubResult(data);setSubbing(false);
    if(data.duplicate){setTab("find");setSearch(data.race.name);}
  }

  const isReg=(id)=>myRegs.some(r=>r.majorRaceId===id);
  const f=DFILTERS[df];
  const filtered=races.filter(r=>{const ms=!search||r.name.toLowerCase().includes(search.toLowerCase());const md=f.tri?r.isTriathlon:(r.distanceM>=f.min&&r.distanceM<=f.max);return ms&&md;});
  const myUserId=comm.find(a=>a.isMe)?.userId;

  return (
    <div className="max-w-4xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6"><h1 className="text-3xl font-semibold tracking-tight mb-1">Community</h1><p className="text-foreground-dim text-sm">Find your race, join the group, chat and compete together.</p></header>
      <div className="flex gap-2 mb-6 flex-wrap">
        {[{id:"find",label:"Find a race"},{id:"myraces",label:"My races ("+myRegs.length+")"},{id:"request",label:"Request a race"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(tab===t.id?"bg-signal text-background":"border border-border hover:bg-surface")}>{t.label}</button>
        ))}
      </div>

      {tab==="find"&&<div className="grid md:grid-cols-2 gap-6">
        <div>
          <input placeholder="Search races..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm mb-3"/>
          <div className="flex gap-1.5 flex-wrap mb-3">{DFILTERS.map((fi,i)=><button key={fi.label} onClick={()=>setDf(i)} className={"text-xs px-3 py-1 rounded-full border transition-colors "+(df===i?"bg-signal text-background border-signal":"border-border hover:bg-surface")}>{fi.label}</button>)}</div>
          <p className="text-xs text-foreground-dim mb-2">{filtered.length} races</p>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filtered.map(race=>{const d=Math.ceil((new Date(race.raceDate).getTime()-Date.now())/(1000*60*60*24));const count=race._count?.registrations||0;return(
              <button key={race.id} onClick={()=>{loadEvent(race);setEventTab("leaderboard");}} className={"w-full text-left rounded-xl border p-3 transition-colors "+(sel?.id===race.id?"border-signal bg-signal/5":"border-border bg-surface hover:bg-surface-raised")}>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium text-sm truncate">{race.name}</p><p className="text-xs text-foreground-dim">{race.city}, {race.country} - {distLabel(race.distanceM)}</p><p className="text-xs text-foreground-dim">{new Date(race.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} - {d}d away</p></div>
                <div className="flex flex-col items-end gap-1 shrink-0">{isReg(race.id)&&<span className="text-xs bg-signal/20 text-signal px-2 py-0.5 rounded-full">Joined</span>}{count>0&&<span className="text-xs text-foreground-dim">{count} athletes</span>}</div></div>
              </button>);
            })}
            {filtered.length===0&&<div className="text-center py-6"><p className="text-sm text-foreground-dim mb-2">No races found.</p><button onClick={()=>setTab("request")} className="text-sm text-signal hover:underline">Request this race</button></div>}
          </div>
        </div>
        <div>{sel?(
          <div>
            <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
              <div className="flex items-start justify-between mb-1"><h2 className="font-semibold text-lg">{sel.name}</h2>{sel.website&&<a href={sel.website} target="_blank" rel="noopener noreferrer" className="text-xs text-signal hover:underline ml-2">Website</a>}</div>
              <p className="text-sm text-foreground-dim mb-0.5">{sel.city}, {sel.country} - {distLabel(sel.distanceM)}</p>
              <p className="text-sm text-foreground-dim mb-4">{new Date(sel.raceDate).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</p>
              {isReg(sel.id)?<button onClick={()=>handleUnreg(sel.id)} className="text-sm text-red-400 hover:text-red-300">Leave this race</button>:(
                <div className="space-y-3"><p className="text-xs text-foreground-dim uppercase tracking-wide">Join to see leaderboard and chat</p>
                  <div className="flex gap-2"><div className="flex-1"><label className="text-xs text-foreground-dim mb-1 block">Goal time (optional)</label><div className="flex gap-2"><input type="number" placeholder="h" value={goalH} onChange={e=>setGoalH(e.target.value)} className="w-14 px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none"/><input type="number" placeholder="m" value={goalM} onChange={e=>setGoalM(e.target.value)} className="w-14 px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none"/></div></div>
                  <div><label className="text-xs text-foreground-dim mb-1 block">Visible</label><button onClick={()=>setPub(!pub)} className={"px-3 py-1.5 rounded-lg border text-xs "+(pub?"bg-signal text-background border-signal":"border-border")}>{pub?"Public":"Private"}</button></div></div>
                  <button onClick={()=>handleReg(sel)} disabled={reging} className="w-full py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{reging?"Joining...":"Join race"}</button>
                </div>
              )}
            </div>
            {isReg(sel.id)&&(
              <div>
                <div className="flex gap-2 mb-4">
                  <button onClick={()=>setEventTab("leaderboard")} className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors "+(eventTab==="leaderboard"?"bg-signal text-background":"border border-border hover:bg-surface")}>Leaderboard ({comm.length})</button>
                  <button onClick={()=>setEventTab("chat")} className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors "+(eventTab==="chat"?"bg-signal text-background":"border border-border hover:bg-surface")}>Chat ({messages.length})</button>
                </div>
                {eventTab==="leaderboard"&&(loading?<p className="text-sm text-foreground-dim">Loading...</p>:comm.length===0?<div className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground-dim">No public athletes yet - be the first!</div>:(
                  <div className="space-y-2">{comm.map((a,i)=>(
                    <div key={a.userId} className={"rounded-xl border p-3 "+(a.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
                      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="text-lg">{i===0?"first":i===1?"second":i===2?"third":"#"+(i+1)}</span><span className={"text-sm font-medium "+(a.isMe?"text-signal":"")}>{a.name}{a.isMe?" (you)":""}</span></div>
                      <div className="flex gap-3 text-xs text-foreground-dim">{a.goalTimeSec&&<span>Goal: {formatGoal(a.goalTimeSec)}</span>}{a.weeklyMiles>0&&<span>{a.weeklyMiles}mi/wk</span>}<span className="font-semibold">{a.pct}%</span></div></div>
                      {a.totalWorkouts>0&&<div><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{a.doneWorkouts}/{a.totalWorkouts} workouts</span></div><div className="w-full h-1 bg-border rounded-full"><div className={"h-1 rounded-full "+(a.isMe?"bg-signal":"bg-foreground-dim")} style={{width:a.pct+"%"}}/></div></div>}
                    </div>
                  ))}</div>
                ))}
                {eventTab==="chat"&&(
                  <div className="flex flex-col h-80">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
                      {messages.length===0?<div className="text-center py-6"><p className="text-sm text-foreground-dim">No messages yet. Start the conversation!</p></div>:messages.map(msg=>(
                        <div key={msg.id} className={"flex gap-2 "+(msg.user.id===myUserId?"flex-row-reverse":"")}>
                          <div className={"max-w-xs rounded-2xl px-3 py-2 text-sm "+(msg.user.id===myUserId?"bg-signal text-background":"bg-surface border border-border")}>
                            {msg.user.id!==myUserId&&<p className="text-xs font-medium mb-0.5 opacity-70">{msg.user.name}</p>}
                            <p>{msg.content}</p>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <p className="text-xs opacity-50">{new Date(msg.createdAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</p>
                              {msg.user.id===myUserId&&<button onClick={()=>deleteMessage(msg.id)} className="text-xs opacity-50 hover:opacity-100">Delete</button>}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef}/>
                    </div>
                    <div className="flex gap-2"><input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()} placeholder="Message the group..." className="flex-1 px-3 py-2 rounded-full bg-surface border border-border focus:border-signal outline-none text-sm"/><button onClick={sendMessage} disabled={sending||!newMsg.trim()} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">Send</button></div>
                  </div>
                )}
              </div>
            )}
            {!isReg(sel.id)&&comm.length>0&&<div className="rounded-xl border border-border bg-surface p-4 text-center"><p className="text-sm font-medium mb-1">{comm.length} athlete{comm.length!==1?"s":""} training</p><p className="text-xs text-foreground-dim">Join to see the leaderboard and chat</p></div>}
          </div>
        ):<div className="rounded-2xl border border-border bg-surface p-8 text-center text-foreground-dim text-sm">Select a race to see the leaderboard and community chat</div>}</div>
      </div>}

      {tab==="myraces"&&<div className="space-y-3">{myRegs.length===0?<div className="text-center py-8"><p className="text-sm text-foreground-dim mb-3">No races joined yet.</p><button onClick={()=>setTab("find")} className="text-sm text-signal hover:underline">Find a race</button></div>:myRegs.map(reg=>(
        <div key={reg.id} className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-start justify-between"><div><h3 className="font-medium">{reg.majorRace.name}</h3><p className="text-sm text-foreground-dim">{reg.majorRace.city}, {reg.majorRace.country}</p><p className="text-sm text-foreground-dim">{new Date(reg.majorRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>{reg.goalTimeSec&&<p className="text-xs text-foreground-dim mt-0.5">Goal: {formatGoal(reg.goalTimeSec)}</p>}<p className="text-xs text-foreground-dim mt-0.5">{reg.isPublic?"Visible":"Private"}</p></div>
        <div className="flex gap-3 flex-col items-end"><button onClick={()=>{loadEvent(reg.majorRace);setTab("find");}} className="text-xs text-signal hover:underline">View</button><button onClick={()=>handleUnreg(reg.majorRaceId)} className="text-xs text-red-400 hover:text-red-300">Leave</button></div></div></div>
      ))}</div>}

      {tab==="request"&&<div className="max-w-lg"><div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold mb-1">Request a race</h2><p className="text-sm text-foreground-dim mb-5">Submit a race and we will review and add it within 24 hours.</p>
        {subResult?(subResult.duplicate?<div className="rounded-xl border border-signal/30 bg-signal/5 p-4"><p className="text-sm font-medium text-signal mb-1">This race already exists!</p><p className="text-sm text-foreground-dim">Found {subResult.race.name}</p></div>:<div className="rounded-xl border border-signal/30 bg-signal/5 p-4"><p className="text-sm font-medium text-signal mb-1">Race submitted!</p><p className="text-sm text-foreground-dim">We will review {subResult.race.name} and add it within 24 hours.</p><button onClick={()=>{setSubResult(null);setRName("");setRDate("");setRCity("");setRWeb("");}} className="text-xs text-signal hover:underline mt-2">Submit another</button></div>):(
          <div className="space-y-4">
            <div><label className="block text-xs text-foreground-dim mb-1">Race name *</label><input value={rName} onChange={e=>setRName(e.target.value)} placeholder="e.g. Austin Marathon" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"/></div>
            <div><label className="block text-xs text-foreground-dim mb-1">Race date *</label><input type="date" value={rDate} onChange={e=>setRDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"/></div>
            <div><label className="block text-xs text-foreground-dim mb-1">Distance *</label><select value={rDist} onChange={e=>{setRDist(e.target.value);setRTri(TRIS.includes(e.target.value));}} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm">{Object.keys(DISTS).map(d=><option key={d}>{d}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs text-foreground-dim mb-1">City *</label><input value={rCity} onChange={e=>setRCity(e.target.value)} placeholder="Austin" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"/></div><div><label className="block text-xs text-foreground-dim mb-1">Country *</label><input value={rCountry} onChange={e=>setRCountry(e.target.value)} placeholder="USA" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"/></div></div>
            <div><label className="block text-xs text-foreground-dim mb-1">Website (optional)</label><input value={rWeb} onChange={e=>setRWeb(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"/></div>
            <button onClick={handleSub} disabled={subbing||!rName||!rDate||!rCity||!rCountry} className="w-full py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{subbing?"Checking...":"Submit race request"}</button>
          </div>
        )}
      </div></div>}
    </div>
  );
}