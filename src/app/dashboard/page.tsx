export const revalidate = 3600;
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMergedDailyMetrics, computeBaselineComparisons } from "@/lib/ai/metrics";
import { Waveform } from "@/components/Waveform";
import { TrendChart } from "@/components/TrendChart";
import { ActivityList } from "@/components/ActivityList";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  easy_run:"bg-green-900/50 text-green-300 border-green-700",tempo:"bg-yellow-900/50 text-yellow-300 border-yellow-700",
  intervals:"bg-red-900/50 text-red-300 border-red-700",long_run:"bg-blue-900/50 text-blue-300 border-blue-700",
  cross_train:"bg-purple-900/50 text-purple-300 border-purple-700",swim:"bg-cyan-900/50 text-cyan-300 border-cyan-700",
  bike:"bg-orange-900/50 text-orange-300 border-orange-700",brick:"bg-pink-900/50 text-pink-300 border-pink-700",
  race:"bg-signal/20 text-signal border-signal/50",
};

function formatDuration(sec: number) { const h=Math.floor(sec/3600);const m=Math.floor((sec%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`; }

function computeFlags(comparisons: any[]) {
  const flags: {type:string;metric:string;message:string}[] = [];
  const hrv = comparisons.find(c=>c.field==="hrvMs");
  const rhr = comparisons.find(c=>c.field==="restingHeartRate");
  const sleep = comparisons.find(c=>c.field==="sleepScore");
  const recovery = comparisons.find(c=>c.field==="bodyBatteryOrRecoveryPct");
  if (hrv?.deltaPct&&hrv.deltaPct<-20) flags.push({type:"warning",metric:"HRV",message:`HRV is ${Math.abs(hrv.deltaPct)}% below your 30-day average. Consider an easy day.`});
  if (rhr?.deltaPct&&rhr.deltaPct>10) flags.push({type:"warning",metric:"Resting HR",message:`Resting HR is ${rhr.deltaPct}% above your average. Monitor for fatigue.`});
  if (sleep?.deltaPct&&sleep.deltaPct<-15) flags.push({type:"info",metric:"Sleep",message:"Sleep score is below your usual range. Prioritize recovery tonight."});
  if (recovery?.deltaPct&&recovery.deltaPct<-20) flags.push({type:"warning",metric:"Recovery",message:`Recovery is ${Math.abs(recovery.deltaPct)}% below your baseline. Avoid hard efforts today.`});
  return flags;
}

export default async function TodayPage() {
  const session = await auth();
  const userId = (session!.user as {id:string}).id;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const weekStart = new Date(today); weekStart.setDate(today.getDate()-today.getDay()+1);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);

  const [history, hasConnection, recentActivities, activeRace, weeklyActivities] = await Promise.all([
    getMergedDailyMetrics(userId, 30),
    prisma.deviceConnection.findFirst({where:{userId},select:{id:true}}),
    prisma.activity.findMany({where:{userId},orderBy:{startTime:"desc"},take:5,select:{id:true,title:true,type:true,startTime:true,durationSec:true,distanceM:true,source:true}}),
    prisma.raceTarget.findFirst({where:{userId,raceDate:{gte:today}},orderBy:{raceDate:"asc"},select:{id:true,raceName:true,raceDate:true,distanceM:true,trainingPlan:{select:{workouts:{orderBy:{date:"asc"},select:{id:true,week:true,day:true,date:true,type:true,title:true,distanceKm:true,durationMin:true,completed:true}}}}}}),
    prisma.activity.findMany({where:{userId,startTime:{gte:weekStart,lte:weekEnd}},select:{distanceM:true,durationSec:true,type:true}}),
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

  return (
    <div className="max-w-4xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6 md:mb-8">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-2">{today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Today</h1>
      </header>

      {activeRace&&plan&&totalWorkouts>0&&(
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div><p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Training for</p><h2 className="font-semibold">{activeRace.raceName}</h2><p className="text-xs text-foreground-dim mt-0.5">{daysToRace} day{daysToRace===1?"":"s"} away</p></div>
              <Link href={`/dashboard/races/${activeRace.id}`} className="text-xs text-signal hover:underline shrink-0 ml-4">Full plan</Link>
            </div>
            <div className="px-5 py-3 border-b border-border">
              <div className="flex justify-between text-xs text-foreground-dim mb-1.5"><span>{doneWorkouts}/{totalWorkouts} workouts</span><span>{pct}%</span></div>
              <div className="w-full h-1.5 bg-border rounded-full"><div className="h-1.5 bg-signal rounded-full" style={{width:`${pct}%`}}/></div>
            </div>
            <div className="px-5 py-4">
              {todaysWorkout?(
                <div><p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Today</p>
                  <div className={`rounded-xl border p-3 ${TYPE_COLORS[todaysWorkout.type]||"bg-surface border-border"} ${todaysWorkout.completed?"opacity-50":""}`}>
                    <div className="flex items-center justify-between">
                      <div><p className="font-medium text-sm">{todaysWorkout.title}</p><p className="text-xs mt-0.5 opacity-75">{todaysWorkout.distanceKm?`${(todaysWorkout.distanceKm/1.60934).toFixed(1)} mi`:""}{todaysWorkout.durationMin?` ${todaysWorkout.durationMin} min`:""}</p></div>
                      {todaysWorkout.completed?<span className="text-xs bg-signal/20 text-signal px-2 py-1 rounded-full">Done</span>:<Link href={`/dashboard/races/${activeRace.id}`} className="text-xs bg-background/30 px-3 py-1.5 rounded-full">Log it</Link>}
                    </div>
                  </div>
                </div>
              ):<p className="text-sm text-foreground-dim">No workout today.</p>}
              {upcomingWorkouts.length>0&&(
                <div className="mt-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Coming up</p>
                  <div className="flex gap-2 flex-wrap">{upcomingWorkouts.map(w=>(
                    <div key={w.id} className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border rounded-lg px-2.5 py-1.5">
                      <span className="text-foreground-dim">{w.day.slice(0,3)}</span><span className="font-medium">{w.title}</span>{w.distanceKm&&<span className="text-foreground-dim">{(w.distanceKm/1.60934).toFixed(1)}mi</span>}
                    </div>
                  ))}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!activeRace&&<div className="rounded-2xl border border-border bg-surface p-5 mb-6 flex items-center justify-between"><p className="text-sm text-foreground-dim">No upcoming race.</p><Link href="/dashboard/races" className="text-sm text-signal hover:underline ml-4">Add race</Link></div>}

      {!hasConnection&&(
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-medium mb-1">Connect a device</h2>
          <p className="text-sm text-foreground-dim mb-3">Connect your wearable to see your recovery metrics.</p>
          <Link href="/dashboard/connections" className="inline-block px-4 py-2 rounded-full bg-signal text-background text-sm font-medium">Connect device</Link>
        </div>
      )}

      {hasData&&(
        <>
          {flags.length===0?(
            <div className="rounded-2xl border border-border bg-surface px-5 py-3 mb-6 flex items-center gap-2">
              <span className="text-signal text-sm">checkmark</span>
              <p className="text-sm text-foreground-dim">All metrics within your normal range. Good to train.</p>
            </div>
          ):(
            <div className="space-y-2 mb-6">{flags.map((flag,i)=>(
              <div key={i} className={"rounded-2xl border px-5 py-3 flex items-start gap-3 "+(flag.type==="warning"?"border-yellow-600/40 bg-yellow-900/10":"border-border bg-surface")}>
                <span className={"text-sm shrink-0 "+(flag.type==="warning"?"text-yellow-400":"text-foreground-dim")}>{flag.type==="warning"?"!":"i"}</span>
                <div><p className={"text-xs font-medium mb-0.5 "+(flag.type==="warning"?"text-yellow-400":"text-foreground-dim")}>{flag.metric}</p><p className="text-sm text-foreground-dim">{flag.message}</p></div>
              </div>
            ))}</div>
          )}

          <section className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {fitnessScore!==null&&<div className="col-span-2 md:col-span-1 rounded-xl border border-border bg-surface px-4 py-4"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Fitness score</p><p className="font-data text-3xl text-signal">{fitnessScore}</p><p className="text-xs text-foreground-dim mt-1">{fitnessScore>=75?"Ready to train hard":fitnessScore>=55?"Moderate effort":"Recovery day"}</p></div>}
              <MetricTile label="HRV" value={latest?.hrvMs} unit="ms" comparison={hrvComparison}/>
              <MetricTile label="Sleep" value={latest?.sleepScore} unit="" comparison={sleepComparison}/>
              <MetricTile label="Recovery" value={latest?.bodyBatteryOrRecoveryPct} unit="%" comparison={recoveryComparison}/>
            </div>
          </section>

          <section className="mb-6">
            <div className="rounded-2xl border border-border bg-surface p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div><span className="font-data text-xs text-foreground-dim uppercase tracking-wide">Resting heart rate</span>{rhrComparison&&<span className={"ml-2 text-xs "+(rhrComparison.direction==="down"?"text-signal":rhrComparison.direction==="up"?"text-alert":"text-foreground-dim")}>{rhrComparison.direction==="down"?"down":rhrComparison.direction==="up"?"up":"flat"} {rhrComparison.deltaPct?Math.abs(rhrComparison.deltaPct)+"% vs 30d":""}</span>}</div>
                <span className="font-data text-2xl text-signal">{latest?.restingHeartRate??"ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"} <span className="text-sm text-foreground-dim">bpm</span></span>
              </div>
              <Waveform restingHeartRate={latest?.restingHeartRate??60} className="h-14"/>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-sm font-medium text-foreground-dim mb-3">This week</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Miles</p><p className="font-data text-xl">{weeklyMiles.toFixed(1)}</p></div>
              <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Time</p><p className="font-data text-xl">{weeklyTime>0?formatDuration(weeklyTime):"ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"}</p></div>
              <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Activities</p><p className="font-data text-xl">{weeklyActivities.length}</p></div>
            </div>
          </section>

          <section className="mb-6 md:mb-8"><h2 className="text-sm font-medium text-foreground-dim mb-3">30-day trend</h2><TrendChart history={history}/></section>

          <section>
            <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-medium text-foreground-dim">Recent activity</h2><Link href="/dashboard/log-workout" className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium">+ Log workout</Link></div>
            <ActivityList activities={recentActivities.map(a=>({id:a.id,title:a.title,type:a.type,startTime:a.startTime,durationSec:a.durationSec,distanceM:a.distanceM,source:a.source}))}/>
          </section>
        </>
      )}
    </div>
  );
}

function MetricTile({label,value,unit,comparison,invertGood=false}:{label:string;value?:number|null;unit:string;comparison?:{direction:"up"|"down"|"flat"|"unknown";deltaPct?:number};invertGood?:boolean}) {
  const direction=comparison?.direction??"unknown";
  const isGood=invertGood?direction==="down":direction==="up";
  const isBad=invertGood?direction==="up":direction==="down";
  const color=isGood?"text-signal":isBad?"text-alert":"text-foreground-dim";
  const arrow=direction==="up"?"up":direction==="down"?"dn":direction==="flat"?"flat":"";
  return(
    <div className="rounded-xl border border-border bg-surface px-3 md:px-4 py-3">
      <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">{label}</p>
      <p className="font-data text-lg md:text-xl">{value!=null?Math.round(value*10)/10:"ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"}<span className="text-xs text-foreground-dim ml-1">{unit}</span></p>
      {comparison?.deltaPct!=null&&<p className={`text-xs ${color} mt-0.5`}>{arrow} {Math.abs(comparison.deltaPct)}% vs 30d</p>}
    </div>
  );
}