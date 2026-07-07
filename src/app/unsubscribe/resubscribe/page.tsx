"use client";
import { useState } from "react";
import Link from "next/link";

export default function ResubscribePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token || "";
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function resubscribe() {
    setState("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, resubscribe: true }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full bg-surface border border-border rounded-2xl p-8 text-center">
        {state === "done" ? (
          <>
            <div className="w-12 h-12 rounded-full bg-signal/10 border border-signal/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">✓</span>
            </div>
            <h1 className="text-foreground font-semibold text-lg mb-2">You're back!</h1>
            <p className="text-foreground-dim text-sm">You'll receive Train2Race emails again.</p>
            <Link href="/" className="mt-4 inline-block text-signal text-sm underline">Go to Train2Race</Link>
          </>
        ) : (
          <>
            <h1 className="text-foreground font-semibold text-lg mb-2">Re-subscribe to emails</h1>
            <p className="text-foreground-dim text-sm mb-6">
              You'll start receiving digest, challenge, and team summary emails again. You can opt out at any time.
            </p>
            {state === "error" && <p className="text-red-400 text-xs mb-3">Something went wrong. Try again or manage preferences in your profile.</p>}
            <button
              onClick={resubscribe}
              disabled={state === "loading" || !token}
              className="w-full py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50"
            >
              {state === "loading" ? "Re-subscribing…" : "Yes, re-subscribe me"}
            </button>
            <Link href="/" className="mt-3 block text-xs text-foreground-dim underline">Never mind</Link>
          </>
        )}
      </div>
    </div>
  );
}
