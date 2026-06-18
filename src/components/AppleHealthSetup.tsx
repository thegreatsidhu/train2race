"use client";

import { useState } from "react";

export function AppleHealthSetup({
  webhookSecret,
  lastSyncedAt,
}: {
  webhookSecret: string;
  lastSyncedAt: Date | null;
}) {
  const [copied, setCopied] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/connectors/apple-health?token=${webhookSecret}`
      : `/api/connectors/apple-health?token=${webhookSecret}`;

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-medium">Apple Watch (via Apple Health)</h3>
        {lastSyncedAt && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-signal/15 text-signal">Receiving data</span>
        )}
      </div>
      <p className="text-sm text-foreground-dim mb-4">
        Apple doesn&apos;t offer a direct web connection, so this works through a small
        export app on your iPhone instead. Install{" "}
        <span className="font-medium text-foreground">Health Auto Export</span> from the
        App Store, create a new automation with type <span className="font-data">REST API</span>,
        and paste this URL as the endpoint:
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-data text-xs bg-surface-raised border border-border rounded-lg px-3 py-2 truncate">
          {webhookUrl}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 px-3 py-2 rounded-lg border border-border hover:border-foreground-dim transition-colors text-xs"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-foreground-dim mt-3">
        Set the export schedule to daily (or hourly for fresher data) and select format JSON.
        Don&apos;t share this URL — anyone with it can post data as you.
      </p>
      {lastSyncedAt && (
        <p className="text-xs text-foreground-dim mt-2 font-data">
          Last received {lastSyncedAt.toLocaleString()}
        </p>
      )}
    </div>
  );
}
