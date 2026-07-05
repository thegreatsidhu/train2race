"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { TeamActivityFeed } from "@/components/TeamActivityFeed";

function fmtMsgDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (msgDay.getTime() === today.getTime()) return `Today · ${time}`;
  if (msgDay.getTime() === yesterday.getTime()) return `Yesterday · ${time}`;
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` · ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ` · ${time}`;
}

const LB_TYPES   = [{ v: "all", l: "All" }, { v: "run", l: "Run + Walk" }, { v: "bike", l: "Bike" }, { v: "swim", l: "Swim" }, { v: "triathlon", l: "Triathlon" }];
const LB_PERIODS = [{ v: "week", l: "Week" }, { v: "month", l: "Month" }, { v: "year", l: "Year" }, { v: "all", l: "All time" }];
const LB_METRICS = [{ v: "distance", l: "Distance" }, { v: "duration", l: "Duration" }, { v: "count", l: "Count" }];

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id,setId]=useState("");const [team,setTeam]=useState<any>(null);const [messages,setMessages]=useState<any[]>([]);const [isAdmin,setIsAdmin]=useState(false);const [myUserId,setMyUserId]=useState("");const [sending,setSending]=useState(false);const [editingName,setEditingName]=useState(false);const [nameInput,setNameInput]=useState("");const [savingName,setSavingName]=useState(false);const [activeTab,setActiveTab]=useState<"bulletin"|"events"|"contact"|"activity"|"leaderboard"|"challenges"|"chat"|"members"|"race">("activity");
  const [bulletins,setBulletins]=useState<any[]>([]);const [bulletinsLoaded,setBulletinsLoaded]=useState(false);const [newBulTitle,setNewBulTitle]=useState("");const [newBulContent,setNewBulContent]=useState("");const [newBulPinned,setNewBulPinned]=useState(false);const [savingBul,setSavingBul]=useState(false);const [showBulForm,setShowBulForm]=useState(false);const [deletingBulId,setDeletingBulId]=useState<string|null>(null);
  const [teamEvents,setTeamEvents]=useState<any[]>([]);const [eventsLoaded,setEventsLoaded]=useState(false);const [newEvTitle,setNewEvTitle]=useState("");const [newEvDesc,setNewEvDesc]=useState("");const [newEvDate,setNewEvDate]=useState("");const [newEvLoc,setNewEvLoc]=useState("");const [newEvLink,setNewEvLink]=useState("");const [savingEv,setSavingEv]=useState(false);const [showEvForm,setShowEvForm]=useState(false);const [deletingEvId,setDeletingEvId]=useState<string|null>(null);
  const [contacts,setContacts]=useState<any[]>([]);const [contactsLoaded,setContactsLoaded]=useState(false);const [newCtLabel,setNewCtLabel]=useState("");const [newCtValue,setNewCtValue]=useState("");const [newCtType,setNewCtType]=useState("text");const [savingCt,setSavingCt]=useState(false);const [showCtForm,setShowCtForm]=useState(false);const [deletingCtId,setDeletingCtId]=useState<string|null>(null);const [copied,setCopied]=useState(false);const [copiedLink,setCopiedLink]=useState(false);const [togglingPrivacy,setTogglingPrivacy]=useState(false);const [promotingId,setPromotingId]=useState<string|null>(null);
  const [challenges,setChallenges]=useState<any[]>([]);const [challengesLoaded,setChallengesLoaded]=useState(false);const [showNewChallenge,setShowNewChallenge]=useState(false);const [challengeForm,setChallengeForm]=useState({title:"",type:"run",metric:"distance",unit:"mi",goal:"",goalPerDay:false,startDate:"",endDate:"",description:""});const [savingChallenge,setSavingChallenge]=useState(false);const [createMsg,setCreateMsg]=useState("");const [logEntry,setLogEntry]=useState<{challengeId:string;value:string;note:string;error?:string}|null>(null);const [savingEntry,setSavingEntry]=useState(false);const [todaySteps,setTodaySteps]=useState<number|null>(null);const [deletingChallenge,setDeletingChallenge]=useState<string|null>(null);const [approvingChallenge,setApprovingChallenge]=useState<string|null>(null);const [leavingChallenge,setLeavingChallenge]=useState<string|null>(null);const [confirmLeaveChallenge,setConfirmLeaveChallenge]=useState<string|null>(null);const [confirmDeleteChId,setConfirmDeleteChId]=useState<string|null>(null);const [acceptingChallenge,setAcceptingChallenge]=useState<string|null>(null);
  const [editingChallengeId,setEditingChallengeId]=useState<string|null>(null);const [editChallengeForm,setEditChallengeForm]=useState({title:"",type:"run",metric:"distance",unit:"mi",goal:"",goalPerDay:false,startDate:"",endDate:"",description:""});const [savingChallengeEdit,setSavingChallengeEdit]=useState(false);
  const [lbType,setLbType]=useState("all");const [lbPeriod,setLbPeriod]=useState("month");const [lbMetric,setLbMetric]=useState("distance");
  const [lbData,setLbData]=useState<any[]>([]);const [lbLoading,setLbLoading]=useState(false);
  const [showInvitePanel,setShowInvitePanel]=useState(false);const [inviteQuery,setInviteQuery]=useState("");const [inviteResults,setInviteResults]=useState<any[]>([]);const [inviteSearching,setInviteSearching]=useState(false);const [addingMember,setAddingMember]=useState<string|null>(null);const [inviteMsg,setInviteMsg]=useState("");
  const [removingId,setRemovingId]=useState<string|null>(null);const [confirmRemoveId,setConfirmRemoveId]=useState<string|null>(null);const [confirmLeave,setConfirmLeave]=useState(false);const [confirmRemoveParticipant,setConfirmRemoveParticipant]=useState<{cId:string;uId:string}|null>(null);const [removingParticipant,setRemovingParticipant]=useState<string|null>(null);
  const [dmTarget,setDmTarget]=useState<string|null>(null);const [dmThread,setDmThread]=useState<any[]>([]);const [dmContent,setDmContent]=useState("");const [sendingDm,setSendingDm]=useState(false);const [dmLoading,setDmLoading]=useState(false);const [myThreads,setMyThreads]=useState<any[]>([]);const [threadsLoaded,setThreadsLoaded]=useState(false);
  const [raceLoaded,setRaceLoaded]=useState(false);const [raceTabData,setRaceTabData]=useState<{members:{userId:string;name:string}[];myJoined:boolean}|null>(null);const [showRaceSearch,setShowRaceSearch]=useState(false);const [raceSearch,setRaceSearch]=useState("");const [raceResults,setRaceResults]=useState<any[]>([]);const [raceSearching,setRaceSearching]=useState(false);const [settingRace,setSettingRace]=useState(false);const [clearingRace,setClearingRace]=useState(false);const [confirmSetRace,setConfirmSetRace]=useState<any>(null);const [confirmClearRace,setConfirmClearRace]=useState(false);const [confirmLeaveRace,setConfirmLeaveRace]=useState(false);const [joiningRace,setJoiningRace]=useState(false);
  useEffect(()=>{params.then(p=>{setId(p.id);loadTeam(p.id);loadMessages(p.id);loadBulletins(p.id);loadEvents(p.id);const sp=new URLSearchParams(window.location.search);if(sp.get("tab")==="challenges"){loadChallenges(p.id).then(()=>{setActiveTab("challenges");const cId=sp.get("challenge");if(cId){setTimeout(()=>{const el=document.getElementById(`challenge-${cId}`);if(el)el.scrollIntoView({behavior:"smooth",block:"center"});},150);}});}else if(sp.get("tab")==="chat"){setActiveTab("chat");}});}, []);
  async function loadTeam(tid:string){try{const res=await fetch(`/api/teams/${tid}`);if(!res.ok){router.push("/dashboard/teams");return;}const data=await res.json();setTeam(data.team);setMyUserId(data.team?.members?.find((m:any)=>m.isMe)?.userId||"");if(data.team?.majorRace){setLbType(data.team.majorRace.isTriathlon?"triathlon":"run");}}catch{router.push("/dashboard/teams");}}
  async function loadMessages(tid:string){try{const res=await fetch(`/api/teams/${tid}/messages`);if(!res.ok)return;const data=await res.json();setMessages(data.messages||[]);setIsAdmin(data.isAdmin||false);}catch{}}
  async function sendMessage(content:string,replyToId?:string){if(!id)return;setSending(true);const res=await fetch(`/api/teams/${id}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,replyToId})});const data=await res.json();if(res.ok){setMessages(prev=>[...prev,data.message]);}setSending(false);}
  async function deleteMessage(messageId:string){await fetch(`/api/teams/${id}/messages`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({messageId})});setMessages(prev=>prev.filter((m:any)=>m.id!==messageId));}
  async function deleteAllMessages(){await fetch(`/api/teams/${id}/messages`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({deleteAll:true})});setMessages([]);}
  async function handleLeave(){setConfirmLeave(false);if(team?.isAdmin){await fetch(`/api/teams/${id}`,{method:"DELETE"});}else{await fetch(`/api/teams/${id}/leave`,{method:"POST"});}router.push("/dashboard/teams");}
  function copyInviteCode(){navigator.clipboard.writeText(team.inviteCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  function copyInviteLink(){const link=team.activeSignupCode?`${window.location.origin}/signup?invite=${team.activeSignupCode}`:`${window.location.origin}/join/${team.inviteCode}`;navigator.clipboard.writeText(link);setCopiedLink(true);setTimeout(()=>setCopiedLink(false),2000);}
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
  async function createChallenge(){if(!challengeForm.title||!challengeForm.startDate||!challengeForm.endDate||!challengeForm.goal)return;setSavingChallenge(true);setCreateMsg("");const res=await fetch(`/api/teams/${id}/challenges`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...challengeForm,goalPerDay:challengeForm.metric==="count"&&challengeForm.goalPerDay})});const d=await res.json().catch(()=>({}));if(res.ok){setChallenges(p=>[{...d.challenge,entries:[]},...p]);setShowNewChallenge(false);setChallengeForm({title:"",type:"run",metric:"distance",unit:"mi",goal:"",goalPerDay:false,startDate:"",endDate:"",description:""});setCreateMsg(d.challenge?.status==="pending"?"Your challenge was submitted and is awaiting admin approval (up to 5 days).":"");}else{setCreateMsg(d.error||"Failed to create challenge.");}setSavingChallenge(false);}
  async function approveChallenge(cId:string,status:string){setApprovingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});if(res.ok){setChallenges(prev=>prev.map(c=>c.id===cId?{...c,status}:c));}setApprovingChallenge(null);}
  async function deleteChallenge(cId:string){setConfirmDeleteChId(null);setDeletingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}`,{method:"DELETE"});setDeletingChallenge(null);if(res.ok)setChallenges(prev=>prev.filter(c=>c.id!==cId));}
  async function acceptChallenge(cId:string){setAcceptingChallenge(cId);const res=await fetch(`/api/teams/${id}/challenges/${cId}/accept`,{method:"POST"});if(res.ok){setChallenges(prev=>prev.map(c=>c.id===cId?{...c,acceptances:[...(c.acceptances||[]),myUserId]}:c));}setAcceptingChallenge(null);}
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
  async function loadBulletins(tid:string){if(bulletinsLoaded)return;const res=await fetch(`/api/teams/${tid}/bulletins`);const d=await res.json().catch(()=>({}));setBulletins(d.bulletins||[]);setBulletinsLoaded(true);}
  async function postBulletin(tid:string){if(!newBulContent.trim())return;setSavingBul(true);const res=await fetch(`/api/teams/${tid}/bulletins`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:newBulTitle.trim()||null,content:newBulContent.trim(),isPinned:newBulPinned})});const d=await res.json().catch(()=>({}));if(res.ok){setBulletins(prev=>[d.bulletin,...prev].sort((a,b)=>Number(b.isPinned)-Number(a.isPinned)||(new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())));setNewBulTitle("");setNewBulContent("");setNewBulPinned(false);setShowBulForm(false);}setSavingBul(false);}
  async function deleteBulletin(bulletinId:string){setDeletingBulId(bulletinId);await fetch(`/api/teams/${id}/bulletins`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({bulletinId})});setBulletins(prev=>prev.filter(b=>b.id!==bulletinId));setDeletingBulId(null);}
  async function togglePin(bulletinId:string,isPinned:boolean){await fetch(`/api/teams/${id}/bulletins`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({bulletinId,isPinned:!isPinned})});setBulletins(prev=>prev.map(b=>b.id===bulletinId?{...b,isPinned:!isPinned}:b).sort((a,b)=>Number(b.isPinned)-Number(a.isPinned)||(new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())));}
  async function loadEvents(tid:string){if(eventsLoaded)return;const res=await fetch(`/api/teams/${tid}/events`);const d=await res.json().catch(()=>({}));setTeamEvents(d.events||[]);setEventsLoaded(true);}
  async function postEvent(tid:string){if(!newEvTitle.trim()||!newEvDate)return;setSavingEv(true);const res=await fetch(`/api/teams/${tid}/events`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:newEvTitle.trim(),description:newEvDesc.trim()||null,eventDate:newEvDate,location:newEvLoc.trim()||null,link:newEvLink.trim()||null})});const d=await res.json().catch(()=>({}));if(res.ok){setTeamEvents(prev=>[...prev,d.event].sort((a,b)=>new Date(a.eventDate).getTime()-new Date(b.eventDate).getTime()));setNewEvTitle("");setNewEvDesc("");setNewEvDate("");setNewEvLoc("");setNewEvLink("");setShowEvForm(false);}setSavingEv(false);}
  async function deleteEvent(eventId:string){setDeletingEvId(eventId);await fetch(`/api/teams/${id}/events`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId})});setTeamEvents(prev=>prev.filter(e=>e.id!==eventId));setDeletingEvId(null);}
  async function loadContacts(tid:string){if(contactsLoaded)return;const res=await fetch(`/api/teams/${tid}/contacts`);const d=await res.json().catch(()=>({}));setContacts(d.contacts||[]);setContactsLoaded(true);}
  async function postContact(tid:string){if(!newCtLabel.trim()||!newCtValue.trim())return;setSavingCt(true);const res=await fetch(`/api/teams/${tid}/contacts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({label:newCtLabel.trim(),value:newCtValue.trim(),type:newCtType})});const d=await res.json().catch(()=>({}));if(res.ok){setContacts(prev=>[...prev,d.contact]);setNewCtLabel("");setNewCtValue("");setNewCtType("text");setShowCtForm(false);}setSavingCt(false);}
  async function deleteContact(contactId:string){setDeletingCtId(contactId);await fetch(`/api/teams/${id}/contacts`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({contactId})});setContacts(prev=>prev.filter(c=>c.id!==contactId));setDeletingCtId(null);}
  function handleBulletinTab(){if(!bulletinsLoaded&&id){loadBulletins(id);}setActiveTab("bulletin");}
  function handleEventsTab(){if(!eventsLoaded&&id){loadEvents(id);}setActiveTab("events");}
  function handleContactTab(){if(!contactsLoaded&&id){loadContacts(id);}setActiveTab("contact");}
  function handleChallengesTab(){if(!challengesLoaded&&id){loadChallenges(id);}setActiveTab("challenges");}
  async function openLogEntry(c:any){setLogEntry({challengeId:c.id,value:"",note:""});}
  const METRIC_UNITS:{[k:string]:string[]}={distance:["mi","km"],duration:["min"],count:["sessions"]};
  function countUnitsFor(type:string){return type==="walk"?["steps"]:["sessions"];}

  const loadLbData = useCallback(async()=>{
    if(!id)return;
    setLbLoading(true);
    const p=new URLSearchParams({period:lbPeriod,metric:lbMetric,type:lbType});
    const res=await fetch(`/api/teams/${id}/leaderboard?${p}`);
    const d=await res.json().catch(()=>({}));
    setLbData(d.entries||[]);
    setLbLoading(false);
  },[id,lbPeriod,lbMetric,lbType]);

  useEffect(()=>{if(activeTab==="leaderboard"&&id)loadLbData();},[activeTab,loadLbData,id]);

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
  useEffect(()=>{
    if(!raceSearch||raceSearch.length<2){setRaceResults([]);return;}
    const t=setTimeout(async()=>{setRaceSearching(true);const res=await fetch(`/api/major-races?search=${encodeURIComponent(raceSearch)}&upcoming=1`);const d=await res.json().catch(()=>({}));setRaceResults(d.races||[]);setRaceSearching(false);},320);
    return()=>clearTimeout(t);
  },[raceSearch]);

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
  async function loadRaceTab(tid:string){if(raceLoaded)return;const res=await fetch(`/api/teams/${tid}/race`);const d=await res.json().catch(()=>({}));setRaceTabData(d);setRaceLoaded(true);}
  async function setTeamRace(race:any){setSettingRace(true);const res=await fetch(`/api/teams/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId:race.id})});if(res.ok){setTeam((t:any)=>({...t,majorRace:{id:race.id,name:race.name,raceDate:race.raceDate,distanceM:race.distanceM,isTriathlon:race.isTriathlon||false}}));setShowRaceSearch(false);setRaceSearch("");setRaceResults([]);setConfirmSetRace(null);}setSettingRace(false);}
  async function clearTeamRace(){setConfirmClearRace(false);setClearingRace(true);const res=await fetch(`/api/teams/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId:null})});if(res.ok){setTeam((t:any)=>({...t,majorRace:null}));setRaceTabData(prev=>prev?{...prev,members:[],myJoined:false}:null);}setClearingRace(false);}
  async function joinTeamRace(){if(!team?.majorRace?.id)return;setJoiningRace(true);const res=await fetch("/api/major-races/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId:team.majorRace.id,isPublic:true})});if(res.ok){const myName=team.members.find((m:any)=>m.isMe)?.name||"You";setRaceTabData(prev=>prev?{...prev,myJoined:true,members:[...prev.members,{userId:myUserId,name:myName}]}:{members:[{userId:myUserId,name:myName}],myJoined:true});}setJoiningRace(false);}
  async function leaveTeamRace(){if(!team?.majorRace?.id)return;setConfirmLeaveRace(false);setJoiningRace(true);const res=await fetch("/api/major-races/register",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({majorRaceId:team.majorRace.id})});if(res.ok){setRaceTabData(prev=>prev?{...prev,myJoined:false,members:prev.members.filter((m:any)=>m.userId!==myUserId)}:null);}setJoiningRace(false);}
  function onMetricChange(metric:string){const firstUnit=metric==="count"?countUnitsFor(challengeForm.type)[0]:METRIC_UNITS[metric]?.[0]??"mi";setChallengeForm(f=>({...f,metric,unit:firstUnit}));}
  async function saveName(){if(!nameInput.trim()||nameInput.trim()===team?.name){setEditingName(false);return;}setSavingName(true);const res=await fetch(`/api/teams/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:nameInput.trim()})});if(res.ok){setTeam((t:any)=>({...t,name:nameInput.trim()}));setEditingName(false);}setSavingName(false);}
  if(!team)return<div className="max-w-3xl px-8 py-10"><p className="text-foreground-dim text-sm">Loading...</p></div>;
  const isCreator = myUserId && team.createdBy === myUserId;
  const isCaptain = isCreator || team.isAdmin;
  return(
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <div className="flex items-start justify-between mb-6">
        <div><button onClick={()=>router.push("/dashboard/teams")} className="text-xs text-foreground-dim hover:text-foreground mb-2 block">Back to Teams</button>{editingName?(<div className="flex items-center gap-2 mt-1"><input autoFocus value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveName();if(e.key==="Escape")setEditingName(false);}} className="text-lg font-semibold bg-surface border border-signal rounded-xl px-3 py-1 focus:outline-none max-w-xs"/><button onClick={saveName} disabled={savingName} className="text-xs text-signal hover:underline disabled:opacity-40">{savingName?"Saving…":"Save"}</button><button onClick={()=>setEditingName(false)} className="text-xs text-foreground-dim hover:underline">Cancel</button></div>):(<div className="flex items-center gap-2 mt-1"><h1 className="text-2xl font-semibold">{team.name}</h1>{isCaptain&&<button onClick={()=>{setNameInput(team.name);setEditingName(true);}} className="text-foreground-dim hover:text-foreground transition-colors text-sm" title="Rename">✎</button>}</div>)}{team.description&&<p className="text-foreground-dim text-sm mt-0.5">{team.description}</p>}{team.majorRace&&<p className="text-xs text-signal mt-1">🏁 {team.majorRace.name} · {new Date(team.majorRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>}</div>
        <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
          <button onClick={copyInviteLink} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-surface-raised transition-colors text-sm"><span className="text-xs">🔗</span><span className="text-xs text-foreground-dim">{copiedLink?"Link copied!":"Invite"}</span></button>
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
        {(()=>{const avg=Math.round(team.members.reduce((s:number,m:any)=>s+m.pct,0)/(team.members.length||1));return(<div className="rounded-xl border border-border bg-surface p-3 text-center">{avg===0?<p className="text-sm font-semibold text-foreground-dim leading-tight">Just getting started!</p>:<p className="text-xl font-bold">{avg}%</p>}<p className="text-xs text-foreground-dim mt-0.5">Avg progress</p></div>);})()}
        {(()=>{const leader=[...team.members].sort((a:any,b:any)=>(b.totalActivityMiles||0)-(a.totalActivityMiles||0))[0];const hasLeader=leader&&(leader.totalActivityMiles||0)>0;return(<div className="rounded-xl border border-border bg-surface p-3 text-center">{hasLeader?<p className="text-xl font-bold text-signal truncate">{leader.name?.split(" ")[0]||"—"}</p>:<p className="text-sm font-semibold text-foreground-dim leading-tight">No leader yet</p>}<p className="text-xs text-foreground-dim mt-0.5">Leading</p></div>);})()}
      </div>
      {/* Pinned bulletin preview */}
      {bulletins.filter(b=>b.isPinned).slice(0,1).map((b:any)=>(
        <div key={b.id} className="mb-4 rounded-2xl border border-signal/30 bg-signal/5 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-signal mt-0.5 shrink-0">📌 Pinned</span>
            <div className="min-w-0 flex-1">
              {b.title&&<p className="text-sm font-semibold mb-0.5">{b.title}</p>}
              <p className="text-sm text-foreground-dim leading-snug">{b.content}</p>
            </div>
            <button onClick={handleBulletinTab} className="shrink-0 text-xs text-signal hover:underline">See all →</button>
          </div>
        </div>
      ))}

      {/* Upcoming events preview */}
      {teamEvents.filter((e:any)=>new Date(e.eventDate)>=new Date()).slice(0,2).map((e:any)=>(
        <div key={e.id} className="mb-3 rounded-2xl border border-border bg-surface px-4 py-3 flex items-center gap-4">
          <div className="shrink-0 text-center w-10">
            <p className="text-xs text-foreground-dim uppercase tracking-wide leading-none">{new Date(e.eventDate).toLocaleDateString("en-US",{month:"short"})}</p>
            <p className="text-xl font-bold leading-tight">{new Date(e.eventDate).getDate()}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{e.title}</p>
            {e.location&&<p className="text-xs text-foreground-dim truncate">{e.location}</p>}
          </div>
          <button onClick={handleEventsTab} className="shrink-0 text-xs text-foreground-dim hover:text-foreground">Details →</button>
        </div>
      ))}

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={()=>setActiveTab("activity")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="activity"?"bg-signal text-background":"border border-border hover:bg-surface")}>Activity</button>
        <button onClick={handleBulletinTab} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="bulletin"?"bg-signal text-background":"border border-border hover:bg-surface")}>Bulletin{bulletins.length>0?` (${bulletins.length})`:""}</button>
        <button onClick={()=>setActiveTab("chat")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="chat"?"bg-signal text-background":"border border-border hover:bg-surface")}>Chat ({messages.length})</button>
        <button onClick={handleChallengesTab} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="challenges"?"bg-signal text-background":"border border-border hover:bg-surface")}>Challenges</button>
        <button onClick={handleEventsTab} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="events"?"bg-signal text-background":"border border-border hover:bg-surface")}>Events{teamEvents.length>0?` (${teamEvents.length})`:""}</button>
        <button onClick={()=>setActiveTab("leaderboard")} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="leaderboard"?"bg-signal text-background":"border border-border hover:bg-surface")}>Leaderboard</button>
        <button onClick={()=>{setActiveTab("race");loadRaceTab(id);}} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="race"?"bg-signal text-background":"border border-border hover:bg-surface")}>Race{team.majorRace?" 🏁":""}</button>
        <button onClick={()=>{setActiveTab("members");loadMyThreads();}} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="members"?"bg-signal text-background":"border border-border hover:bg-surface")}>Members ({team.members.length})</button>
        <button onClick={handleContactTab} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors "+(activeTab==="contact"?"bg-signal text-background":"border border-border hover:bg-surface")}>Contact</button>
      </div>
      {activeTab==="bulletin"&&<div>
        {isCaptain&&(
          <div className="mb-5">
            {!showBulForm?(
              <button onClick={()=>setShowBulForm(true)} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:opacity-90">+ Post update</button>
            ):(
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                <p className="font-medium text-sm">New bulletin</p>
                <input value={newBulTitle} onChange={e=>setNewBulTitle(e.target.value)} placeholder="Title (optional)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none"/>
                <textarea value={newBulContent} onChange={e=>setNewBulContent(e.target.value)} placeholder="Write your update…" rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none resize-none"/>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={newBulPinned} onChange={e=>setNewBulPinned(e.target.checked)} className="rounded"/>
                  Pin to top of team page
                </label>
                <div className="flex gap-2">
                  <button onClick={()=>postBulletin(id)} disabled={savingBul||!newBulContent.trim()} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{savingBul?"Posting…":"Post"}</button>
                  <button onClick={()=>{setShowBulForm(false);setNewBulTitle("");setNewBulContent("");setNewBulPinned(false);}} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
        {!bulletinsLoaded?(
          <div className="space-y-2">{[1,2].map(i=><div key={i} className="h-16 rounded-xl bg-surface border border-border animate-pulse"/>)}</div>
        ):bulletins.length===0?(
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-dim">{isCaptain?"No updates yet. Post the first bulletin above.":"No updates from the captain yet."}</div>
        ):(
          <div className="space-y-3">
            {bulletins.map((b:any)=>(
              <div key={b.id} className={"rounded-2xl border p-4 "+(b.isPinned?"border-signal/30 bg-signal/5":"border-border bg-surface")}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {b.isPinned&&<span className="text-xs text-signal font-medium">📌 Pinned</span>}
                      {b.title&&<p className="text-sm font-semibold">{b.title}</p>}
                      <span className="text-xs text-foreground-dim">{b.user.name} · {new Date(b.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                    </div>
                    <p className="text-sm text-foreground-dim leading-relaxed whitespace-pre-wrap">{b.content}</p>
                  </div>
                  {isCaptain&&(
                    <div className="flex gap-2 shrink-0">
                      <button onClick={()=>togglePin(b.id,b.isPinned)} className="text-xs text-foreground-dim hover:text-signal">{b.isPinned?"Unpin":"Pin"}</button>
                      <button onClick={()=>deleteBulletin(b.id)} disabled={deletingBulId===b.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40">{deletingBulId===b.id?"…":"Delete"}</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {activeTab==="events"&&<div>
        {isCaptain&&(
          <div className="mb-5">
            {!showEvForm?(
              <button onClick={()=>setShowEvForm(true)} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:opacity-90">+ Add event</button>
            ):(
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                <p className="font-medium text-sm">New event</p>
                <input value={newEvTitle} onChange={e=>setNewEvTitle(e.target.value)} placeholder="Event title *" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none"/>
                <input type="datetime-local" value={newEvDate} onChange={e=>setNewEvDate(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none"/>
                <input value={newEvLoc} onChange={e=>setNewEvLoc(e.target.value)} placeholder="Location (optional)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none"/>
                <textarea value={newEvDesc} onChange={e=>setNewEvDesc(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none resize-none"/>
                <input value={newEvLink} onChange={e=>setNewEvLink(e.target.value)} placeholder="Link (optional, e.g. registration URL)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none"/>
                <div className="flex gap-2">
                  <button onClick={()=>postEvent(id)} disabled={savingEv||!newEvTitle.trim()||!newEvDate} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{savingEv?"Saving…":"Save event"}</button>
                  <button onClick={()=>{setShowEvForm(false);setNewEvTitle("");setNewEvDesc("");setNewEvDate("");setNewEvLoc("");setNewEvLink("");}} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
        {!eventsLoaded?(
          <div className="space-y-2">{[1,2].map(i=><div key={i} className="h-16 rounded-xl bg-surface border border-border animate-pulse"/>)}</div>
        ):teamEvents.length===0?(
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-dim">{isCaptain?"No events yet. Add the first one above.":"No upcoming events."}</div>
        ):(
          <div className="space-y-3">
            {teamEvents.map((e:any)=>{
              const past=new Date(e.eventDate)<new Date();
              return(
                <div key={e.id} className={"rounded-2xl border p-4 flex gap-4 "+(past?"border-border bg-surface opacity-60":"border-border bg-surface")}>
                  <div className="shrink-0 text-center w-12 pt-0.5">
                    <p className="text-xs text-foreground-dim uppercase tracking-wide leading-none">{new Date(e.eventDate).toLocaleDateString("en-US",{month:"short"})}</p>
                    <p className="text-2xl font-bold leading-tight">{new Date(e.eventDate).getDate()}</p>
                    <p className="text-xs text-foreground-dim">{new Date(e.eventDate).getFullYear()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{e.title}{past&&<span className="ml-2 text-xs text-foreground-dim font-normal">Past</span>}</p>
                        <p className="text-xs text-foreground-dim mt-0.5">{new Date(e.eventDate).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}{e.location&&` · ${e.location}`}</p>
                        {e.description&&<p className="text-sm text-foreground-dim mt-1 leading-snug">{e.description}</p>}
                        {e.link&&<a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs text-signal hover:underline mt-1 inline-block">More info →</a>}
                      </div>
                      {isCaptain&&<button onClick={()=>deleteEvent(e.id)} disabled={deletingEvId===e.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 shrink-0">{deletingEvId===e.id?"…":"Delete"}</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {activeTab==="contact"&&<div>
        {isCaptain&&(
          <div className="mb-5">
            {!showCtForm?(
              <button onClick={()=>setShowCtForm(true)} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:opacity-90">+ Add contact</button>
            ):(
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                <p className="font-medium text-sm">New contact</p>
                <input value={newCtLabel} onChange={e=>setNewCtLabel(e.target.value)} placeholder="Label (e.g. Coach Email, Team Group Chat)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none"/>
                <div className="flex gap-2">
                  <select value={newCtType} onChange={e=>setNewCtType(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="link">Link</option>
                  </select>
                  <input value={newCtValue} onChange={e=>setNewCtValue(e.target.value)} placeholder="Value" className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>postContact(id)} disabled={savingCt||!newCtLabel.trim()||!newCtValue.trim()} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{savingCt?"Saving…":"Save"}</button>
                  <button onClick={()=>{setShowCtForm(false);setNewCtLabel("");setNewCtValue("");setNewCtType("text");}} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
        {!contactsLoaded?(
          <div className="space-y-2">{[1,2].map(i=><div key={i} className="h-12 rounded-xl bg-surface border border-border animate-pulse"/>)}</div>
        ):contacts.length===0?(
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-dim">{isCaptain?"No contact info yet. Add coach emails, group chats, or any other info your team needs.":"No contact information added yet."}</div>
        ):(
          <div className="space-y-2">
            {contacts.map((c:any)=>(
              <div key={c.id} className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">{c.label}</p>
                  {c.type==="email"?<a href={`mailto:${c.value}`} className="text-sm text-signal hover:underline">{c.value}</a>
                  :c.type==="phone"?<a href={`tel:${c.value}`} className="text-sm text-signal hover:underline">{c.value}</a>
                  :c.type==="link"?<a href={c.value} target="_blank" rel="noopener noreferrer" className="text-sm text-signal hover:underline truncate block">{c.value}</a>
                  :<p className="text-sm">{c.value}</p>}
                </div>
                {isCaptain&&<button onClick={()=>deleteContact(c.id)} disabled={deletingCtId===c.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 shrink-0">{deletingCtId===c.id?"…":"Delete"}</button>}
              </div>
            ))}
          </div>
        )}
      </div>}

      {false&&<div className="space-y-3">
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
        <TeamActivityFeed teamId={id} />
      </div>}
      {activeTab==="leaderboard"&&<div>
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
          {lbLoading?<div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 rounded-2xl bg-surface animate-pulse"/>)}</div>:lbData.length===0?<p className="text-sm text-foreground-dim py-6 text-center">Your crew is warming up — check back soon!</p>:(
            <div className="space-y-2">
              {lbData.map((e:any)=>(
                <div key={e.userId} className={"flex items-center gap-3 rounded-2xl border px-4 py-3 "+(e.isMe?"border-signal bg-signal/5":"border-border bg-surface")}>
                  <span className={"w-7 text-center font-bold shrink-0 "+(e.rank===1?"text-yellow-400 text-base":e.rank===2?"text-gray-400 text-base":e.rank===3?"text-amber-600 text-base":"text-foreground-dim text-xs")}>{e.rank<=3?["🥇","🥈","🥉"][e.rank-1]:`#${e.rank}`}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{e.name}{e.isMe?" (you)":""}</p>{e.bio&&<p className="text-xs text-foreground-dim truncate">{e.bio}</p>}<p className="text-xs text-foreground-dim">{e.activityCount===0?"Getting started":e.activityCount===1?"1 activity":`${e.activityCount} activities`}</p></div>
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
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.type} onChange={e=>{const t=e.target.value;if(t==="walk"){const u=countUnitsFor("walk")[0];setChallengeForm(f=>({...f,type:t,metric:"count",unit:u}));}else setChallengeForm(f=>({...f,type:t,unit:f.metric==="count"?"sessions":f.unit}));}}><option value="run">Run</option><option value="walk">Walk</option><option value="swim">Swim</option><option value="bike">Bike</option><option value="custom">Custom</option></select></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Track by</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.metric} onChange={e=>onMetricChange(e.target.value)}><option value="distance">Distance</option><option value="duration">Duration</option><option value="count">Count</option></select></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Unit</label><select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.unit} onChange={e=>setChallengeForm(f=>({...f,unit:e.target.value}))}>{(challengeForm.metric==="count"?countUnitsFor(challengeForm.type):METRIC_UNITS[challengeForm.metric]||["mi"]).map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Goal</label><input type="number" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Required" value={challengeForm.goal} onChange={e=>setChallengeForm(f=>({...f,goal:e.target.value}))}/><p className="text-xs text-foreground-dim mt-1">{challengeForm.unit==="steps"?"e.g. 10,000 steps per day":challengeForm.metric==="distance"?"e.g. 50 miles total":challengeForm.metric==="duration"?"e.g. 500 minutes":"e.g. 20 workouts"}</p><label className="flex items-center gap-1.5 mt-1.5 cursor-pointer text-xs text-foreground-dim"><input type="checkbox" checked={challengeForm.goalPerDay} onChange={e=>setChallengeForm(f=>({...f,goalPerDay:e.target.checked}))} className="rounded"/>{challengeForm.goalPerDay?"Per day goal":"Make it a per day goal"}</label></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Start date</label><input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.startDate} onChange={e=>setChallengeForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">End date</label><input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={challengeForm.endDate} onChange={e=>setChallengeForm(f=>({...f,endDate:e.target.value}))}/></div>
                <div className="col-span-2"><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Description (optional)</label><textarea className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" rows={2} value={challengeForm.description} onChange={e=>setChallengeForm(f=>({...f,description:e.target.value}))}/></div>
              </div>
              {challengeForm.unit==="steps"&&<div className="rounded-xl border border-teal-500/30 bg-teal-900/10 p-3 text-xs space-y-1.5"><p className="font-medium text-teal-400">ℹ️ Don't have a step tracker? These free apps work great:</p><p className="font-medium text-foreground-dim pt-0.5">iPhone:</p><p className="text-foreground-dim">• <a href="https://www.apple.com/ios/health/" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Apple Health</a> (built-in, no download needed)</p><p className="text-foreground-dim">• <a href="https://apps.apple.com/us/app/pedometer/id712286167" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Pedometer++</a></p><p className="font-medium text-foreground-dim pt-0.5">Android:</p><p className="text-foreground-dim">• <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.fitness" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Google Fit</a> (free)</p><p className="text-foreground-dim">• <a href="https://play.google.com/store/apps/details?id=com.sec.android.app.shealth" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Samsung Health</a> (free)</p><p className="text-foreground-dim pt-0.5">Log your daily steps in Train2Race using the <strong className="text-foreground">+ Log workout</strong> button. Select any activity type and enter your step count.</p></div>}
              <div className="flex gap-2"><button onClick={createChallenge} disabled={savingChallenge||!challengeForm.title||!challengeForm.goal||!challengeForm.startDate||!challengeForm.endDate} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{savingChallenge?(team.isAdmin||isCreator?"Creating...":"Submitting..."):(team.isAdmin||isCreator?"Create challenge":"Submit for approval")}</button><button onClick={()=>{setShowNewChallenge(false);setCreateMsg("");}} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button></div>
            </div>
          ):(
            <div>
              {challenges.some(c=>c.status==="approved"&&new Date(c.endDate)>=new Date())?<p className="text-xs text-foreground-dim italic py-2 px-1">There&apos;s already an active challenge. A new one can be created after it ends.</p>:<button onClick={()=>setShowNewChallenge(true)} className="w-full rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-sm text-foreground-dim hover:bg-surface transition-colors text-left">{team.isAdmin||isCreator?"+ Create a challenge":"+ Suggest a challenge for your team"}</button>}
              {createMsg&&<p className="text-xs text-signal mt-2 px-1">{createMsg}</p>}
            </div>
          )}
        </div>
        {/* Challenge list */}
        {!challengesLoaded?<p className="text-sm text-foreground-dim">Loading...</p>:challenges.length===0?<p className="text-sm text-foreground-dim">No active challenges. Create one and get your team moving!</p>:(
          <div className="space-y-4">
            {challenges.map(c=>{
              const isPending=c.status==="pending";const isRejected=c.status==="rejected";
              const isStepsChallenge=c.unit==="steps"&&c.metric==="count";
              const totals:{[uid:string]:{name:string;total:number;todayTotal:number}}={};
              const todayStr=new Date().toISOString().split("T")[0];
              if(isStepsChallenge&&c.stepsByUser){
                const nameMap:{[uid:string]:string}={};
                c.entries.forEach((e:any)=>{if(!nameMap[e.userId])nameMap[e.userId]=e.user.name||"?";});
                Object.entries(c.stepsByUser as Record<string,{total:number;todayTotal:number}>).forEach(([uid,st])=>{totals[uid]={name:nameMap[uid]||"?",total:st.total,todayTotal:st.todayTotal};});
              }else{
                c.entries.forEach((e:any)=>{
                  if(!totals[e.userId])totals[e.userId]={name:e.user.name||"?",total:0,todayTotal:0};
                  totals[e.userId].total+=e.value;
                  const eDay=e.date?new Date(e.date).toISOString().split("T")[0]:null;
                  if(eDay===todayStr)totals[e.userId].todayTotal+=e.value;
                });
              }
              const sorted=Object.entries(totals).sort((a,b)=>c.goalPerDay?(b[1].todayTotal-a[1].todayTotal):(b[1].total-a[1].total));
              const myEntry=totals[myUserId??''];
              const myDisplayTotal=c.goalPerDay?(myEntry?.todayTotal??0):(myEntry?.total??0);
              const pct=c.goal?Math.min(100,Math.round((myDisplayTotal/c.goal)*100)):null;
              const active=new Date()<new Date(c.endDate)&&!isPending&&!isRejected;
              return(
                <div key={c.id} id={`challenge-${c.id}`} className={"rounded-2xl border bg-surface p-5 "+(isPending?"border-yellow-700/40 opacity-80":isRejected?"border-red-700/30 opacity-60":"border-border")}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-medium text-sm">{c.title}</p>
                        {isPending&&<span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-700/40">Pending approval</span>}
                        {isRejected&&<span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-700/30">Rejected</span>}
                      </div>
                      <p className="text-xs text-foreground-dim mt-0.5 capitalize">{c.type} · {c.metric} · {c.unit}{c.goal?` · Goal: ${c.goal} ${c.unit}${c.goalPerDay?" / day":""}`:""}</p>
                      <p className="text-xs text-foreground-dim">{new Date(c.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})} – {new Date(c.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {team.isAdmin&&isPending&&<><button onClick={()=>approveChallenge(c.id,"approved")} disabled={approvingChallenge===c.id} className="text-xs text-signal hover:underline disabled:opacity-40">{approvingChallenge===c.id?"...":"Approve"}</button><button onClick={()=>approveChallenge(c.id,"rejected")} disabled={approvingChallenge===c.id} className="text-xs text-red-400 hover:underline disabled:opacity-40">Reject</button></>}
                      {active&&<button onClick={()=>openLogEntry(c)} className="text-xs text-signal hover:underline">+ Log</button>}
                      {isCaptain&&editingChallengeId!==c.id&&<button onClick={()=>{setEditingChallengeId(c.id);setEditChallengeForm({title:c.title,type:c.type,metric:c.metric,unit:c.unit,goal:c.goal!=null?String(c.goal):"",goalPerDay:!!c.goalPerDay,startDate:new Date(c.startDate).toISOString().split("T")[0],endDate:new Date(c.endDate).toISOString().split("T")[0],description:c.description||""});}} className="text-xs text-foreground-dim hover:text-signal hover:underline">Edit</button>}
                      {!isPending&&!isRejected&&!(c.acceptances||[]).includes(myUserId)&&<button onClick={()=>acceptChallenge(c.id)} disabled={acceptingChallenge===c.id} className="text-xs text-signal font-medium hover:underline disabled:opacity-40">{acceptingChallenge===c.id?"...":"Accept"}</button>}
                      {!isPending&&!isRejected&&(confirmLeaveChallenge===c.id?<><button onClick={()=>leaveChallenge(c.id)} disabled={leavingChallenge===c.id} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{leavingChallenge===c.id?"...":"Confirm"}</button><button onClick={()=>setConfirmLeaveChallenge(null)} className="text-xs text-foreground-dim hover:underline">Cancel</button></>:<button onClick={()=>setConfirmLeaveChallenge(c.id)} className="text-xs text-foreground-dim hover:text-red-400 hover:underline">Leave</button>)}
                      {team.isAdmin&&(confirmDeleteChId===c.id?<><button onClick={()=>deleteChallenge(c.id)} disabled={deletingChallenge===c.id} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{deletingChallenge===c.id?"...":"Yes, delete"}</button><button onClick={()=>setConfirmDeleteChId(null)} className="text-xs text-foreground-dim hover:underline">Cancel</button></>:<button onClick={()=>setConfirmDeleteChId(c.id)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Delete</button>)}
                    </div>
                  </div>
                  {editingChallengeId===c.id&&<div className="mb-3 p-3 rounded-xl bg-background border border-border space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input className="col-span-2 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" placeholder="Title" value={editChallengeForm.title} onChange={e=>setEditChallengeForm(f=>({...f,title:e.target.value}))}/>
                      <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.type} onChange={e=>{const t=e.target.value;if(t==="walk"){const u=countUnitsFor("walk")[0];setEditChallengeForm(f=>({...f,type:t,metric:"count",unit:u}));}else setEditChallengeForm(f=>({...f,type:t,unit:f.metric==="count"?"sessions":f.unit}));}}><option value="run">Run</option><option value="walk">Walk</option><option value="swim">Swim</option><option value="bike">Bike</option><option value="custom">Custom</option></select>
                      <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.metric} onChange={e=>{const m=e.target.value;const u=m==="count"?countUnitsFor(editChallengeForm.type)[0]:METRIC_UNITS[m]?.[0]??"mi";setEditChallengeForm(f=>({...f,metric:m,unit:u}));}}><option value="distance">Distance</option><option value="duration">Duration</option><option value="count">Count</option></select>
                      <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.unit} onChange={e=>setEditChallengeForm(f=>({...f,unit:e.target.value}))}>{(editChallengeForm.metric==="count"?countUnitsFor(editChallengeForm.type):METRIC_UNITS[editChallengeForm.metric]||["mi"]).map(u=><option key={u} value={u}>{u}</option>)}</select>
                      <div><input type="number" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" placeholder="Goal" value={editChallengeForm.goal} onChange={e=>setEditChallengeForm(f=>({...f,goal:e.target.value}))}/><label className="flex items-center gap-1.5 mt-1 cursor-pointer text-xs text-foreground-dim"><input type="checkbox" checked={editChallengeForm.goalPerDay} onChange={e=>setEditChallengeForm(f=>({...f,goalPerDay:e.target.checked}))} className="rounded"/>Per day goal</label></div>
                      <input type="date" className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.startDate} onChange={e=>setEditChallengeForm(f=>({...f,startDate:e.target.value}))}/>
                      <input type="date" className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={editChallengeForm.endDate} onChange={e=>setEditChallengeForm(f=>({...f,endDate:e.target.value}))}/>
                      <textarea className="col-span-2 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" rows={2} placeholder="Description (optional)" value={editChallengeForm.description} onChange={e=>setEditChallengeForm(f=>({...f,description:e.target.value}))}/>
                    </div>
                    <div className="flex gap-2"><button onClick={()=>saveChallengeEdit(c.id)} disabled={savingChallengeEdit||!editChallengeForm.title} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50">{savingChallengeEdit?"Saving...":"Save changes"}</button><button onClick={()=>setEditingChallengeId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">Cancel</button></div>
                  </div>}
                  {pct!==null&&!isPending&&!isRejected&&<div className="mb-3">{pct>=100?<div className="flex items-center gap-2 mb-1"><span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-700/40 font-medium">🏆 {c.goalPerDay?"Today's goal hit!":"Challenge completed!"}</span></div>:<div className="flex justify-between text-xs text-foreground-dim mb-1"><span>{c.goalPerDay?"Today":"My progress"}</span><span>{myDisplayTotal} / {c.goal} {c.unit}{c.goalPerDay?" today":""} ({pct}%)</span></div>}<div className="w-full h-2 bg-border rounded-full"><div className={"h-2 rounded-full transition-all "+(pct>=100?"bg-yellow-400":"bg-signal")} style={{width:`${Math.min(pct,100)}%`}}/></div></div>}
                  {logEntry?.challengeId===c.id&&<div className="mb-3 p-3 rounded-xl bg-background border border-border space-y-2"><div className="flex gap-2 items-center"><input type="number" placeholder={`Value in ${c.unit}`} className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.value} onChange={e=>setLogEntry(l=>l?{...l,value:e.target.value,error:undefined}:null)}/><button onClick={submitEntry} disabled={savingEntry||!logEntry.value} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50">{savingEntry?"...":"Save"}</button><button onClick={()=>setLogEntry(null)} className="text-xs text-foreground-dim hover:text-foreground">✕</button></div><input placeholder="Note (optional)" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm" value={logEntry.note} onChange={e=>setLogEntry(l=>l?{...l,note:e.target.value}:null)}/>{logEntry.error&&<p className="text-xs text-red-400">{logEntry.error}</p>}</div>}
                  {sorted.length>0&&!isPending&&!isRejected&&<div className="mt-2 space-y-1">{sorted.map(([uid,d],i)=>{const displayVal=c.goalPerDay?d.todayTotal:d.total;const hit=c.goal&&displayVal>=c.goal;return(<div key={uid} className="flex items-center justify-between text-xs"><span className="text-foreground-dim min-w-0 flex-1 truncate flex items-center gap-1">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`} {d.name}{uid===myUserId?" (you)":""}{hit&&<span className="shrink-0 text-yellow-400 font-bold">🏆</span>}</span><div className="flex items-center gap-2 ml-2 shrink-0">{team.isAdmin&&uid!==myUserId&&(confirmRemoveParticipant?.cId===c.id&&confirmRemoveParticipant?.uId===uid?<><button onClick={()=>removeParticipant(c.id,uid)} disabled={removingParticipant===`${c.id}:${uid}`} className="text-red-400 font-medium hover:underline disabled:opacity-40">{removingParticipant===`${c.id}:${uid}`?"...":"OK"}</button><button onClick={()=>setConfirmRemoveParticipant(null)} className="text-foreground-dim hover:underline">✕</button></>:<button onClick={()=>setConfirmRemoveParticipant({cId:c.id,uId:uid})} className="text-foreground-dim hover:text-red-400 hover:underline">Remove</button>)}<span className="font-medium">{displayVal} {c.unit}</span></div></div>)})}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>}
      {activeTab==="race"&&<div>
        {/* ─── Race is set ─── */}
        {team.majorRace&&!showRaceSearch&&<div>
          <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Team race</p>
                <h2 className="font-semibold text-lg leading-tight">{team.majorRace.name}</h2>
                <p className="text-sm text-foreground-dim mt-0.5">
                  {new Date(team.majorRace.raceDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
                  {team.majorRace.distanceM&&<span className="ml-1">· {(team.majorRace.distanceM/1609.34).toFixed(1)} mi</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-4xl font-bold font-data text-signal leading-none">{Math.max(0,Math.ceil((new Date(team.majorRace.raceDate).getTime()-Date.now())/86400000))}</p>
                <p className="text-xs text-foreground-dim mt-1">days to go</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
              <span className="text-xs text-foreground-dim">{raceTabData?.myJoined?"✓ You're registered for this race":"Register to train and race with your team"}</span>
              {raceTabData?.myJoined
                ?(confirmLeaveRace
                  ?<div className="flex items-center gap-2 shrink-0"><span className="text-xs text-foreground-dim">Leave race?</span><button onClick={leaveTeamRace} disabled={joiningRace} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{joiningRace?"...":"Confirm"}</button><button onClick={()=>setConfirmLeaveRace(false)} className="text-xs text-foreground-dim hover:underline">Cancel</button></div>
                  :<button onClick={()=>setConfirmLeaveRace(true)} className="text-xs text-foreground-dim hover:text-red-400 transition-colors shrink-0">Leave race</button>)
                :<button onClick={joinTeamRace} disabled={joiningRace} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0">{joiningRace?"Joining...":"Join this race"}</button>
              }
            </div>
          </div>
          {/* Member registration list */}
          <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-3">Team members registered</p>
            {!raceTabData
              ?<p className="text-sm text-foreground-dim">Loading...</p>
              :raceTabData.members.length===0
                ?<p className="text-sm text-foreground-dim">No team members registered yet.</p>
                :<div className="flex flex-wrap gap-2">
                  {raceTabData.members.map((m:any)=>(
                    <span key={m.userId} className={"text-xs px-3 py-1.5 rounded-full border "+(m.userId===myUserId?"bg-signal/10 border-signal/30 text-signal":"bg-surface-raised border-border")}>
                      {m.userId===myUserId?"You":m.name}
                    </span>
                  ))}
                </div>
            }
          </div>
          {/* Captain controls */}
          {isCaptain&&<div className="flex items-center gap-4">
            <button onClick={()=>{setShowRaceSearch(true);setConfirmSetRace(null);setRaceSearch("");setRaceResults([]);}} className="text-xs text-foreground-dim hover:text-foreground transition-colors">Change race</button>
            {confirmClearRace
              ?<div className="flex items-center gap-2"><span className="text-xs text-foreground-dim">Remove team race?</span><button onClick={clearTeamRace} disabled={clearingRace} className="text-xs text-red-400 font-medium hover:underline disabled:opacity-40">{clearingRace?"...":"Confirm"}</button><button onClick={()=>setConfirmClearRace(false)} className="text-xs text-foreground-dim hover:underline">Cancel</button></div>
              :<button onClick={()=>setConfirmClearRace(true)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Clear race</button>
            }
          </div>}
        </div>}
        {/* ─── No race set ─── */}
        {!team.majorRace&&!showRaceSearch&&<div>
          {isCaptain
            ?<div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <p className="text-sm font-medium mb-1">No team race set</p>
              <p className="text-xs text-foreground-dim mb-4">Set a target race so your team can train and race together.</p>
              <button onClick={()=>setShowRaceSearch(true)} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium">Search races</button>
            </div>
            :<div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-foreground-dim">No team race set yet. Ask your captain to add one.</p>
            </div>
          }
        </div>}
        {/* ─── Race search form (set or change) ─── */}
        {showRaceSearch&&isCaptain&&<div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{team.majorRace?"Change team race":"Set team race"}</p>
            <button onClick={()=>{setShowRaceSearch(false);setRaceSearch("");setRaceResults([]);setConfirmSetRace(null);}} className="text-xs text-foreground-dim hover:text-foreground">Cancel</button>
          </div>
          <input value={raceSearch} onChange={e=>setRaceSearch(e.target.value)} placeholder="Search races by name…" autoFocus className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-signal outline-none mb-2"/>
          {raceSearching&&<p className="text-xs text-foreground-dim mt-1">Searching...</p>}
          {!raceSearching&&raceSearch.length>=2&&raceResults.length===0&&<p className="text-xs text-foreground-dim mt-1">No upcoming races found.</p>}
          {raceResults.length>0&&!confirmSetRace&&<div className="mt-2 border border-border rounded-xl overflow-hidden">
            {raceResults.slice(0,8).map((r:any)=>(
              <button key={r.id} onClick={()=>setConfirmSetRace(r)} className="w-full text-left flex items-start justify-between px-4 py-3 hover:bg-surface-raised transition-colors border-b border-border/40 last:border-0">
                <div className="min-w-0 flex-1 mr-3"><p className="text-sm font-medium truncate">{r.name}</p><p className="text-xs text-foreground-dim">{r.city}, {r.country}</p></div>
                <div className="text-right shrink-0"><p className="text-xs text-foreground-dim">{new Date(r.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p><p className="text-xs text-foreground-dim">{(r.distanceM/1609.34).toFixed(1)} mi</p></div>
              </button>
            ))}
          </div>}
          {confirmSetRace&&<div className="mt-2 rounded-xl border border-signal/30 bg-signal/5 px-4 py-3">
            <p className="text-sm font-medium mb-0.5">Set team race to "{confirmSetRace.name}"?</p>
            <p className="text-xs text-foreground-dim mb-3">{new Date(confirmSetRace.raceDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})} · {(confirmSetRace.distanceM/1609.34).toFixed(1)} mi</p>
            <div className="flex gap-2">
              <button onClick={()=>setTeamRace(confirmSetRace)} disabled={settingRace} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50">{settingRace?"Saving...":"Confirm"}</button>
              <button onClick={()=>setConfirmSetRace(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">Back</button>
            </div>
          </div>}
        </div>}
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
                                <p className={"text-xs mt-0.5 "+(m.fromUser.id===myUserId?"opacity-70":"text-foreground-dim")}>{m.fromUser.id!==myUserId&&`${m.fromUser.name} · `}{fmtMsgDate(m.createdAt)}</p>
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

        <div className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-foreground-dim mb-0.5">Invite code</p>
            <p className="font-mono font-bold tracking-widest text-sm">{team.inviteCode}</p>
          </div>
          <button onClick={copyInviteCode} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-surface-raised transition-colors shrink-0">{copied?"Copied!":"Copy code"}</button>
        </div>

        {team.members.length === 0 && (
          <p className="text-sm text-foreground-dim py-2">No members yet.</p>
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
                {member.bio&&<p className="text-xs text-foreground-dim mt-0.5 max-w-sm">{member.bio}</p>}
                <p className="text-xs text-foreground-dim mt-0.5">Joined {new Date(member.joinedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}{member.weeklyMiles>0?` · ${member.weeklyMiles} mi this week`:""}</p>
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
                          <p className={"text-xs mt-0.5 "+(m.fromUser.id===myUserId?"opacity-70":"text-foreground-dim")}>{fmtMsgDate(m.createdAt)}</p>
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
