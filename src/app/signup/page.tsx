"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("invite") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, inviteCode: inviteCode || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="text" required placeholder="Name" value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
      <input type="email" required placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
      <input type="password" required minLength={8} placeholder="Password (min. 8 characters)" value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
      <input type="text" placeholder="Invite code (e.g. T2R-XXXX)" value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
        className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm font-data tracking-wider" />
      {error && <p className="text-alert text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full px-4 py-3 rounded-xl bg-signal text-background font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-semibold tracking-tight text-lg">Train2Race</Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Create your account</h1>
        <p className="text-foreground-dim text-sm mb-6">You need an invite code to sign up.</p>
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
        <p className="text-center text-sm text-foreground-dim mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-signal hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}