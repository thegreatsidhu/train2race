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

        {/* Hero */}
        <section className="pt-16 md:pt-24 pb-12 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.18em] text-signal mb-5">AI coach · race plans · team racing</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-6">Train smarter.<br/>Race better.<br/>Together.</h1>
            <p className="text-foreground-dim text-lg leading-relaxed max-w-md mb-8">Train2Race gives you an AI coach, a personalised training plan, race-day nutrition targets, and real team competition — all built around the race you are chasing.</p>
            <div className="flex items-center gap-4 flex-wrap mb-6">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Start for free</Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">Log in</Link>
            </div>
            <div className="flex items-center gap-6 text-xs text-foreground-dim flex-wrap">
              <div><span className="text-signal font-semibold">AI coach</span> built in</div>
              <div><span className="text-signal font-semibold">100+</span> major races</div>
              <div><span className="text-signal font-semibold">Free</span> to join</div>
            </div>
          </div>

          {/* Preview card */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-foreground-dim uppercase tracking-wide">Today</p>
              <span className="text-xs bg-signal/15 text-signal px-2 py-0.5 rounded-full">89 days to race</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Week", value: "Week 10" },
                { label: "Miles", value: "31mi" },
                { label: "Done", value: "4 / 5" },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-background border border-border px-3 py-2.5">
                  <p className="text-xs text-foreground-dim mb-0.5">{m.label}</p>
                  <p className="text-sm font-semibold">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-background border border-border px-4 py-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">AI coach</p>
              <p className="text-sm leading-relaxed text-foreground-dim">"You are on track for a strong taper. Today's tempo is your last hard session before race week — make it count."</p>
            </div>
            <div className="rounded-xl bg-background border border-border px-4 py-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Today's workout</p>
              <p className="text-sm font-medium">8mi Tempo — Week 10, Thursday</p>
              <p className="text-xs text-foreground-dim mt-0.5">2mi warm-up · 4mi at threshold · 2mi cool-down</p>
            </div>
          </div>
        </section>

        {/* AI + Plans + Nutrition */}
        <section className="py-16 border-t border-border">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Intelligence</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 max-w-xl">An AI coach that knows your race, not just your schedule</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <Pillar eyebrow="AI daily coach" title="Advice that fits where you are" body="The AI coach knows your race, your training plan, and how your recent workouts went. Ask it anything — pacing strategy, injury concerns, what to eat the night before — and get a direct answer." />
            <Pillar eyebrow="Race day nutrition" title="Exact fueling for your body" body="AI-generated carb, fluid, sodium, and caffeine targets for before, during, and after your race — calculated from your weight, stomach sensitivity, and race conditions. Instant on return visits." />
            <Pillar eyebrow="Training plan AI" title="Week-by-week, race to race" body="Enter your race and current fitness. Get a full training plan from today to race day — with progressive overload, taper, and triathlon-specific swim/bike/run splits if needed." />
          </div>
        </section>

        {/* Community + Leaderboards */}
        <section className="py-16 border-t border-border">
          <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Community</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 max-w-xl">Race with your team, compete with the world</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <Pillar eyebrow="Global leaderboard" title="Where do you rank among everyone?" body="Filter by event, age group, sex, city, or training period. See how your weekly mileage, duration, and activity count stacks up against every athlete registered for your race." />
            <Pillar eyebrow="Private teams" title="Train together, compete together" body="Create a team, share an invite code, and give your training partners a secure space. Teams get a private leaderboard, group chat, and shared race target — all in one place." />
            <Pillar eyebrow="Event communities" title="Everyone racing Chicago. One feed." body="Every major race has a public community board. Post your goals, share conditions, and connect with thousands of athletes preparing for the same start line." />
          </div>
        </section>

        {/* Team invitations preview */}
        <section className="py-16 border-t border-border grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Team invitations</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Bring your whole squad</h2>
            <p className="text-foreground-dim leading-relaxed mb-6">Search by name, send an invitation, and let your teammates accept from their dashboard. No codes to share, no emails to forward — invites are built into the platform.</p>
            <p className="text-foreground-dim leading-relaxed text-sm">Team invitations show up on each athlete's Today page so nothing gets missed. Accept and you are instantly on the team leaderboard.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-3">Team invitations</p>
            {[
              { team: "Chicago Marathon Crew", inviter: "Sarah K." },
              { team: "Ironman Training Squad", inviter: "Marcus T." },
            ].map((inv) => (
              <div key={inv.team} className="rounded-xl bg-background border border-border px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{inv.team}</p>
                  <p className="text-xs text-foreground-dim">Invited by {inv.inviter}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium">Accept</button>
                  <button className="px-3 py-1.5 rounded-full border border-border text-xs">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Your race is waiting</h2>
          <p className="text-foreground-dim max-w-md mx-auto mb-8">Pick a race, get a training plan, and start competing with your team — in under five minutes. Free to join.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Get started free</Link>
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
              <p className="text-xs text-foreground-dim leading-relaxed max-w-xs">The complete training platform for endurance athletes — AI coach, team racing, and race-day nutrition, all in one place.</p>
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
