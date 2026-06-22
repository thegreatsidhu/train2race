export const revalidate = 0;
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMergedDailyMetrics, computeBaselineComparisons } from "@/lib/ai/metrics";
import { Waveform } from "@/components/Waveform";
import { TrendChart } from "@/components/TrendChart";
import { ActivityList } from "@/components/ActivityList";
import { WeatherWidget } from "@/components/WeatherWidget";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  easy_run:"bg-green-900/50 text-green-300 border-green-700",
  tempo:"bg-yellow-900/50 text-yellow-300 border-yellow-700",
  intervals:"bg-red-900/50 text-red-300 border-red-700",
  long_run:"bg-blue-900/50 text-blue-300 border-blue-700",
  cross_train:"bg-purple-900/50 text-purple-300 border-purple-700",
  swim:"bg-cyan-900/50 text-cyan-300 border-cyan-700",
  bike:"bg-orange-900/50 text-orange-300 border-orange-700",
  brick:"bg-pink-900/50 text-pink-300 border-pink-700",
  race:"bg-signal/20 text-signal border-signal/50",
};

function formatDuration(sec: number) {
  const h=Math.floor(sec/3600); const m=Math.floor((sec%3600)/60);
  return h>0 ? h+"h "+m+"m" : m+"m";
}

function computeFlags(comparisons: any[]) {
  const flags: {type:string;metric:string;message:string}[] = [];
  const hrv = comparisons.find(c=>c.field==="hrvMs");
  const rhr = comparisons.find(c=>c.field==="restingHeartRate");
  const sleep = comparisons.find(c=>c.field==="sleepScore");
  const recovery = comparisons.find(c=>c.field==="bodyBatteryOrRecoveryPct");
  if (hrv?.deltaPct&&hrv.deltaPct<-20) flags.push({type:"warning",metric:"HRV",message:"HRV is "+Math.abs(hrv.deltaPct)+"% below your 30-day average. Consider an easy day."});
  if (rhr?.deltaPct&&rhr.deltaPct>10) flags.push({type:"warning",metric:"Resting HR",message:"Resting HR is "+rhr.deltaPct+"% above your average. Monitor for fatigue."});
  if (sleep?.deltaPct&&sleep.deltaPct<-15) flags.push({type:"info",metric:"Sleep",message:"Sleep score is below your usual range. Prioritize recovery tonight."});
  if (recovery?.deltaPct&&recovery.deltaPct<-20) flags.push({type:"warning",metric:"Recovery",message:"Recovery is "+Math.abs(recovery.deltaPct)+"% below your baseline. Avoid hard efforts today."});
  return flags;
}

function greeting(timezone: string | null) {
  try {
    const h = parseInt(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone || "America/New_York" }));
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  } catch { return "Welcome back"; }
}

function milesLabel(distanceM: number) {
  const mi = distanceM / 1609.34;
  return mi >= 26 ? "Marathon" : mi >= 13 ? "Half marathon" : mi >= 6 ? `${mi.toFixed(0)}mi` : `${mi.toFixed(1)}mi`;
}

export default async function TodayPage() {
  const session = await auth();
  const userId = (session!.user as {id:string}).id;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const weekStart = new Date(today); weekStart.setDate(today.getDate()-today.getDay()+1);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
  const yearOut = new Date(today); yearOut.setFullYear(today.getFullYear()+1);

  const [history, hasConnection, recentActivities, activeRace, weeklyActivities, user, raceReg] = await Promise.all([
    getMergedDailyMetrics(userId, 30),
    prisma.deviceConnection.findFirst({where:{userId},select:{id:true}}),
    prisma.activity.findMany({where:{userId},orderBy:{startTime:"desc"},take:5,select:{id:true,title:true,type:true,startTime:true,durationSec:true,distanceM:true,source:true}}),
    prisma.raceTarget.findFirst({where:{userId,raceDate:{gte:today}},orderBy:{raceDate:"asc"},select:{id:true,raceName:true,raceDate:true,distanceM:true,trainingPlan:{select:{workouts:{orderBy:{date:"asc"},select:{id:true,week:true,day:true,date:true,type:true,title:true,distanceKm:true,durationMin:true,completed:true}}}}}}),
    prisma.activity.findMany({where:{userId,startTime:{gte:weekStart,lte:weekEnd}},select:{distanceM:true,durationSec:true,type:true}}),
    prisma.user.findUnique({where:{id:userId},select:{name:true,timezone:true}}),
    prisma.raceRegistration.findFirst({where:{userId,majorRace:{raceDate:{gte:today},status:"active"}},orderBy:{majorRace:{raceDate:"asc"}},include:{majorRace:{select:{id:true,name:true,city:true,country:true,raceDate:true}}}}),
  ]);

  const country = raceReg?.majorRace?.country ?? null;
  const [upcomingRaces, primaryTeam] = await Promise.all([
    prisma.majorRace.findMany({
      where:{status:"active",raceDate:{gte:today,lte:yearOut},...(country?{country}:{})},
      orderBy:{raceDate:"asc"},take:6,
      select:{id:true,name:true,city:true,country:true,raceDate:true,distanceM:true,_count:{select:{registrations:true}}},
    }),
    prisma.team.findFirst({
      where:{members:{some:{userId}}},
      orderBy:{createdAt:"desc"},
      include:{members:{include:{user:{select:{id:true,name:true,trainingPlans:{take:1,orderBy:{createdAt:"desc"},select:{_count:{select:{workouts:true}},workouts:{where:{completed:true},select:{id:true}}}}}}},orderBy:{joinedAt:"asc"}}},
    }),
  ]);

  const comparisons = computeBaselineComparisons(history);
  const latest = history[history.length-1];
  const hasData = history.length > 0;
  const flags = hasData ? computeFlags(comparisons) : [];
  const weeklyMiles = weeklyActivities.reduce((s,a)=>s+(a.distanceM||0)/1609.34,0);
  const weeklyTime = weeklyActivities.reduce((s,a)=>s+(a.durationSec||0),0);
  const plan = activeRace?.trainingPlan;
  const allWorkouts = plan?.workouts??[];
  const totalWorkouts = allWorkouts.length;
  const doneWorkouts = allWorkouts.filter(w=>w.completed).length;
  const pct = totalWorkouts>0?Math.round((doneWorkouts/totalWorkouts)*100):0;
  const daysToRace = activeRace?Math.ceil((new Date(activeRace.raceDate).getTime()-today.getTime())/(1000*60*60*24)):0;
  const thisWeekWorkouts = allWorkouts.filter(w=>{const d=new Date(w.date);return d>=weekStart&&d<=weekEnd;});
  const todaysWorkout = thisWeekWorkouts.find(w=>w.day===todayDay);
  const upcomingWorkouts = thisWeekWorkouts.filter(w=>{const d=new Date(w.date);d.setHours(0,0,0,0);return d>today&&!w.completed;}).slice(0,2);
  const hrvComparison = comparisons.find(c=>c.field==="hrvMs");
  const sleepComparison = comparisons.find(c=>c.field==="sleepScore");
  const recoveryComparison = comparisons.find(c=>c.field==="bodyBatteryOrRecoveryPct");
  const rhrComparison = comparisons.find(c=>c.field==="restingHeartRate");
  const userName = user?.name?.split(" ")[0] ?? "Athlete";
  const greetingText = greeting(user?.timezone ?? null);

  const leaderboard = primaryTeam ? primaryTeam.members.map(m => {
    const p = m.user.trainingPlans[0];
    const total = p?._count?.workouts ?? 0;
    const done = p?.workouts?.length ?? 0;
    return { userId: m.user.id, name: m.user.name || "Anonymous", pct: total > 0 ? Math.round((done/total)*100) : 0, isMe: m.userId === userId };
  }).sort((a,b)=>b.pct-a.pct).slice(0,5) : [];

  const isNewUser = !hasConnection && !activeRace && !hasData && recentActivities.length === 0;

  return (
    <div className="max-w-4xl px-4 md:px-8 py-6 md:py-10">

      {/* Welcome */}
      <header className="mb-8">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-1">
          {today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{greetingText}, {userName}</h1>
        {isNewUser && <p className="text-foreground-dim text-sm mt-2">Let's get your training set up.</p>}
      </header>

      {/* Getting started — shown to brand new users with nothing connected */}
      {isNewUser && (
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-1">Welcome to Train2Race</h2>
            <p className="text-sm text-foreground-dim mb-4">Get the most out of your training by completing these steps.</p>
            <div className="space-y-2">
              {[
                { href:"/dashboard/races", label:"Add a target race", desc:"Set your goal race and generate a training plan" },
                { href:"/dashboard/connections", label:"Connect a device", desc:"Sync your Garmin, Whoop, or Apple Watch for recovery insights" },
                { href:"/dashboard/log-workout", label:"Log your first workout", desc:"Manually record a run, ride, or swim" },
                { href:"/dashboard/teams", label:"Join or create a team", desc:"Train alongside your crew and see the leaderboard" },
              ].map(item=>(
                <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 hover:bg-surface-raised transition-colors group">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-foreground-dim">{item.desc}</p>
                  </div>
                  <span className="text-foreground-dim group-hover:text-foreground ml-3 transition-colors">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Race training card */}
      {activeRace && (
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Training for</p>
                <h2 className="font-semibold">{activeRace.raceName}</h2>
                <p className="text-xs text-foreground-dim mt-0.5">{daysToRace} day{daysToRace===1?"":"s"} away</p>
              </div>
              <Link href={"/dashboard/races/"+activeRace.id} className="text-xs text-signal hover:underline shrink-0 ml-4">Full plan</Link>
            </div>
            <div className="px-5 py-3 border-b border-border">
              <div className="flex justify-between text-xs text-foreground-dim mb-1.5">
                <span>{doneWorkouts}/{totalWorkouts} workouts</span><span>{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full">
                <div className="h-1.5 bg-signal rounded-full transition-all" style={{width:pct+"%"}}/>
              </div>
            </div>
            <div className="px-5 py-4">
              {(!plan||totalWorkouts===0)?(
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground-dim">No training plan yet.</p>
                  <Link href={"/dashboard/races/"+activeRace.id} className="text-xs text-signal hover:underline">Build a plan</Link>
                </div>
              ):todaysWorkout?(
                <div>
                  <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Today</p>
                  <div className={"rounded-xl border p-3 "+(TYPE_COLORS[todaysWorkout.type]||"bg-surface border-border")+" "+(todaysWorkout.completed?"opacity-50":"")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{todaysWorkout.title}</p>
                        <p className="text-xs mt-0.5 opacity-75">{todaysWorkout.distanceKm?(todaysWorkout.distanceKm/1.60934).toFixed(1)+" mi":""}{todaysWorkout.durationMin?" "+todaysWorkout.durationMin+" min":""}</p>
                      </div>
                      {todaysWorkout.completed?<span className="text-xs bg-signal/20 text-signal px-2 py-1 rounded-full">Done</span>:<Link href={"/dashboard/races/"+activeRace.id} className="text-xs bg-background/30 px-3 py-1.5 rounded-full">Log it</Link>}
                    </div>
                  </div>
                </div>
              ):<p className="text-sm text-foreground-dim">Rest day — no workout scheduled today.</p>}
              {upcomingWorkouts.length>0&&(
                <div className="mt-3">
                  <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Coming up</p>
                  <div className="flex gap-2 flex-wrap">
                    {upcomingWorkouts.map(w=>(
                      <div key={w.id} className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border rounded-lg px-2.5 py-1.5">
                        <span className="text-foreground-dim">{w.day.slice(0,3)}</span>
                        <span className="font-medium">{w.title}</span>
                        {w.distanceKm&&<span className="text-foreground-dim">{(w.distanceKm/1.60934).toFixed(1)}mi</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!activeRace&&!isNewUser&&(
        <div className="rounded-2xl border border-border bg-surface p-5 mb-6 flex items-center justify-between">
          <p className="text-sm text-foreground-dim">No upcoming race set.</p>
          <Link href="/dashboard/races" className="text-sm text-signal hover:underline ml-4">Add a race →</Link>
        </div>
      )}

      {/* Weather + Team leaderboard */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <WeatherWidget raceCity={raceReg?.majorRace?.city ?? null} raceCountry={raceReg?.majorRace?.country ?? null} />

        {primaryTeam && leaderboard.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide">Team leaderboard</p>
              <Link href={"/dashboard/teams/"+primaryTeam.id} className="text-xs text-signal hover:underline">{primaryTeam.name} →</Link>
            </div>
            <div className="space-y-2">
              {leaderboard.map((m,i)=>(
                <div key={m.userId} className={"flex items-center justify-between rounded-lg px-3 py-2 "+(m.isMe?"bg-signal/10 border border-signal/20":"bg-background border border-border")}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                    <p className="text-sm font-medium">{m.name.split(" ")[0]}{m.isMe?" (you)":""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-border rounded-full hidden sm:block">
                      <div className={"h-1.5 rounded-full "+(m.isMe?"bg-signal":i===0?"bg-yellow-400":"bg-foreground-dim")} style={{width:m.pct+"%"}}/>
                    </div>
                    <span className="text-xs text-foreground-dim w-8 text-right">{m.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!primaryTeam && (
          <Link href="/dashboard/teams" className="rounded-2xl border border-border bg-surface p-5 hover:bg-surface-raised transition-colors block">
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Team leaderboard</p>
            <p className="text-sm text-foreground-dim mb-3">Join or create a team to see how you stack up against your training partners.</p>
            <span className="text-xs text-signal">Find a team →</span>
          </Link>
        )}
      </div>

      {/* Upcoming races */}
      {upcomingRaces.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-foreground-dim mb-3">
            Upcoming races{country ? ` in ${country}` : ""}
          </h2>
          <div className="space-y-2">
            {upcomingRaces.map(race=>{
              const isRegistered = raceReg?.majorRace?.id === race.id;
              const daysAway = Math.ceil((new Date(race.raceDate).getTime()-today.getTime())/(1000*60*60*24));
              return (
                <div key={race.id} className={"rounded-xl border bg-surface px-4 py-3 flex items-center justify-between "+(isRegistered?"border-signal/40":"border-border")}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{race.name}</p>
                      {isRegistered && <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">Registered</span>}
                    </div>
                    <p className="text-xs text-foreground-dim mt-0.5">{race.city}, {race.country} · {milesLabel(race.distanceM)}</p>
                    <p className="text-xs text-foreground-dim">{new Date(race.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {daysAway} days away · {race._count.registrations} registered</p>
                  </div>
                  <Link href={`/community/${race.id}`} className="text-xs text-signal hover:underline shrink-0 ml-4">View →</Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Connect device prompt — shown when user has activity but no device */}
      {!hasConnection && !isNewUser && (
        <div className="rounded-2xl border border-border bg-surface p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Connect a wearable</p>
            <p className="text-xs text-foreground-dim mt-0.5">Sync Garmin, Whoop, or Apple Watch to unlock recovery insights.</p>
          </div>
          <Link href="/dashboard/connections" className="px-4 py-2 rounded-full bg-signal text-background text-xs font-medium ml-4 shrink-0">Connect</Link>
        </div>
      )}

      {/* Health metrics */}
      {hasData&&(
        <>
          {flags.length===0?(
            <div className="rounded-2xl border border-border bg-surface px-5 py-3 mb-6 flex items-center gap-2">
              <span className="text-signal text-sm">OK</span>
              <p className="text-sm text-foreground-dim">All metrics within your normal range. Good to train.</p>
            </div>
          ):(
            <div className="space-y-2 mb-6">
              {flags.map((flag,i)=>(
                <div key={i} className={"rounded-2xl border px-5 py-3 flex items-start gap-3 "+(flag.type==="warning"?"border-yellow-600/40 bg-yellow-900/10":"border-border bg-surface")}>
                  <span className={"text-sm shrink-0 "+(flag.type==="warning"?"text-yellow-400":"text-foreground-dim")}>{flag.type==="warning"?"!":"i"}</span>
                  <div>
                    <p className={"text-xs font-medium mb-0.5 "+(flag.type==="warning"?"text-yellow-400":"text-foreground-dim")}>{flag.metric}</p>
                    <p className="text-sm text-foreground-dim">{flag.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <section className="mb-6">
            <div className="grid grid-cols-3 gap-3">
              <MetricTile label="HRV" value={latest?.hrvMs} unit="ms" comparison={hrvComparison}/>
              <MetricTile label="Sleep" value={latest?.sleepScore} unit="" comparison={sleepComparison}/>
              <MetricTile label="Recovery" value={latest?.bodyBatteryOrRecoveryPct} unit="%" comparison={recoveryComparison}/>
            </div>
          </section>
          <section className="mb-6">
            <div className="rounded-2xl border border-border bg-surface p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-data text-xs text-foreground-dim uppercase tracking-wide">Resting heart rate</span>
                <span className="font-data text-2xl text-signal">{latest?.restingHeartRate??"--"} <span className="text-sm text-foreground-dim">bpm</span></span>
              </div>
              <Waveform restingHeartRate={latest?.restingHeartRate??60} className="h-14"/>
            </div>
          </section>
          <section className="mb-6">
            <h2 className="text-sm font-medium text-foreground-dim mb-3">This week</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Miles</p><p className="font-data text-xl">{weeklyMiles.toFixed(1)}</p></div>
              <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Time</p><p className="font-data text-xl">{weeklyTime>0?formatDuration(weeklyTime):"--"}</p></div>
              <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Activities</p><p className="font-data text-xl">{weeklyActivities.length}</p></div>
            </div>
          </section>
          <section className="mb-6 md:mb-8">
            <h2 className="text-sm font-medium text-foreground-dim mb-3">30-day trend</h2>
            <TrendChart history={history}/>
          </section>
        </>
      )}

      {/* Recent activity */}
      {recentActivities.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground-dim">Recent activity</h2>
            <Link href="/dashboard/log-workout" className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium">+ Log workout</Link>
          </div>
          <ActivityList activities={recentActivities.map(a=>({id:a.id,title:a.title,type:a.type,startTime:a.startTime,durationSec:a.durationSec,distanceM:a.distanceM,source:a.source}))}/>
        </section>
      )}

      {!hasData && !isNewUser && recentActivities.length === 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-dim">No activities yet.</p>
          <Link href="/dashboard/log-workout" className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium">+ Log workout</Link>
        </div>
      )}
    </div>
  );
}

function MetricTile({label,value,unit,comparison,invertGood=false}:{label:string;value?:number|null;unit:string;comparison?:{direction:"up"|"down"|"flat"|"unknown";deltaPct?:number};invertGood?:boolean}) {
  const direction=comparison?.direction??"unknown";
  const isGood=invertGood?direction==="down":direction==="up";
  const isBad=invertGood?direction==="up":direction==="down";
  const color=isGood?"text-signal":isBad?"text-alert":"text-foreground-dim";
  const arrow=direction==="up"?"↑":direction==="down"?"↓":direction==="flat"?"→":"";
  return(
    <div className="rounded-xl border border-border bg-surface px-3 md:px-4 py-3">
      <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">{label}</p>
      <p className="font-data text-lg md:text-xl">{value!=null?Math.round(value*10)/10:"--"}<span className="text-xs text-foreground-dim ml-1">{unit}</span></p>
      {comparison?.deltaPct!=null&&<p className={"text-xs "+color+" mt-0.5"}>{arrow} {Math.abs(comparison.deltaPct)}% vs 30d</p>}
    </div>
  );
}
