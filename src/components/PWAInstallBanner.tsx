"use client";
import { useState, useEffect } from "react";

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem("pwa-banner-dismissed") === "1") return;

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
  }, []);

  useEffect(() => {
    if (platform) setVisible(true);
  }, [platform]);

  function dismiss() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setVisible(false);
  }

  if (!visible || !platform) return null;

  const instruction =
    platform === "ios"
      ? 'Tap the share button then "Add to Home Screen"'
      : 'Tap the menu then "Add to Home Screen"';

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-signal text-background">
      <p className="text-sm leading-snug">
        <span className="font-semibold">Install Train2Race</span>
        {" — "}
        {instruction}
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 mt-0.5 text-background/70 hover:text-background transition-colors text-base leading-none"
      >
        ✕
      </button>
    </div>
  );
}
