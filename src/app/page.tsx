import Link from "next/link";
import { Waveform } from "@/components/Waveform";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <nav className="flex items-center justify-between px-6 md:px-10 py-6 max-w-6xl w-full mx-auto">
        <span className="font-semibold tracking-tight text-lg">Train2Race</span>
        <div className="flex items-center gap-6 text-sm text-foreground-dim">
          <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
          <Link href="/signup" className="px-4 py-2 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 md:px-10">

        <section className="pt-16 md:pt-24 pb-12 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.18em] text-signal mb-5">
              Whoop · Strava · Garmin coming soon
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-6">
              Train smarter.<br />Race faster.<br />Recover better.
            </h1>
            <p className="text-foreground-dim text-lg leading-relaxed max-w-md mb-8">
              Train2Race syncs your wearables every night, watches your data against your own baseline, and gives you a daily plan — training load, recovery, nutrition, and race strategy, all in one place.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">
                Create your account
              </Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">
                I already have one
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-data text-xs text-foreground-dim uppercase tracking-wide">Resting HR — live trace</span>
              <span className="font-data text-2xl text-signal">52 <span className="text-sm text-foreground-dim">bpm</span></span>
            </div>
            <Waveform restingHeartRate={52} className="h-16" />
            <div className="mt-6 grid grid-cols-3 gap-4 font-data text-sm">
              <Stat label="HRV" value="68 ms" trend="up" />
              <Stat label="Sleep" value="84" trend="flat" />
              <Stat label="Recovery" value="71%" trend="up" />
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar
            eyebrow="Every night, automatically"
            title="An AI coach that runs while you sleep"
            body="A nightly agent syncs your Whoop and Strava data, recomputes your 30-day baselines, and writes a personalized advice card before you wake up — no manual input needed."
          />
          <Pillar
            eyebrow="Built for racers"
            title="Race plans built on real data"
            body="Add your next race and ask the coach to build a training plan around your actual recovery scores and training load — not a generic template pulled from the internet."
          />
          <Pillar
            eyebrow="Fuel right"
            title="Precision nutrition for every workout"
            body="Get exact carb, protein, fluid, and electrolyte targets for before, during, and after every session — calculated from your weight, workout type, duration, and intensity."
          />
        </section>

        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar
            eyebrow="Know your fitness"
            title="A real fitness assessment"
            body="Train2Race scores your cardiovascular fitness, HRV and recovery, sleep, training load, and consistency — then gives you a plain-English summary of where you stand."
          />
          <Pillar
            eyebrow="Cardiac-aware, never diagnostic"
            title="Flags what's outside your normal"
            body="When resting heart rate or HRV drifts meaningfully from your own baseline, Train2Race flags it plainly and tells you to see a doctor — it never speculates about causes."
          />
          <Pillar
            eyebrow="Your data, one view"
            title="Whoop + Strava, merged"
            body="Connect both and Train2Race merges them into a single normalized view — one trend chart, one advice card, one coach that sees everything."
          />
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6 md:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-foreground-dim">
          <span>Train2Race is a coaching tool, not a medical device.</span>
          <span className="font-data">v1</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: "up" | "down" | "flat" }) {
  const trendColor = trend === "up" ? "text-signal" : trend === "down" ? "text-alert" : "text-foreground-dim";
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  return (
    <div>
      <div className="text-foreground-dim text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="text-foreground text-base">{value} <span className={trendColor}>{arrow}</span></div>
    </div>
  );
}

function Pillar({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-data text-xs uppercase tracking-[0.14em] text-load mb-3">{eyebrow}</p>
      <h3 className="text-xl font-semibold mb-3 tracking-tight">{title}</h3>
      <p className="text-foreground-dim leading-relaxed text-sm">{body}</p>
    </div>
  );
}