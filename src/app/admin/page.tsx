import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "./AdminPanel";

// Server-side gate: anyone without an admin/superadmin session gets a plain 404 — not a
// login screen, not an "unauthorized" message, nothing indicating an admin panel exists here
// at all. (Apple flagged this route during App Store review as an undisclosed admin surface,
// reachable at a guessable URL with a shared password that had a hardcoded fallback. That
// password system has been removed entirely; access is now purely by real account role.)
export default async function AdminPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) notFound();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "admin" && user?.role !== "superadmin") notFound();

  return <AdminPanel />;
}
