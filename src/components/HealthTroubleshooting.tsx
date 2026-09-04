"use client";
import { useState, useEffect } from "react";
import { isMedianApp, openAppSettings } from "@/lib/median";

const ITEMS = [
  {
    q: "Tapping Connect flickers and then nothing happens",
    a: "This usually means Health Connect granted some permissions but not others — for example \"Steps\" is on but \"Distance\" isn't. On the phone, open the Health Connect app (or Settings → Apps → Health Connect) → App permissions → Train2Race, and check that at least Steps is turned on.",
  },
  {
    q: "\"No health data found\" after connecting",
    a: "Health Connect needs at least one app feeding it data (like Google Fit or your phone's built-in step counter). Open Health Connect → Data and access → make sure a data source is connected, and that it has recorded something for today.",
  },
  {
    q: "Google Health Connect isn't installed",
    a: "On some Android versions Health Connect is a separate app. Search \"Health Connect\" in the Play Store, install it, open it once, and connect a data source before coming back here.",
  },
  {
    q: "Just granted permissions but it's still not connecting",
    a: "Fully close Train2Race (swipe it away from recent apps, not just the back button) and reopen it before trying Connect again — permission changes don't always apply to an app that's still running in the background.",
  },
];

export function HealthTroubleshooting() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(isMedianApp()); }, []);
  if (!show) return null;

  return (
    <details className="mt-3 group">
      <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden py-2 px-1 text-sm text-foreground-dim hover:text-foreground transition-colors">
        <span>Trouble connecting Apple Health or Google Health Connect?</span>
        <span className="text-xs select-none transition-transform group-open:rotate-180 inline-block ml-2 shrink-0">▾</span>
      </summary>
      <div className="pt-1 pb-2 px-1 space-y-4">
        {ITEMS.map(({ q, a }) => (
          <div key={q}>
            <p className="text-sm font-medium mb-1">{q}</p>
            <p className="text-xs text-foreground-dim leading-relaxed">{a}</p>
          </div>
        ))}
        <button onClick={openAppSettings} className="text-xs text-signal hover:underline">
          Open app settings →
        </button>
      </div>
    </details>
  );
}
