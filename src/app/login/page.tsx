"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <img src="/logo.png" alt="Train2Race" className="w-16 h-16 rounded-2xl" />
            <span className="font-semibold tracking-tight text-lg">Train2Race</span>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
        <p className="text-foreground-dim text-sm mb-6">Log in to your team and training dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
          />
          {error && <p className="text-alert text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl bg-signal text-background font-medium hover:bg-signal-dim transition-colors disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-foreground-dim mt-6">
          No account?{" "}
          <Link href="/signup" className="text-signal hover:underline">Sign up</Link>
        </p>
        <p className="text-center text-sm text-foreground-dim mt-2">
          <Link href="/forgot-password" className="text-signal hover:underline">Forgot your password?</Link>
        </p>
      </div>
    </div>
  );
}