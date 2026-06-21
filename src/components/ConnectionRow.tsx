"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
function timeAgo(date){const mins=Math.floor((Date.now()-date.getTime())/60000);if(mins<1)return"just now";if(mins<60)return`${mins}m ago`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h ago`;return`${Math.floor(hrs/24)}d ago`;}
export function ConnectionRow({ source, label, description, connection }) {
  const router = useRouter();
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState("");
  const isConnected = connection && connection.status !== "revoked";
  const isAppleHealth = source === "APPLE_HEALTH";
  async function handleSync() {
    if (!connection || isAppleHealth) return;
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source})});
      const data = await res.json();
      if (data.skipped) { setSyncMsg("Synced recently"); }
      else { setSyncMsg(data.failed>0?"Sync failed":"Synced!"); router.refresh(); }
    } catch { setSyncMsg("Sync failed"); }
    setSyncing(false);
    setTimeout(()=>setSyncMsg(""),3000);
  }
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium">{label}</h3>
          {isConnected && <span className={"text-xs px-2 py-0.5 rounded-full "+(connection.status==="active"?"bg-signal/15 text-signal":"bg-alert/15 text-alert")}>{connection.status==="active"?"Connected":"Needs attention"}</span>}
        </div>
        <p className="text-sm text-foreground-dim">{description}</p>
        {connection?.lastSyncedAt && <p className="text-xs text-foreground-dim mt-1">Last synced {timeAgo(new Date(connection.lastSyncedAt))}</p>}
        {isAppleHealth && isConnected && <p className="text-xs text-foreground-dim mt-1">Auto-syncs via webhook</p>}
        {connection?.lastError && <p className="text-xs text-alert mt-1">{connection.lastError}</p>}
        {syncMsg && <p className={"text-xs mt-1 "+(syncMsg.includes("fail")?"text-alert":"text-signal")}>{syncMsg}</p>}
      </div>
      {isConnected ? (
        <div className="flex flex-col items-end gap-2 shrink-0">
          {!isAppleHealth && <button onClick={handleSync} disabled={syncing} className="px-4 py-2 rounded-full border border-border hover:border-foreground-dim transition-colors text-sm disabled:opacity-60">{syncing?"Syncing...":"Sync now"}</button>}
          <a href={`/api/connectors/${source.toLowerCase()}/disconnect`} className="text-xs text-foreground-dim hover:text-alert transition-colors">Disconnect</a>
        </div>
      ) : (
        <a href={`/api/connectors/${source.toLowerCase()}/start`} className="shrink-0 px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors">Connect</a>
      )}
    </div>
  );
}
