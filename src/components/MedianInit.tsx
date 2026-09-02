"use client";
import { useEffect } from "react";
import { syncStatusBarColor } from "@/lib/median";

export function MedianInit() {
  useEffect(() => {
    syncStatusBarColor();
  }, []);

  return null;
}
