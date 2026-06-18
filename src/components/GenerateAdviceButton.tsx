"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateAdviceButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/advice/generate", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="shrink-0 px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60"
    >
      {loading ? "Generating…" : "Generate now"}
    </button>
  );
}
