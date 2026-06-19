"use client";

export function DeleteRaceButton({ raceId }: { raceId: string }) {
  async function handleDelete() {
    if (!confirm("Delete this race and its training plan?")) return;
    await fetch(`/api/races/${raceId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: raceId }),
    });
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-foreground-dim hover:text-red-400 transition-colors">
      Delete
    </button>
  );
}
