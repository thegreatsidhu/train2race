import { prisma } from "@/lib/prisma";
import { verifyUnsubToken } from "@/lib/email";
import Link from "next/link";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full bg-surface border border-border rounded-2xl p-8 text-center">
          <p className="text-foreground-dim text-sm">Invalid unsubscribe link.</p>
          <Link href="/dashboard/profile" className="mt-4 inline-block text-signal text-sm underline">
            Manage email preferences
          </Link>
        </div>
      </div>
    );
  }

  const userId = verifyUnsubToken(token);
  let success = false;
  let alreadyOptedOut = false;

  if (userId) {
    try {
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { emailOptOut: true },
      });
      if (user?.emailOptOut) {
        alreadyOptedOut = true;
        success = true;
      } else {
        await (prisma as any).user.update({
          where: { id: userId },
          data: { emailOptOut: true },
        });
        success = true;
      }
    } catch {}
  }

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full bg-surface border border-border rounded-2xl p-8 text-center">
          <p className="text-foreground-dim text-sm">This unsubscribe link is invalid or has expired.</p>
          <Link href="/dashboard/profile" className="mt-4 inline-block text-signal text-sm underline">
            Manage email preferences
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full bg-surface border border-border rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-signal/10 border border-signal/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-xl">✓</span>
        </div>
        <h1 className="text-foreground font-semibold text-lg mb-2">
          {alreadyOptedOut ? "Already unsubscribed" : "You've been unsubscribed"}
        </h1>
        <p className="text-foreground-dim text-sm leading-relaxed">
          You will no longer receive marketing and digest emails from Train2Race.
          You will still receive critical account emails like password resets.
        </p>
        <div className="mt-6 space-y-2">
          <Link
            href={`/unsubscribe/resubscribe?token=${token}`}
            className="block text-xs text-foreground-dim underline"
          >
            Changed your mind? Re-subscribe
          </Link>
          <Link href="/" className="block text-xs text-foreground-dim underline">
            Go to train2race.com
          </Link>
        </div>
      </div>
    </div>
  );
}
