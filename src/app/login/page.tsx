"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { InviteRequestForm } from "@/components/InviteRequestForm";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "";
  const redirectTo = rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const failCount = useRef(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      failCount.current += 1;
      if (failCount.current >= 5) {
        setError("Too many failed attempts. Redirecting to reset password…");
        setTimeout(() => router.push(`/forgot-password`), 1500);
        return;
      }
      setError(`Incorrect email or password. ${5 - failCount.current} attempt${5 - failCount.current === 1 ? "" : "s"} remaining.`);
      return;
    }
    router.push(redirectTo);
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
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

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-center text-xs text-foreground-dim mb-3">Don't have an account yet?</p>
          <InviteRequestForm label="Request an invite code →" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
