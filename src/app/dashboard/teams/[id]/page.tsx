"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const LB_TYPES   = [{ v: "all", l: "All" }, { v: "run", l: "Run" }, { v: "bike", l: "Bike" }, { v: "swim", l: "Swim" }, { v: "walk", l: "Walk" }, { v: "strength", l: "Strength" }];
const LB_PERIODS = [{ v: "week", l: "Week" }, { v: "month", l: "Month" }, { v: "year", l: "Year" }, { v: "all", l: "All time" }];
const LB_METRICS = [{ v: "distance", l: "Distance" }, { v: "duration", l: "Duration" }, { v: "count", l: "Count" }];

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id,setId]=useState("");const [team,setTeam]=useState<any>(null);const [messages,setMessages]=useState<any[]>([]);const [newMessage,setNewMessage]=useState("");const [sending,setSending]=useState(false);const [activeTab,setActiveTab]=useState<"leaderboard"|"chat"|"challenges"|"members">("leaderboard");const [copied,setCopied]=useState(false);const [copiedLink,setCopiedLink]=useState(false);const [togglingPrivacy,setTogglingPrivacy]=useState(false);const [promotingId,setPromotingId]=useState<string|null>(null);
  const [challenges,setChallenges]=useState<any[]>([]);const [challengesLoaded,setChallengesLoaded]=useState(false);const [showNewChallenge,setShowNewChallenge]=useState(false);const [challengeForm,setChallengeForm]=useState({title:"",type:"run",metric:"distance",unit:"mi",goal:"",startDate:"",endDate:"",description:""});const [savingChallenge,setSavingChallenge]=useState(false);const [createMsg,setCreateMsg]=useState("");const [logEntry,setLogEntry]=useState<{challengeId:string;value:string;note:string}|null>(null);const [savingEntry,setSavingEntry]=useState(false);const [deletingChallenge,setDeletingChallenge]=useState<string|null>(null);const [approvingChallenge,setApprovingChallenge]=useState<string|null>(null);const [leavingChallenge,setLeavingChallenge]=useState<string|null>(null);const [confirmLeaveChallenge,setConfirmLeaveChallenge]=useState<string|null>(null);const [confirmDeleteChId,setConfirmDeleteChId]=useState<string|null>(null);
  const [lbView,setLbView]=useState<"plan"|"activity"|"challenge">("plan");
  const [lbType,setLbType]=useState("all");const [lbPeriod,setLbPeriod]=useState("month");const [lbMetric,setLbMetric]=useState("distance");
  const [lbData,setLbData]=useState<any[]>([]);const [lbLoading,setLbLoading]=useState(false);const [lbChallengeId,setLbChallengeId]=useState<string|null>(null);
  const [showInvitePanel,setShowInvitePanel]=useState(false);const [inviteQuery,setInviteQuery]=useState("");const [inviteResults,setInviteResults]=useState<any[]>([]);const [inviteSearching,setInviteSearching]=useState(false);const [addingMember,setAddingMember]=useState<string|null>(null);const [inviteMsg,setInviteMsg]=useState("");
  const [removingId,setRemovingId]=useState<string|null>(null);const [confirmRemoveId,setConfirmRemoveId]=useState<string|null>(null);const [confirmLeave,setConfirmLeave]=useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{params.then(p=>{setId(p.id);loadTeam(p.id);loadMessages(p.id);});}, []);
  async function loadTeam(tid:string){const res=await fetch(`/api/teams/${tid}`);if(!res.ok){router.push("/dashboard/teams");return;}const data=await res.json();setTeam(data.team);}
  async function loadMessages(tid:string){const res=await fetch(`/api/teams/${tid}/messages`);const data=await res.json();setMessages(data.messages||[]);}
  async function sendMessage(){if(!newMessage.trim()||!id)return;setSending(true);const res=await fetch(`/api/teams/${id}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:newMessage})});const data=await res.json();if(res.ok){setMessages(prev=>[...prev,data.message]);setNewMessage("");setTimeout(()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"}),100);}setSending(false);}
  async function handleLeave(){setConfirmLeave(false);if(team?.isAdmin){await fetch(`/api/teams/${id}`,{method:"DELETE"});}else{await fetch(`/api/teams/${id}/leave`,{method:"POST"});}router.push("/dashboard/teams");}
  function copyInviteCode(){navigator.clipboard.writeText(team.inviteCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  function copyInviteLink(){navigator.clipboard.writeText(`${window.location.origin}/join/${team.inviteCode}`);setCopiedLink(true);setTimeout(()=>setCopiedLink(false),2000);}
  async function removeMember(memberId:string, name:string){
    setRemovingId(memberId);
    const res=await fetch(`/api/teams/${id}/members/${memberId}`,{method:"DELETE"});
    setRemovingId(null);
    if(res.ok){setTeam((t:any)=>({...t,members:t.members.filter((m:any)=>m.userId!==memberId)}));}
  }
  async function toggleMemberRole(memberId:string, currentRole:string){
    setPromotingId(memberId);
    const newRole = currentRole==="admin"?"member":"admin";
    const res = await fetch(`/api/teams/${id}/members/${memberId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:newRole})});
    if(res.ok){setTeam((t:any)=>({...t,members:t.members.map((m:any)=>m.userId===memberId?{...m,role:newRole}:m)}));}
    setPromotingId(null);
  }
  async function togglePrivacy(){setTogglingPrivacy(true);const res=await fetch(`/api/teams/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isPrivate:!team.isPrivate})});if(res.ok){setTeam((t:any)=>({...t,isPrivate:!t.isPrivate}));}setTogglingPrivacy(false);}
  async function loadChallenges(tid:string){const res=await fetch(`/api/teams/${tid}/challenges`);const d=await res.json();setChallenges(d.challenges||[]);setChallengesLoaded(true);}
  async function createChallenge(){if(!challengeForm.title||!challengeForm.startDate||!challengeForm.endDate)return;setSavingChallenge(true);setCreateMsg("");const res=await fetch(`/api/teams/${id}/challenges`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...challengeForm,goal:challengeForm.goal||null})});const d=await res.json().catch(()=>({}));if(res.ok){setChallenges(p=>[{...d.challenge,entries:[]},...p]);setShowNewChallenge(false);setChallengeForm({title:"",type:"run",metric:"distance",unit:"mi",goal:"",startDate:"",endDate:"",description:""});setCreateMsg(d.challenge?.status==="pending"?"Your challenge was submitted and is awaiting admin approval (up to 5 days).":"");}setSavingChallenge(false);}
  async function approveChallenge(cId:string,status:string){setApprovingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});if(res.ok){setChallenges(prev=>prev.map(c=>c.id===cId?{...c,status}:c));}setApprovingChallenge(null);}
  async function deleteChallenge(cId:string){setConfirmDeleteChId(null);setDeletingChallenge(cId);await fetch(`/api/teams/${id}/challenges/${cId}`,{method:"DELETE"});setChallenges(prev=>prev.filter(c=>c.id!==cId));setDeletingChallenge(null);}
  async function leaveChallenge(cId:string){setConfirmLeaveChallenge(null);setLeavingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}/entries`,{method:"DELETE"});if(res.ok){setChallenges(prev=>prev.map(c=>c.id===cId?{...c,entries:c.entries.filter((e:any)=>e.userId!==myUserId)}:c));}setLeavingChallenge(null);}
  async function submitEntry(){if(!logEntry||!logEntry.value)return;setSavingEntry(true);const todayStr=new Date().toISOString().split("T")[0];const res=await fetch(`/api/teams/${id}/challenges/${logEntry.challengeId}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:logEntry.value,date:todayStr,note:logEntry.note})});if(res.ok){const d=await res.json();setChallenges(prev=>prev.map(c=>c.id===logEntry.challengeId?{...c,entries:[...c.entries,d.entry]}:c));setLogEntry(null);}setSavingEntry(false);}
  function handleChallengesTab(){if(!challengesLoaded&&id){loadChallenges(id);}setActiveTab("challenges");}
  const METRIC_UNITS:{[k:string]:string[]}={distance:["mi","km"],duration:["min"],count:["sessions","steps"]};

  const loadLbData = useCallback(async()=>{
    if(!id)return;
    setLbLoading(true);
    const p=new URLSearchParams({period:lbPeriod,metric:lbMetric,type:lbType});
    const res=await fetch(`/api/teams/${id}/leaderboard?${p}`);
    const d=await res.json().catch(()=>({}));
    setLbData(d.entries||[]);
    setLbLoading(false);
  },[id,lbPeriod,lbMetric,lbType]);

  useEffect(()=>{if(lbView==="activity"&&id)loadLbData();},[lbView,loadLbData,id]);

  function formatLbValue(e:any){
    if(lbMetric==="distance")return`${e.distanceMi} mi`;
    if(lbMetric==="duration"){const h=Math.floor(e.durationMin/60);const m=e.durationMin%60;return h>0?`${h}h ${m}m`:`${m}m`;}
    return`${e.activityCount} activities`;
  }

  useEffect(()=>{
    if(!showInvitePanel||inviteQuery.length<2){setInviteResults([]);return;}
    const t=setTimeout(async()=>{
      setInviteSearching(true);
      const res=await fetch(`/api/users/search?q=${encodeURIComponent(inviteQuery)}`);
      const d=await res.json().catch(()=>({}));
      // Filter out existing members
      const existingIds=new Set(team?.members?.map((m:any)=>m.userId)||[]);
      setInviteResults((d.users||[]).filter((u:any)=>!existingIds.has(u.id)));
      setInviteSearching(false);
    },300);
    return()=>clearTimeout(t);
  },[inviteQuery,showInvitePanel,team]);

  async function addMember(userId:string,name:string){
    setAddingMember(userId);
    const res=await fetch(`/api/teams/${id}/members`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    const d=await res.json().catch(()=>({}));
    setAddingMember(null);
    if(res.ok){
      setInviteResults(r=>r.filter(u=>u.id!==userId));
      setInviteMsg(`Invitation sent to ${name}!`);
      setTimeout(()=>setInviteMsg(""),3000);
    } else if(d.alreadyInvited){
      setInviteMsg(`${name} already has a pending invitation.`);
      setTimeout(()=>setInviteMsg(""),3000);
    } else {
      setInviteMsg(d.error||"Failed to invite member.");
      setTimeout(()=>setInviteMsg(""),3000);
    }
  }
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
          {team.isAdmin&&<button onClick={()=>{setShowInvitePanel(p=>!p);setInviteQuery("");setInviteResults([]);}} className={"text-xs transition-colors "+(showInvitePanel?"text-signal hover:text-foreground":"text-foreground-dim hover:text-foreground")}>+ Find &amp; add members</button>}
        </div>
      </div>

      {/* Member invite panel */}
      {showInvitePanel&&team.isAdmin&&(
        <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
          <h3 className="font-medium text-sm mb-3">Invite members by name</h3>
          <input
            value={inviteQuery} onChange={e=>setInviteQuery(e.target.value)}
            placeholder="Search athletes by name..."
            className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm mb-3"
            autoFocus
          />
          {inviteMsg&&<p className="text-xs text-signal mb-2">{inviteMsg}</p>}
          {inviteSearching&&<p className="text-xs text-foreground-dim">Searching...</p>}
          {!inviteSearching&&inviteQuery.length>=2&&inviteResults.length===0&&<p className="text-xs text-foreground-dim">No athletes found (they may have a private account).</p>}
          {inviteResults.length>0&&(
            <div className="space-y-2">
              {inviteResults.map((u:any)=>(
                <div key={u.id} className="flex items-center justify-between rounded-xl bg-background border border-border px-3 py-2">
                  <div><p className="text-sm font-medium">{u.name}</p>{u.city&&<p className="text-xs text-foreground-dim">{u.city}</p>}</div>
                  <button onClick={()=>addMember(u.id,u.name)} disabled={addingMember===u.id}
                    className="px-3 py-1 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-50">
                    {addingMember===u.id?"Inviting...":"Invite"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {inviteQuery.length<2&&<p className="text-xs text-foreground-dim">Type at least 2 characters to search.</p>}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold">{team.members.length}</p><p className="text-xs text-foreground-dim mt-0.5">Members</p></div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold">{Math.round(team.members.reduce((s:number,m:any)=>s+m.pct,0)/(team.members.length||1))}%</p><p className="text-xs text-foreground-dim mt-0.5">Avg progress</p></div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold text-signal truncate">{team.members[0]?.name?.split(" ")[0]||"—"}</p><p className="text-xs text-foreground-dim mt-0.5">Leading</p></div>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={()=>setActiveTab("leaderboard")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="leaderboard"?"bg-signal text-background":"border border-border hover:bg-surface")}>Leaderboard</button>
        <button onClick={handleChallengesTab} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="challenges"?"bg-signal text-background":"border border-border hover:bg-surface")}>Challenges</button>
        <button onClick={()=>setActiveTab("chat")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="chat"?"bg-signal text-background":"border border-border hover:bg-surface")}>Chat ({messages.length})</button>
        <button onClick={()=>setActiveTab("members")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="members"?"bg-signal text-background":"border border-border hover:bg-surface")}>Members ({team.members.length})</button>
      </div>
      {activeTab==="leaderboard"&&<div>
        {/* Sub-view toggle */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {([["plan","Training plan"],["activity","Activity"],["challenge","Challenges"]] as const).map(([v,l])=>(
            <button key={v} onClick={()=>{setLbView(v);if(v==="activity"&&id)loadLbData();if(v==="challenge"&&!challengesLoaded&&id){loadChallenges(id);setChallengesLoaded(true);}}}
              className={"px-3 py-1.5 rounded-full text-sm font-medium transition-colors "+(lbView===v?"bg-signal text-background":"border border-border hover:bg-surface text-foreground-dim")}>{l}</button>
          ))}
        </div>

        {/* Plan progress view */}
        {lbView==="plan"&&<div className="space-y-3">
          {team.members.map((member:any,i:number)=>(
            <div key={member.userId} className={"rounded-2xl border p-4 "+(member.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={"text-lg font-bold "+(i===0?"text-yellow-400":i===1?"text-gray-400":i===2?"text-amber-600":"text-foreground-dim text-sm")}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                  <div><p className="font-medium text-sm">{member.name}{member.isMe?" (you)":""}</p><div className="flex items-center gap-2">{member.role==="admin"&&<span className="text-xs text-foreground-dim">Admin</span>}{isCreator&&!member.isMe&&<button onClick={()=>toggleMemberRole(member.userId,member.role)} disabled={promotingId===member.userId} className="text-xs text-signal hover:underline disabled:opacity-40">{promotingId===member.userId?"...":(member.role==="admin"?"Remove admin":"Make admin")}</button>}{team.isAdmin&&!member.isMe&&member.userId!==team.createdBy&&(confirmRemoveId===member.userId?<><button onClick={()=>{setConfirmRemoveId(null);removeMember(member.userId,member.name);}} disabled={removingId===member.userId} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{removingId===member.userId?"...":"OK"}</button><button onClick={()=>setConfirmRemoveId(null)} className="text-xs text-foreground-dim hover:underline">✕</button></>:<button onClick={()=>setConfirmRemoveId(member.userId)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Remove</button>)}</div></div>
                </div>
                <div className="flex gap-4 text-xs text-foreground-dim">{member.weeklyMiles>0&&<span>{member.weeklyMiles}mi/wk</span>}<span className="font-semibold text-sm">{member.pct}%</span></div>
              </div>
              {member.totalWorkouts>0?<div><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{member.doneWorkouts}/{member.totalWorkouts} workouts</span></div><div className="w-full h-2 bg-border rounded-full"><div className={"h-2 rounded-full transition-all "+(member.isMe?"bg-signal":i===0?"bg-yellow-400":"bg-foreground-dim")} style={{width:`${member.pct}%`}}/></div></div>:<p className="text-xs text-foreground-dim">No training plan yet</p>}
            </div>
          ))}
        </div>}

        {/* Activity leaderboard view */}
        {lbView==="activity"&&<div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {LB_PERIODS.map(p=><button key={p.v} onClick={()=>setLbPeriod(p.v)} className={"px-3 py-1 rounded-full text-xs font-medium transition-colors "+(lbPeriod===p.v?"bg-signal text-background":"border border-border hover:bg-surface text-foreground-dim")}>{p.l}</button>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LB_METRICS.map(m=><button key={m.v} onClick={()=>setLbMetric(m.v)} className={"px-3 py-1 rounded-full text-xs font-medium transition-colors "+(lbMetric===m.v?"bg-signal text-background":"border border-border hover:bg-surface text-foreground-dim")}>{m.l}</button>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LB_TYPES.map(t=><button key={t.v} onClick={()=>setLbType(t.v)} className={"px-3 py-1 rounded-full text-xs font-medium transition-colors "+(lbType===t.v?"bg-signal text-background":"border border-border hover:bg-surface text-foreground-dim")}>{t.l}</button>)}
            </div>
          </div>
          {lbLoading?<div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 rounded-2xl bg-surface animate-pulse"/>)}</div>:lbData.length===0?<p className="text-sm text-foreground-dim py-6 text-center">No activity logged for this period yet.</p>:(
            <div className="space-y-2">
              {lbData.map((e:any)=>(
                <div key={e.userId} className={"flex items-center gap-3 rounded-2xl border px-4 py-3 "+(e.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
                  <span className={"w-7 text-center font-bold shrink-0 "+(e.rank===1?"text-yellow-400 text-base":e.rank===2?"text-gray-400 text-base":e.rank===3?"text-amber-600 text-base":"text-foreground-dim text-xs")}>{e.rank<=3?["🥇","🥈","🥉"][e.rank-1]:`#${e.rank}`}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{e.name}{e.isMe?" (you)":""}</p><p className="text-xs text-foreground-dim">{e.activityCount} {e.activityCount===1?"activity":"activities"}</p></div>
                  <p className="font-semibold text-sm shrink-0">{formatLbValue(e)}</p>
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* Challenge leaderboard view */}
        {lbView==="challenge"&&<div>
          {!challengesLoaded?<p className="text-sm text-foreground-dim">Loading...</p>:challenges.length===0?<p className="text-sm text-foreground-dim py-6 text-center">No challenges yet.</p>:(
            <div className="space-y-2 mb-4">
              {challenges.map((c:any)=><button key={c.id} onClick={()=>setLbChallengeId(c.id===lbChallengeId?null:c.id)} className={"w-full text-left rounded-xl border px-4 py-3 transition-colors "+(lbChallengeId===c.id?"border-signal bg-signal/5":"border-border bg-surface hover:bg-surface-raised")}>
                <p className="font-medium text-sm">{c.title}</p>
                <p className="text-xs text-foreground-dim capitalize mt-0.5">{c.type} · {c.metric} · {c.unit}{c.goal?` · Goal: ${c.goal}`:""}</p>
              </button>)}
            </div>
          )}
          {lbChallengeId&&(()=>{
            const c=challenges.find((x:any)=>x.id===lbChallengeId);
            if(!c)return null;
            const totals:{[uid:string]:{name:string;total:number}}={};
            c.entries.forEach((e:any)=>{if(!totals[e.userId])totals[e.userId]={name:e.user?.name||"?",total:0};totals[e.userId].total+=e.value;});
            const sorted=Object.entries(totals).sort((a:any,b:any)=>b[1].total-a[1].total);
            return sorted.length===0?<p className="text-sm text-foreground-dim text-center py-4">No entries yet.</p>:(
              <div className="space-y-2">
                {sorted.map(([uid,d]:any,i)=>(
                  <div key={uid} className={"flex items-center gap-3 rounded-2xl border px-4 py-3 "+(uid===myUserId?"border-signal bg-signal/5":"border-border bg-surface")}>
                    <span className={"w-7 text-center font-bold shrink-0 "+(i===0?"text-yellow-400 text-base":i===1?"text-gray-400 text-base":i===2?"text-amber-600 text-base":"text-foreground-dim text-xs")}>{i<=2?["🥇","🥈","🥉"][i]:`#${i+1}`}</span>
                    <p className="flex-1 font-medium text-sm">{d.name}{uid===myUserId?" (you)":""}</p>
                    <p className="font-semibold text-sm">{d.total} {c.unit}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>}

        <div className="pt-6 border-t border-border mt-6">
          {confirmLeave?(
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground-dim">{team.isAdmin?"Delete this team permanently?":"Leave this team?"}</span>
              <button onClick={handleLeave} className="text-xs text-red-400 font-medium hover:underline">Confirm</button>
              <button onClick={()=>setConfirmLeave(false)} className="text-xs text-foreground-dim hover:underline">Cancel</button>
            </div>
          ):(
            <button onClick={()=>setConfirmLeave(true)} className="text-xs text-red-400 hover:text-red-300">{team.isAdmin?"Delete team":"Leave team"}</button>
          )}
        </div>
      </div>}
      {activeTab==="challenges"&&<div>
        {/* New challenge form — open to all members */}
        <div className="mb-6">
          {showNewChallenge?(
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <div>
                <h3 className="font-medium text-sm">Suggest a challenge</h3>
                {!team.isAdmin&&<p className="text-xs text-foreground-dim mt-0.5">Challenges require admin approval and can take up to 5 days to go live.</p>}
              </div>
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
              <div className="flex gap-2"><button onClick={createChallenge} disabled={savingChallenge} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{savingChallenge?"Submitting...":"Submit challenge"}</button><button onClick={()=>{setShowNewChallenge(false);setCreateMsg("");}} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button></div>
            </div>
          ):(
            <div>
              <button onClick={()=>setShowNewChallenge(true)} className="w-full rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-sm text-foreground-dim hover:bg-surface transition-colors text-left">+ Suggest a challenge for your team</button>
              {createMsg&&<p className="text-xs text-signal mt-2 px-1">{createMsg}</p>}
            </div>
          )}
        </div>
        {/* Challenge list */}
        {!challengesLoaded?<p className="text-sm text-foreground-dim">Loading...</p>:challenges.length===0?<p className="text-sm text-foreground-dim">No challenges yet.</p>:(
          <div className="space-y-4">
            {challenges.map(c=>{
              const isPending=c.status==="pending";const isRejected=c.status==="rejected";
              const totals:{[uid:string]:{name:string;total:number}}={};
              c.entries.forEach((e:any)=>{if(!totals[e.userId])totals[e.userId]={name:e.user.name||"?",total:0};totals[e.userId].total+=e.value;});
              const sorted=Object.entries(totals).sort((a,b)=>b[1].total-a[1].total);
              const myTotal=totals[myUserId??'']?.total??0;
              const pct=c.goal?Math.min(100,Math.round((myTotal/c.goal)*100)):null;
              const active=new Date()<new Date(c.endDate)&&!isPending&&!isRejected;
              return(
                <div key={c.id} className={"rounded-2xl border bg-surface p-5 "+(isPending?"border-yellow-700/40 opacity-80":isRejected?"border-red-700/30 opacity-60":"border-border")}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-medium text-sm">{c.title}</p>
                        {isPending&&<span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-700/40">Pending approval</span>}
                        {isRejected&&<span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-700/30">Rejected</span>}
                      </div>
                      <p className="text-xs text-foreground-dim mt-0.5 capitalize">{c.type} · {c.metric} · {c.unit}{c.goal?` · Goal: ${c.goal} ${c.unit}`:""}</p>
                      <p className="text-xs text-foreground-dim">{new Date(c.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})} – {new Date(c.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {team.isAdmin&&isPending&&<><button onClick={()=>approveChallenge(c.id,"approved")} disabled={approvingChallenge===c.id} className="text-xs text-signal hover:underline disabled:opacity-40">{approvingChallenge===c.id?"...":"Approve"}</button><button onClick={()=>approveChallenge(c.id,"rejected")} disabled={approvingChallenge===c.id} className="text-xs text-red-400 hover:underline disabled:opacity-40">Reject</button></>}
                      {active&&<button onClick={()=>setLogEntry({challengeId:c.id,value:"",note:""})} className="text-xs text-signal hover:underline">+ Log</button>}
                      {!isPending&&!isRejected&&(confirmLeaveChallenge===c.id?<><button onClick={()=>leaveChallenge(c.id)} disabled={leavingChallenge===c.id} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{leavingChallenge===c.id?"...":"Confirm"}</button><button onClick={()=>setConfirmLeaveChallenge(null)} className="text-xs text-foreground-dim hover:underline">Cancel</button></>:<button onClick={()=>setConfirmLeaveChallenge(c.id)} className="text-xs text-foreground-dim hover:text-red-400 hover:underline">Leave</button>)}
                      {team.isAdmin&&(confirmDeleteChId===c.id?<><button onClick={()=>deleteChallenge(c.id)} disabled={deletingChallenge===c.id} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{deletingChallenge===c.id?"...":"Yes, delete"}</button><button onClick={()=>setConfirmDeleteChId(null)} className="text-xs text-foreground-dim hover:underline">Cancel</button></>:<button onClick={()=>setConfirmDeleteChId(c.id)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Delete</button>)}
                    </div>
                  </div>
                  {pct!==null&&!isPending&&!isRejected&&<div className="mb-3"><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>My progress</span><span>{myTotal} / {c.goal} {c.unit} ({pct}%)</span></div><div className="w-full h-2 bg-border rounded-full"><div className="h-2 rounded-full bg-signal transition-all" style={{width:`${pct}%`}}/></div></div>}
                  {logEntry?.challengeId===c.id&&<div className="mb-3 p-3 rounded-xl bg-background border border-border space-y-2"><div className="flex gap-2 items-center"><input type="number" placeholder={`Value in ${c.unit}`} className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.value} onChange={e=>setLogEntry(l=>l?{...l,value:e.target.value}:null)}/><button onClick={submitEntry} disabled={savingEntry||!logEntry.value} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50">{savingEntry?"...":"Save"}</button><button onClick={()=>setLogEntry(null)} className="text-xs text-foreground-dim hover:text-foreground">✕</button></div><input placeholder="Note (optional)" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.note} onChange={e=>setLogEntry(l=>l?{...l,note:e.target.value}:null)}/></div>}
                  {sorted.length>0&&!isPending&&!isRejected&&<div className="space-y-1">{sorted.slice(0,5).map(([uid,d],i)=><div key={uid} className="flex items-center justify-between text-xs"><span className="text-foreground-dim">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`} {d.name}{uid===myUserId?" (you)":""}</span><span className="font-medium">{d.total} {c.unit}</span></div>)}</div>}
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
      {activeTab==="members"&&<div className="space-y-2">
        {team.members.map((member:any)=>(
          <div key={member.userId} className={"flex items-center justify-between rounded-2xl border px-4 py-3 "+(member.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{member.name}{member.isMe?" (you)":""}</p>
                {member.role==="admin"&&<span className="text-xs px-1.5 py-0.5 rounded bg-signal/20 text-signal">Admin</span>}
                {member.userId===team.createdBy&&<span className="text-xs text-foreground-dim">Owner</span>}
              </div>
              <p className="text-xs text-foreground-dim mt-0.5">Joined {new Date(member.joinedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
            </div>
            {team.isAdmin&&!member.isMe&&(
              <div className="flex gap-2 shrink-0">
                {isCreator&&<button onClick={()=>toggleMemberRole(member.userId,member.role)} disabled={promotingId===member.userId} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-signal hover:text-signal transition-colors disabled:opacity-40">{promotingId===member.userId?"...":(member.role==="admin"?"Remove admin":"Make admin")}</button>}
                {member.userId!==team.createdBy&&(confirmRemoveId===member.userId?<><button onClick={()=>{setConfirmRemoveId(null);removeMember(member.userId,member.name);}} disabled={removingId===member.userId} className="text-xs px-3 py-1.5 rounded-full bg-red-600/80 text-white disabled:opacity-40">{removingId===member.userId?"Removing...":"Confirm"}</button><button onClick={()=>setConfirmRemoveId(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button></>:<button onClick={()=>setConfirmRemoveId(member.userId)} className="text-xs px-3 py-1.5 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">Remove</button>)}
              </div>
            )}
          </div>
        ))}
      </div>}
    </div>
  );
}
