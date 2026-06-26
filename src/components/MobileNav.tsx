"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function MobileNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-surface transition-colors">
        <div className="w-5 h-0.5 bg-foreground mb-1"></div>
        <div className="w-5 h-0.5 bg-foreground mb-1"></div>
        <div className="w-5 h-0.5 bg-foreground"></div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <Image src="/logo.png" alt="Train2Race" width={28} height={28} className="rounded-md" />
              <span className="font-semibold text-lg">Train2Race</span>
            </Link>
            <button onClick={() => setOpen(false)} className="p-2 text-foreground-dim hover:text-foreground text-xl leading-none">
              ✕
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-4 text-lg">
            {[
              { href: "/dashboard", label: "Today" },
              { href: "/dashboard/plan", label: "My Plan" },
              { href: "/dashboard/teams", label: "Teams" },
              { href: "/dashboard/races", label: "Races" },
              { href: "/dashboard/community", label: "Community" },
              { href: "/dashboard/leaderboard", label: "Leaderboard" },
              { href: "/dashboard/nutrition", label: "Nutrition" },
              { href: "/dashboard/profile", label: "Profile" },
              { href: "/dashboard/support", label: "Help & Support" },
              { href: "/dashboard/feature-request", label: "Request a Feature" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-3 py-3 rounded-xl text-foreground-dim hover:text-foreground hover:bg-surface transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="px-7 pt-4 border-t border-border">
            <p className="text-xs text-foreground-dim mb-3">{email}</p>
          </div>
        </div>
      )}
    </>
  );
}







