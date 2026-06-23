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
            <p className="font-data text-xs uppercase tracking-[0.18em] text-signal mb-5">Train together · Race together</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-6">The team that trains together<br/>races better.</h1>
            <p className="text-foreground-dim text-lg leading-relaxed max-w-md mb-8">Train2Race brings your crew together around a shared race goal — team leaderboards, group chat, training plans, and a global community all in one place.</p>
            <div className="flex items-center gap-4 flex-wrap mb-6">
              <Link href="/signup" className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">Join for free</Link>
              <Link href="/login" className="px-6 py-3 rounded-full border border-border hover:border-foreground-dim transition-colors">Log in</Link>
            </div>
            <div className="flex items-center gap-6 text-xs text-foreground-dim flex-wrap">
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
        <section className="py-16 border-t border-border grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.14em] text-signal mb-4">Why it works</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Accountability changes everything</h2>
            <p className="text-foreground-dim leading-relaxed mb-4">Athletes who train with a team are more consistent, push harder on tough days, and are less likely to skip workouts. Train2Race makes that accountability visible — you can see exactly how your training compares to your teammates, every single week.</p>
            <p className="text-foreground-dim leading-relaxed text-sm">Knowing your crew can see your mileage is the best motivation to lace up when you do not feel like it.</p>
          </div>
          <div className="space-y-3">
            {[
              { quote: "Seeing Marcus ahead of me on the leaderboard made me do my Tuesday run when I really didn't want to.", name: "Sarah K.", race: "Chicago Marathon" },
              { quote: "We've been training together for 12 weeks and nobody has missed more than one workout. The group chat keeps us going.", name: "Priya S.", race: "NYC Marathon" },
            ].map(t => (
              <div key={t.name} className="rounded-2xl border border-border bg-surface p-5">
                <p className="text-sm text-foreground-dim leading-relaxed mb-3">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-signal/20 flex items-center justify-center text-xs font-semibold text-signal">{t.name[0]}</div>
                  <div>
                    <p className="text-xs font-medium">{t.name}</p>
                    <p className="text-xs text-foreground-dim">{t.race}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Your team is waiting</h2>
          <p className="text-foreground-dim max-w-md mx-auto mb-8">Create a free account, start a team, and invite your training partners. Your first race plan takes two minutes to generate.</p>
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
