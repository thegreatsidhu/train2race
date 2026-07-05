"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Activity {
  id: string;
  title: string | null;
  type: string;
  startTime: Date;
  durationSec: number;
  distanceM: number | null;
  source: string;
  raw?: any;
  photos?: string[];
}

export function ActivityList({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deletedPhotos, setDeletedPhotos] = useState<Set<string>>(new Set());

  async function removePhoto(activityId: string, photoUrl: string) {
    setDeletedPhotos(prev => new Set(prev).add(photoUrl));
    const res = await fetch(`/api/activities/${activityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removePhoto: photoUrl }),
    });
    if (!res.ok) {
      setDeletedPhotos(prev => { const next = new Set(prev); next.delete(photoUrl); return next; });
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setDeleting(null);
    setConfirmDel(null);
    router.refresh();
  }

  function formatDistance(distanceM: number | null, type: string) {
    if (!distanceM) return null;
    if (type === "swim") {
      return distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`;
    }
    return `${(distanceM / 1609.34).toFixed(1)} mi`;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-foreground-dim">Your journey starts with one workout.</p>;
  }

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
      <div className="space-y-2">
        {activities.map((a) => {
          const isPlan = a.source === "plan";
          const photos = a.photos ?? [];
          return (
            <div key={a.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium capitalize">{a.title ?? a.type}</p>
                    {isPlan && <span className="text-xs px-1.5 py-0.5 rounded-md bg-signal/10 text-signal border border-signal/20">Plan</span>}
                  </div>
                  <p className="text-xs text-foreground-dim">
                    {new Date(a.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" · "}{isPlan ? "Training Plan" : a.source.toLowerCase()}
                  </p>
                  {a.raw?.notes && (
                    <p className="text-xs text-foreground-dim mt-0.5 italic truncate">{a.raw.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-data text-sm text-foreground-dim">
                    {[
                      a.durationSec > 0 ? Math.round(a.durationSec / 60) + " min" : null,
                      formatDistance(a.distanceM, a.type),
                      a.raw?.steps ? Number(a.raw.steps).toLocaleString() + " steps" : null,
                    ].filter(Boolean).join(" · ")}
                  </span>
                  {a.source === "MANUAL" && (
                    <button onClick={() => router.push(`/dashboard/log-workout/edit/${a.id}`)}
                      className="text-xs text-foreground-dim hover:text-signal transition-colors" title="Edit">
                      ✎
                    </button>
                  )}
                  {!isPlan && (
                    <button onClick={() => setConfirmDel(confirmDel === a.id ? null : a.id)}
                      className="text-xs text-foreground-dim hover:text-alert transition-colors" title="Delete">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {photos.filter(u => !deletedPhotos.has(u)).length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {photos.filter(u => !deletedPhotos.has(u)).map((url, i) => (
                    <div key={i} className="relative group">
                      <button onClick={() => setLightbox(url)} className="focus:outline-none">
                        <img
                          src={url}
                          alt=""
                          className="w-16 h-16 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity"
                        />
                      </button>
                      {a.source === "MANUAL" && (
                        <button
                          onClick={() => removePhoto(a.id, url)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove photo">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {confirmDel === a.id && !isPlan && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-foreground-dim flex-1">Delete this workout?</p>
                  <button onClick={() => setConfirmDel(null)}
                    className="text-xs px-3 py-1 rounded-full border border-border hover:bg-surface">Cancel</button>
                  <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                    className="text-xs px-3 py-1 rounded-full bg-alert text-background disabled:opacity-50">
                    {deleting === a.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
