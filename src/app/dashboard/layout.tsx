import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ViewTransition } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SideNav } from "@/components/SideNav";
import { MobileNav } from "@/components/MobileNav";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { LogWorkoutFAB } from "@/components/LogWorkoutFAB";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();

  // TEMPORARY diagnostic for the "logged out on every app reopen" investigation — remove once
  // resolved. Logs whether the session cookie actually arrives on the request at all, so we can
  // tell apart "cookie never sent" (native storage issue) from "cookie sent but rejected" (an
  // auth-config issue) — Vercel's function logs will show this.
  const session = await auth();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const hasSessionCookie = /(^|;\s*)(__Secure-)?authjs\.session-token=/.test(cookieHeader);
  const cookieNames = cookieHeader.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean);
  console.log(`[auth-debug] authed=${!!session?.user} hasSessionCookie=${hasSessionCookie} cookieCount=${cookieNames.length} cookieNames=${JSON.stringify(cookieNames)} ua=${(requestHeaders.get("user-agent") ?? "").slice(0, 100)}`);

  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { onboardingComplete: true } });
  if (!dbUser?.onboardingComplete) redirect("/onboarding");

  // Android's Median WebView already reserves space for the status bar natively (unlike iOS,
  // which draws edge-to-edge under a translucent status bar) — adding our own safe-area-inset
  // padding on top of that reserved space double-counts it, showing up as an empty gap above
  // the header. Detect Android server-side (via User-Agent) so there's no client-side flash.
  const isAndroid = /Android/i.test(requestHeaders.get("user-agent") ?? "");

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <SideNav email={session.user.email ?? ""} role={(session.user as any).role} />

      {/* Mobile top bar */}
      <div className={"md:hidden flex flex-col sticky top-0 z-20 bg-background" + (isAndroid ? "" : " pt-[env(safe-area-inset-top)]")}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2"><Image src="/logo.png" alt="Train2Race" width={28} height={28} className="rounded-md" /><span className="font-semibold tracking-tight text-lg">Train2Race</span></Link>
          <MobileNav email={session.user.email ?? ""} role={(session.user as any).role} />
        </div>
        <PWAInstallBanner />
      </div>

      <main className="flex-1 min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
        <ViewTransition enter="page-fade-in" exit="page-fade-out" default="none">
          {children}
        </ViewTransition>
      </main>

      {/* FAB — mobile only, hidden on log-workout pages */}
      <LogWorkoutFAB />
    </div>
  );
}











