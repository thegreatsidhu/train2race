"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";

const LB_TYPES   = [{ v: "all", l: "All" }, { v: "run", l: "Run + Walk" }, { v: "bike", l: "Bike" }, { v: "swim", l: "Swim" }, { v: "triathlon", l: "Triathlon" }];
const LB_PERIODS = [{ v: "week", l: "Week" }, { v: "month", l: "Month" }, { v: "year", l: "Year" }, { v: "all", l: "All time" }];
const LB_METRICS = [{ v: "distance", l: "Distance" }, { v: "duration", l: "Duration" }, { v: "count", l: "Count" }];

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id,setId]=useState("");const [team,setTeam]=useState<any>(null);const [messages,setMessages]=useState<any[]>([]);const [isAdmin,setIsAdmin]=useState(false);const [myUserId,setMyUserId]=useState("");const [sending,setSending]=useState(false);const [activeTab,setActiveTab]=useState<"plan"|"activity"|"challenges"|"chat"|"members">("plan");const [copied,setCopied]=useState(false);const [copiedLink,setCopiedLink]=useState(false);const [togglingPrivacy,setTogglingPrivacy]=useState(false);const [promotingId,setPromotingId]=useState<string|null>(null);
  const [challenges,setChallenges]=useState<any[]>([]);const [challengesLoaded,setChallengesLoaded]=useState(false);const [showNewChallenge,setShowNewChallenge]=useState(false);const [challengeForm,setChallengeForm]=useState({title:"",type:"run",metric:"distance",unit:"mi",goal:"",startDate:"",endDate:"",description:""});const [savingChallenge,setSavingChallenge]=useState(false);const [createMsg,setCreateMsg]=useState("");const [logEntry,setLogEntry]=useState<{challengeId:string;value:string;note:string;error?:string}|null>(null);const [savingEntry,setSavingEntry]=useState(false);const [todaySteps,setTodaySteps]=useState<number|null>(null);const [deletingChallenge,setDeletingChallenge]=useState<string|null>(null);const [approvingChallenge,setApprovingChallenge]=useState<string|null>(null);const [leavingChallenge,setLeavingChallenge]=useState<string|null>(null);const [confirmLeaveChallenge,setConfirmLeaveChallenge]=useState<string|null>(null);const [confirmDeleteChId,setConfirmDeleteChId]=useState<string|null>(null);
  const [editingChallengeId,setEditingChallengeId]=useState<string|null>(null);const [editChallengeForm,setEditChallengeForm]=useState({title:"",type:"run",metric:"distance",unit:"mi",goal:"",startDate:"",endDate:"",description:""});const [savingChallengeEdit,setSavingChallengeEdit]=useState(false);
  const [lbType,setLbType]=useState("all");const [lbPeriod,setLbPeriod]=useState("month");const [lbMetric,setLbMetric]=useState("distance");
  const [lbData,setLbData]=useState<any[]>([]);const [lbLoading,setLbLoading]=useState(false);
  const [showInvitePanel,setShowInvitePanel]=useState(false);const [inviteQuery,setInviteQuery]=useState("");const [inviteResults,setInviteResults]=useState<any[]>([]);const [inviteSearching,setInviteSearching]=useState(false);const [addingMember,setAddingMember]=useState<string|null>(null);const [inviteMsg,setInviteMsg]=useState("");
  const [removingId,setRemovingId]=useState<string|null>(null);const [confirmRemoveId,setConfirmRemoveId]=useState<string|null>(null);const [confirmLeave,setConfirmLeave]=useState(false);const [confirmRemoveParticipant,setConfirmRemoveParticipant]=useState<{cId:string;uId:string}|null>(null);const [removingParticipant,setRemovingParticipant]=useState<string|null>(null);
  const [dmTarget,setDmTarget]=useState<string|null>(null);const [dmThread,setDmThread]=useState<any[]>([]);const [dmContent,setDmContent]=useState("");const [sendingDm,setSendingDm]=useState(false);const [dmLoading,setDmLoading]=useState(false);const [myThreads,setMyThreads]=useState<any[]>([]);const [threadsLoaded,setThreadsLoaded]=useState(false);
  useEffect(()=>{params.then(p=>{setId(p.id);loadTeam(p.id);loadMessages(p.id);});}, []);
  async function loadTeam(tid:string){const res=await fetch(`/api/teams/${tid}`);if(!res.ok){router.push("/dashboard/teams");return;}const data=await res.json();setTeam(data.team);setMyUserId(data.team?.members?.find((m:any)=>m.isMe)?.userId||"");if(data.team?.majorRace){setLbType(data.team.majorRace.isTriathlon?"triathlon":"run");}}
  async function loadMessages(tid:string){const res=await fetch(`/api/teams/${tid}/messages`);const data=await res.json();setMessages(data.messages||[]);setIsAdmin(data.isAdmin||false);}
  async function sendMessage(content:string,replyToId?:string){if(!id)return;setSending(true);const res=await fetch(`/api/teams/${id}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,replyToId})});const data=await res.json();if(res.ok){setMessages(prev=>[...prev,data.message]);}setSending(false);}
  async function deleteMessage(messageId:string){await fetch(`/api/teams/${id}/messages`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({messageId})});setMessages(prev=>prev.filter((m:any)=>m.id!==messageId));}
  async function deleteAllMessages(){await fetch(`/api/teams/${id}/messages`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({deleteAll:true})});setMessages([]);}
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
  async function createChallenge(){if(!challengeForm.title||!challengeForm.startDate||!challengeForm.endDate)return;setSavingChallenge(true);setCreateMsg("");const res=await fetch(`/api/teams/${id}/challenges`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...challengeForm,goal:challengeForm.goal||null})});const d=await res.json().catch(()=>({}));if(res.ok){setChallenges(p=>[{...d.challenge,entries:[]},...p]);setShowNewChallenge(false);setChallengeForm({title:"",type:"run",metric:"distance",unit:"mi",goal:"",startDate:"",endDate:"",description:""});setCreateMsg(d.challenge?.status==="pending"?"Your challenge was submitted and is awaiting admin approval (up to 5 days).":"");}else{setCreateMsg(d.error||"Failed to create challenge.");}setSavingChallenge(false);}
  async function approveChallenge(cId:string,status:string){setApprovingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});if(res.ok){setChallenges(prev=>prev.map(c=>c.id===cId?{...c,status}:c));}setApprovingChallenge(null);}
  async function deleteChallenge(cId:string){setConfirmDeleteChId(null);setDeletingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}`,{method:"DELETE"});setDeletingChallenge(null);if(res.ok)setChallenges(prev=>prev.filter(c=>c.id!==cId));}
  async function leaveChallenge(cId:string){setConfirmLeaveChallenge(null);setLeavingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}/entries`,{method:"DELETE"});setLeavingChallenge(null);if(res.ok)setChallenges(prev=>prev.filter(c=>c.id!==cId));}
  async function saveChallengeEdit(cId:string){setSavingChallengeEdit(true);const res=await fetch(`/api/teams/${id}/challenges/${cId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...editChallengeForm,goal:editChallengeForm.goal||null})});if(res.ok){const d=await res.json();setChallenges(prev=>prev.map(c=>c.id===cId?{...c,...d.challenge,entries:c.entries}:c));setEditingChallengeId(null);}setSavingChallengeEdit(false);}
  async function removeParticipant(cId:string,uId:string){const key=`${cId}:${uId}`;setRemovingParticipant(key);setConfirmRemoveParticipant(null);const res=await fetch(`/api/teams/${id}/challenges/${cId}/entries?userId=${uId}`,{method:"DELETE"});setRemovingParticipant(null);if(res.ok)setChallenges(prev=>prev.map(c=>c.id===cId?{...c,entries:c.entries.filter((e:any)=>e.userId!==uId)}:c));}
  async function openDm(memberId:string){
    if(dmTarget===memberId){setDmTarget(null);return;}
    setDmTarget(memberId);setDmThread([]);setDmContent("");setDmLoading(true);
    const res=await fetch(`/api/teams/${id}/dm?withUserId=${memberId}`);
    const d=await res.json().catch(()=>({}));
    setDmThread(d.messages||[]);setDmLoading(false);
  }
  async function sendDm(toUserId:string){
    if(!dmContent.trim())return;setSendingDm(true);
    const res=await fetch(`/api/teams/${id}/dm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({toUserId,content:dmContent.trim()})});
    if(res.ok){const d=await res.json();setDmThread(prev=>[...prev,d.message]);setDmContent("");}
    setSendingDm(false);
  }
  async function loadMyThreads(){
    if(threadsLoaded)return;
    const res=await fetch(`/api/teams/${id}/dm`);
    const d=await res.json().catch(()=>({}));
    setMyThreads(d.threads||[]);setThreadsLoaded(true);
  }
  async function submitEntry(){if(!logEntry||!logEntry.value)return;setSavingEntry(true);const todayStr=new Date().toISOString().split("T")[0];const res=await fetch(`/api/teams/${id}/challenges/${logEntry.challengeId}/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:logEntry.value,date:todayStr,note:logEntry.note})});if(res.ok){const d=await res.json();setChallenges(prev=>prev.map(c=>c.id===logEntry.challengeId?{...c,entries:[...c.entries,d.entry]}:c));setLogEntry(null);}else{const d=await res.json().catch(()=>({}));setLogEntry(l=>l?{...l,error:d.error||"Failed to save entry."}:null);}setSavingEntry(false);}
  function handleChallengesTab(){if(!challengesLoaded&&id){loadChallenges(id);}setActiveTab("challenges");}
  async function openLogEntry(c:any){setTodaySteps(null);setLogEntry({challengeId:c.id,value:"",note:""});if(c.unit==="steps"){const res=await fetch("/api/metrics/steps/today");const d=await res.json().catch(()=>({}));setTodaySteps(d.steps??null);}}
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

  useEffect(()=>{if(activeTab==="activity"&&id)loadLbData();},[activeTab,loadLbData,id]);

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
  const isCreator = myUserId && team.createdBy === myUserId;
  const isCaptain = isCreator || team.isAdmin;
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
        <button onClick={()=>setActiveTab("plan")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="plan"?"bg-signal text-background":"border border-border hover:bg-surface")}>Training plan</button>
        <button onClick={()=>setActiveTab("activity")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="activity"?"bg-signal text-background":"border border-border hover:bg-surface")}>Activity</button>
        <button onClick={handleChallengesTab} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="challenges"?"bg-signal text-background":"border border-border hover:bg-surface")}>Challenges</button>
        <button onClick={()=>setActiveTab("chat")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="chat"?"bg-signal text-background":"border border-border hover:bg-surface")}>Chat ({messages.length})</button>
        <button onClick={()=>{setActiveTab("members");loadMyThreads();}} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="members"?"bg-signal text-background":"border border-border hover:bg-surface")}>Members ({team.members.length})</button>
      </div>
      {activeTab==="plan"&&<div className="space-y-3">
          {team.members.map((member:any,i:number)=>(
            <div key={member.userId} className={"rounded-2xl border p-4 "+(member.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={"text-lg font-bold "+(i===0?"text-yellow-400":i===1?"text-gray-400":i===2?"text-amber-600":"text-foreground-dim text-sm")}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                  <div><p className="font-medium text-sm">{member.name}{member.isMe?" (you)":""}</p><div className="flex items-center gap-2">{member.role==="admin"&&<span className="text-xs text-foreground-dim">Captain</span>}{isCreator&&!member.isMe&&<button onClick={()=>toggleMemberRole(member.userId,member.role)} disabled={promotingId===member.userId} className="text-xs text-signal hover:underline disabled:opacity-40">{promotingId===member.userId?"...":(member.role==="admin"?"Remove captain":"Make captain")}</button>}{team.isAdmin&&!member.isMe&&member.userId!==team.createdBy&&(confirmRemoveId===member.userId?<><button onClick={()=>{setConfirmRemoveId(null);removeMember(member.userId,member.name);}} disabled={removingId===member.userId} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{removingId===member.userId?"...":"OK"}</button><button onClick={()=>setConfirmRemoveId(null)} className="text-xs text-foreground-dim hover:underline">✕</button></>:<button onClick={()=>setConfirmRemoveId(member.userId)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Remove</button>)}</div></div>
                </div>
                <div className="flex gap-4 text-xs text-foreground-dim">{member.weeklyMiles>0&&<span>{member.weeklyMiles}mi/wk</span>}<span className="font-semibold text-sm">{member.pct}%</span></div>
              </div>
              {member.totalWorkouts>0?<div><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{member.doneWorkouts}/{member.totalWorkouts} workouts</span></div><div className="w-full h-2 bg-border rounded-full"><div className={"h-2 rounded-full transition-all "+(member.isMe?"bg-signal":i===0?"bg-yellow-400":"bg-foreground-dim")} style={{width:`${member.pct}%`}}/></div></div>:<p className="text-xs text-foreground-dim">No training plan yet</p>}
            </div>
          ))}
      </div>}

      {activeTab==="activity"&&<div>
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
      {activeTab==="challenges"&&<div>
        {/* New challenge form — open to all members */}
        <div className="mb-6">
          {showNewChallenge?(
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <div>
                <h3 className="font-medium text-sm">{team.isAdmin||isCreator?"Create a challenge":"Suggest a challenge"}</h3>
                {!team.isAdmin&&!isCreator&&<p className="text-xs text-foreground-dim mt-0.5">Suggestions require admin approval and can take up to 5 days to go live.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Title</label><input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="e.g. July Run Challenge" value={challengeForm.title} onChange={e=>setChallengeForm(f=>({...f,title:e.target.value}))}/></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.type} onChange={e=>{const t=e.target.value;if(t==="walk"||t==="steps")setChallengeForm(f=>({...f,type:t,metric:"count",unit:"steps"}));else setChallengeForm(f=>({...f,type:t}));}}><option value="run">Run</option><option value="walk">Walk</option><option value="swim">Swim</option><option value="bike">Bike</option><option value="steps">Steps</option><option value="custom">Custom</option></select></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Track by</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.metric} onChange={e=>onMetricChange(e.target.value)}><option value="distance">Distance</option><option value="duration">Duration</option><option value="count">Count</option></select></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Unit</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.unit} onChange={e=>setChallengeForm(f=>({...f,unit:e.target.value}))}>{(METRIC_UNITS[challengeForm.metric]||["mi"]).map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Goal (optional)</label><input type="number" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="e.g. 100" value={challengeForm.goal} onChange={e=>setChallengeForm(f=>({...f,goal:e.target.value}))}/></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Start date</label><input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.startDate} onChange={e=>setChallengeForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">End date</label><input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.endDate} onChange={e=>setChallengeForm(f=>({...f,endDate:e.target.value}))}/></div>
                <div className="col-span-2"><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Description (optional)</label><textarea className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" rows={2} value={challengeForm.description} onChange={e=>setChallengeForm(f=>({...f,description:e.target.value}))}/></div>
              </div>
              <div className="flex gap-2"><button onClick={createChallenge} disabled={savingChallenge} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{savingChallenge?(team.isAdmin||isCreator?"Creating...":"Submitting..."):(team.isAdmin||isCreator?"Create challenge":"Submit for approval")}</button><button onClick={()=>{setShowNewChallenge(false);setCreateMsg("");}} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button></div>
            </div>
          ):(
            <div>
              <button onClick={()=>setShowNewChallenge(true)} className="w-full rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-sm text-foreground-dim hover:bg-surface transition-colors text-left">{team.isAdmin||isCreator?"+ Create a challenge":"+ Suggest a challenge for your team"}</button>
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
                      {active&&<button onClick={()=>openLogEntry(c)} className="text-xs text-signal hover:underline">+ Log</button>}
                      {isCaptain&&editingChallengeId!==c.id&&<button onClick={()=>{setEditingChallengeId(c.id);setEditChallengeForm({title:c.title,type:c.type,metric:c.metric,unit:c.unit,goal:c.goal!=null?String(c.goal):"",startDate:new Date(c.startDate).toISOString().split("T")[0],endDate:new Date(c.endDate).toISOString().split("T")[0],description:c.description||""});}} className="text-xs text-foreground-dim hover:text-signal hover:underline">Edit</button>}
                      {!isPending&&!isRejected&&(confirmLeaveChallenge===c.id?<><button onClick={()=>leaveChallenge(c.id)} disabled={leavingChallenge===c.id} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{leavingChallenge===c.id?"...":"Confirm"}</button><button onClick={()=>setConfirmLeaveChallenge(null)} className="text-xs text-foreground-dim hover:underline">Cancel</button></>:<button onClick={()=>setConfirmLeaveChallenge(c.id)} className="text-xs text-foreground-dim hover:text-red-400 hover:underline">Leave</button>)}
                      {team.isAdmin&&(confirmDeleteChId===c.id?<><button onClick={()=>deleteChallenge(c.id)} disabled={deletingChallenge===c.id} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{deletingChallenge===c.id?"...":"Yes, delete"}</button><button onClick={()=>setConfirmDeleteChId(null)} className="text-xs text-foreground-dim hover:underline">Cancel</button></>:<button onClick={()=>setConfirmDeleteChId(c.id)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Delete</button>)}
                    </div>
                  </div>
                  {editingChallengeId===c.id&&<div className="mb-3 p-3 rounded-xl bg-background border border-border space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input className="col-span-2 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" placeholder="Title" value={editChallengeForm.title} onChange={e=>setEditChallengeForm(f=>({...f,title:e.target.value}))}/>
                      <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.type} onChange={e=>{const t=e.target.value;if(t==="walk"||t==="steps")setEditChallengeForm(f=>({...f,type:t,metric:"count",unit:"steps"}));else setEditChallengeForm(f=>({...f,type:t}));}}><option value="run">Run</option><option value="walk">Walk</option><option value="swim">Swim</option><option value="bike">Bike</option><option value="steps">Steps</option><option value="custom">Custom</option></select>
                      <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.metric} onChange={e=>{const m=e.target.value;const u=METRIC_UNITS[m]?.[0]??"mi";setEditChallengeForm(f=>({...f,metric:m,unit:u}));}}><option value="distance">Distance</option><option value="duration">Duration</option><option value="count">Count</option></select>
                      <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.unit} onChange={e=>setEditChallengeForm(f=>({...f,unit:e.target.value}))}>{(METRIC_UNITS[editChallengeForm.metric]||["mi"]).map(u=><option key={u} value={u}>{u}</option>)}</select>
                      <input type="number" className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" placeholder="Goal (optional)" value={editChallengeForm.goal} onChange={e=>setEditChallengeForm(f=>({...f,goal:e.target.value}))}/>
                      <input type="date" className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.startDate} onChange={e=>setEditChallengeForm(f=>({...f,startDate:e.target.value}))}/>
                      <input type="date" className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.endDate} onChange={e=>setEditChallengeForm(f=>({...f,endDate:e.target.value}))}/>
                      <textarea className="col-span-2 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" rows={2} placeholder="Description (optional)" value={editChallengeForm.description} onChange={e=>setEditChallengeForm(f=>({...f,description:e.target.value}))}/>
                    </div>
                    <div className="flex gap-2"><button onClick={()=>saveChallengeEdit(c.id)} disabled={savingChallengeEdit||!editChallengeForm.title} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50">{savingChallengeEdit?"Saving...":"Save changes"}</button><button onClick={()=>setEditingChallengeId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">Cancel</button></div>
                  </div>}
                  {pct!==null&&!isPending&&!isRejected&&<div className="mb-3"><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>My progress</span><span>{myTotal} / {c.goal} {c.unit} ({pct}%)</span></div><div className="w-full h-2 bg-border rounded-full"><div className="h-2 rounded-full bg-signal transition-all" style={{width:`${pct}%`}}/></div></div>}
                  {logEntry?.challengeId===c.id&&<div className="mb-3 p-3 rounded-xl bg-background border border-border space-y-2">{c.unit==="steps"&&todaySteps!=null&&<button onClick={()=>setLogEntry(l=>l?{...l,value:String(todaySteps),error:undefined}:null)} className="text-xs text-signal hover:underline">Use today's steps: {todaySteps.toLocaleString()}</button>}<div className="flex gap-2 items-center"><input type="number" placeholder={`Value in ${c.unit}`} className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.value} onChange={e=>setLogEntry(l=>l?{...l,value:e.target.value,error:undefined}:null)}/><button onClick={submitEntry} disabled={savingEntry||!logEntry.value} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50">{savingEntry?"...":"Save"}</button><button onClick={()=>setLogEntry(null)} className="text-xs text-foreground-dim hover:text-foreground">✕</button></div><input placeholder="Note (optional)" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.note} onChange={e=>setLogEntry(l=>l?{...l,note:e.target.value}:null)}/>{logEntry.error&&<p className="text-xs text-red-400">{logEntry.error}</p>}</div>}
                  {sorted.length>0&&!isPending&&!isRejected&&<div className="mt-2 space-y-1">{sorted.map(([uid,d],i)=><div key={uid} className="flex items-center justify-between text-xs"><span className="text-foreground-dim min-w-0 flex-1 truncate">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`} {d.name}{uid===myUserId?" (you)":""}</span><div className="flex items-center gap-2 ml-2 shrink-0">{team.isAdmin&&uid!==myUserId&&(confirmRemoveParticipant?.cId===c.id&&confirmRemoveParticipant?.uId===uid?<><button onClick={()=>removeParticipant(c.id,uid)} disabled={removingParticipant===`${c.id}:${uid}`} className="text-red-400 font-medium hover:underline disabled:opacity-40">{removingParticipant===`${c.id}:${uid}`?"...":"OK"}</button><button onClick={()=>setConfirmRemoveParticipant(null)} className="text-foreground-dim hover:underline">✕</button></>:<button onClick={()=>setConfirmRemoveParticipant({cId:c.id,uId:uid})} className="text-foreground-dim hover:text-red-400 hover:underline">Remove</button>)}<span className="font-medium">{d.total} {c.unit}</span></div></div>)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>}
      {activeTab==="chat"&&<div className="h-96 md:h-[500px] flex flex-col">
        <ChatPanel
          messages={messages}
          myUserId={myUserId}
          isAdmin={isAdmin}
          height="100%"
          onSend={sendMessage}
          onDelete={deleteMessage}
          onDeleteAll={isAdmin ? deleteAllMessages : undefined}
          sending={sending}
        />
      </div>}
      {activeTab==="members"&&<div className="space-y-2">
        {/* Inbox for non-captain members: show threads where captain messaged them */}
        {!isCaptain&&myThreads.length>0&&(
          <div className="rounded-2xl border border-border bg-surface p-4 mb-2">
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-3">Messages from captain</p>
            <div className="space-y-2">
              {myThreads.map((t:any)=>(
                <div key={t.userId}>
                  <button onClick={()=>openDm(t.userId)} className={"w-full text-left flex items-center justify-between rounded-xl px-3 py-2 transition-colors "+(dmTarget===t.userId?"bg-signal/10 border border-signal/30":"bg-background border border-border hover:bg-surface-raised")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t.name}{t.unread>0&&<span className="ml-2 text-xs bg-signal text-background rounded-full px-1.5 py-0.5">{t.unread}</span>}</p>
                      <p className="text-xs text-foreground-dim truncate">{t.lastMessage}</p>
                    </div>
                    <span className="text-foreground-dim text-xs ml-2 shrink-0">{dmTarget===t.userId?"▲":"▼"}</span>
                  </button>
                  {dmTarget===t.userId&&(
                    <div className="mt-2 rounded-xl border border-border bg-background p-3 space-y-2">
                      {dmLoading?<p className="text-xs text-foreground-dim">Loading…</p>:(
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {dmThread.map((m:any)=>(
                            <div key={m.id} className={"flex "+(m.fromUser.id===myUserId?"justify-end":"justify-start")}>
                              <div className={"max-w-[80%] rounded-xl px-3 py-2 text-sm "+(m.fromUser.id===myUserId?"bg-signal text-background":"bg-surface border border-border")}>
                                <p>{m.content}</p>
                                <p className={"text-xs mt-0.5 "+(m.fromUser.id===myUserId?"opacity-70":"text-foreground-dim")}>{m.fromUser.name} · {new Date(m.createdAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</p>
                              </div>
                            </div>
                          ))}
                          {dmThread.length===0&&<p className="text-xs text-foreground-dim text-center py-2">No messages yet.</p>}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <input value={dmContent} onChange={e=>setDmContent(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendDm(t.userId);}}} placeholder="Reply…" className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-signal"/>
                        <button onClick={()=>sendDm(t.userId)} disabled={sendingDm||!dmContent.trim()} className="px-3 py-2 rounded-xl bg-signal text-background text-xs font-medium disabled:opacity-50">{sendingDm?"…":"Send"}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {team.members.map((member:any)=>(
          <div key={member.userId} className={"rounded-2xl border "+(member.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{member.name}{member.isMe?" (you)":""}</p>
                  {member.role==="admin"&&<span className="text-xs px-1.5 py-0.5 rounded bg-signal/20 text-signal">Captain</span>}
                  {member.userId===team.createdBy&&<span className="text-xs text-foreground-dim">Owner</span>}
                </div>
                <p className="text-xs text-foreground-dim mt-0.5">Joined {new Date(member.joinedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                {/* Message button — captains only, not self */}
                {isCaptain&&!member.isMe&&(
                  <button onClick={()=>openDm(member.userId)} className={"text-xs px-3 py-1.5 rounded-full border transition-colors "+(dmTarget===member.userId?"border-signal text-signal bg-signal/10":"border-border hover:border-signal hover:text-signal")}>
                    {dmTarget===member.userId?"✕ Close":"💬 Message"}
                  </button>
                )}
                {team.isAdmin&&!member.isMe&&(
                  <>
                    {isCreator&&<button onClick={()=>toggleMemberRole(member.userId,member.role)} disabled={promotingId===member.userId} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-signal hover:text-signal transition-colors disabled:opacity-40">{promotingId===member.userId?"...":(member.role==="admin"?"Remove captain":"Make captain")}</button>}
                    {member.userId!==team.createdBy&&(confirmRemoveId===member.userId?<><button onClick={()=>{setConfirmRemoveId(null);removeMember(member.userId,member.name);}} disabled={removingId===member.userId} className="text-xs px-3 py-1.5 rounded-full bg-red-600/80 text-white disabled:opacity-40">{removingId===member.userId?"Removing...":"Confirm"}</button><button onClick={()=>setConfirmRemoveId(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button></>:<button onClick={()=>setConfirmRemoveId(member.userId)} className="text-xs px-3 py-1.5 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">Remove</button>)}
                  </>
                )}
              </div>
            </div>
            {/* DM thread panel — shown below the member row when open */}
            {dmTarget===member.userId&&(
              <div className="border-t border-border px-4 pb-4 pt-3">
                {dmLoading?<p className="text-xs text-foreground-dim">Loading…</p>:(
                  <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                    {dmThread.map((m:any)=>(
                      <div key={m.id} className={"flex "+(m.fromUser.id===myUserId?"justify-end":"justify-start")}>
                        <div className={"max-w-[80%] rounded-xl px-3 py-2 text-sm "+(m.fromUser.id===myUserId?"bg-signal text-background":"bg-surface-raised border border-border")}>
                          <p>{m.content}</p>
                          <p className={"text-xs mt-0.5 "+(m.fromUser.id===myUserId?"opacity-70":"text-foreground-dim")}>{new Date(m.createdAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</p>
                        </div>
                      </div>
                    ))}
                    {dmThread.length===0&&<p className="text-xs text-foreground-dim py-2">No messages yet. Send the first one.</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={dmContent} onChange={e=>setDmContent(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendDm(member.userId);}}} placeholder={`Message ${member.name}…`} className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-signal" autoFocus/>
                  <button onClick={()=>sendDm(member.userId)} disabled={sendingDm||!dmContent.trim()} className="px-4 py-2 rounded-xl bg-signal text-background text-sm font-medium disabled:opacity-50">{sendingDm?"…":"Send"}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="pt-5 border-t border-border mt-3">
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
    </div>
  );
}
