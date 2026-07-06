import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SideNav } from "@/components/SideNav";
import { MobileNav } from "@/components/MobileNav";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { LogWorkoutFAB } from "@/components/LogWorkoutFAB";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { onboardingComplete: true } });
  if (!dbUser?.onboardingComplete) redirect("/onboarding");

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <SideNav email={session.user.email ?? ""} role={(session.user as any).role} />

      {/* Mobile top bar */}
      <div className="md:hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2"><Image src="/logo.png" alt="Train2Race" width={28} height={28} className="rounded-md" /><span className="font-semibold tracking-tight text-lg">Train2Race</span></Link>
          <MobileNav email={session.user.email ?? ""} role={(session.user as any).role} />
        </div>
        <PWAInstallBanner />
      </div>

      <main className="flex-1 min-w-0 pb-24 md:pb-0">{children}</main>

      {/* FAB — mobile only, hidden on log-workout pages */}
      <LogWorkoutFAB />
    </div>
  );
}











