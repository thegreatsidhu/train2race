"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeviceConnection } from "@prisma/client";

interface Props {
  source: "GARMIN" | "WHOOP" | "STRAVA";
  label: string;
  description: string;
  connection?: DeviceConnection;
}

export function ConnectionRow({ source, label, description, connection }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const isConnected = connection && connection.status !== "revoked";

  async function handleSync() {
    if (!connection) return;
    setSyncing(true);
    await fetch(`/api/connectors/${source.toLowerCase()}/sync`, { method: "POST" });
    setSyncing(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium">{label}</h3>
          {isConnected && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                connection.status === "active"
                  ? "bg-signal/15 text-signal"
                  : "bg-alert/15 text-alert"
              }`}
            >
              {connection.status === "active" ? "Connected" : "Needs attention"}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground-dim">{description}</p>
        {connection?.lastSyncedAt && (
          <p className="text-xs text-foreground-dim mt-1 font-data">
            Last synced {connection.lastSyncedAt.toLocaleString()}
          </p>
        )}
        {connection?.lastError && (
          <p className="text-xs text-alert mt-1">{connection.lastError}</p>
        )}
      </div>

      {isConnected ? (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="shrink-0 px-4 py-2 rounded-full border border-border hover:border-foreground-dim transition-colors text-sm disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      ) : (
        <a
          href={`/api/connectors/${source.toLowerCase()}/start`}
          className="shrink-0 px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors"
        >
          Connect
        </a>
      )}
    </div>
  );
}
