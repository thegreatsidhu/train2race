"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-foreground-dim hover:text-alert transition-colors"
    >
      Sign out
    </button>
  );
}
