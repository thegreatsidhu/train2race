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
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-6">Train smarter.<br/>Race together.<br/>Recover better.</h1>
            <p className="text-foreground-dim text-lg leading-relaxed max-w-md mb-8">Train2Race turns your wearable data into a personalized AI coaching plan with race-specific training, nutrition guidance, and a community of athletes chasing the same finish line.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Start free</Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">Log in</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-data text-xs text-foreground-dim uppercase tracking-wide">Resting HR today</span>
              <span className="font-data text-2xl text-signal">52 <span className="text-sm text-foreground-dim">bpm</span></span>
            </div>
            <Waveform restingHeartRate={52} className="h-16" />
            <div className="mt-6 grid grid-cols-3 gap-4 font-data text-sm">
              <Stat label="HRV" value="68 ms" trend="up" />
              <Stat label="Sleep" value="84" trend="flat" />
              <Stat label="Recovery" value="71%" trend="up" />
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-foreground-dim">Todays workout</p>
              <p className="text-sm font-medium mt-1">Tempo Run 5 mi Chicago Marathon week 8</p>
            </div>
          </div>
        </section>
        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="AI-powered coaching" title="A plan built around your recovery" body="Connect your wearable and Train2Race builds a training plan around your actual HRV, sleep, and recovery data not a generic template from the internet." />
          <Pillar eyebrow="Race-specific training" title="From 5K to full Ironman" body="Pick your race from 100 plus major events worldwide. Get a week-by-week plan with the right distances, intensities, and taper calibrated to your fitness level." />
          <Pillar eyebrow="Race day nutrition" title="Fuel targets for every session" body="Exact carb, protein, fluid, and electrolyte targets before, during, and after every workout calculated from your weight, workout type, and duration." />
        </section>
        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="100 plus major races" title="Find your race community" body="Search Boston, Chicago, Ironman Kona, and 100 plus other major events. See who else is training for your race and compare workout progress on a live leaderboard." />
          <Pillar eyebrow="Train together" title="Create a team" body="Start a private team with your running club, training partners, or coworkers. Share an invite code, track each others progress, and chat all in one place." />
          <Pillar eyebrow="Stay accountable" title="Compete with your crew" body="Team leaderboards ranked by workout completion, weekly mileage, and consistency. Friendly competition makes the hard weeks easier." />
        </section>
        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="Daily AI advice" title="Your coach every morning" body="A nightly AI agent reviews your recovery data, compares it against your 30-day baseline, and writes a personalized advice card before you wake up." />
          <Pillar eyebrow="Know your numbers" title="One dashboard for everything" body="HRV, resting heart rate, sleep score, recovery percentage, and 30-day trends all merged into a single view from your connected devices." />
          <Pillar eyebrow="Never diagnostic" title="Flags what is outside your normal" body="When your data drifts meaningfully from your own baseline, Train2Race flags it and recommends you see a doctor. It never speculates about causes." />
        </section>
        <section className="py-16 border-t border-border text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Ready to train with purpose?</h2>
          <p className="text-foreground-dim max-w-md mx-auto mb-8">Join athletes training for marathons, triathlons, ultras, and everything in between. Your first race plan is free.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Create your free account</Link>
        </section>
      </main>
      <footer className="border-t border-border py-8 px-6 md:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-foreground-dim flex-wrap gap-2">
          <span>Train2Race is a coaching tool, not a medical device.</span>
          <span>Boston Chicago NYC Ironman and 100 plus more races</span>
        </div>
      </footer>
    </div>
  );
}
function Stat({ label, value, trend }: { label: string; value: string; trend: "up"|"down"|"flat" }) {
  const color = trend==="up"?"text-signal":trend==="down"?"text-alert":"text-foreground-dim";
  const arrow = trend==="up"?"up":trend==="down"?"down":"flat";
  return <div><div className="text-foreground-dim text-xs uppercase tracking-wide mb-1">{label}</div><div className="text-foreground text-base">{value} <span className={color}>{arrow}</span></div></div>;
}
function Pillar({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div><p className="font-data text-xs uppercase tracking-[0.14em] text-load mb-3">{eyebrow}</p><h3 className="text-xl font-semibold mb-3 tracking-tight">{title}</h3><p className="text-foreground-dim leading-relaxed text-sm">{body}</p></div>;
}