import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin access is granted purely by a NextAuth session with role "admin"/"superadmin" —
// there is no shared password. (A previous shared-password fallback — including a hardcoded
// literal usable by anyone who found it — was removed after Apple flagged the admin panel as
// an undisclosed surface during App Store review. See /admin's server-side page gate, which
// 404s the route entirely for anyone without an authorized session.)
//
// The `_password` parameter is kept (but ignored) so the many existing call sites across
// admin API routes that still pass one don't need to change.
export async function isAdminAuthorized(_password?: string): Promise<boolean> {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return false;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === "superadmin" || user?.role === "admin";
  } catch {
    return false;
  }
}
