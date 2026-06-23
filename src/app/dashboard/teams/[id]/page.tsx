"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id,setId]=useState("");const [team,setTeam]=useState<any>(null);const [messages,setMessages]=useState<any[]>([]);const [newMessage,setNewMessage]=useState("");const [sending,setSending]=useState(false);const [activeTab,setActiveTab]=useState<"leaderboard"|"chat"|"challenges">("leaderboard");const [copied,setCopied]=useState(false);const [copiedLink,setCopiedLink]=useState(false);const [togglingPrivacy,setTogglingPrivacy]=useState(false);const [promotingId,setPromotingId]=useState<string|null>(null);
  const [challenges,setChallenges]=useState<any[]>([]);const [challengesLoaded,setChallengesLoaded]=useState(false);const [showNewChallenge,setShowNewChallenge]=useState(false);const [challengeForm,setChallengeForm]=useState({title:"",type:"run",metric:"distance",unit:"mi",goal:"",startDate:"",endDate:"",description:""});const [savingChallenge,setSavingChallenge]=useState(false);const [logEntry,setLogEntry]=useState<{challengeId:string;value:string;note:string}|null>(null);const [savingEntry,setSavingEntry]=useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{params.then(p=>{setId(p.id);loadTeam(p.id);loadMessages(p.id);});}, []);
  async function loadTeam(tid:string){const res=await fetch(`/api/teams/${tid}`);if(!res.ok){router.push("/dashboard/teams");return;}const data=await res.json();setTeam(data.team);}
  async function loadMessages(tid:string){const res=await fetch(`/api/teams/${tid}/messages`);const data=await res.json();setMessages(data.messages||[]);}
  async function sendMessage(){if(!newMessage.trim()||!id)return;setSending(true);const res=await fetch(`/api/teams/${id}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:newMessage})});const data=await res.json();if(res.ok){setMessages(prev=>[...prev,data.message]);setNewMessage("");setTimeout(()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"}),100);}setSending(false);}
  async function handleLeave(){if(!confirm("Leave this team?"))return;await fetch(`/api/teams/${id}/leave`,{method:"POST"});router.push("/dashboard/teams");}
  function copyInviteCode(){navigator.clipboard.writeText(team.inviteCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  function copyInviteLink(){navigator.clipboard.writeText(`${window.location.origin}/join/${team.inviteCode}`);setCopiedLink(true);setTimeout(()=>setCopiedLink(false),2000);}
  async function toggleMemberRole(memberId:string, currentRole:string){
    setPromotingId(memberId);
    const newRole = currentRole==="admin"?"member":"admin";
    const res = await fetch(`/api/teams/${id}/members/${memberId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:newRole})});
    if(res.ok){setTeam((t:any)=>({...t,members:t.members.map((m:any)=>m.userId===memberId?{...m,role:newRole}:m)}));}
    setPromotingId(null);
  }
  async function togglePrivacy(){setTogglingPrivacy(true);const res=await fetch(`/api/teams/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isPrivate:!team.isPrivate})});if(res.ok){setTeam((t:any)=>({...t,isPrivate:!t.isPrivate}));}setTogglingPrivacy(false);}
  async function loadChallenges(tid:string){const res=await fetch(`/api/teams/${tid}/challenges`);const d=await res.json();setChallenges(d.challenges||[]);setChallengesLoaded(true);}
  async function createChallenge(){if(!challengeForm.title||!challengeForm.startDate||!challengeForm.endDate)return;setSavingChallenge(true);const res=await fetch(`/api/teams/${id}/challenges`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...challengeForm,goal:challengeForm.goal||null})});if(res.ok){const d=await res.json();setChallenges(p=>[{...d.challenge,entries:[]},...p]);setShowNewChallenge(false);setChallengeForm({title:"",type:"run",metric:"distance",unit:"mi",goal:"",startDate:"",endDate:"",description:""});}setSavingChallenge(false);}
  async function submitEntry(){if(!logEntry||!logEntry.value)return;setSavingEntry(true);const todayStr=new Date().toISOString().split("T")[0];const res=await fetch(`/api/teams/${id}/challenges/${logEntry.challengeId}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:logEntry.value,date:todayStr,note:logEntry.note})});if(res.ok){const d=await res.json();setChallenges(prev=>prev.map(c=>c.id===logEntry.challengeId?{...c,entries:[...c.entries,d.entry]}:c));setLogEntry(null);}setSavingEntry(false);}
  function handleChallengesTab(){if(!challengesLoaded&&id){loadChallenges(id);}setActiveTab("challenges");}
  const METRIC_UNITS:{[k:string]:string[]}={distance:["mi","km"],duration:["min"],count:["sessions","steps"]};
  function onMetricChange(metric:string){const firstUnit=METRIC_UNITS[metric]?.[0]??"mi";setChallengeForm(f=>({...f,metric,unit:firstUnit}));}
  if(!team)return<div className="max-w-3xl px-8 py-10"><p className="text-foreground-dim text-sm">Loading...</p></div>;
  const myUserId = team.members.find((m:any)=>m.isMe)?.userId;
  const isCreator = myUserId && team.createdBy === myUserId;
  return(
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <div className="flex items-start justify-between mb-6">
        <div><button onClick={()=>router.push("/dashboard/teams")} className="text-xs text-foreground-dim hover:text-foreground mb-2 block">Back to Teams</button><h1 className="text-2xl font-semibold">{team.name}</h1>{team.description&&<p className="text-foreground-dim text-sm mt-0.5">{team.description}</p>}{team.majorRace&&<p className="text-xs text-signal mt-1">🏁 {team.majorRace.name} · {new Date(team.majorRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>}</div>
        <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
          <button onClick={copyInviteCode} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-surface-raised transition-colors text-sm"><span className="font-mono font-bold tracking-widest">{team.inviteCode}</span><span className="text-xs text-foreground-dim">{copied?"Copied!":"Copy code"}</span></button>
          <button onClick={copyInviteLink} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-surface-raised transition-colors text-sm"><span className="text-xs">🔗</span><span className="text-xs text-foreground-dim">{copiedLink?"Link copied!":"Copy invite link"}</span></button>
          <p className="text-xs text-foreground-dim">Invite members</p>
          {team.isAdmin&&<button onClick={togglePrivacy} disabled={togglingPrivacy} className="text-xs text-foreground-dim hover:text-foreground transition-colors disabled:opacity-40">{togglingPrivacy?"Saving...":(team.isPrivate?"Private — make public":"Public — make private")}</button>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold">{team.members.length}</p><p className="text-xs text-foreground-dim mt-0.5">Members</p></div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold">{Math.round(team.members.reduce((s:number,m:any)=>s+m.pct,0)/(team.members.length||1))}%</p><p className="text-xs text-foreground-dim mt-0.5">Avg progress</p></div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold text-signal truncate">{team.members[0]?.name?.split(" ")[0]||"—"}</p><p className="text-xs text-foreground-dim mt-0.5">Leading</p></div>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={()=>setActiveTab("leaderboard")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="leaderboard"?"bg-signal text-background":"border border-border hover:bg-surface")}>Leaderboard</button>
        <button onClick={handleChallengesTab} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="challenges"?"bg-signal text-background":"border border-border hover:bg-surface")}>Challenges</button>
        <button onClick={()=>setActiveTab("chat")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="chat"?"bg-signal text-background":"border border-border hover:bg-surface")}>Chat ({messages.length})</button>
      </div>
      {activeTab==="leaderboard"&&<div className="space-y-3">
        {team.members.map((member:any,i:number)=>(
          <div key={member.userId} className={"rounded-2xl border p-4 "+(member.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3"><span className={"text-lg font-bold "+(i===0?"text-yellow-400":i===1?"text-gray-400":i===2?"text-amber-600":"text-foreground-dim")}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span><div><p className="font-medium text-sm">{member.name}{member.isMe?" (you)":""}</p><div className="flex items-center gap-2">{member.role==="admin"&&<span className="text-xs text-foreground-dim">Admin</span>}{isCreator&&!member.isMe&&<button onClick={()=>toggleMemberRole(member.userId,member.role)} disabled={promotingId===member.userId} className="text-xs text-signal hover:underline disabled:opacity-40">{promotingId===member.userId?"...":(member.role==="admin"?"Remove admin":"Make admin")}</button>}</div></div></div>
              <div className="flex gap-4 text-xs text-foreground-dim">{member.weeklyMiles>0&&<span>{member.weeklyMiles}mi/wk</span>}<span className="font-semibold text-sm">{member.pct}%</span></div>
            </div>
            {member.totalWorkouts>0?<div><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{member.doneWorkouts}/{member.totalWorkouts} workouts</span></div><div className="w-full h-2 bg-border rounded-full"><div className={"h-2 rounded-full transition-all "+(member.isMe?"bg-signal":i===0?"bg-yellow-400":"bg-foreground-dim")} style={{width:`${member.pct}%`}}/></div></div>:<p className="text-xs text-foreground-dim">No training plan yet</p>}
          </div>
        ))}
        <div className="pt-4 border-t border-border"><button onClick={handleLeave} className="text-xs text-red-400 hover:text-red-300">{team.isAdmin?"Delete team":"Leave team"}</button></div>
      </div>}
      {activeTab==="challenges"&&<div>
        {/* New challenge form */}
        {team.isAdmin&&<div className="mb-6">{showNewChallenge?(
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h3 className="font-medium text-sm">New challenge</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Title</label><input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="e.g. July Run Challenge" value={challengeForm.title} onChange={e=>setChallengeForm(f=>({...f,title:e.target.value}))}/></div>
              <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.type} onChange={e=>setChallengeForm(f=>({...f,type:e.target.value}))}><option value="run">Run</option><option value="walk">Walk</option><option value="swim">Swim</option><option value="bike">Bike</option><option value="steps">Steps</option><option value="custom">Custom</option></select></div>
              <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Track by</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.metric} onChange={e=>onMetricChange(e.target.value)}><option value="distance">Distance</option><option value="duration">Duration</option><option value="count">Count</option></select></div>
              <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Unit</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.unit} onChange={e=>setChallengeForm(f=>({...f,unit:e.target.value}))}>{(METRIC_UNITS[challengeForm.metric]||["mi"]).map(u=><option key={u} value={u}>{u}</option>)}</select></div>
              <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Goal (optional)</label><input type="number" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="e.g. 100" value={challengeForm.goal} onChange={e=>setChallengeForm(f=>({...f,goal:e.target.value}))}/></div>
              <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Start date</label><input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.startDate} onChange={e=>setChallengeForm(f=>({...f,startDate:e.target.value}))}/></div>
              <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">End date</label><input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.endDate} onChange={e=>setChallengeForm(f=>({...f,endDate:e.target.value}))}/></div>
              <div className="col-span-2"><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Description (optional)</label><textarea className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" rows={2} value={challengeForm.description} onChange={e=>setChallengeForm(f=>({...f,description:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2"><button onClick={createChallenge} disabled={savingChallenge} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{savingChallenge?"Creating...":"Create challenge"}</button><button onClick={()=>setShowNewChallenge(false)} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button></div>
          </div>
        ):(
          <button onClick={()=>setShowNewChallenge(true)} className="w-full rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-sm text-foreground-dim hover:bg-surface transition-colors text-left">+ Create a challenge for your team</button>
        )}</div>}
        {/* Challenge list */}
        {!challengesLoaded?<p className="text-sm text-foreground-dim">Loading...</p>:challenges.length===0?<p className="text-sm text-foreground-dim">{team.isAdmin?"No challenges yet. Create one above.":"No challenges yet. Ask your admin to create one."}</p>:(
          <div className="space-y-4">
            {challenges.map(c=>{
              const totals:{[uid:string]:{name:string;total:number}}={};
              c.entries.forEach((e:any)=>{if(!totals[e.userId])totals[e.userId]={name:e.user.name||"?",total:0};totals[e.userId].total+=e.value;});
              const sorted=Object.entries(totals).sort((a,b)=>b[1].total-a[1].total);
              const myTotal=totals[myUserId??'']?.total??0;
              const pct=c.goal?Math.min(100,Math.round((myTotal/c.goal)*100)):null;
              const active=new Date()<new Date(c.endDate);
              return(
                <div key={c.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div><p className="font-medium text-sm">{c.title}</p><p className="text-xs text-foreground-dim mt-0.5 capitalize">{c.type} · {c.metric} · {c.unit}{c.goal?` · Goal: ${c.goal} ${c.unit}`:""}</p><p className="text-xs text-foreground-dim">{new Date(c.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})} – {new Date(c.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p></div>
                    {active&&<button onClick={()=>setLogEntry({challengeId:c.id,value:"",note:""})} className="text-xs text-signal hover:underline shrink-0 ml-3">+ Log</button>}
                  </div>
                  {pct!==null&&<div className="mb-3"><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>My progress</span><span>{myTotal} / {c.goal} {c.unit} ({pct}%)</span></div><div className="w-full h-2 bg-border rounded-full"><div className="h-2 rounded-full bg-signal transition-all" style={{width:`${pct}%`}}/></div></div>}
                  {logEntry?.challengeId===c.id&&<div className="mb-3 p-3 rounded-xl bg-background border border-border space-y-2"><div className="flex gap-2 items-center"><input type="number" placeholder={`Value in ${c.unit}`} className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.value} onChange={e=>setLogEntry(l=>l?{...l,value:e.target.value}:null)}/><button onClick={submitEntry} disabled={savingEntry||!logEntry.value} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50">{savingEntry?"...":"Save"}</button><button onClick={()=>setLogEntry(null)} className="text-xs text-foreground-dim hover:text-foreground">✕</button></div><input placeholder="Note (optional)" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.note} onChange={e=>setLogEntry(l=>l?{...l,note:e.target.value}:null)}/></div>}
                  {sorted.length>0&&<div className="space-y-1">{sorted.slice(0,5).map(([uid,d],i)=><div key={uid} className="flex items-center justify-between text-xs"><span className="text-foreground-dim">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`} {d.name}{uid===myUserId?" (you)":""}</span><span className="font-medium">{d.total} {c.unit}</span></div>)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>}
      {activeTab==="chat"&&<div className="flex flex-col h-96 md:h-[500px]">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.length===0?<div className="text-center py-8"><p className="text-sm text-foreground-dim">No messages yet. Say hi!</p></div>:messages.map((msg:any)=>(
            <div key={msg.id} className={"flex gap-2 "+(msg.userId===myUserId?"flex-row-reverse":"")}>
              <div className={"max-w-xs rounded-2xl px-4 py-2.5 text-sm "+(msg.userId===myUserId?"bg-signal text-background":"bg-surface border border-border")}>
                {msg.userId!==myUserId&&<p className="text-xs font-medium mb-1 opacity-70">{msg.user.name}</p>}
                <p>{msg.content}</p>
                <p className="text-xs opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef}/>
        </div>
        <div className="flex gap-2"><input value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()} placeholder="Message your team..." className="flex-1 px-4 py-2.5 rounded-full bg-surface border border-border focus:border-signal outline-none text-sm"/><button onClick={sendMessage} disabled={sending||!newMessage.trim()} className="px-4 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">Send</button></div>
      </div>}
    </div>
  );
}
