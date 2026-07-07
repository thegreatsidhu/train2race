"use client";
import { useState, useEffect, useRef } from "react";

function formatDistance(distanceM: number | null) {
  if (!distanceM) return null;
  return `${(distanceM / 1609.34).toFixed(1)} mi`;
}

const TYPE_ICON: Record<string, string> = {
  run: "🏃", ride: "🚴", swim: "🏊", strength: "💪", walk: "🚶", other: "⚡",
};

function typeIcon(type: string) {
  return TYPE_ICON[type?.toLowerCase()] ?? "⚡";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  return "Just now";
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string;
  isMe: boolean;
}

export function TeamActivityFeed({ teamId }: { teamId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [highFiving, setHighFiving] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(14);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Comments state
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Set<string>>(new Set());
  const [deletingComment, setDeletingComment] = useState<Set<string>>(new Set());
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`/api/teams/${teamId}/activity`)
      .then(r => r.json())
      .then(d => { setActivities(d.activities || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [teamId]);

  async function toggleHighFive(activityId: string, iHighFived: boolean) {
    if (highFiving.has(activityId)) return;
    setHighFiving(prev => new Set(prev).add(activityId));
    const method = iHighFived ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/activities/${activityId}/kudos`, { method });
      const data = await res.json();
      if (res.ok) {
        setActivities(prev => prev.map(a =>
          a.id === activityId ? { ...a, highFiveCount: data.count, iHighFived: !iHighFived } : a
        ));
      }
    } finally {
      setHighFiving(prev => { const next = new Set(prev); next.delete(activityId); return next; });
    }
  }

  async function toggleComments(activityId: string) {
    const isOpen = expandedComments.has(activityId);
    setExpandedComments(prev => {
      const next = new Set(prev);
      isOpen ? next.delete(activityId) : next.add(activityId);
      return next;
    });
    if (!isOpen && !comments[activityId]) {
      await loadComments(activityId);
      setTimeout(() => inputRefs.current[activityId]?.focus(), 50);
    }
  }

  async function loadComments(activityId: string) {
    setLoadingComments(prev => new Set(prev).add(activityId));
    try {
      const res = await fetch(`/api/activities/${activityId}/comments`);
      const d = await res.json();
      setComments(prev => ({ ...prev, [activityId]: d.comments || [] }));
    } catch {}
    setLoadingComments(prev => { const next = new Set(prev); next.delete(activityId); return next; });
  }

  async function submitComment(activityId: string) {
    const content = (commentInputs[activityId] || "").trim();
    if (!content || submittingComment.has(activityId)) return;
    setSubmittingComment(prev => new Set(prev).add(activityId));
    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments(prev => ({ ...prev, [activityId]: [...(prev[activityId] ?? []), d.comment] }));
        setCommentInputs(prev => ({ ...prev, [activityId]: "" }));
        setActivities(prev => prev.map(a =>
          a.id === activityId ? { ...a, commentCount: (a.commentCount ?? 0) + 1 } : a
        ));
      }
    } finally {
      setSubmittingComment(prev => { const next = new Set(prev); next.delete(activityId); return next; });
    }
  }

  async function deleteComment(activityId: string, commentId: string) {
    if (deletingComment.has(commentId)) return;
    setDeletingComment(prev => new Set(prev).add(commentId));
    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (res.ok) {
        setComments(prev => ({
          ...prev,
          [activityId]: (prev[activityId] ?? []).filter(c => c.id !== commentId),
        }));
        setActivities(prev => prev.map(a =>
          a.id === activityId ? { ...a, commentCount: Math.max(0, (a.commentCount ?? 1) - 1) } : a
        ));
      }
    } finally {
      setDeletingComment(prev => { const next = new Set(prev); next.delete(commentId); return next; });
    }
  }

  if (!loaded) return <p className="text-sm text-foreground-dim py-4">Loading...</p>;
  if (activities.length === 0) return <p className="text-sm text-foreground-dim py-4">Be the first to log a workout today! Your team is watching 💪</p>;

  const visible = activities.slice(0, visibleCount);

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
      <div className="space-y-3">
        {visible.map((a: any) => {
          const commentsOpen = expandedComments.has(a.id);
          const activityComments = comments[a.id] ?? [];
          const commentCount = a.commentCount ?? 0;

          return (
            <div key={a.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">{a.isMe ? "You" : a.userName}</p>
                    <span className="text-xs text-foreground-dim shrink-0">{timeAgo(a.startTime)}</span>
                  </div>
                  <p className="text-sm capitalize">{typeIcon(a.type)} {a.title || a.type}</p>
                  <p className="text-xs text-foreground-dim mt-0.5">
                    {[
                      a.durationSec > 0 ? Math.round(a.durationSec / 60) + " min" : null,
                      formatDistance(a.distanceM),
                      a.raw?.steps ? Number(a.raw.steps).toLocaleString() + " steps" : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* High Five */}
                  {!a.isMe && (
                    <button
                      onClick={() => toggleHighFive(a.id, a.iHighFived)}
                      disabled={highFiving.has(a.id)}
                      className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                        (a.iHighFived
                          ? "bg-signal/15 border-signal/40 text-signal"
                          : "border-border bg-surface hover:bg-surface-raised text-foreground-dim")}
                    >
                      <span>🙌</span>
                      <span>{a.highFiveCount > 0 ? a.highFiveCount : ""} {a.iHighFived ? "High Five!" : "High Five"}</span>
                    </button>
                  )}
                  {a.isMe && a.highFiveCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-signal/30 bg-signal/10 text-signal">
                      <span>🙌</span>
                      <span>{a.highFiveCount}</span>
                    </div>
                  )}
                  {/* Comment toggle */}
                  <button
                    onClick={() => toggleComments(a.id)}
                    className={"flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-colors " +
                      (commentsOpen
                        ? "bg-surface-raised border-border text-foreground"
                        : "border-border text-foreground-dim hover:bg-surface-raised")}
                  >
                    <span>💬</span>
                    {commentCount > 0 && <span>{commentCount}</span>}
                  </button>
                </div>
              </div>

              {/* Photos */}
              {a.photos && a.photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {a.photos.map((url: string, i: number) => (
                    <button key={i} onClick={() => setLightbox(url)} className="focus:outline-none">
                      <img
                        src={url}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Comments section */}
              {commentsOpen && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {loadingComments.has(a.id) ? (
                    <p className="text-xs text-foreground-dim animate-pulse">Loading comments…</p>
                  ) : activityComments.length === 0 ? (
                    <p className="text-xs text-foreground-dim">No comments yet. Be the first!</p>
                  ) : (
                    <div className="space-y-2">
                      {activityComments.map((c: Comment) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-xs font-medium">{c.isMe ? "You" : c.userName}</span>
                              <span className="text-xs text-foreground-dim">{timeAgo(c.createdAt)}</span>
                            </div>
                            <p className="text-sm mt-0.5 break-words">{c.content}</p>
                          </div>
                          {c.isMe && (
                            <button
                              onClick={() => deleteComment(a.id, c.id)}
                              disabled={deletingComment.has(c.id)}
                              className="text-xs text-foreground-dim/50 hover:text-red-400 transition-colors shrink-0 mt-0.5 disabled:opacity-40"
                              aria-label="Delete comment"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment input */}
                  <div className="flex gap-2 items-center">
                    <input
                      ref={el => { inputRefs.current[a.id] = el; }}
                      type="text"
                      maxLength={500}
                      placeholder="Add a comment…"
                      value={commentInputs[a.id] ?? ""}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [a.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment(a.id)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none placeholder:text-foreground-dim/50"
                    />
                    <button
                      onClick={() => submitComment(a.id)}
                      disabled={submittingComment.has(a.id) || !(commentInputs[a.id] ?? "").trim()}
                      className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-40 shrink-0"
                    >
                      {submittingComment.has(a.id) ? "…" : "Post"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {activities.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(c => c + 14)}
            className="w-full py-2 text-sm text-foreground-dim hover:text-foreground border border-border rounded-xl hover:bg-surface transition-colors">
            Load more
          </button>
        )}
      </div>
    </>
  );
}
