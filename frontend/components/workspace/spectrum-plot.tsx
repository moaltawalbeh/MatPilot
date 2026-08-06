"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

export type SpectrumRegion = { from: number; to: number; label?: string };
export type PeakMarker = { position: number; label?: string };

const MAX_POINTS = 1200;

export default function SpectrumPlot({
  x,
  y,
  xLabel,
  yLabel,
  color = "var(--accent-cyan)",
  height = 260,
  peaks = [],
  regions = [],
  annotations = [],
  yDomain,
}: {
  x: number[] | null;
  y: number[] | null;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
  peaks?: PeakMarker[];
  regions?: SpectrumRegion[];
  annotations?: Array<{ position: number; label: string; color?: string }>;
  yDomain?: [number, number];
}) {
  const data = useMemo(() => {
    if (!x || !y) return [];
    const n = Math.min(x.length, y.length);
    if (n === 0) return [];
    const step = Math.max(1, Math.ceil(n / MAX_POINTS));
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i += step) {
      out.push({ x: x[i], y: y[i] });
    }
    return out;
  }, [x, y]);

  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          color: "var(--text-tertiary)",
          background: "var(--bg-tertiary)",
          borderRadius: "var(--radius-md)",
        }}
      >
        No spectrum data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            type="number"
            domain={["auto", "auto"]}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -4,
              fontSize: 11,
              fill: "var(--text-tertiary)",
            }}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            tickLine={{ stroke: "var(--border-subtle)" }}
            axisLine={{ stroke: "var(--border-subtle)" }}
          />
          <YAxis
            domain={yDomain ?? ["auto", "auto"]}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: 8,
              fontSize: 11,
              fill: "var(--text-tertiary)",
            }}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            tickLine={{ stroke: "var(--border-subtle)" }}
            axisLine={{ stroke: "var(--border-subtle)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text-tertiary)" }}
            labelFormatter={(value) => `${xLabel ?? "x"}: ${Number(value).toFixed(2)}`}
            formatter={(value: number) => [Number(value).toExponential(3), yLabel ?? "y"]}
          />
          {regions.map((r, i) => (
            <ReferenceArea
              key={`area-${i}`}
              x1={r.from}
              x2={r.to}
              stroke="var(--accent-emerald)"
              strokeOpacity={0.3}
              fill="var(--accent-emerald)"
              fillOpacity={0.12}
            />
          ))}
          {peaks.map((p, i) => (
            <ReferenceLine
              key={`peak-${i}`}
              x={p.position}
              stroke="var(--accent-amber)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
          ))}
          {annotations.map((a, i) => (
            <ReferenceLine
              key={`ann-${i}`}
              x={a.position}
              stroke={a.color ?? "var(--accent-rose)"}
              strokeDasharray="2 4"
            />
          ))}
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
