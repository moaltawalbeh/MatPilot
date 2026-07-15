"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

type Peak = { two_theta: number; intensity: number };

type XrdChartProps = {
  data?: { angle: number; Experimental: number; Calculated?: number; Difference?: number }[];
  peaks?: Peak[];
  referenceLines?: { angle: number; label: string; color?: string }[];
  title?: string;
};

function generateDefaultData() {
  return Array.from({ length: 71 }, (_, i) => {
    const x = 10 + i;
    const p = (at: number, h: number, w: number) => h * Math.exp(-Math.pow((x - at) / w, 2));
    const calc = 3 + p(18.7, 43, 1.35) + p(37.5, 100, 1.7) + p(44.2, 67, 1.3) + p(48.5, 54, 1.3) + p(65, 38, 1.8);
    return {
      angle: x,
      Experimental: Math.round(calc + (i % 5)),
      Calculated: Math.round(calc * 0.94),
      Difference: Math.round((i % 5) - 2),
    };
  });
}

export function XrdChart({ data, peaks, referenceLines, title }: XrdChartProps) {
  const chartData = data || generateDefaultData();

  return (
    <div className="chart">
      {title && (
        <div style={{ padding: "8px 16px 0", fontSize: 13, fontWeight: 500 }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18 }}>
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
          {chartData[0]?.Calculated !== undefined && (
            <Line dataKey="Calculated" stroke="#60d2b5" strokeWidth={1.5} dot={false} />
          )}
          {chartData[0]?.Difference !== undefined && (
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
