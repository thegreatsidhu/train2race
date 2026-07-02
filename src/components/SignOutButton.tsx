"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  async function handleSignOut() {
    try {
      const data = await fetch("/api/me/week-summary").then(r => r.json());
      sessionStorage.setItem("logout-stats", JSON.stringify(data));
    } catch {}
    await signOut({ redirect: false });
    window.location.href = "/goodbye";
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-foreground-dim hover:text-alert transition-colors"
    >
      Sign out
    </button>
  );
}
