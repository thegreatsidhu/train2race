import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = process.env.ADMIN_PASSWORD || "train2race2024";

export async function isAdminAuthorized(password?: string): Promise<boolean> {
  // Super admin — logged-in session takes priority
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role === "superadmin") return true;
    }
  } catch {}

  // Fall back to password
  if (!password) return false;
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}
