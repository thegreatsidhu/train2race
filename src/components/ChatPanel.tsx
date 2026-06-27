"use client";
import { useState, useRef, useEffect } from "react";

function fmtMsgDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (msgDay.getTime() === today.getTime()) return `Today · ${time}`;
  if (msgDay.getTime() === yesterday.getTime()) return `Yesterday · ${time}`;
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` · ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ` · ${time}`;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
  replyTo?: { id: string; content: string; user: { id: string; name: string } } | null;
}

interface Props {
  messages: Message[];
  myUserId: string;
  isAdmin?: boolean;
  height?: string;
  onSend: (content: string, replyToId?: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onDeleteAll?: () => Promise<void>;
  sending?: boolean;
}

export function ChatPanel({ messages, myUserId, isAdmin, height = "360px", onSend, onDelete, onDeleteAll, sending }: Props) {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    await onSend(trimmed, replyTo?.id);
    setReplyTo(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  }

  async function handleDeleteAll() {
    setConfirmDeleteAll(false);
    await onDeleteAll?.();
  }

  function startReply(msg: Message) {
    setReplyTo(msg);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col" style={{ height }}>
      {/* Admin: clear all */}
      {isAdmin && onDeleteAll && (
        <div className="flex justify-end mb-2">
          {confirmDeleteAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-dim">Clear all messages?</span>
              <button onClick={handleDeleteAll} className="text-xs px-2 py-1 rounded-full bg-red-600 text-white">Yes, clear</button>
              <button onClick={() => setConfirmDeleteAll(false)} className="text-xs px-2 py-1 rounded-full border border-border">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDeleteAll(true)} className="text-xs text-red-400 hover:text-red-300">Clear all messages</button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1.5 mb-3 pr-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-foreground-dim">No messages yet. Say hi!</p>
          </div>
        ) : messages.map((msg) => {
          const isMe = msg.user.id === myUserId;
          return (
            <div key={msg.id} className={"flex gap-1.5 group " + (isMe ? "flex-row-reverse" : "")}>
              <div className={"max-w-[75%] " + (isMe ? "items-end" : "items-start") + " flex flex-col gap-0.5"}>
                {/* Sender name — always shown */}
                <span className={"text-xs font-medium px-1 " + (isMe ? "text-signal text-right" : "text-foreground-dim")}>
                  {msg.user.name}{isMe ? " (you)" : ""}
                </span>

                {/* Bubble */}
                <div className={"rounded-2xl px-3 py-2 text-sm " + (isMe ? "bg-signal text-background" : "bg-surface border border-border")}>
                  {/* Quoted reply */}
                  {msg.replyTo && (
                    <div className={"mb-1.5 px-2 py-1 rounded-lg border-l-2 text-xs " + (isMe ? "border-background/40 bg-background/10" : "border-signal/40 bg-signal/5")}>
                      <span className={"font-medium " + (isMe ? "opacity-80" : "text-signal")}>{msg.replyTo.user.name}</span>
                      <p className={"opacity-70 truncate mt-0.5 " + (isMe ? "" : "text-foreground-dim")}>{msg.replyTo.content}</p>
                    </div>
                  )}
                  <p className="leading-snug">{msg.content}</p>
                  <p className={"text-xs mt-1 " + (isMe ? "opacity-50" : "text-foreground-dim/60")}>
                    {fmtMsgDate(msg.createdAt)}
                  </p>
                </div>

                {/* Actions — show on hover */}
                <div className={"flex gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity " + (isMe ? "flex-row-reverse" : "")}>
                  <button onClick={() => startReply(msg)} className="text-xs text-foreground-dim hover:text-foreground">Reply</button>
                  {(isMe || isAdmin) && (
                    <button onClick={() => handleDelete(msg.id)} disabled={deletingId === msg.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40">
                      {deletingId === msg.id ? "…" : isAdmin && !isMe ? "Delete (admin)" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-surface border border-signal/30 text-xs">
          <div className="flex-1 min-w-0">
            <span className="text-signal font-medium">Replying to {replyTo.user.name}</span>
            <p className="text-foreground-dim truncate mt-0.5">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-foreground-dim hover:text-foreground shrink-0">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={replyTo ? `Reply to ${replyTo.user.name}…` : "Message the group…"}
          className="flex-1 px-3 py-2 rounded-full bg-surface border border-border focus:border-signal outline-none text-sm"
        />
        <button onClick={handleSend} disabled={sending || !input.trim()}
          className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">
          Send
        </button>
      </div>
    </div>
  );
}
