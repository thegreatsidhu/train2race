"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0d10", color: "#ede9e2", fontFamily: "sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ textAlign: "center", maxWidth: "24rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</h2>
            <p style={{ fontSize: "0.875rem", color: "#9aa3ab", marginBottom: "1.5rem" }}>
              An unexpected error occurred. It has been reported automatically.
            </p>
            <button
              onClick={unstable_retry}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "9999px", background: "#5ec9b5", color: "#0b0d10", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", border: "none" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
