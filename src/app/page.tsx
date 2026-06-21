import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <nav className="flex items-center justify-between px-6 md:px-10 py-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Train2Race" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold tracking-tight text-lg">Train2Race</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-foreground-dim">
          <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
          <Link href="/signup" className="px-4 py-2 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Get started</Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 md:px-10">

        <section className="pt-16 md:pt-24 pb-12 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.18em] text-signal mb-5">Train together. Race together.</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-6">Your team.<br/>Your race.<br/>Your data.</h1>
            <p className="text-foreground-dim text-lg leading-relaxed max-w-md mb-8">Create a private team with your training partners, pick your race, and compete on a live leaderboard as you all build toward the same finish line — with your wearable data powering every step.</p>
            <div className="flex items-center gap-4 flex-wrap mb-6">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Create your team</Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">Log in</Link>
            </div>
            <div className="flex items-center gap-6 text-xs text-foreground-dim flex-wrap">
              <div><span className="text-signal font-semibold">100+</span> major races</div>
              <div><span className="text-signal font-semibold">Private</span> team leaderboards</div>
              <div><span className="text-signal font-semibold">Free</span> to join</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Team</p>
                <p className="font-semibold">Chicago Marathon Crew</p>
              </div>
              <span className="text-xs bg-signal/15 text-signal px-3 py-1 rounded-full">4 members</span>
            </div>
            <div className="pt-1 pb-1 border-t border-border">
              <p className="text-xs text-foreground-dim mb-2 uppercase tracking-wide">Leaderboard - Week 8</p>
              <div className="space-y-2.5">
                {[
                  { rank: "1", name: "Sarah K.", pct: 82, miles: "38mi", me: false },
                  { rank: "2", name: "You", pct: 74, miles: "31mi", me: true },
                  { rank: "3", name: "Marcus T.", pct: 68, miles: "28mi", me: false },
                  { rank: "4", name: "Priya S.", pct: 55, miles: "22mi", me: false },
                ].map((m) => (
                  <div key={m.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-dim w-4">#{m.rank}</span>
                        <span className={"text-sm font-medium " + (m.me ? "text-signal" : "")}>{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-foreground-dim">
                        <span>{m.miles}/wk</span>
                        <span className={m.me ? "text-signal font-semibold" : ""}>{m.pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1 bg-border rounded-full">
                      <div className={"h-1 rounded-full " + (m.me ? "bg-signal" : "bg-foreground-dim opacity-40")} style={{ width: m.pct + "%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-1 border-t border-border">
              <p className="text-xs text-foreground-dim">Chicago Marathon - 89 days away</p>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="Private teams" title="Train with your crew" body="Create a private team with your running club, triathlon group, or training partners. Share a 6-character invite code and everyone is in within seconds." />
          <Pillar eyebrow="Team leaderboards" title="Friendly competition built in" body="Ranked by workout completion, weekly mileage, and consistency. See exactly where you stand against your teammates every day of training." />
          <Pillar eyebrow="Team chat" title="Stay connected all season" body="Message your team directly inside Train2Race. Celebrate PRs, share tips, and keep the group motivated from first workout to race day." />
        </section>

        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="100+ major races" title="Find your race community" body="Search Boston, Chicago, Ironman Kona, and 100+ other major events. See who else is training for your race and compare progress on a live leaderboard." />
          <Pillar eyebrow="Race-specific plans" title="From 5K to full Ironman" body="Pick your race and get a week-by-week training plan calibrated to your fitness level and time to race day — including swim, bike, and run for triathlons." />
          <Pillar eyebrow="Nutrition targets" title="Fuel calculated from your data" body="Exact carb, protein, fluid, and electrolyte targets for before, during, and after every workout — calculated from your weight and workout type." />
        </section>

        <section className="py-16 border-t border-border grid md:grid-cols-3 gap-10">
          <Pillar eyebrow="Unified metrics" title="All your wearable data in one place" body="HRV, resting heart rate, sleep score, and recovery from Whoop, Garmin, and Apple Health — merged into a single dashboard with 30-day trends." />
          <Pillar eyebrow="Know your baseline" title="See what is normal for you" body="Train2Race compares every metric against your own 30-day rolling baseline. See immediately when you need an easy day before your body tells you." />
          <Pillar eyebrow="Never diagnostic" title="Flags what is outside your normal" body="When your recovery metrics drop meaningfully below your baseline, Train2Race flags it and recommends you see a doctor. It never speculates about causes." />
        </section>

        <section className="py-16 border-t border-border text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Ready to train with your team?</h2>
          <p className="text-foreground-dim max-w-md mx-auto mb-8">Create a free account, start a team, and invite your training partners. Your first race plan is on us.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Create your free team</Link>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Train2Race" className="w-7 h-7 rounded-md" />
                <span className="font-semibold">Train2Race</span>
              </div>
              <p className="text-xs text-foreground-dim leading-relaxed max-w-xs">Team training platform for endurance athletes. Built for runners, triathletes, and everyone chasing a finish line.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-3">Platform</p>
              <div className="space-y-2 text-xs text-foreground-dim">
                <div><a href="/signup" className="hover:text-foreground transition-colors">Get started</a></div>
                <div><a href="/login" className="hover:text-foreground transition-colors">Log in</a></div>
                <div><a href="/privacy" className="hover:text-foreground transition-colors">Privacy policy</a></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-3">Contact</p>
              <div className="space-y-2 text-xs text-foreground-dim">
                <div><a href="mailto:support@train2race.com" className="hover:text-foreground transition-colors">support@train2race.com</a></div>
                <div><a href="mailto:hello@train2race.com" className="hover:text-foreground transition-colors">hello@train2race.com</a></div>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex items-center justify-between flex-wrap gap-2 text-xs text-foreground-dim">
            <span>Train2Race is a training tool, not a medical device.</span>
            <span>Boston - Chicago - NYC - Ironman - and 100+ more races</span>
          </div>
        </div>
      </footer>
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