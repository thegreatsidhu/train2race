import Link from "next/link";
import Image from "next/image";
import { InviteRequestForm } from "@/components/InviteRequestForm";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <nav className="flex items-center justify-between px-6 md:px-10 py-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Train2Race" width={32} height={32} className="rounded-lg" />
          <span className="font-semibold tracking-tight text-lg">Train2Race</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-foreground-dim">
          <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
          <Link href="/signup" className="px-4 py-2 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Get started</Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 md:px-10">

        {/* Hero */}
        <section className="pt-16 md:pt-24 pb-16 grid md:grid-cols-[1.15fr_0.85fr] gap-14 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.18em] text-signal mb-5">Built for endurance athletes</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.06] mb-6">
              The long weeks are easier<br/>with your crew watching.
            </h1>
            <p className="text-foreground-dim text-lg leading-relaxed max-w-lg mb-8">
              Train2Race is where your training group lives — leaderboards, team chat, group challenges, and a community of athletes all working toward the same finish line.
            </p>
            <div className="flex items-center gap-4 flex-wrap mb-5">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Join for free</Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">Log in</Link>
            </div>
            <div className="mb-6">
              <InviteRequestForm label="Need an invite code? Request one →" />
            </div>
            <div className="flex items-center gap-6 text-xs text-foreground-dim flex-wrap">
              <div><span className="text-signal font-semibold">100+</span> major races</div>
              <div><span className="text-signal font-semibold">Strava</span> connected</div>
              <div><span className="text-signal font-semibold">Free</span> to join</div>
            </div>
          </div>

          {/* Hero preview card */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Team</p>
                <p className="font-semibold">Chicago Marathon Crew</p>
              </div>
              <span className="text-xs bg-signal/15 text-signal px-3 py-1 rounded-full">6 members</span>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-foreground-dim mb-3 uppercase tracking-wide">Week 8 leaderboard</p>
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
                      <span className="text-xs text-foreground-dim">{m.miles}/wk</span>
                    </div>
                    <div className="w-full h-1 bg-border rounded-full">
                      <div className={"h-1 rounded-full " + (m.me ? "bg-signal" : "bg-foreground-dim/40")} style={{ width: m.pct + "%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <p className="text-xs text-foreground-dim">Chicago Marathon · 89 days away</p>
              <span className="text-xs text-signal">💬 4 new messages</span>
            </div>
          </div>
        </section>

        {/* Teams */}
        <section className="py-16 border-t border-border grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Teams</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 leading-tight">A private space for your training group</h2>
            <p className="text-foreground-dim leading-relaxed mb-6">
              Create a team around your race goal and invite your training partners. Each team has its own leaderboard, chat, events, and challenges — visible only to members.
            </p>
            <div className="space-y-4 text-sm">
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl border border-border bg-surface p-4">
                  <p className="font-medium mb-1">Weekly leaderboard</p>
                  <p className="text-xs text-foreground-dim leading-relaxed">Ranked by mileage and workout completion. Updates as teammates log their sessions.</p>
                </div>
                <div className="flex-1 rounded-xl border border-border bg-surface p-4">
                  <p className="font-medium mb-1">Team chat</p>
                  <p className="text-xs text-foreground-dim leading-relaxed">Talk route tips, celebrate PRs, and keep each other accountable between workouts.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl border border-border bg-surface p-4">
                  <p className="font-medium mb-1">Public or private</p>
                  <p className="text-xs text-foreground-dim leading-relaxed">Keep your team invite-only, or make it public so other athletes can find and join.</p>
                </div>
                <div className="flex-1 rounded-xl border border-border bg-surface p-4">
                  <p className="font-medium mb-1">Team events</p>
                  <p className="text-xs text-foreground-dim leading-relaxed">Schedule group runs, races, or meetups. Members get notified the moment you post.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div>
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Active challenge</p>
              <p className="font-semibold">July Miles Challenge</p>
              <p className="text-xs text-foreground-dim mt-0.5">Run · Distance · 18 days left</p>
            </div>
            <div className="border-t border-border pt-3 space-y-3">
              {[
                { rank: "🥇", name: "Marcus T.", total: 67, pct: 67, me: false },
                { rank: "🥈", name: "You", total: 54, pct: 54, me: true },
                { rank: "🥉", name: "Sarah K.", total: 41, pct: 41, me: false },
                { rank: "#4",  name: "Priya S.", total: 28, pct: 28, me: false },
              ].map((m) => (
                <div key={m.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground-dim w-5">{m.rank}</span>
                      <span className={"text-sm font-medium " + (m.me ? "text-signal" : "")}>{m.name}</span>
                    </div>
                    <span className="text-xs text-foreground-dim">{m.total} mi</span>
                  </div>
                  <div className="w-full h-1 bg-border rounded-full">
                    <div className={"h-1 rounded-full " + (m.me ? "bg-signal" : "bg-foreground-dim/40")} style={{ width: m.pct + "%" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-2">
              <p className="text-xs text-foreground-dim">Goal: 100 mi · Chicago Marathon Crew</p>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="py-16 border-t border-border">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Community</p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 leading-tight">Find local athletes training for your race</h2>
              <p className="text-foreground-dim leading-relaxed mb-6">
                Beyond your personal team, Train2Race has community groups built around specific races and local areas. Find people in your city heading to the same start line — and train together before race day.
              </p>
              <p className="text-foreground-dim text-sm leading-relaxed">
                Don't see a community for your area? Submit a request. Once approved, it shows up for anyone searching for your race.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { name: "Chicago Marathon — Chicago North Side", members: 34, race: "Chicago Marathon" },
                { name: "Boston Qualifiers — Pacific Northwest", members: 18, race: "Boston Marathon" },
                { name: "NYC Tri Club", members: 52, race: "NYC Triathlon" },
              ].map(c => (
                <div key={c.name} className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-foreground-dim mt-0.5">🏁 {c.race}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-signal font-medium">{c.members} members</p>
                    <p className="text-xs text-foreground-dim mt-0.5">Join →</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-foreground-dim px-1 pt-1">Communities are moderated. Join free.</p>
            </div>
          </div>
        </section>

        {/* Strava + log workouts */}
        <section className="py-16 border-t border-border grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <p className="text-xs text-foreground-dim uppercase tracking-wide">Recent activity</p>
            {[
              { type: "Run", title: "Morning tempo", dist: "6.2 mi", dur: "51 min", src: "Strava" },
              { type: "Ride", title: "Sunday long ride", dist: "38 mi", dur: "2h 14m", src: "Manual" },
              { type: "Swim", title: "Lake session", dist: "1,800m", dur: "42 min", src: "Manual" },
            ].map(a => (
              <div key={a.title} className="flex items-center justify-between rounded-xl bg-background border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-foreground-dim mt-0.5">{a.type} · {a.dist} · {a.dur}</p>
                </div>
                <span className={"text-xs px-2 py-0.5 rounded-full " + (a.src === "Strava" ? "bg-orange-500/15 text-orange-400" : "bg-surface-raised text-foreground-dim border border-border")}>{a.src}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Workout tracking</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 leading-tight">Log it your way</h2>
            <p className="text-foreground-dim leading-relaxed mb-4">
              Connect your Strava account and runs, rides, and swims sync automatically. Or log manually — the leaderboard doesn't care where the data comes from.
            </p>
            <p className="text-foreground-dim text-sm leading-relaxed mb-6">
              Every activity feeds your team standings and your progress toward race day.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-foreground-dim">
              <span className="px-3 py-1.5 rounded-full border border-border bg-surface">Run</span>
              <span className="px-3 py-1.5 rounded-full border border-border bg-surface">Ride</span>
              <span className="px-3 py-1.5 rounded-full border border-border bg-surface">Swim</span>
              <span className="px-3 py-1.5 rounded-full border border-border bg-surface">Strength</span>
              <span className="px-3 py-1.5 rounded-full border border-border bg-surface">Other</span>
            </div>
          </div>
        </section>

        {/* Race communities + global */}
        <section className="py-16 border-t border-border">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Race coverage</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 max-w-xl">100+ major races. One platform.</h2>
          <p className="text-foreground-dim mb-10 max-w-lg">Boston. Chicago. Ironman Kona. NYC. Every major event has a race page, a public community board, and a global leaderboard filtered by age group, sex, or city.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <Pillar
              eyebrow="Race communities"
              title="Everyone racing Chicago. One feed."
              body="Post your goals, share course intel, and see who else is on the start list. Race boards are open to anyone registered for that event."
            />
            <Pillar
              eyebrow="Global leaderboard"
              title="See where you rank"
              body="Filter by race, city, age group, or sex. Know how your weekly mileage stacks up against every other athlete chasing the same finish line."
            />
            <Pillar
              eyebrow="Training plans"
              title="Week-by-week to race day"
              body="Pick your race and get a structured plan — progressive long runs, taper weeks, and triathlon-specific splits if you need them."
            />
          </div>
        </section>

        {/* Why it works — human callout */}
        <section className="py-16 border-t border-border">
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-16 items-center">
            <div>
              <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Why it works</p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 leading-tight">Knowing your team can see your mileage is the best alarm clock you'll ever set</h2>
              <p className="text-foreground-dim leading-relaxed text-sm">
                Athletes who train with a group are more consistent, less likely to skip on bad days, and tend to push harder when it counts. Train2Race makes that accountability concrete — your team sees exactly what you logged this week.
              </p>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <p className="text-3xl font-data font-bold text-signal mb-1">89</p>
                <p className="text-sm text-foreground-dim">days to race day — your crew is already logging miles</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-2xl font-data font-bold mb-1">31mi</p>
                  <p className="text-xs text-foreground-dim">your mileage this week</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-2xl font-data font-bold text-signal mb-1">#2</p>
                  <p className="text-xs text-foreground-dim">on your team leaderboard</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Nutrition */}
        <section className="py-16 border-t border-border">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Race day nutrition</p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 leading-tight">Fuelling calculated from your own numbers</h2>
              <p className="text-foreground-dim leading-relaxed mb-4">
                Carb targets, fluid intake, sodium, and caffeine — calculated around your weight, race distance, and conditions. Not someone else's generic plan.
              </p>
              <p className="text-foreground-dim text-sm leading-relaxed">
                Works for marathon, half-iron, and full Ironman. Adjusts for heat and humidity.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <p className="text-xs text-foreground-dim uppercase tracking-wide">Race day targets — Chicago Marathon</p>
              <div className="space-y-3">
                {[
                  { label: "Carbohydrates", value: "65g / hr", note: "gels + drink" },
                  { label: "Fluid", value: "500ml / hr", note: "water + electrolytes" },
                  { label: "Sodium", value: "800mg / hr", note: "adjust for heat" },
                  { label: "Caffeine", value: "100mg", note: "miles 16–20" },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-foreground-dim">{n.note}</p>
                    </div>
                    <p className="text-sm font-data font-semibold text-signal">{n.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-border text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Your team is already training.</h2>
          <p className="text-foreground-dim max-w-sm mx-auto mb-8 leading-relaxed">Start a team, find a community, and connect with athletes going to the same race. Free to join.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors mb-5">Create your free account</Link>
          <div className="mt-4">
            <InviteRequestForm label="Already have a code? Sign up →" />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.png" alt="Train2Race" width={28} height={28} className="rounded-md" />
                <span className="font-semibold">Train2Race</span>
              </div>
              <p className="text-xs text-foreground-dim leading-relaxed max-w-xs">Team training platform for endurance athletes. Built for runners, triathletes, and anyone chasing a finish line.</p>
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
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex items-center justify-between flex-wrap gap-2 text-xs text-foreground-dim">
            <span>Train2Race is not affiliated with Strava, Inc.</span>
            <span>Boston · Chicago · NYC · Ironman · and 100+ more races</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Pillar({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-data text-xs uppercase tracking-[0.14em] text-signal/70 mb-3">{eyebrow}</p>
      <h3 className="text-lg font-semibold mb-3 tracking-tight leading-snug">{title}</h3>
      <p className="text-foreground-dim leading-relaxed text-sm">{body}</p>
    </div>
  );
}
