import Link from "next/link";
import { Waveform } from "@/components/Waveform";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <nav className="flex items-center justify-between px-6 md:px-10 py-6 max-w-6xl w-full mx-auto">
        <span className="font-semibold tracking-tight text-lg">Train2Race</span>
        <div className="flex items-center gap-6 text-sm text-foreground-dim">
          <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
          <Link href="/signup" className="px-4 py-2 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Get started</Link>
        </div>
      </nav>
      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 md:px-10">
        <section className="pt-16 md:pt-24 pb-12 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.18em] text-signal mb-5">Built for endurance athletes</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-6">All your training metrics.<br/>One place.<br/>Race ready.</h1>
            <p className="text-foreground-dim text-lg leading-relaxed max-w-md mb-8">Train2Race connects your wearables and turns HRV, sleep, recovery, and training load into a clear picture of your fitness with race plans, nutrition targets, and a community to keep you accountable.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Start free</Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">Log in</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-data text-xs text-foreground-dim uppercase tracking-wide">Resting HR</span>
              <span className="font-data text-2xl text-signal">52 <span className="text-sm text-foreground-dim">bpm</span></span>
            </div>
            <Waveform restingHeartRate={52} className="h-14" />
            <div className="grid grid-cols-4 gap-3 font-data text-sm pt-1">
              <Stat label="HRV" value="68ms" good />
              <Stat label="Sleep" value="84" />
              <Stat label="Recovery" value="71%" good />
              <Stat label="Fitness" value="79" good />
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-foreground-dim mb-1">Training plan - Chicago Marathon Week 8</p>
              <div className="w-full h-1.5 bg-border rounded-full"><div className="h-1.5 bg-signal rounded-full" style={{width:"54%"}}/></div>
              <p className="text-xs text-foreground-dim mt-1">27/50 workouts complete - 54%</p>
            </div>
          </div>
        </section>
        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="Unified metrics" title="All your data in one dashboard" body="HRV, resting heart rate, sleep score, recovery percentage, and training load pulled from your wearable and shown in a single 30-day view." />
          <Pillar eyebrow="Know your baseline" title="See what is normal for you" body="Train2Race compares every metric against your own 30-day rolling baseline not population averages. See immediately when you are above or below your personal normal." />
          <Pillar eyebrow="Weekly summaries" title="Miles, time, and activities this week" body="See your weekly training volume at a glance - total miles, time on feet, and number of activities - so you always know where you stand." />
        </section>
        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="100 plus major races" title="Race-specific training plans" body="Pick from Boston, Chicago, Ironman Kona, and 100 plus other major events. Get a week-by-week plan calibrated to your fitness level and time to race day." />
          <Pillar eyebrow="Triathlon ready" title="Swim, bike, run all covered" body="Sprint to full Ironman. Training plans include swim sessions, bike rides, runs, and brick workouts automatically scheduled around your recovery data." />
          <Pillar eyebrow="Nutrition targets" title="Fuel calculated from your data" body="Exact carb, protein, fluid, and electrolyte targets for before, during, and after every session calculated from your weight, workout type, and duration." />
        </section>
        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="Race community" title="Find athletes at your race" body="See who else is training for your race and how their progress compares. A live leaderboard of workout completion keeps everyone accountable." />
          <Pillar eyebrow="Private teams" title="Train with your crew" body="Create a private team with your running club, training partners, or coworkers. Share an invite code, track progress together, and chat." />
          <Pillar eyebrow="Friendly competition" title="Team leaderboards" body="Ranked by workout completion, weekly mileage, and consistency. A little competition makes the hard weeks easier." />
        </section>
        <section className="py-16 border-t border-border text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Ready to see the full picture?</h2>
          <p className="text-foreground-dim max-w-md mx-auto mb-8">Connect your wearable, add your race, and see exactly where your fitness stands for free.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Create your free account</Link>
        </section>
      </main>
      <footer className="border-t border-border py-8 px-6 md:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-foreground-dim flex-wrap gap-2">
          <span>Train2Race is a training tool, not a medical device.</span>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span>Boston Chicago NYC Ironman and 100 plus more races</span>
        </div>
      </footer>
    </div>
  );
}
function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return <div><div className="text-foreground-dim text-xs uppercase tracking-wide mb-1">{label}</div><div className={`text-sm font-medium ${good?"text-signal":"text-foreground"}`}>{value}</div></div>;
}
function Pillar({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div><p className="font-data text-xs uppercase tracking-[0.14em] text-load mb-3">{eyebrow}</p><h3 className="text-xl font-semibold mb-3 tracking-tight">{title}</h3><p className="text-foreground-dim leading-relaxed text-sm">{body}</p></div>;
}
