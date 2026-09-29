"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

function AccountRemovedContent() {
  const params = useSearchParams();
  const banned = params.get("reason") === "banned";

  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <p className="text-sm text-foreground-dim">
      {banned
        ? "This account has been suspended. Signing you out…"
        : "This account is no longer available. Signing you out…"}
    </p>
  );
}

export default function AccountRemovedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="text-center max-w-sm">
        <Suspense>
          <AccountRemovedContent />
        </Suspense>
      </div>
    </div>
  );
}
