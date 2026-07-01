"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <Image src="/logo.png" alt="Train2Race" width={64} height={64} className="rounded-2xl" />
            <span className="font-semibold tracking-tight text-lg">Train2Race</span>
          </Link>
        </div>

        {submitted ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight mb-3">Check your email</h1>
            <p className="text-foreground-dim text-sm mb-6">
              If an account exists for <strong>{email}</strong>, we sent a reset link. Check your inbox — it expires in 1 hour.
            </p>
            <Link href="/login" className="text-signal hover:underline text-sm">Back to login</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Forgot your password?</h1>
            <p className="text-foreground-dim text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-signal text-background font-medium hover:bg-signal-dim transition-colors disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="text-center text-sm text-foreground-dim mt-6">
              <Link href="/login" className="text-signal hover:underline">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}