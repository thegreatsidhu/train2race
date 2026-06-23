"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: window.location.origin + "/" })}
      className="text-sm text-foreground-dim hover:text-alert transition-colors"
    >
      Sign out
    </button>
  );
}
