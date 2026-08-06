"use client";

import { Sparkles, Table2 } from "lucide-react";
import type { SpectrumAnalysisResult } from "../../types";

type ResultsCardsProps = {
  analysis: SpectrumAnalysisResult;
  bandAssignments?: Record<string, string>;
  baselineMethod?: string;
  smoothingWindow?: number;
};

function fmt(v: number, digits = 2): string {
  return Number.isFinite(v) ? v.toFixed(digits) : "—";
}

export function ResultsCards({ analysis, bandAssignments, baselineMethod, smoothingWindow }: ResultsCardsProps) {
  const peaks = analysis.peaks ?? [];
  const stats = analysis.stats ?? {};

  const statsRows = [
    { label: "Peaks detected", value: String(peaks.length) },
    { label: "Max intensity", value: fmt(Number(stats.max_intensity ?? NaN)) },
    { label: "Min intensity", value: fmt(Number(stats.y_min ?? NaN)) },
    { label: "Signal/noise", value: fmt(Number(stats.snr ?? NaN), 1) },
    { label: "Noise estimate", value: fmt(Number(stats.noise_estimate ?? NaN)) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ display: "flex", flexDirection: "column" }}>
        <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={14} style={{ color: "var(--accent-orange)" }} />
          <div>
            <h2>Results</h2>
            <span className="muted">Detected peaks and statistics</span>
          </div>
        </div>

        {analysis.parameters.baseline_order > 0 && (
          <div
            style={{
              margin: "0 20px 16px",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              background: "rgba(239, 68, 68, 0.07)",
              border: "1px solid rgba(239, 68, 68, 0.18)",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            Baseline correction <strong>{baselineMethod ?? "polynomial"}</strong> and smoothing window{" "}
            <strong>{smoothingWindow ?? "—"} pts</strong> were applied before peak detection.
          </div>
        )}

        <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
          {statsRows.map((row) => (
            <div
              key={row.label}
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{row.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column" }}>
        <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Table2 size={14} style={{ color: "var(--accent-orange)" }} />
          <div>
            <h2>Peak table</h2>
            <span className="muted">{peaks.length} peaks found</span>
          </div>
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          {peaks.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              No peaks above the prominence threshold were detected. Try lowering the prominence or disabling baseline correction.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>#</th>
                    <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Position</th>
                    <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Intensity</th>
                    <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Width (FWHM)</th>
                    <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Assignment</th>
                  </tr>
                </thead>
                <tbody>
                  {peaks.map((peak, i) => {
                    const name = bandAssignments?.[String(peak.position)] ?? peak.assignment;
                    return (
                      <tr key={`${peak.position}-${i}`} style={{ color: "var(--text-primary)" }}>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-faint)", color: "var(--text-tertiary)" }}>{i + 1}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-faint)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {fmt(Number(peak.position))}
                        </td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-faint)", fontVariantNumeric: "tabular-nums" }}>{fmt(Number(peak.intensity))}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-faint)", fontVariantNumeric: "tabular-nums" }}>{fmt(Number(peak.fwhm))}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-faint)" }}>
                          {name ? <span className="badge" style={{ fontSize: 11 }}>{name}</span> : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
