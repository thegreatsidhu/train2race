"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id,setId]=useState("");const [team,setTeam]=useState<any>(null);const [messages,setMessages]=useState<any[]>([]);const [newMessage,setNewMessage]=useState("");const [sending,setSending]=useState(false);const [activeTab,setActiveTab]=useState<"leaderboard"|"chat">("leaderboard");const [copied,setCopied]=useState(false);const [togglingPrivacy,setTogglingPrivacy]=useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{params.then(p=>{setId(p.id);loadTeam(p.id);loadMessages(p.id);});}, []);
  async function loadTeam(tid:string){const res=await fetch(`/api/teams/${tid}`);if(!res.ok){router.push("/dashboard/teams");return;}const data=await res.json();setTeam(data.team);}
  async function loadMessages(tid:string){const res=await fetch(`/api/teams/${tid}/messages`);const data=await res.json();setMessages(data.messages||[]);}
  async function sendMessage(){if(!newMessage.trim()||!id)return;setSending(true);const res=await fetch(`/api/teams/${id}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:newMessage})});const data=await res.json();if(res.ok){setMessages(prev=>[...prev,data.message]);setNewMessage("");setTimeout(()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"}),100);}setSending(false);}
  async function handleLeave(){if(!confirm("Leave this team?"))return;await fetch(`/api/teams/${id}/leave`,{method:"POST"});router.push("/dashboard/teams");}
  function copyInviteCode(){navigator.clipboard.writeText(team.inviteCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  async function togglePrivacy(){setTogglingPrivacy(true);const res=await fetch(`/api/teams/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isPrivate:!team.isPrivate})});if(res.ok){setTeam((t:any)=>({...t,isPrivate:!t.isPrivate}));}setTogglingPrivacy(false);}
  if(!team)return<div className="max-w-3xl px-8 py-10"><p className="text-foreground-dim text-sm">Loading...</p></div>;
  const myUserId = team.members.find((m:any)=>m.isMe)?.userId;
  return(
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <div className="flex items-start justify-between mb-6">
        <div><button onClick={()=>router.push("/dashboard/teams")} className="text-xs text-foreground-dim hover:text-foreground mb-2 block">Back to Teams</button><h1 className="text-2xl font-semibold">{team.name}</h1>{team.description&&<p className="text-foreground-dim text-sm mt-0.5">{team.description}</p>}{team.majorRace&&<p className="text-xs text-signal mt-1">🏁 {team.majorRace.name} · {new Date(team.majorRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>}</div>
        <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
          <button onClick={copyInviteCode} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-surface-raised transition-colors text-sm"><span className="font-mono font-bold tracking-widest">{team.inviteCode}</span><span className="text-xs text-foreground-dim">{copied?"Copied!":"Copy"}</span></button>
          <p className="text-xs text-foreground-dim">Invite code</p>
          {team.isAdmin&&<button onClick={togglePrivacy} disabled={togglingPrivacy} className="text-xs text-foreground-dim hover:text-foreground transition-colors disabled:opacity-40">{togglingPrivacy?"Saving...":(team.isPrivate?"Private — make public":"Public — make private")}</button>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold">{team.members.length}</p><p className="text-xs text-foreground-dim mt-0.5">Members</p></div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold">{Math.round(team.members.reduce((s:number,m:any)=>s+m.pct,0)/(team.members.length||1))}%</p><p className="text-xs text-foreground-dim mt-0.5">Avg progress</p></div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center"><p className="text-xl font-bold text-signal truncate">{team.members[0]?.name?.split(" ")[0]||"—"}</p><p className="text-xs text-foreground-dim mt-0.5">Leading</p></div>
      </div>
      <div className="flex gap-2 mb-6">{([{id:"leaderboard",label:"Leaderboard"},{id:"chat",label:`Chat (${messages.length})`}] as const).map(tab=><button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab===tab.id?"bg-signal text-background":"border border-border hover:bg-surface")}>{tab.label}</button>)}</div>
      {activeTab==="leaderboard"&&<div className="space-y-3">
        {team.members.map((member:any,i:number)=>(
          <div key={member.userId} className={"rounded-2xl border p-4 "+(member.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3"><span className={"text-lg font-bold "+(i===0?"text-yellow-400":i===1?"text-gray-400":i===2?"text-amber-600":"text-foreground-dim")}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span><div><p className="font-medium text-sm">{member.name}{member.isMe?" (you)":""}</p>{member.role==="admin"&&<span className="text-xs text-foreground-dim">Admin</span>}</div></div>
              <div className="flex gap-4 text-xs text-foreground-dim">{member.weeklyMiles>0&&<span>{member.weeklyMiles}mi/wk</span>}<span className="font-semibold text-sm">{member.pct}%</span></div>
            </div>
            {member.totalWorkouts>0?<div><div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{member.doneWorkouts}/{member.totalWorkouts} workouts</span></div><div className="w-full h-2 bg-border rounded-full"><div className={"h-2 rounded-full transition-all "+(member.isMe?"bg-signal":i===0?"bg-yellow-400":"bg-foreground-dim")} style={{width:`${member.pct}%`}}/></div></div>:<p className="text-xs text-foreground-dim">No training plan yet</p>}
          </div>
        ))}
        <div className="pt-4 border-t border-border"><button onClick={handleLeave} className="text-xs text-red-400 hover:text-red-300">{team.isAdmin?"Delete team":"Leave team"}</button></div>
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
