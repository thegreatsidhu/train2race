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
  role: "user" | "assistant";
  content: string;
  sentAt?: string;
}

export function ChatUI({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const now = new Date().toISOString();
    setMessages((prev) => [...prev, { role: "user", content: text, sentAt: now }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const replyAt = new Date().toISOString();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, sentAt: replyAt }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong — try again in a moment.", sentAt: replyAt },
        ]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-foreground-dim text-sm">
            Try: &quot;How&apos;s my recovery looking this week?&quot; or &quot;Build me a 12-week half marathon plan.&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-signal text-background"
                  : "bg-surface-raised border border-border text-foreground"
              }`}
            >
              {m.content}
              {m.sentAt && (
                <p className={"text-xs mt-1.5 " + (m.role === "user" ? "opacity-50 text-right" : "text-foreground-dim/60")}>
                  {fmtMsgDate(m.sentAt)}
                </p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface-raised border border-border rounded-2xl px-4 py-3 text-sm text-foreground-dim">
              Thinking…
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border p-4 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask your coach…"
          className="flex-1 bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-signal"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-5 py-3 rounded-xl bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
