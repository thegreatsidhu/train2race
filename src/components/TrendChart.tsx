"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { MergedDayMetrics } from "@/lib/ai/metrics";

export function TrendChart({ history }: { history: MergedDayMetrics[] }) {
  const data = history.map((d) => ({
    date: d.date.slice(5), // MM-DD
    restingHeartRate: d.restingHeartRate,
    hrvMs: d.hrvMs,
    sleepScore: d.sleepScore,
  }));

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--foreground-dim)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="var(--foreground-dim)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="restingHeartRate"
            name="Resting HR"
            stroke="var(--foreground-dim)"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="hrvMs"
            name="HRV"
            stroke="var(--signal)"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="sleepScore"
            name="Sleep score"
            stroke="var(--load)"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
