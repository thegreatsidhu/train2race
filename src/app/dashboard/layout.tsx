import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex-1 flex">
      <aside className="w-56 border-r border-border flex flex-col px-4 py-6 shrink-0">
        <Link href="/dashboard" className="font-semibold tracking-tight text-lg px-2 mb-8">
          Train2Race
        </Link>
        <nav className="flex flex-col gap-1 text-sm flex-1">
          <NavLink href="/dashboard" label="Today" />
          <NavLink href="/dashboard/fitness" label="Fitness" />
          <NavLink href="/dashboard/nutrition" label="Nutrition" />
          <NavLink href="/dashboard/chat" label="Coach" />
          <NavLink href="/dashboard/races" label="Race plans" />
          <NavLink href="/dashboard/connections" label="Connections" />
          <NavLink href="/dashboard/profile" label="Profile" />
        </nav>
        <div className="px-2">
          <p className="text-xs text-foreground-dim mb-2 truncate">{session.user.email}</p>
          <SignOutButton />
        </div>
      </aside>
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
