import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "@/components/MobileNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 border-r border-border flex-col px-4 py-6 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8"><Image src="/logo.png" alt="Train2Race" width={32} height={32} className="rounded-lg" /><span className="font-semibold tracking-tight text-lg">Train2Race</span></Link>
        <nav className="flex flex-col gap-1 text-sm flex-1">
          <NavLink href="/dashboard" label="Today" />
          <NavLink href="/dashboard/plan" label="My Plan" />
          <NavLink href="/dashboard/nutrition" label="Nutrition" />
          <NavLink href="/dashboard/races" label="Races" />
          <NavLink href="/dashboard/community" label="Community" />
          <NavLink href="/dashboard/teams" label="Teams" />
          <NavLink href="/dashboard/leaderboard" label="Leaderboard" />
          <NavLink href="/dashboard/profile" label="Profile" />
          <NavLink href="/dashboard/support" label="Help & Support" />
        </nav>
        <div className="px-2">
          <p className="text-xs text-foreground-dim mb-2 truncate">{session.user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2"><Image src="/logo.png" alt="Train2Race" width={28} height={28} className="rounded-md" /><span className="font-semibold tracking-tight text-lg">Train2Race</span></Link>
        <MobileNav email={session.user.email ?? ""} />
      </div>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-2 py-2 rounded-lg text-foreground-dim hover:text-foreground hover:bg-surface transition-colors"
    >
      {label}
    </Link>
  );
}










