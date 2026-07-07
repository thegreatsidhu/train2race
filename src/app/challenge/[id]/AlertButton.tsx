"use client";
import { useState } from "react";

export function AlertButton({ challengeType }: { challengeType: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function request() {
    if (state !== "idle") return;
    setState("loading");
    const res = await fetch("/api/platform-challenges/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeType }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "idle");
  }

  if (state === "done") return <span className="text-sm text-signal">✓ You'll be notified when the next challenge starts!</span>;

  return (
    <button
      onClick={request}
      disabled={state === "loading"}
      className="px-5 py-2.5 rounded-2xl bg-signal text-background font-semibold text-sm hover:bg-signal/90 transition-colors disabled:opacity-50"
    >
      {state === "loading" ? "…" : "🔔 Alert me when the next challenge starts"}
    </button>
  );
}
