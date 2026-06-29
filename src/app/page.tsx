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
        <section className="pt-20 md:pt-32 pb-16 grid md:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.18em] text-signal mb-6">Train together · Race together</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.12] mb-7">Nobody crosses the<br/>finish line alone.</h1>
            <p className="text-xl text-foreground-dim mb-5">From beginners to experienced athletes — Train2Race helps you every step of the journey.</p>
            <p className="text-foreground-dim leading-relaxed max-w-md mb-10">Bring your crew together around a shared race goal — team leaderboards, group chat, training plans, and a global community all in one place.</p>
            <div className="flex items-center gap-4 flex-wrap mb-5">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Join for free</Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">Log in</Link>
            </div>
            <div className="mb-8">
              <InviteRequestForm label="Need an invite code? Request one →" />
            </div>
            <div className="flex items-center gap-8 text-xs text-foreground-dim flex-wrap">
              <div><span className="text-signal font-semibold">100+</span> major races</div>
              <div><span className="text-signal font-semibold">Private</span> team leaderboards</div>
              <div><span className="text-signal font-semibold">Free</span> to join</div>
            </div>
          </div>

          {/* Preview card — team leaderboard */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Team</p>
                <p className="font-semibold">Chicago Marathon Crew</p>
              </div>
              <span className="text-xs bg-signal/15 text-signal px-3 py-1 rounded-full">5 members</span>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-foreground-dim mb-3 uppercase tracking-wide">Leaderboard — Week 8</p>
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
            <div className="border-t border-border pt-2">
              <p className="text-xs text-foreground-dim">Chicago Marathon · 89 days away</p>
            </div>
          </div>
        </section>

        {/* Team features */}
        <section className="py-16 border-t border-border">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Your team</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 max-w-xl">Everything your training group needs, in one place</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <Pillar eyebrow="Private leaderboards" title="Friendly competition every week" body="Ranked by workout completion, weekly mileage, and consistency. See exactly where you stand against your teammates throughout the entire training cycle." />
            <Pillar eyebrow="Team chat" title="Stay connected all season" body="Message your team directly inside Train2Race. Celebrate PRs, share tips, swap routes, and keep everyone motivated from the first long run to race morning." />
            <Pillar eyebrow="Team invitations" title="Bring your whole crew" body="Search by name and send an invite. Teammates accept from their dashboard — no codes to share, no emails to forward. Everyone is in within seconds." />
          </div>
        </section>

        {/* Group challenges */}
        <section className="py-16 border-t border-border grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Group challenges</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Set a goal. Compete together.</h2>
            <p className="text-foreground-dim leading-relaxed mb-6">Create a custom challenge for your team — most miles in July, longest long run, most active days. Everyone logs their progress and the leaderboard updates in real time.</p>
            <div className="space-y-3 text-sm text-foreground-dim">
              <div className="flex items-start gap-3"><span className="text-signal shrink-0">→</span><span>Track by distance, duration, or activity count</span></div>
              <div className="flex items-start gap-3"><span className="text-signal shrink-0">→</span><span>Run for a week, a month, or the whole training block</span></div>
              <div className="flex items-start gap-3"><span className="text-signal shrink-0">→</span><span>Live leaderboard updates as teammates log entries</span></div>
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

        {/* Join or create a community */}
        <section className="py-20 border-t border-border grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-5">Community</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5">Join or create a community to help you reach your fitness goals</h2>
            <p className="text-foreground-dim leading-relaxed mb-8">Whether you're just starting out or preparing for your tenth race, being part of a community keeps you motivated, accountable, and connected to people who understand the journey.</p>
            <div className="space-y-4 text-sm text-foreground-dim">
              <div className="flex items-start gap-3"><span className="text-signal shrink-0">→</span><span>Search for local community groups training for your race</span></div>
              <div className="flex items-start gap-3"><span className="text-signal shrink-0">→</span><span>Join an existing community or submit a request to start your own</span></div>
              <div className="flex items-start gap-3"><span className="text-signal shrink-0">→</span><span>Get notified when new events and challenges are added</span></div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { name: "Donuts, Beer & Run Repeat", members: 41, race: "Chicago Marathon" },
              { name: "Moms Run Sundays", members: 28, race: "LA 5K Series" },
              { name: "Miles Before Mimosas", members: 35, race: "NYC Half Marathon" },
              { name: "Run Club — Tuesday Crew", members: 19, race: "Boston Marathon" },
            ].map(c => (
              <div key={c.name} className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-foreground-dim mt-1">🏁 {c.race} · {c.members} members</p>
                </div>
                <Link href="/signup" className="text-xs text-signal ml-4 shrink-0 hover:underline">Join →</Link>
              </div>
            ))}
            <p className="text-xs text-foreground-dim px-1 pt-2">Don't see your area? Submit a request and we'll set it up.</p>
          </div>
        </section>

        {/* Community + Leaderboards */}
        <section className="py-16 border-t border-border">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Global community</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 max-w-xl">You are not training alone</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <Pillar eyebrow="Global leaderboard" title="See how you rank worldwide" body="Filter by event, age group, sex, or city. See how your weekly mileage and activity count stacks up against every athlete registered for your race." />
            <Pillar eyebrow="100+ major races" title="Find your race community" body="Search Boston, Chicago, Ironman, and 100+ other major events. See who else is targeting your finish line and connect before race day." />
            <Pillar eyebrow="Event communities" title="Everyone racing Chicago. One feed." body="Every major race has a public board. Post your goals, share course tips, and rally with thousands of athletes preparing for the same start line." />
          </div>
        </section>

        {/* Race plans + nutrition */}
        <section className="py-16 border-t border-border">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Race prep</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 max-w-xl">From sign-up to finish line</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <Pillar eyebrow="Training plans" title="Week-by-week, race to race" body="Pick your race, enter your current fitness, and get a structured plan from today to race day — with progressive overload, taper, and triathlon-specific splits if needed." />
            <Pillar eyebrow="Race day nutrition" title="Fuelling done right" body="Personalised carb, fluid, sodium, and caffeine targets for before, during, and after your race — calculated from your weight, stomach sensitivity, and conditions." />
            <Pillar eyebrow="Log your workouts" title="Track every mile" body="Log runs, rides, swims, and strength sessions. Your activity feeds the team leaderboard and shows your progress toward race day." />
          </div>
        </section>

        {/* Motivation callout */}
        <section className="py-16 border-t border-border max-w-2xl">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Why it works</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Accountability changes everything</h2>
          <p className="text-foreground-dim leading-relaxed mb-4">Athletes who train with a team are more consistent, push harder on tough days, and are less likely to skip workouts. Train2Race makes that accountability visible — you can see exactly how your training compares to your teammates, every single week.</p>
          <p className="text-foreground-dim leading-relaxed text-sm">Knowing your crew can see your mileage is the best motivation to lace up when you do not feel like it.</p>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Your team is waiting</h2>
          <p className="text-foreground-dim max-w-md mx-auto mb-8">Create a free account, start a team, and invite your training partners. Your first race plan takes two minutes to generate.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Create your free team</Link>
        </section>
      </main>

      {/* FAQ */}
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">FAQ</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">Common questions</h2>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-8 max-w-4xl">
            {[
              { q: "Is it free?", a: "Yes, always free to join. No credit card required." },
              { q: "Do I need a wearable or fitness tracker?", a: "No. You can log workouts manually. Wearable integrations are optional." },
              { q: "What races are supported?", a: "100+ major races including Boston, Chicago, New York, Ironman, and more. You can also request new races." },
              { q: "How do I join a team?", a: "Get an invite code from your team captain and enter it when signing up or from your dashboard." },
              { q: "Can I train without a team?", a: "Yes. You can register for a race, follow a training plan, and join the global race community on your own." },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="font-medium mb-2">{q}</p>
                <p className="text-sm text-foreground-dim leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-12 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.png" alt="Train2Race" width={28} height={28} className="rounded-md" />
                <span className="font-semibold">Train2Race</span>
              </div>
              <p className="text-xs text-foreground-dim leading-relaxed max-w-xs">Team training platform for endurance athletes. Built for runners, triathletes, and everyone chasing a finish line together.</p>
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
            <span>Train2Race is a training tool, not a medical device.</span>
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
      <p className="font-data text-xs uppercase tracking-[0.14em] text-load mb-3">{eyebrow}</p>
      <h3 className="text-xl font-semibold mb-3 tracking-tight">{title}</h3>
      <p className="text-foreground-dim leading-relaxed text-sm">{body}</p>
    </div>
  );
}
