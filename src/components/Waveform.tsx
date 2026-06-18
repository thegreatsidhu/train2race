"use client";

import { useMemo } from "react";

interface WaveformProps {
  /** If provided, the waveform's rhythm reflects this resting HR (faster bpm = tighter pulses). */
  restingHeartRate?: number;
  className?: string;
  color?: string;
}

/**
 * The app's signature visual element: a continuous ECG-style trace that
 * scrolls right to left. When given a real resting heart rate, the pulse
 * spacing/speed is derived from it, so the line is quietly a real read
 * of the person's own physiology rather than pure decoration.
 */
export function Waveform({ restingHeartRate = 60, className = "", color }: WaveformProps) {
  const path = useMemo(() => buildEcgPath(8), []); // 8 repeating beats, enough to scroll seamlessly
  const durationSec = Math.max(3, Math.min(10, (60 / restingHeartRate) * 6));

  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 960 64"
        preserveAspectRatio="none"
        className="w-[200%] h-full"
        style={{
          animation: `scroll-waveform ${durationSec}s linear infinite`,
        }}
      >
        <path
          d={path}
          fill="none"
          stroke={color ?? "var(--signal)"}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
        />
        <path
          d={path}
          fill="none"
          stroke={color ?? "var(--signal)"}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
          transform="translate(960, 0)"
        />
      </svg>
      <style>{`
        @keyframes scroll-waveform {
          from { transform: translateX(0); }
          to { transform: translateX(-960px); }
        }
      `}</style>
    </div>
  );
}

// Builds N repeating ECG-like cycles: flat baseline, small P wave, sharp
// QRS spike, T wave bump, then flat again — tiled across a 960px-wide viewBox.
function buildEcgPath(beats: number): string {
  const beatWidth = 120;
  const baselineY = 32;
  let d = `M0,${baselineY}`;
  for (let i = 0; i < beats; i++) {
    const x = i * beatWidth;
    d += ` L${x + 20},${baselineY}`;
    d += ` Q${x + 28},${baselineY - 6} ${x + 34},${baselineY}`; // P wave
    d += ` L${x + 46},${baselineY}`;
    d += ` L${x + 50},${baselineY + 6}`; // Q dip
    d += ` L${x + 56},${baselineY - 26}`; // R spike
    d += ` L${x + 62},${baselineY + 10}`; // S dip
    d += ` L${x + 70},${baselineY}`;
    d += ` L${x + 82},${baselineY}`;
    d += ` Q${x + 92},${baselineY - 10} ${x + 102},${baselineY}`; // T wave
    d += ` L${x + beatWidth},${baselineY}`;
  }
  return d;
}
