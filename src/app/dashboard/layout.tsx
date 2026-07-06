import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SideNav } from "@/components/SideNav";
import { MobileNav } from "@/components/MobileNav";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
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

      {/* FAB — mobile only */}
      <Link
        href="/dashboard/log-workout"
        aria-label="Log workout"
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex w-14 h-14 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-black/25 active:scale-95 transition-transform"
        style={{ fontSize: 32, lineHeight: 1, fontWeight: 300 }}
      >
        +
      </Link>
    </div>
  );
}











