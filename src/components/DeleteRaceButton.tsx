"use client";
import { useState } from "react";

export function DeleteRaceButton({ raceId }: { raceId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/races?id=${raceId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      window.location.reload();
    } else {
      setError("Failed to delete");
      setConfirm(false);
    }
  }

  if (error) return <span className="text-xs text-red-400">{error}</span>;

  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-foreground-dim">Delete race?</span>
        <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60">
          {deleting ? "Deleting..." : "Yes"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-foreground-dim hover:text-foreground">No</button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className="text-xs text-foreground-dim hover:text-red-400 transition-colors">
      Delete
    </button>
  );
}
