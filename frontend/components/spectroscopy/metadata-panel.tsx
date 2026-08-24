"use client";

import { Info, FileText } from "lucide-react";

type MetadataPanelProps = {
  metadata: Record<string, unknown>;
  filename?: string;
  dataPoints?: number;
  xRange?: [number, number] | null;
  xAxisLabel?: string;
};

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function humanize(key: string): string {
  return key
    .replace(/[_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MetadataPanel({ metadata, filename, dataPoints, xRange, xAxisLabel }: MetadataPanelProps) {
  const entries = Object.entries(metadata ?? {}).filter(([, v]) => v != null && v !== "");

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Info size={14} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h2>Metadata</h2>
          <span className="muted">File and instrument information</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <FileText size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {filename || "Untitled spectrum"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {dataPoints != null ? `${dataPoints} data points` : "—"}
              {xRange?.[0] != null && xRange[1] != null ? ` · ${xRange[0].toFixed(1)}–${xRange[1].toFixed(1)} ${xAxisLabel?.split("(")[1]?.replace(")", "") ?? ""}` : ""}
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
            No metadata was embedded in this file. Header lines such as{" "}
            <code style={{ fontSize: 11, background: "var(--surface-2)", padding: "1px 4px", borderRadius: 3 }}># key: value</code>{" "}
            are parsed automatically.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
            {entries.map(([key, value]) => (
              <div key={key} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {humanize(key)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={formatValue(key, value)}
                >
                  {formatValue(key, value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
