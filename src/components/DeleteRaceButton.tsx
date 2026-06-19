"use client";

export function DeleteRaceButton({ raceId }: { raceId: string }) {
  async function handleDelete() {
    if (!confirm("Delete this race and its training plan?")) return;
    const res = await fetch(`/api/races?id=${raceId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to delete race");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-foreground-dim hover:text-red-400 transition-colors">
      Delete
    </button>
  );
}
