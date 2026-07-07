"use client";
import { useState } from "react";

export function JoinButton({ challengeId, initialJoined }: { challengeId: string; initialJoined: boolean }) {
  const [joined, setJoined] = useState(initialJoined);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/platform-challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, action: joined ? "leave" : "join", joinedVia: "link" }),
    });
    if (res.ok) setJoined(j => !j);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={"px-6 py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 " + (joined ? "bg-signal/10 border border-signal/40 text-signal" : "bg-signal text-background hover:bg-signal/90")}
    >
      {loading ? "…" : joined ? "✓ Joined" : "Join challenge"}
    </button>
  );
}
