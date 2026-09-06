"use client";
import { useEffect } from "react";
import { REMEMBER_TOKEN_STORAGE_KEY } from "@/lib/rememberTokenClient";

// Mints a remember-me token into localStorage if one isn't already there — covers first login
// via any provider (credentials or Google), and self-heals if the stored token is ever lost for
// some other reason. The actual silent-restore-after-cookie-loss logic lives on the login page.
export function RememberMeSync() {
  useEffect(() => {
    if (localStorage.getItem(REMEMBER_TOKEN_STORAGE_KEY)) return;
    fetch("/api/auth/remember", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.token) localStorage.setItem(REMEMBER_TOKEN_STORAGE_KEY, d.token); })
      .catch(() => {});
  }, []);

  return null;
}
