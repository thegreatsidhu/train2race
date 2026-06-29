import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";
import { MobileNav } from "@/components/MobileNav";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <SideNav email={session.user.email ?? ""} role={(session.user as any).role} />

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2"><Image src="/logo.png" alt="Train2Race" width={28} height={28} className="rounded-md" /><span className="font-semibold tracking-tight text-lg">Train2Race</span></Link>
        <MobileNav email={session.user.email ?? ""} role={(session.user as any).role} />
      </div>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}











