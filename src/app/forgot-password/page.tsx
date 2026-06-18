"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-semibold tracking-tight text-lg">Train2Race</Link>
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