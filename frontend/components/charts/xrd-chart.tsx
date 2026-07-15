"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { FileBarChart } from "lucide-react";

type Peak = { two_theta: number; intensity: number };

type XrdChartProps = {
  data?: { angle: number; Experimental: number; Calculated?: number; Difference?: number }[];
  peaks?: Peak[];
  referenceLines?: { angle: number; label: string; color?: string }[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function XrdChart({ data, peaks, referenceLines, title, emptyTitle, emptyDescription, emptyAction }: XrdChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="chart" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, minHeight: 250 }}>
        <FileBarChart size={48} color="#36516b" style={{ marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {emptyTitle || "No diffraction data yet"}
        </h3>
        <p className="muted" style={{ fontSize: 13, textAlign: "center", maxWidth: 300, marginBottom: 16 }}>
          {emptyDescription || "Upload an XRD pattern file to visualize the diffraction data here."}
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="chart">
      {title && (
        <div style={{ padding: "8px 16px 0", fontSize: 13, fontWeight: 500 }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18 }}>
          <CartesianGrid stroke="#263545" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="angle"
            tick={{ fontSize: 10 }}
            stroke="#8090a1"
            tickLine={false}
            label={{ value: "2θ (degrees)", position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "#8090a1" } }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="#8090a1"
            tickLine={false}
            label={{ value: "Intensity", angle: -90, position: "insideLeft", offset: 20, style: { fontSize: 10, fill: "#8090a1" } }}
          />
          <Tooltip
            contentStyle={{
              background: "#101a24",
              border: "1px solid #36516b",
              borderRadius: 6,
              fontSize: 11,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="Experimental" stroke="#70bdff" strokeWidth={2} dot={false} />
          {data[0]?.Calculated !== undefined && (
            <Line dataKey="Calculated" stroke="#60d2b5" strokeWidth={1.5} dot={false} />
          )}
          {data[0]?.Difference !== undefined && (
            <Line dataKey="Difference" stroke="#8897a8" strokeWidth={1} dot={false} />
          )}
          {peaks?.map((peak, i) => (
            <ReferenceLine
              key={`peak-${i}`}
              x={peak.two_theta}
              stroke="#ff6b6b"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ))}
          {referenceLines?.map((ref, i) => (
            <ReferenceLine
              key={`ref-${i}`}
              x={ref.angle}
              stroke={ref.color || "#ffd93d"}
              strokeDasharray="5 3"
              strokeWidth={1}
              label={{ value: ref.label, position: "top", style: { fontSize: 9, fill: ref.color || "#ffd93d" } }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
