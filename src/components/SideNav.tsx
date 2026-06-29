"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

const NAV_LINKS = [
  { href: "/dashboard", label: "Today", exact: true },
  { href: "/dashboard/plan", label: "My Plan" },
  { href: "/dashboard/teams", label: "Teams" },
  { href: "/dashboard/community", label: "Community" },
  { href: "/dashboard/races", label: "Races" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/nutrition", label: "Nutrition" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/support", label: "Help & Support" },
  { href: "/dashboard/feature-request", label: "Request a Feature" },
];

export function SideNav({ email }: { email: string }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="hidden md:flex w-56 border-r border-border flex-col px-4 py-6 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8">
        <Image src="/logo.png" alt="Train2Race" width={32} height={32} className="rounded-lg" />
        <span className="font-semibold tracking-tight text-lg">Train2Race</span>
      </Link>
      <nav className="flex flex-col gap-1 text-sm flex-1">
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={
              "px-2 py-2 rounded-lg transition-colors " +
              (isActive(link.href, link.exact)
                ? "bg-signal/10 text-signal font-medium"
                : "text-foreground-dim hover:text-foreground hover:bg-surface")
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="px-2">
        <p className="text-xs text-foreground-dim mb-2 truncate">{email}</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
