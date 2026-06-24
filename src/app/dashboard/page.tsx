export const revalidate = 0;
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMergedDailyMetrics, computeBaselineComparisons } from "@/lib/ai/metrics";
import { ActivityList } from "@/components/ActivityList";
import { LocalSection } from "@/components/LocalSection";
import { UpcomingRacesSection } from "@/components/UpcomingRacesSection";
import { TeamInvitations } from "@/components/TeamInvitations";
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

const QUOTES = [
  { text: "The miracle isn't that I finished. The miracle is that I had the courage to start.", author: "John Bingham" },
  { text: "Pain is inevitable. Suffering is optional.", author: "Haruki Murakami" },
  { text: "To give anything less than your best is to sacrifice the gift.", author: "Steve Prefontaine" },
  { text: "Ask yourself: 'Can I give more?' The answer is usually: 'Yes'.", author: "Paul Tergat" },
  { text: "Run when you can, walk when you have to, crawl if you must; just never give up.", author: "Dean Karnazes" },
  { text: "Champions are made from something deep inside — a desire, a dream, a vision.", author: "Muhammad Ali" },
  { text: "The body does not want you to do this. As you run, it tells you to stop but the mind must be strong.", author: "Haile Gebrselassie" },
  { text: "Somewhere in the world someone is training when you are not. When you race him, he will win.", author: "Tom Fleming" },
  { text: "You have a choice. You can throw in the towel, or you can use it to wipe the sweat off your face.", author: "Unknown" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Most people never run far enough on their first wind to find out they've got a second.", author: "William James" },
  { text: "Believe that you can run farther or faster. Believe that you're strong enough, tough enough.", author: "John Bingham" },
  { text: "The obsession with running is really an obsession with the potential for more and more life.", author: "George Sheehan" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Every morning you have two choices: continue to sleep with your dreams, or wake up and chase them.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
  { text: "Don't count the miles; make the miles count.", author: "Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The hardest step for a runner is the first one out the door.", author: "Unknown" },
  { text: "Running is the greatest metaphor for life, because you get out of it what you put into it.", author: "Oprah Winfrey" },
  { text: "Act like a horse. Be dumb. Just run.", author: "Jumbo Elliott" },
  { text: "There will be days when I don't know if I can run a marathon. Those are the days I run a marathon.", author: "Unknown" },
  { text: "Hills are just speed work in disguise.", author: "Frank Shorter" },
  { text: "The voice inside your head that says you can't do this is a liar.", author: "Unknown" },
  { text: "I run because if I didn't, I'd be sluggish and glum and spend too much time on the couch.", author: "Paul Carrozza" },
  { text: "That's the thing about running: your greatest runs are rarely measured in how fast or slow you ran. They are measured in moments.", author: "Dean Karnazes" },
  { text: "What seems hard now will one day be your warm-up.", author: "Unknown" },
  { text: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.", author: "Dwayne Johnson" },
  { text: "The more difficult the victory, the greater the happiness in winning.", author: "Pelé" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "You miss 100% of the workouts you skip.", author: "Unknown" },
  { text: "Motivation gets you started. Habit keeps you going.", author: "Jim Ryun" },
  { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
  { text: "The finish line is just the beginning of a whole new race.", author: "Unknown" },
  { text: "One step at a time is all it takes to get you there.", author: "Emily Dickinson" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Unknown" },
  { text: "Life is short. Run fast.", author: "Unknown" },
  { text: "Your only competition is who you were yesterday.", author: "Unknown" },
  { text: "A mile is a mile whether you run it fast or slow — but you'll feel better about the fast one.", author: "Unknown" },
  { text: "Courage is not having the strength to go on; it is going on when you don't have the strength.", author: "Theodore Roosevelt" },
  { text: "You are stronger than you think.", author: "Unknown" },
  { text: "Train hard, win easy.", author: "Unknown" },
  { text: "Excellence is not a destination; it is a continuous journey that never ends.", author: "Brian Tracy" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "You were built for this. Every mile, every rep, every early morning led here.", author: "Unknown" },
];

const TIMEZONE_CITY: Record<string, string> = {
  "America/New_York":"New York","America/Chicago":"Chicago","America/Los_Angeles":"Los Angeles",
  "America/Denver":"Denver","America/Phoenix":"Phoenix","America/Anchorage":"Anchorage",
  "Pacific/Honolulu":"Honolulu","America/Toronto":"Toronto","America/Vancouver":"Vancouver",
  "America/Montreal":"Montreal","America/Calgary":"Calgary","Europe/London":"London",
  "Europe/Paris":"Paris","Europe/Berlin":"Berlin","Europe/Amsterdam":"Amsterdam",
  "Europe/Madrid":"Madrid","Europe/Rome":"Rome","Europe/Zurich":"Zurich",
  "Europe/Stockholm":"Stockholm","Asia/Tokyo":"Tokyo","Asia/Shanghai":"Shanghai",
  "Asia/Singapore":"Singapore","Asia/Seoul":"Seoul","Asia/Dubai":"Dubai",
  "Asia/Mumbai":"Mumbai","Australia/Sydney":"Sydney","Australia/Melbourne":"Melbourne",
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

function getGreeting(timezone: string | null) {
  try {
    const h = parseInt(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone || "America/New_York" }));
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  } catch { return "Welcome back"; }
}

function raceMessage(days: number): string {
  if (days === 0) return "Race day is TODAY — go get it.";
  if (days <= 7) return "Race week. Trust your training — you've earned this.";
  if (days <= 14) return "Two weeks out. Taper smart and stay healthy.";
  if (days <= 30) return "Final month. Every workout matters now.";
  if (days <= 60) return "Eight weeks out. This is where champions are made.";
  if (days <= 90) return "Stay consistent. The work you do today compounds.";
  return "Long runway ahead — build the base, stack the miles.";
}

function computeStreak(activities: { startTime: Date }[], today: Date): number {
  const days = new Set(activities.map(a => { const d = new Date(a.startTime); d.setHours(0,0,0,0); return d.getTime(); }));
  let streak = 0;
  const d = new Date(today);
  while (days.has(d.getTime())) { streak++; d.setDate(d.getDate()-1); }
  return streak;
}

function milesLabel(distanceM: number) {
  const mi = distanceM / 1609.34;
  return mi >= 26 ? "Marathon" : mi >= 13 ? "Half marathon" : `${mi.toFixed(1)}mi`;
}

export default async function TodayPage() {
  const session = await auth();
  const userId = (session!.user as {id:string}).id;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const weekStart = new Date(today); weekStart.setDate(today.getDate()-today.getDay()+1);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const fortyFiveDaysAgo = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(),0,0).getTime()) / 86400000);

  const [history, hasConnection, recentActivities, activeRace, weeklyActivities, user, raceReg, recentForStreak] = await Promise.all([
    getMergedDailyMetrics(userId, 30),
    prisma.deviceConnection.findFirst({where:{userId},select:{id:true}}),
    prisma.activity.findMany({where:{userId},orderBy:{startTime:"desc"},take:7,select:{id:true,title:true,type:true,startTime:true,durationSec:true,distanceM:true,source:true,raw:true}}),
    prisma.raceTarget.findFirst({where:{userId,raceDate:{gte:today}},orderBy:{raceDate:"asc"},select:{id:true,raceName:true,raceDate:true,distanceM:true,trainingPlan:{select:{workouts:{orderBy:{date:"asc"},select:{id:true,week:true,day:true,date:true,type:true,title:true,distanceKm:true,durationMin:true,completed:true}}}}}}),
    prisma.activity.findMany({where:{userId,startTime:{gte:weekStart,lte:weekEnd}},select:{distanceM:true,durationSec:true,type:true}}),
    prisma.user.findUnique({where:{id:userId},select:{name:true,timezone:true}}),
    prisma.raceRegistration.findFirst({where:{userId,majorRace:{raceDate:{gte:today},status:"active"}},orderBy:{majorRace:{raceDate:"asc"}},include:{majorRace:{select:{id:true,name:true,city:true,country:true,raceDate:true}}}}),
    prisma.activity.findMany({where:{userId,startTime:{gte:fortyFiveDaysAgo}},select:{startTime:true,distanceM:true},orderBy:{startTime:"desc"}}),
  ]);

  const primaryTeam = await prisma.team.findFirst({
    where:{members:{some:{userId}}},
    orderBy:{createdAt:"desc"},
    include:{members:{include:{user:{select:{id:true,name:true,trainingPlans:{take:1,orderBy:{createdAt:"desc"},select:{_count:{select:{workouts:true}},workouts:{where:{completed:true},select:{id:true}}}}}}},orderBy:{joinedAt:"asc"}}},
  });

  let activeChallenges: any[] = [];
  try {
    activeChallenges = await (prisma as any).teamChallenge.findMany({
      where:{team:{members:{some:{userId}}},endDate:{gte:today}},
      include:{team:{select:{id:true,name:true}},entries:{where:{userId},select:{value:true}}},
      orderBy:{endDate:"asc"},
      take:10,
    });
  } catch {}

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
  const greetingText = getGreeting(user?.timezone ?? null);
  const timezoneCity = TIMEZONE_CITY[user?.timezone ?? ""] ?? null;
  const raceCity = raceReg?.majorRace?.city ?? null;
  const quote = QUOTES[dayOfYear % QUOTES.length];
  const streak = computeStreak(recentForStreak, today);
  const monthlyMiles = recentForStreak.filter(a=>new Date(a.startTime)>=monthStart).reduce((s,a)=>s+(a.distanceM||0)/1609.34,0);
  const isNewUser = !hasConnection && !activeRace && !hasData && recentActivities.length === 0;

  const leaderboard = primaryTeam ? primaryTeam.members.map(m => {
    const p = m.user.trainingPlans[0];
    const total = p?._count?.workouts ?? 0;
    const done = p?.workouts?.length ?? 0;
    return { userId: m.user.id, name: m.user.name || "Anonymous", pct: total>0?Math.round((done/total)*100):0, isMe: m.userId===userId };
  }).sort((a,b)=>b.pct-a.pct).slice(0,5) : [];

  return (
    <div className="max-w-4xl px-4 md:px-8 py-6 md:py-10">

      {/* Header */}
      <header className="mb-6">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-1">
          {today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">{greetingText}, {userName}</h1>
        {/* Stats bar */}
        {(streak > 0 || monthlyMiles > 0) && (
          <div className="flex items-center gap-3 flex-wrap">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-surface border border-border">
                <span>{streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "✓"}</span>
                <span className="font-medium">{streak}-day streak</span>
              </span>
            )}
            {monthlyMiles > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-surface border border-border">
                <span className="font-medium">{monthlyMiles.toFixed(1)} mi</span>
                <span className="text-foreground-dim">this month</span>
              </span>
            )}
            {activeRace && (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-surface border border-border">
                <span className="font-medium">{daysToRace}d</span>
                <span className="text-foreground-dim">to {activeRace.raceName}</span>
              </span>
            )}
          </div>
        )}
      </header>

      {/* Team invitations */}
      <TeamInvitations />

      {/* Quote of the day */}
      {!isNewUser && (
        <div className="mb-6 px-1">
          <p className="text-sm italic text-foreground-dim">"{quote.text}"</p>
          <p className="text-xs text-foreground-dim mt-1">— {quote.author}</p>
        </div>
      )}

      {/* Getting started — new users */}
      {isNewUser && (
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-1">Welcome to Train2Race</h2>
            <p className="text-sm text-foreground-dim mb-1">Every great race starts with a single workout. Let's build yours.</p>
            <p className="text-xs italic text-foreground-dim mb-4">"{quote.text}" — {quote.author}</p>
            <div className="space-y-2">
              {[
                { href:"/dashboard/races", label:"Add a target race", desc:"Set your goal race and generate a personalized training plan" },
                { href:"/dashboard/connections", label:"Connect a device", desc:"Sync Garmin, Whoop, or Apple Watch for recovery insights" },
                { href:"/dashboard/log-workout", label:"Log your first workout", desc:"Manually record a run, ride, or swim" },
                { href:"/dashboard/teams", label:"Join a team", desc:"Train alongside your crew and compete on the leaderboard" },
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

      {/* Weather + team leaderboard */}
      <Accordion label="Leaderboard" defaultOpen>
        <LocalSection
          defaultCity={timezoneCity ?? raceCity}
          leaderboard={leaderboard}
          teamId={primaryTeam?.id ?? null}
          teamName={primaryTeam?.name ?? null}
        />
      </Accordion>

      {/* Race training card */}
      {activeRace && (
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Training for</p>
                <h2 className="font-semibold">{activeRace.raceName}</h2>
                <p className="text-xs text-signal mt-0.5">{raceMessage(daysToRace)}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-2xl font-data font-bold text-signal">{daysToRace}</p>
                <p className="text-xs text-foreground-dim">{daysToRace===1?"day":"days"} to go</p>
                <Link href={"/dashboard/races/"+activeRace.id} className="text-xs text-signal hover:underline block mt-1">Full plan →</Link>
              </div>
            </div>
            {totalWorkouts > 0 && (
              <div className="px-5 py-3 border-b border-border">
                <div className="flex justify-between text-xs text-foreground-dim mb-1.5">
                  <span>{doneWorkouts}/{totalWorkouts} workouts complete</span>
                  <span className={pct>=75?"text-signal":pct>=50?"text-yellow-400":""}>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full">
                  <div className={"h-1.5 rounded-full transition-all "+(pct>=75?"bg-signal":pct>=50?"bg-yellow-400":"bg-foreground-dim")} style={{width:pct+"%"}}/>
                </div>
              </div>
            )}
            <div className="px-5 py-4">
              {(!plan||totalWorkouts===0)?(
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground-dim">No training plan yet. Build one to start your countdown.</p>
                  <Link href={"/dashboard/races/"+activeRace.id} className="text-xs text-signal hover:underline ml-4 shrink-0">Build plan →</Link>
                </div>
              ):todaysWorkout?(
                <div>
                  <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">On the plan today</p>
                  <div className={"rounded-xl border p-3 "+(TYPE_COLORS[todaysWorkout.type]||"bg-surface border-border")+" "+(todaysWorkout.completed?"opacity-50":"")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{todaysWorkout.title}</p>
                        <p className="text-xs mt-0.5 opacity-75">{todaysWorkout.distanceKm?(todaysWorkout.distanceKm/1.60934).toFixed(1)+" mi":""}{todaysWorkout.durationMin?" · "+todaysWorkout.durationMin+" min":""}</p>
                      </div>
                      {todaysWorkout.completed
                        ? <span className="text-xs bg-signal/20 text-signal px-2 py-1 rounded-full">Done ✓</span>
                        : <Link href={"/dashboard/races/"+activeRace.id} className="text-xs bg-background/30 px-3 py-1.5 rounded-full border border-current">Log it</Link>}
                    </div>
                  </div>
                </div>
              ):<p className="text-sm text-foreground-dim">Rest day — recovery is part of the plan.</p>}
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
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">No race on the calendar</p>
            <p className="text-xs text-foreground-dim mt-0.5">Add a target race to unlock your training plan and countdown.</p>
          </div>
          <Link href="/dashboard/races" className="text-sm text-signal hover:underline ml-4 shrink-0">Add a race →</Link>
        </div>
      )}

      {/* Upcoming races nearby */}
      <Accordion label="Upcoming races">
        <UpcomingRacesSection
          defaultCity={timezoneCity ?? raceCity}
          registeredRaceId={raceReg?.majorRace?.id ?? null}
        />
      </Accordion>

      {/* Active challenges */}
      {activeChallenges.length > 0 && (
        <Accordion label={`Active challenges (${activeChallenges.length})`} defaultOpen>
          <div className="space-y-3">
            {activeChallenges.map(c => {
              const myTotal = c.entries.reduce((s: number, e: any) => s + e.value, 0);
              const pct = c.goal ? Math.min(100, Math.round((myTotal / c.goal) * 100)) : null;
              const daysLeft = Math.ceil((new Date(c.endDate).getTime() - today.getTime()) / 86400000);
              return (
                <Link key={c.id} href={`/dashboard/teams/${c.team.id}`} className="block rounded-2xl border border-border bg-surface px-4 py-3 hover:bg-surface-raised transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-foreground-dim mt-0.5 capitalize">{c.team.name} · {c.type} · {c.unit}</p>
                    </div>
                    <span className="text-xs text-foreground-dim shrink-0 ml-3">{daysLeft}d left</span>
                  </div>
                  {pct !== null ? (
                    <div>
                      <div className="flex justify-between text-xs text-foreground-dim mb-1">
                        <span>{myTotal} / {c.goal} {c.unit}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full">
                        <div className="h-1.5 rounded-full bg-signal transition-all" style={{width:`${pct}%`}} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-dim">{myTotal} {c.unit} logged</p>
                  )}
                </Link>
              );
            })}
          </div>
        </Accordion>
      )}

      {/* Connect device prompt */}
      {!hasConnection && !isNewUser && (
        <div className="rounded-2xl border border-border bg-surface p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Connect a wearable</p>
            <p className="text-xs text-foreground-dim mt-0.5">Sync Garmin, Whoop, or Apple Watch to unlock HRV, sleep, and recovery insights.</p>
          </div>
          <Link href="/dashboard/connections" className="px-4 py-2 rounded-full bg-signal text-background text-xs font-medium ml-4 shrink-0">Connect</Link>
        </div>
      )}

      {/* Health metrics + weekly stats */}
      {hasData&&(
        <Accordion label="Health & stats" defaultOpen>
          {flags.length>0&&(
            <div className={"rounded-2xl border px-4 py-3 mb-4 flex items-center gap-2 flex-wrap "+(flags.some(f=>f.type==="warning")?"border-yellow-600/40 bg-yellow-900/10":"border-border bg-surface")}>
              <span className={flags.some(f=>f.type==="warning")?"text-yellow-400 text-sm":"text-foreground-dim text-sm"}>{flags.some(f=>f.type==="warning")?"⚠":"ℹ"}</span>
              <p className="text-sm text-foreground-dim">{flags[0].message}{flags.length>1?` · +${flags.length-1} more`:""}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <MetricTile label="HRV" value={latest?.hrvMs} unit="ms" comparison={hrvComparison}/>
            <MetricTile label="Sleep" value={latest?.sleepScore} unit="" comparison={sleepComparison}/>
            <MetricTile label="Recovery" value={latest?.bodyBatteryOrRecoveryPct} unit="%" comparison={recoveryComparison}/>
            <MetricTile label="Resting HR" value={latest?.restingHeartRate} unit="bpm" comparison={rhrComparison} invertGood={true}/>
          </div>
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">This week</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Miles</p><p className="font-data text-xl">{weeklyMiles.toFixed(1)}</p></div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Time</p><p className="font-data text-xl">{weeklyTime>0?formatDuration(weeklyTime):"--"}</p></div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Activities</p><p className="font-data text-xl">{weeklyActivities.length}</p></div>
          </div>
        </Accordion>
      )}

      {/* Recent activity */}
      <details open className="mb-6 group">
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden mb-3 py-0.5 border-b border-border">
          <h2 className="text-sm font-medium text-foreground-dim select-none">Recent activity</h2>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/log-workout" className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium">+ Log workout</Link>
            <span className="text-foreground-dim text-xs select-none transition-transform group-open:rotate-180 inline-block mr-0.5">▾</span>
          </div>
        </summary>
        <div className="pt-1">
          {recentActivities.length > 0
            ? <ActivityList activities={recentActivities.map(a=>({id:a.id,title:a.title,type:a.type,startTime:a.startTime,durationSec:a.durationSec,distanceM:a.distanceM,source:a.source,raw:a.raw?.notes?{notes:a.raw.notes}:null}))}/>
            : <p className="text-sm text-foreground-dim">No activities yet — log your first workout and start the streak.</p>
          }
        </div>
      </details>
    </div>
  );
}

function Accordion({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen || undefined} className="mb-6 group">
      <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden mb-3 py-0.5 border-b border-border">
        <h2 className="text-sm font-medium text-foreground-dim select-none">{label}</h2>
        <span className="text-foreground-dim text-xs select-none transition-transform group-open:rotate-180 inline-block mr-0.5">▾</span>
      </summary>
      <div className="pt-1">{children}</div>
    </details>
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
