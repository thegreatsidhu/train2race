"use client";

import { signOut } from "next-auth/react";
import { REMEMBER_TOKEN_STORAGE_KEY } from "@/lib/rememberTokenClient";

export function SignOutButton() {
  async function handleSignOut() {
    try {
      const data = await fetch("/api/me/week-summary").then(r => r.json());
      sessionStorage.setItem("logout-stats", JSON.stringify(data));
    } catch {}
    localStorage.removeItem(REMEMBER_TOKEN_STORAGE_KEY);
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
