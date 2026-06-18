"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-alert text-sm mb-4">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-signal hover:underline text-sm">Request a new one</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight mb-3">Password updated</h1>
        <p className="text-foreground-dim text-sm">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Set a new password</h1>
      <p className="text-foreground-dim text-sm mb-6">Must be at least 8 characters.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
        />
        {error && <p className="text-alert text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl bg-signal text-background font-medium hover:bg-signal-dim transition-colors disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-semibold tracking-tight text-lg">Train2Race</Link>
        </div>
        <Suspense fallback={<p className="text-foreground-dim text-sm">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
