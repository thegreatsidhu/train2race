"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { syncStatusBarColor, setPushExternalUserId, addPushOpenedListener, removePushOpenedListener } from "@/lib/median";

export function MedianInit() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    syncStatusBarColor();
  }, []);

  // Keep this device's OneSignal external user ID in sync with whichever account is signed in,
  // so server-side push targeting is correct even before the explicit push opt-in step.
  useEffect(() => {
    if (status !== "authenticated") return;
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) setPushExternalUserId(userId);
  }, [status, session]);

  // Deep-link into the app when a push notification is tapped.
  useEffect(() => {
    const listenerId = addPushOpenedListener((data) => {
      if (data?.type === "chat_message" && data?.teamId) {
        router.push(`/dashboard/teams/${data.teamId}?tab=chat`);
      }
    });
    return () => removePushOpenedListener(listenerId);
  }, [router]);

  return null;
}
