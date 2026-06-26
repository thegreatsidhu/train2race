export const revalidate = 0;
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityList } from "@/components/ActivityList";
import { UpcomingRacesSection } from "@/components/UpcomingRacesSection";
import { TeamInvitations } from "@/components/TeamInvitations";
import { DashboardNotifications } from "@/components/DashboardNotifications";
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
  { text: "Courage is not having the strength to go on; it is going on when you don't have the strength.", author: "Theodore Roosevelt" },
  { text: "You are stronger than you think.", author: "Unknown" },
  { text: "Train hard, win easy.", author: "Unknown" },
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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [hasConnection, recentActivities, activeRace, weeklyActivities, user, raceReg, recentForStreak, completedWorkouts, myMemberships, rawTeamMessages, allRaceRegs] = await Promise.all([
    prisma.deviceConnection.findFirst({where:{userId},select:{id:true}}),
    prisma.activity.findMany({where:{userId},orderBy:{startTime:"desc"},take:10,select:{id:true,title:true,type:true,startTime:true,durationSec:true,distanceM:true,source:true,raw:true}}),
    prisma.raceTarget.findFirst({where:{userId,raceDate:{gte:today}},orderBy:{raceDate:"asc"},select:{id:true,raceName:true,raceDate:true,distanceM:true,trainingPlan:{select:{workouts:{orderBy:{date:"asc"},select:{id:true,week:true,day:true,date:true,type:true,title:true,distanceKm:true,durationMin:true,completed:true}}}}}}),
    prisma.activity.findMany({where:{userId,startTime:{gte:weekStart,lte:weekEnd}},select:{distanceM:true,durationSec:true,type:true}}),
    prisma.user.findUnique({where:{id:userId},select:{name:true,timezone:true,city:true}}),
    prisma.raceRegistration.findFirst({where:{userId,majorRace:{raceDate:{gte:today},status:"active"}},orderBy:{majorRace:{raceDate:"asc"}},include:{majorRace:{select:{id:true,name:true,city:true,country:true,raceDate:true}}}}),
    prisma.activity.findMany({where:{userId,startTime:{gte:fortyFiveDaysAgo}},select:{startTime:true,distanceM:true},orderBy:{startTime:"desc"}}),
    prisma.trainingWorkout.findMany({where:{plan:{userId},completed:true},orderBy:{completedAt:"desc"},take:10,select:{id:true,title:true,type:true,date:true,distanceKm:true,durationMin:true,completedAt:true}}),
    prisma.teamMember.findMany({where:{userId},select:{teamId:true,lastViewedChatAt:true}}),
    prisma.teamMessage.findMany({where:{team:{members:{some:{userId}}},userId:{not:userId},isDeleted:false,createdAt:{gte:thirtyDaysAgo}},select:{id:true,content:true,createdAt:true,teamId:true,team:{select:{id:true,name:true}},user:{select:{name:true}}},orderBy:{createdAt:"desc"},take:100}),
    prisma.raceRegistration.findMany({where:{userId},select:{majorRaceId:true}}),
  ]);

  // Teams with member counts + weekly activity
  const userTeams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true, _count: { select: { members: true } }, members: { select: { userId: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const allTeamMemberIds = [...new Set(userTeams.flatMap((t: any) => t.members.map((m: any) => m.userId)))];
  const weeklyActiveUsers = allTeamMemberIds.length > 0
    ? await prisma.activity.findMany({ where: { userId: { in: allTeamMemberIds }, startTime: { gte: weekStart, lte: weekEnd } }, select: { userId: true }, distinct: ["userId"] })
    : [];
  const weeklyActiveSet = new Set(weeklyActiveUsers.map((a: any) => a.userId));
  const teamsWithActivity = userTeams.map((t: any) => ({
    id: t.id, name: t.name,
    memberCount: t._count.members,
    weeklyActiveCount: t.members.filter((m: any) => weeklyActiveSet.has(m.userId)).length,
  }));

  // Race community leaderboard
  let raceLeaderboard: any[] = [];
  if ((raceReg as any)?.majorRace?.id) {
    try {
      const communityRegs = await prisma.raceRegistration.findMany({
        where: { majorRaceId: (raceReg as any).majorRace.id, isPublic: true },
        include: { user: { select: { id: true, name: true } }, raceTarget: { select: { trainingPlan: { select: { _count: { select: { workouts: true } }, workouts: { where: { completed: true }, select: { id: true } } } } } } },
        take: 20,
      });
      raceLeaderboard = communityRegs.map((r: any) => {
        const tp = r.raceTarget?.trainingPlan;
        const total = tp?._count?.workouts ?? 0;
        const done = tp?.workouts?.length ?? 0;
        return { userId: r.userId, name: r.user.name || "Athlete", isMe: r.userId === userId, pct: total > 0 ? Math.round((done / total) * 100) : 0, hasPlan: total > 0 };
      }).sort((a: any, b: any) => b.pct - a.pct).slice(0, 8);
    } catch {}
  }

  let activeChallenges: any[] = [];
  try {
    activeChallenges = await (prisma as any).teamChallenge.findMany({
      where:{team:{members:{some:{userId}}},endDate:{gte:today},status:"approved"},
      include:{team:{select:{id:true,name:true}},entries:{where:{userId},select:{value:true}}},
      orderBy:{endDate:"asc"}, take:10,
    });
  } catch {}

  let unreadDms: any[] = [];
  try {
    unreadDms = await (prisma as any).directMessage.findMany({
      where:{toUserId:userId,isRead:false,createdAt:{gte:thirtyDaysAgo}},
      select:{id:true,content:true,createdAt:true,teamId:true,team:{select:{id:true,name:true}},fromUser:{select:{name:true}}},
      orderBy:{createdAt:"desc"}, take:20,
    });
  } catch {}

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

  const userName = user?.name?.split(" ")[0] ?? "Athlete";
  const greetingText = getGreeting(user?.timezone ?? null);
  const timezoneCity = TIMEZONE_CITY[user?.timezone ?? ""] ?? null;
  const raceCity = (raceReg as any)?.majorRace?.city ?? null;
  const displayCity = (user as any)?.city ?? timezoneCity ?? raceCity;
  const quote = QUOTES[dayOfYear % QUOTES.length];
  const streak = computeStreak(recentForStreak, today);
  const monthlyMiles = recentForStreak.filter(a=>new Date(a.startTime)>=monthStart).reduce((s,a)=>s+(a.distanceM||0)/1609.34,0);
  const isNewUser = !hasConnection && !activeRace && recentActivities.length === 0;

  const workoutItems = completedWorkouts.map((w: any) => ({
    id: `workout_${w.id}`, title: w.title, type: w.type,
    startTime: w.completedAt ?? new Date(w.date),
    durationSec: w.durationMin ? w.durationMin * 60 : 0,
    distanceM: w.distanceKm ? Math.round(w.distanceKm * 1000) : null,
    source: "plan", raw: null,
  }));
  const loggedItems = recentActivities.map((a: any) => ({
    id: a.id, title: a.title, type: a.type, startTime: a.startTime,
    durationSec: a.durationSec, distanceM: a.distanceM, source: a.source,
    raw: a.raw?.notes ? { notes: a.raw.notes } : null,
  }));
  const mergedActivities = [...loggedItems, ...workoutItems]
    .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 10);

  // Chat / DM notifications
  const chatViewMap = new Map((myMemberships as any[]).map((m: any) => [m.teamId, m.lastViewedChatAt]));
  const recentTeamMessages = (rawTeamMessages as any[]).filter((msg: any) => {
    const lastViewed = chatViewMap.get(msg.teamId);
    return !lastViewed || new Date(msg.createdAt) > new Date(lastViewed);
  });
  const msgByTeam = new Map<string, {teamId:string;teamName:string;count:number;senderName:string;preview:string}>();
  for (const msg of recentTeamMessages) {
    if (!msgByTeam.has(msg.teamId)) msgByTeam.set(msg.teamId, { teamId: msg.team.id, teamName: msg.team.name, count: 0, senderName: msg.user.name ?? "Someone", preview: msg.content });
    msgByTeam.get(msg.teamId)!.count++;
  }
  const teamMessageGroups = Array.from(msgByTeam.values());
  const dmByTeam = new Map<string, {teamId:string;teamName:string;count:number;senderName:string;preview:string}>();
  for (const dm of (unreadDms as any[])) {
    if (!dmByTeam.has(dm.teamId)) dmByTeam.set(dm.teamId, { teamId: dm.team.id, teamName: dm.team.name, count: 0, senderName: dm.fromUser.name ?? "Captain", preview: dm.content });
    dmByTeam.get(dm.teamId)!.count++;
  }
  const dmGroups = Array.from(dmByTeam.values());

  return (
    <div className="max-w-2xl px-4 md:px-8 py-6 md:py-10">

      {/* ── Header ── */}
      <header className="mb-8">
        <p className="text-xs text-foreground-dim uppercase tracking-[0.16em] mb-2">
          {today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">{greetingText}, {userName}.</h1>
        <div className="flex flex-wrap gap-2">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-surface border border-border font-medium">
              {streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "✓"} {streak}-day streak
            </span>
          )}
          {monthlyMiles > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-surface border border-border">
              <span className="font-medium">{monthlyMiles.toFixed(1)} mi</span>
              <span className="text-foreground-dim">this month</span>
            </span>
          )}
          {activeRace && daysToRace > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-signal/10 border border-signal/30 text-signal font-medium">
              {daysToRace}d to race
            </span>
          )}
        </div>
      </header>

      {/* ── Invitations ── */}
      <TeamInvitations />

      {/* ── DM / chat notifications ── */}
      <DashboardNotifications teamMessageGroups={teamMessageGroups} dmGroups={dmGroups} />

      {/* ── Quote ── */}
      <div className="mb-8 border-l-2 border-signal/30 pl-4">
        <p className="text-sm italic text-foreground-dim leading-relaxed">"{quote.text}"</p>
        <p className="text-xs text-foreground-dim/60 mt-1.5">— {quote.author}</p>
      </div>

      {/* ── New user onboarding ── */}
      {isNewUser && (
        <section className="mb-8">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-1">Welcome to Train2Race</h2>
            <p className="text-sm text-foreground-dim mb-4">Every great race starts with a single workout. Let's build yours.</p>
            <div className="space-y-2">
              {[
                { href:"/dashboard/plan", label:"Add a target race", desc:"Set your goal race and generate a personalized training plan" },
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

      {/* ── Race countdown ── */}
      {activeRace ? (
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {/* Hero row */}
            <div className="px-5 py-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground-dim uppercase tracking-[0.12em] mb-1.5">Your next race</p>
                <h2 className="font-semibold text-lg leading-tight truncate">{activeRace.raceName}</h2>
                <p className="text-xs text-signal mt-2 leading-relaxed">{raceMessage(daysToRace)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-5xl font-data font-bold text-signal leading-none">{daysToRace}</p>
                <p className="text-xs text-foreground-dim mt-1.5">{daysToRace===1?"day":"days"} to go</p>
              </div>
            </div>
            {/* Plan progress */}
            {totalWorkouts > 0 && (
              <div className="px-5 py-3 border-t border-border/50">
                <div className="flex justify-between text-xs text-foreground-dim mb-1.5">
                  <span>{doneWorkouts} of {totalWorkouts} workouts complete</span>
                  <span className={pct>=75?"text-signal":pct>=50?"text-yellow-400":""}>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full">
                  <div className={"h-1.5 rounded-full transition-all "+(pct>=75?"bg-signal":pct>=50?"bg-yellow-400":"bg-foreground-dim/40")} style={{width:pct+"%"}}/>
                </div>
              </div>
            )}
            {/* Today's workout */}
            <div className="px-5 py-4 border-t border-border/50">
              {(!plan||totalWorkouts===0)?(
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground-dim">No training plan yet.</p>
                  <Link href={"/dashboard/races/"+activeRace.id} className="text-xs text-signal hover:underline ml-4 shrink-0">Build plan →</Link>
                </div>
              ):todaysWorkout?(
                <div>
                  <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">On the plan today</p>
                  <div className={"rounded-xl border p-3 "+(TYPE_COLORS[todaysWorkout.type]||"bg-surface border-border")+(todaysWorkout.completed?" opacity-50":"")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{todaysWorkout.title}</p>
                        <p className="text-xs mt-0.5 opacity-75">
                          {todaysWorkout.distanceKm?(todaysWorkout.distanceKm/1.60934).toFixed(1)+" mi":""}
                          {todaysWorkout.durationMin?" · "+todaysWorkout.durationMin+" min":""}
                        </p>
                      </div>
                      {todaysWorkout.completed
                        ?<span className="text-xs bg-signal/20 text-signal px-2 py-1 rounded-full">Done ✓</span>
                        :<Link href={"/dashboard/races/"+activeRace.id} className="text-xs bg-background/30 px-3 py-1.5 rounded-full border border-current">Log it</Link>}
                    </div>
                  </div>
                </div>
              ):(
                <p className="text-sm text-foreground-dim">Rest day — recovery is part of the plan.</p>
              )}
              {upcomingWorkouts.length>0&&(
                <div className="mt-3 flex gap-2 flex-wrap">
                  {upcomingWorkouts.map(w=>(
                    <div key={w.id} className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border rounded-lg px-2.5 py-1.5">
                      <span className="text-foreground-dim">{w.day.slice(0,3)}</span>
                      <span className="font-medium">{w.title}</span>
                      {w.distanceKm&&<span className="text-foreground-dim">{(w.distanceKm/1.60934).toFixed(1)}mi</span>}
                    </div>
                  ))}
                </div>
              )}
              <Link href={"/dashboard/races/"+activeRace.id} className="block mt-3 text-xs text-foreground-dim hover:text-signal transition-colors">Full plan →</Link>
            </div>
          </div>
        </section>
      ) : !isNewUser && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">No race on the calendar</p>
            <p className="text-xs text-foreground-dim mt-0.5">Add a target race to unlock your training plan and countdown.</p>
          </div>
          <Link href="/dashboard/plan" className="text-sm text-signal hover:underline ml-4 shrink-0">Add a race →</Link>
        </div>
      )}

      {/* ── Race community leaderboard ── */}
      {raceLeaderboard.length > 0 && (raceReg as any)?.majorRace && (
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Race community</p>
              <h2 className="font-semibold">{(raceReg as any).majorRace.name}</h2>
              <p className="text-xs text-foreground-dim mt-0.5">
                {raceLeaderboard.length} athletes registered ·{" "}
                {new Date((raceReg as any).majorRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
              </p>
            </div>
            <div className="divide-y divide-border/40">
              {raceLeaderboard.map((athlete: any, i: number) => (
                <div key={athlete.userId} className={"flex items-center gap-3 px-5 py-3 "+(athlete.isMe?"bg-signal/5":"")}>
                  <span className={"text-xs font-data w-5 shrink-0 tabular-nums "+(i===0?"text-yellow-400":i===1?"text-slate-300":i===2?"text-amber-600/80":"text-foreground-dim")}>
                    {i+1}
                  </span>
                  <span className={"text-sm flex-1 min-w-0 truncate "+(athlete.isMe?"font-semibold text-signal":"")}>
                    {athlete.isMe?"You":athlete.name}
                  </span>
                  {athlete.hasPlan?(
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 bg-border rounded-full hidden sm:block">
                        <div className="h-1.5 rounded-full bg-signal" style={{width:athlete.pct+"%"}}/>
                      </div>
                      <span className="text-xs text-foreground-dim w-8 text-right tabular-nums">{athlete.pct}%</span>
                    </div>
                  ):(
                    <span className="text-xs text-foreground-dim/50 shrink-0">No plan</span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border">
              <Link href={`/dashboard/community?race=${(raceReg as any).majorRace.id}`} className="text-xs text-signal hover:underline">
                View full community →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Your teams ── */}
      {teamsWithActivity.length > 0 ? (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-foreground-dim uppercase tracking-wide">Your crew</h2>
            <Link href="/dashboard/teams" className="text-xs text-signal hover:underline">All teams →</Link>
          </div>
          <div className="space-y-2">
            {teamsWithActivity.map((t: any) => (
              <Link key={t.id} href={`/dashboard/teams/${t.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 hover:border-signal/30 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-signal/10 border border-signal/20 flex items-center justify-center shrink-0">
                  <span className="text-signal font-bold text-sm">{t.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-foreground-dim mt-0.5">
                    {t.memberCount} {t.memberCount===1?"member":"members"}
                    {t.weeklyActiveCount > 0 && <> · <span className="text-signal">{t.weeklyActiveCount} active this week</span></>}
                  </p>
                </div>
                <span className="text-foreground-dim text-xs group-hover:text-signal transition-colors shrink-0">→</span>
              </Link>
            ))}
          </div>
        </section>
      ) : !isNewUser && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">You're not on a team yet</p>
            <p className="text-xs text-foreground-dim mt-0.5">Train with others — join or create a team to compete together.</p>
          </div>
          <Link href="/dashboard/teams" className="text-sm text-signal hover:underline ml-4 shrink-0">Find a team →</Link>
        </div>
      )}

      {/* ── Weekly stats ── */}
      {(weeklyMiles > 0 || weeklyTime > 0 || weeklyActivities.length > 0) && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-3">This week</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Miles</p>
              <p className="font-data text-xl">{weeklyMiles>0?weeklyMiles.toFixed(1):"--"}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Time</p>
              <p className="font-data text-xl">{weeklyTime>0?formatDuration(weeklyTime):"--"}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Activities</p>
              <p className="font-data text-xl">{weeklyActivities.length||"--"}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Active challenges ── */}
      {activeChallenges.length > 0 && (
        <Accordion label={`Active challenges (${activeChallenges.length})`}>
          <div className="space-y-3">
            {activeChallenges.map((c: any) => {
              const myTotal = c.entries.reduce((s: number, e: any) => s + e.value, 0);
              const cpct = c.goal ? Math.min(100, Math.round((myTotal / c.goal) * 100)) : null;
              const daysLeft = Math.ceil((new Date(c.endDate).getTime() - today.getTime()) / 86400000);
              return (
                <Link key={c.id} href={`/dashboard/teams/${c.team.id}?tab=challenges&challenge=${c.id}`} className="block rounded-2xl border border-border bg-surface px-4 py-3 hover:bg-surface-raised transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-foreground-dim mt-0.5 capitalize">{c.team.name} · {c.type} · {c.unit}</p>
                    </div>
                    <span className="text-xs text-foreground-dim shrink-0 ml-3">{daysLeft}d left</span>
                  </div>
                  {cpct !== null ? (
                    <div>
                      <div className="flex justify-between text-xs text-foreground-dim mb-1">
                        <span>{myTotal} / {c.goal} {c.unit}</span>
                        <span>{cpct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full">
                        <div className="h-1.5 rounded-full bg-signal transition-all" style={{width:`${cpct}%`}}/>
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

      {/* ── Upcoming races nearby ── */}
      <Accordion label={displayCity ? `Upcoming races in ${displayCity}` : "Upcoming races"}>
        <UpcomingRacesSection
          defaultCity={timezoneCity ?? raceCity}
          registeredRaceIds={(allRaceRegs as any[]).map((r: any) => r.majorRaceId)}
          hasRacePlan={!!activeRace}
        />
      </Accordion>

      {/* ── Recent activity ── */}
      <details className="mb-6 group">
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden mb-3 py-0.5 border-b border-border">
          <h2 className="text-sm font-medium text-foreground-dim select-none">Recent activity</h2>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/log-workout" className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium">+ Log workout</Link>
            <span className="text-foreground-dim text-xs select-none transition-transform group-open:rotate-180 inline-block mr-0.5">▾</span>
          </div>
        </summary>
        <div className="pt-1">
          {mergedActivities.length > 0
            ? <ActivityList activities={mergedActivities}/>
            : <p className="text-sm text-foreground-dim">No activities yet — log your first workout and start the streak.</p>
          }
        </div>
      </details>

    </div>
  );
}

function Accordion({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen||undefined} className="mb-6 group">
      <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden mb-3 py-0.5 border-b border-border">
        <h2 className="text-sm font-medium text-foreground-dim select-none">{label}</h2>
        <span className="text-foreground-dim text-xs select-none transition-transform group-open:rotate-180 inline-block mr-0.5">▾</span>
      </summary>
      <div className="pt-1">{children}</div>
    </details>
  );
}
